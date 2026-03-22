import { useMemo, useState } from 'react'
import { SYSTEMS } from '../data/systems'
import { CONNECTORS } from '../data/connectors'
import { SIGNALS } from '../data/signals'
import { WIRE_COLORS, TYPE_COLORS, CAT_LABELS } from '../data/constants'

export function JsonExportTab() {
  const [copied, setCopied] = useState(false)

  const jsonOutput = useMemo(() => {
    const data = {
      metadata: {
        vehicle: "特斯拉",
        document: "音響系統線路圖",
        systems: Object.keys(SYSTEMS),
        generated: new Date().toISOString(),
      },
      systems: SYSTEMS,
      connectors: CONNECTORS.map(c => ({
        id: c.id,
        module: c.module,
        type: c.type,
        group: c.group,
        systems: c.systems,
        description: c.description,
        pinCount: c.pins?.length || 0,
        pins: c.pins || [],
      })),
      signals: SIGNALS.map(s => ({
        id: s.id,
        name: s.name,
        color: s.color,
        gauge: s.gauge,
        type: s.type,
        systems: s.systems,
        category: s.category,
        path: s.path,
        crossSheet: !!s.crossSheet,
      })),
      wireColors: WIRE_COLORS,
      typeColors: TYPE_COLORS,
      categories: CAT_LABELS,
    }
    return JSON.stringify(data, null, 2)
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="json-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>結構化 JSON 輸出</h3>
          <p style={{ fontSize: 13, opacity: 0.5, margin: "4px 0 0" }}>
            可直接用於下游程式、資料庫匯入或 API 整合
          </p>
        </div>
        <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
          {copied ? '✓ 已複製' : '複製 JSON'}
        </button>
      </div>
      <pre>{jsonOutput}</pre>
    </div>
  )
}
