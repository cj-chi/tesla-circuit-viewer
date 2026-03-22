import { SYSTEMS } from '../data/systems'
import { CONNECTORS } from '../data/connectors'
import { SIGNALS } from '../data/signals'
import { WIRE_COLORS, TYPE_COLORS, TYPE_LABELS } from '../data/constants'
import { Badge, SystemBadge } from './Badge'

export function OverviewTab() {
  return (
    <div className="overview-page">
      <div className="systems-grid">
        {Object.values(SYSTEMS).map(sys => (
          <div
            key={sys.id}
            className="system-card"
            style={{ borderTop: `3px solid ${sys.id === "base" ? "#475569" : "#b91c1c"}22` }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2>{sys.name}</h2>
              <Badge bg={sys.id === "base" ? "#475569" : "#b91c1c"}>{sys.condition}</Badge>
            </div>
            <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 10 }}>{sys.sheet}</div>
            <p style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.8 }}>{sys.description}</p>
            <div className="stats-row">
              <div className="stat-box">
                <div className="value" style={{ color: TYPE_COLORS.controller }}>
                  {CONNECTORS.filter(c => c.systems.includes(sys.id) && c.type === "controller").length}
                </div>
                <div className="label">控制器</div>
              </div>
              <div className="stat-box">
                <div className="value" style={{ color: TYPE_COLORS.speaker }}>
                  {CONNECTORS.filter(c => c.systems.includes(sys.id) && c.type === "speaker").length}
                </div>
                <div className="label">揚聲器</div>
              </div>
              <div className="stat-box">
                <div className="value" style={{ color: "#f59e0b" }}>
                  {SIGNALS.filter(s => s.systems.includes(sys.id)).length}
                </div>
                <div className="label">訊號線</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h3 className="section-title">線材顏色對照</h3>
      <div className="legend-row">
        {Object.entries(WIRE_COLORS).map(([code, { name, hex }]) => (
          <div key={code} className="legend-item">
            <span className="legend-swatch" style={{ background: hex }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600 }}>{code}</span>
            <span style={{ opacity: 0.6 }}>{name}</span>
          </div>
        ))}
      </div>

      <h3 className="section-title">接頭類型</h3>
      <div className="legend-row">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="legend-item">
            <span className="legend-swatch" style={{ background: color, borderRadius: 3, width: 14, height: 14 }} />
            <span style={{ fontWeight: 500 }}>{TYPE_LABELS[type]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
