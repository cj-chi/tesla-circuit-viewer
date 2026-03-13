import { useRef, useEffect } from 'react'

export function Header({ search, onSelectResult }) {
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        search.setQuery('')
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [search])

  const hasResults = search.results.connectors.length > 0 || search.results.signals.length > 0

  return (
    <header className="app-header">
      <div className="logo">
        <div className="logo-icon">⚡</div>
        <div>
          <div className="logo-title">特斯拉音響線路分析器</div>
          <div className="logo-sub">Tesla Audio Wiring Analyzer</div>
        </div>
      </div>

      <div className="search-container" ref={dropdownRef}>
        <span className="search-icon">🔍</span>
        <input
          className="search-input"
          type="text"
          value={search.query}
          onChange={e => search.setQuery(e.target.value)}
          placeholder="模糊搜尋接頭、訊號、模組名稱..."
          autoComplete="off"
        />
        {search.query.length >= 1 && (
          <div className="search-dropdown">
            {!hasResults && (
              <div className="search-result" style={{ opacity: 0.5, cursor: 'default' }}>
                無匹配結果
              </div>
            )}
            {search.results.connectors.length > 0 && (
              <>
                <div className="search-section-label">接頭</div>
                {search.results.connectors.map(c => (
                  <div
                    key={c.id}
                    className="search-result"
                    onClick={() => { onSelectResult('connector', c.id); search.setQuery('') }}
                  >
                    <span className="type-badge conn">接頭</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{c.id}</span>
                    <span style={{ flex: 1, opacity: 0.6 }}>{c.module}</span>
                  </div>
                ))}
              </>
            )}
            {search.results.signals.length > 0 && (
              <>
                <div className="search-section-label">訊號</div>
                {search.results.signals.map(s => (
                  <div
                    key={s.id}
                    className="search-result"
                    onClick={() => { onSelectResult('signal', s.id); search.setQuery('') }}
                  >
                    <span className="type-badge sig">訊號</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{s.id}</span>
                    <span style={{ flex: 1, opacity: 0.6 }}>{s.name}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
