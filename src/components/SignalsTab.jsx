import { useMemo, Fragment } from 'react'
import { SIGNALS } from '../data/signals'
import { CONNECTORS } from '../data/connectors'
import { CAT_LABELS, WIRE_COLORS } from '../data/constants'
import { findConnectorsForSignal } from '../data/graph-builder'
import { SystemBadge } from './Badge'
import { WireSwatch } from './WireSwatch'

function SignalPathFlow({ signal, navigateTo }) {
  const pathStr = signal.path || ''
  const segments = pathStr
    .replace(/↔/g, '→')
    .split(/\s*→\s*/)
    .map(s => s.trim())
    .filter(Boolean)

  return (
    <div className="signal-path-flow">
      {segments.map((seg, i) => {
        const connMatch = seg.match(/^(X\d{2,4}[A-Z]?)/)
        const isClickable = !!connMatch && CONNECTORS.some(c => c.id === connMatch[1])
        const conn = isClickable ? CONNECTORS.find(c => c.id === connMatch[1]) : null

        return (
          <Fragment key={i}>
            {i > 0 && <div className="path-arrow">→</div>}
            <div
              className="path-node"
              onClick={() => isClickable && navigateTo('connector', connMatch[1])}
              style={{ cursor: isClickable ? 'pointer' : 'default' }}
            >
              <span className="node-id" style={{ color: isClickable ? 'var(--connector-color)' : 'var(--text-dim)' }}>
                {connMatch ? connMatch[1] : seg}
              </span>
              <span className="node-label">
                {conn ? conn.module.split(' ').slice(0, 2).join(' ') : seg}
              </span>
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}

export function SignalsTab({ filter, selectedEntity, navigateTo }) {
  const selectedId = selectedEntity?.type === 'signal' ? selectedEntity.id : null

  const filteredSignals = useMemo(() => {
    if (filter === 'all') return SIGNALS
    return SIGNALS.filter(s => s.systems.includes(filter))
  }, [filter])

  const selectedSignal = selectedId ? SIGNALS.find(s => s.id === selectedId) : null
  const relatedConns = useMemo(() => {
    if (!selectedId) return []
    return findConnectorsForSignal(selectedId)
  }, [selectedId])

  return (
    <div className="signals-page">
      {/* 選中的訊號詳情 */}
      {selectedSignal && (
        <div className="signal-detail-panel">
          <h3>{selectedSignal.id} — {selectedSignal.name}</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <div className="label">線色</div>
              <div className="value"><WireSwatch code={selectedSignal.color} /></div>
            </div>
            <div className="detail-item">
              <div className="label">線徑</div>
              <div className="value">{selectedSignal.gauge} mm²</div>
            </div>
            <div className="detail-item">
              <div className="label">線材類型</div>
              <div className="value">{selectedSignal.type}</div>
            </div>
            <div className="detail-item">
              <div className="label">系統</div>
              <div className="value" style={{ display: 'flex', gap: 4 }}>
                {selectedSignal.systems.map(s => <SystemBadge key={s} sys={s} />)}
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, opacity: 0.6 }}>訊號路徑</h4>
          <SignalPathFlow signal={selectedSignal} navigateTo={navigateTo} />

          {relatedConns.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, opacity: 0.6 }}>
                經過的接頭 ({relatedConns.length})
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {relatedConns.map(c => (
                  <span
                    key={c.id}
                    className="clickable-connector"
                    onClick={() => navigateTo('connector', c.id)}
                    style={{
                      padding: '4px 10px',
                      background: 'rgba(245,158,11,0.1)',
                      border: '1px solid rgba(245,158,11,0.3)',
                      borderRadius: 6,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {c.id}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => navigateTo(null)}
            style={{
              marginTop: 12, padding: '4px 12px', background: 'transparent',
              border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)',
              cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
            }}
          >
            ✕ 關閉詳情
          </button>
        </div>
      )}

      {/* 訊號列表依分類 */}
      {Object.entries(CAT_LABELS).map(([cat, label]) => {
        const sigs = filteredSignals.filter(s => s.category === cat)
        if (!sigs.length) return null
        return (
          <div key={cat} className="signal-group">
            <h3>{label} ({sigs.length})</h3>
            {sigs.map(s => (
              <div
                key={s.id}
                className={`signal-row ${selectedId === s.id ? 'selected' : ''}`}
                onClick={() => navigateTo('signal', s.id)}
              >
                <span className="sig-id">{s.id}</span>
                <span>{s.name}</span>
                <WireSwatch code={s.color} />
                <span className="sig-gauge">{s.gauge}mm²</span>
                <div style={{ display: 'flex', gap: 3 }}>
                  {s.systems.map(sys => <SystemBadge key={sys} sys={sys} />)}
                </div>
                <span className="sig-path">{s.path}</span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
