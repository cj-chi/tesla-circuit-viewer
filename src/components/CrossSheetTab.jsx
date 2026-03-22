import { useMemo } from 'react'
import { CONNECTORS } from '../data/connectors'
import { SIGNALS } from '../data/signals'
import { TYPE_COLORS } from '../data/constants'
import { SystemBadge } from './Badge'

export function CrossSheetTab() {
  const crossSheetConns = useMemo(() => {
    return CONNECTORS.filter(c => c.systems.length > 1)
  }, [])

  const crossSheetSigs = useMemo(() => {
    return SIGNALS.filter(s => s.systems.length > 1 || s.crossSheet)
  }, [])

  return (
    <div className="cross-sheet-page">
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>跨圖紙共用接頭 ({crossSheetConns.length})</h3>
        <p style={{ fontSize: 13, opacity: 0.5, marginBottom: 16 }}>
          以下接頭同時出現在 Base 與 Premium 圖紙中，表示硬體共用、只差配置條件。
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {crossSheetConns.map(c => (
            <div
              key={c.id}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid rgba(255,255,255,0.08)`,
                borderLeft: `3px solid ${TYPE_COLORS[c.type]}`,
                borderRadius: 8,
                padding: "10px 14px",
              }}
            >
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: TYPE_COLORS[c.type] }}>
                {c.id}
              </div>
              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{c.module}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>跨圖紙共用訊號 ({crossSheetSigs.length})</h3>
        <p style={{ fontSize: 13, opacity: 0.5, marginBottom: 16 }}>
          這些訊號線在多張圖紙中出現，代表 Base/Premium 共用佈線路徑。
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {crossSheetSigs.slice(0, 30).map(s => (
            <div
              key={s.id}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                padding: "10px 14px",
                display: "grid",
                gridTemplateColumns: "80px 1fr 90px 60px 80px 1fr",
                gap: 10,
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "var(--text-dim)" }}>
                {s.id}
              </span>
              <span>{s.name}</span>
              <span style={{ display: "flex", gap: 4 }}>
                {s.color.split("/").map(c => (
                  <span
                    key={c}
                    className="wire-swatch"
                    style={{
                      background: { RD: "#E53935", BU: "#1E88E5", BK: "#212121", WH: "#BDBDBD", GN: "#43A047", YE: "#FDD835", OG: "#FB8C00", VT: "#8E24AA", BN: "#795548", GY: "#757575" }[c] || "#999"
                    }}
                  />
                ))}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{s.gauge}mm²</span>
              <div style={{ display: "flex", gap: 3 }}>
                {s.systems.map(sys => <SystemBadge key={sys} sys={sys} />)}
              </div>
              <span style={{ fontSize: 12, opacity: 0.6, fontFamily: "'JetBrains Mono', monospace" }}>
                {s.path}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
