#!/usr/bin/env python3
"""
Tesla EE Circuit Diagram Parser
掃描所有 PDF，提取接頭、訊號、跨頁引用，輸出 JSON 供網站使用
"""
import os
import re
import json
import glob
import pdfplumber
from collections import defaultdict

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_DIR = SCRIPT_DIR
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "circuit_data.json")

# 接頭代號 pattern：X + 數字，可能有 -引腳號
CONNECTOR_RE = re.compile(r'\b(X\d{2,4}[A-Z]?)(?:-(\d+))?\b')
# 訊號名稱 pattern：全大寫英數+底線，長度>=4
SIGNAL_RE = re.compile(r'\b([A-Z][A-Z0-9_+\-]{3,})\b')
# 跨頁引用：帶頁碼的引用，如 "See Page 5" 或 "P7504"
PAGE_REF_RE = re.compile(r'\b[Pp](\d{1,2})\b|P\d{4,}')

# 已知不是訊號的黑名單
SIGNAL_BLACKLIST = {
    'TWIST', 'FLRY', 'MCIV', 'LEFT', 'RIGHT', 'FRONT', 'REAR',
    'BODY', 'DOOR', 'SEAT', 'HVAC', 'POWER', 'AUDIO', 'BRAKE',
    'DRIVE', 'CHARGE', 'SECURITY', 'STEERING', 'RESTRAINTS',
    'PDF', 'TABLE', 'PAGE', 'NOTE', 'SPEC', 'WIRE', 'FUSE',
    'LHD', 'RHD', 'LHS', 'RHS', 'AWD', 'ECU', 'HCU', 'ESP',
    'EPAS', 'CAN', 'BUS', 'GND', 'PWR', 'SIG', 'REF', 'ISO',
    'SAE', 'PVC', 'CSA', 'VIN', 'VDC', 'VAC',
}


def extract_pdf_info(pdf_path):
    """從單個 PDF 提取所有相關資訊"""
    filename = os.path.basename(pdf_path)
    name_no_ext = filename.replace('_print.pdf', '').replace('_', ' ').title()

    result = {
        "file": filename,
        "name": name_no_ext,
        "pages": 0,
        "connectors": {},      # connector_id -> [{"pin": pin, "signals": [...], "page": n}]
        "signals": set(),      # 所有訊號名稱
        "raw_text_sample": "",
    }

    try:
        with pdfplumber.open(pdf_path) as pdf:
            result["pages"] = len(pdf.pages)
            all_text = []

            for page_num, page in enumerate(pdf.pages, 1):
                text = page.extract_text() or ""
                all_text.append(text)

                # 找接頭
                for m in CONNECTOR_RE.finditer(text):
                    conn_id = m.group(1)
                    pin = m.group(2)
                    if conn_id not in result["connectors"]:
                        result["connectors"][conn_id] = []
                    # 找該接頭周圍的訊號（前後 200 字元）
                    start = max(0, m.start() - 200)
                    end = min(len(text), m.end() + 200)
                    context = text[start:end]
                    signals_in_ctx = [
                        s for s in SIGNAL_RE.findall(context)
                        if s not in SIGNAL_BLACKLIST and len(s) >= 4
                    ]
                    result["connectors"][conn_id].append({
                        "pin": pin,
                        "page": page_num,
                        "context_signals": list(set(signals_in_ctx[:10]))
                    })
                    result["signals"].update(signals_in_ctx)

                # 找獨立訊號名稱（非接頭相關）
                for s in SIGNAL_RE.findall(text):
                    if s not in SIGNAL_BLACKLIST and len(s) >= 4:
                        result["signals"].add(s)

            combined = "\n".join(all_text)
            result["raw_text_sample"] = combined[:500]

    except Exception as e:
        print(f"  [Error] {filename}: {e}")

    # set 轉 list
    result["signals"] = sorted(list(result["signals"]))
    return result


def build_connections(diagrams):
    """根據共用接頭和訊號，建立 PDF 之間的連線"""
    # connector_id -> [pdf_files]
    connector_map = defaultdict(list)
    # signal -> [pdf_files]
    signal_map = defaultdict(list)

    for d in diagrams:
        fn = d["file"]
        for conn_id in d["connectors"]:
            connector_map[conn_id].append(fn)
        for sig in d["signals"]:
            signal_map[sig].append(fn)

    connections = []
    seen = set()

    # 接頭共用連線
    for conn_id, files in connector_map.items():
        files = list(set(files))
        if len(files) >= 2:
            for i in range(len(files)):
                for j in range(i+1, len(files)):
                    a, b = sorted([files[i], files[j]])
                    key = f"{a}|{b}|conn:{conn_id}"
                    if key not in seen:
                        seen.add(key)
                        connections.append({
                            "source": a,
                            "target": b,
                            "type": "connector",
                            "label": conn_id,
                            "weight": 3
                        })

    # 訊號共用連線（只取出現在 2-5 個 PDF 的訊號，太多的是全域訊號不算）
    for sig, files in signal_map.items():
        files = list(set(files))
        if 2 <= len(files) <= 8:
            for i in range(len(files)):
                for j in range(i+1, len(files)):
                    a, b = sorted([files[i], files[j]])
                    key = f"{a}|{b}|sig:{sig}"
                    if key not in seen:
                        seen.add(key)
                        connections.append({
                            "source": a,
                            "target": b,
                            "type": "signal",
                            "label": sig,
                            "weight": 1
                        })

    return connections


def main():
    pdf_files = sorted(glob.glob(os.path.join(PDF_DIR, "*.pdf")))
    if not pdf_files:
        print("找不到 PDF 檔案！")
        return

    print(f"找到 {len(pdf_files)} 個 PDF 檔案，開始解析...")

    diagrams = []
    for i, pdf_path in enumerate(pdf_files, 1):
        fn = os.path.basename(pdf_path)
        print(f"[{i:02d}/{len(pdf_files)}] 解析 {fn}...")
        info = extract_pdf_info(pdf_path)
        print(f"       接頭: {len(info['connectors'])}個, 訊號: {len(info['signals'])}個")
        diagrams.append(info)

    print("\n建立跨 PDF 連線...")
    connections = build_connections(diagrams)
    print(f"找到 {len(connections)} 條連線（接頭+訊號共用）")

    # 統計
    conn_links = [c for c in connections if c["type"] == "connector"]
    sig_links = [c for c in connections if c["type"] == "signal"]
    print(f"  - 接頭連線: {len(conn_links)} 條")
    print(f"  - 訊號連線: {len(sig_links)} 條")

    # 輸出 JSON
    output = {
        "generated_at": __import__('datetime').datetime.now().isoformat(),
        "total_pdfs": len(diagrams),
        "diagrams": diagrams,
        "connections": connections,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 已輸出到 {OUTPUT_FILE}")
    size_kb = os.path.getsize(OUTPUT_FILE) / 1024
    print(f"   檔案大小: {size_kb:.1f} KB")


if __name__ == "__main__":
    main()
