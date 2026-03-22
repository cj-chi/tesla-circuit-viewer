import { useMemo } from 'react'
import { CONNECTORS } from '../data/connectors'
import { TYPE_COLORS, TYPE_LABELS } from '../data/constants'
import { findSignalsForConnector } from '../data/graph-builder'
import { Badge, SystemBadge } from './Badge'
import { WireSwatch } from './WireSwatch'

export function ConnectorsTab({ filter, selectedEntity, navigateTo }) {
  const selectedId = selectedEntity?.type === 'connector' ? selectedEntity.id : null
  const selectedConn = selectedId ? CONNECTORS.find(c => c.id === selectedId) : null

  const filteredConns = useMemo(() => {
    if (filter === 'all') return CONNECTORS
    return CONNECTORS.filter(c => c.systems.includes(filter))
  }, [filter])

  const relatedSignals = useMemo(() => {
    if (!selectedId) return []
    return findSignalsForConnector(selectedId)
  }, [selectedId])

  return (
    <div className="connectors-page">
      <div className="connector-list">
        {filteredConns.map(c => (
          <div
            key={c.id}
            className={`connector-card ${selectedId === c.id ? 'selected' : ''}`}
            style={{ borderLeft: `3px solid ${TYPE_COLORS[c.type] || '#555'}` }}
            onClick={() => navigateTo('connector', c.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-id" style={{ color: TYPE_COLORS[c.type] }}>{c.id}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {c.systems.map(s => <SystemBadge key={s} sys={s} />)}
              </div>
            </div>
            <div className="card-module">{c.module}</div>
            <div className="card-desc">{c.description}</div>
          </div>
        ))}
      </div>

      <div className="connector-detail">
        {selectedConn ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ color: TYPE_COLORS[selectedConn.type] }}>{selectedConn.id}</h2>
                <div className="detail-meta">{selectedConn.module}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Badge bg={TYPE_COLORS[selectedConn.type]}>{TYPE_LABELS[selectedConn.type]}</Badge>
                {selectedConn.systems.map(s => <SystemBadge key={s} sys={s} />)}
              </div>
            </div>

            <p style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.75, marginBottom: 20 }}>
              {selectedConn.description}
            </p>

            {selectedConn.pins && selectedConn.pins.length > 0 && (
              <>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, opacity: 0.6 }}>腳位定義</h3>
                <table className="pin-table">
                  <thead>
                    <tr>
                      <th>Pin</th>
                      <th>訊號</th>
                      <th>方向</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedConn.pins.map((p, i) => (
                      <tr key={i}>
                        <td className="pin-num">{p.pin}</td>
                        <td>
                          <span
                            className="clickable-signal"
                            onClick={(e) => {
                              e.stopPropagation()
                              // 嘗試找到匹配的訊號
                              const match = relatedSignals.find(s =>
                                s.name.toLowerCase().includes(p.signal.toLowerCase().split(' ')[0])
                              )
                              if (match) navigateTo('signal', match.id)
                            }}
                          >
                            {p.signal}
                          </span>
                          {p.condition && <Badge bg="#92400e"> {p.condition}</Badge>}
                        </td>
                        <td>
                          <Badge bg={
                            p.dir.includes("Out") ? "#0369a1" :
                            p.dir.includes("In") ? "#15803d" :
                            p.dir.includes("A2B") ? "#b45309" :
                            p.dir.includes("Power") ? "#dc2626" :
                            p.dir.includes("Ground") ? "#374151" : "#475569"
                          }>
                            {p.dir}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {relatedSignals.length > 0 && (
              <div className="related-section">
                <h3>相關訊號線 ({relatedSignals.length})</h3>
                {relatedSignals.map(sig => (
                  <div
                    key={sig.id}
                    className="related-signal-item"
                    onClick={() => navigateTo('signal', sig.id)}
                  >
                    <span className="sig-id">{sig.id}</span>
                    <WireSwatch code={sig.color} />
                    <span className="sig-name">{sig.name}</span>
                    <span className="sig-path">{sig.path}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">← 選擇一個接頭查看詳情</div>
        )}
      </div>
    </div>
  )
}
