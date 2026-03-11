import pdfplumber, sys

pdf_path = sys.argv[1] if len(sys.argv) > 1 else "index_print.pdf"
with pdfplumber.open(pdf_path) as pdf:
    for i, page in enumerate(pdf.pages[:3]):
        print(f"\n=== Page {i+1} ===")
        text = page.extract_text()
        if text:
            print(text[:2000])
        else:
            print("[No extractable text]")
        print("\n--- Tables ---")
        for t in page.extract_tables()[:2]:
            for row in t[:10]:
                print(row)
