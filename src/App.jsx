import { useState, useMemo } from 'react'
import { useSearch } from './hooks/useSearch'
import { useNavigation } from './hooks/useNavigation'
import { buildGraphData } from './data/graph-builder'
import { Header } from './components/Header'
import { OverviewTab } from './components/OverviewTab'
import { ConnectorsTab } from './components/ConnectorsTab'
import { SignalsTab } from './components/SignalsTab'
import { TopologyTab } from './components/TopologyTab'
import { CrossSheetTab } from './components/CrossSheetTab'
import { JsonExportTab } from './components/JsonExportTab'

export default function App() {
  const [systemFilter, setSystemFilter] = useState('all')
  const search = useSearch()
  const nav = useNavigation()

  const graphData = useMemo(() => buildGraphData(systemFilter), [systemFilter])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* 頂部 */}
      <Header
        search={search}
        onSelectResult={(type, id) => nav.navigateTo(type, id)}
      />

      {/* 工具列 */}
      <div className="toolbar">
        <button
          className={`tab-btn ${nav.activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => nav.setActiveTab('overview')}
        >
          📊 系統總覽
        </button>
        <button
          className={`tab-btn ${nav.activeTab === 'connectors' ? 'active' : ''}`}
          onClick={() => nav.setActiveTab('connectors')}
        >
          🔌 接頭分析
        </button>
        <button
          className={`tab-btn ${nav.activeTab === 'signals' ? 'active' : ''}`}
          onClick={() => nav.setActiveTab('signals')}
        >
          📡 訊號清單
        </button>
        <button
          className={`tab-btn ${nav.activeTab === 'topology' ? 'active' : ''}`}
          onClick={() => nav.setActiveTab('topology')}
        >
          🕸️ 拓樸圖
        </button>
        <button
          className={`tab-btn ${nav.activeTab === 'cross' ? 'active' : ''}`}
          onClick={() => nav.setActiveTab('cross')}
        >
          🔗 跨圖紙
        </button>
        <button
          className={`tab-btn ${nav.activeTab === 'json' ? 'active' : ''}`}
          onClick={() => nav.setActiveTab('json')}
        >
          </> JSON
        </button>

        <div className="filter-group">
          <button
            className={`filter-btn ${systemFilter === 'all' ? 'active-all' : ''}`}
            onClick={() => setSystemFilter('all')}
          >
            全部
          </button>
          <button
            className={`filter-btn ${systemFilter === 'base' ? 'active-base' : ''}`}
            onClick={() => setSystemFilter('base')}
          >
            Base
          </button>
          <button
            className={`filter-btn ${systemFilter === 'premium' ? 'active-premium' : ''}`}
            onClick={() => setSystemFilter('premium')}
          >
            Premium
          </button>
        </div>
      </div>

      {/* 主內容區 */}
      <div className="main-content">
        {nav.activeTab === 'overview' && <OverviewTab />}
        {nav.activeTab === 'connectors' && (
          <ConnectorsTab
            filter={systemFilter}
            selectedEntity={nav.selectedEntity}
            navigateTo={nav.navigateTo}
          />
        )}
        {nav.activeTab === 'signals' && (
          <SignalsTab
            filter={systemFilter}
            selectedEntity={nav.selectedEntity}
            navigateTo={nav.navigateTo}
          />
        )}
        {nav.activeTab === 'topology' && (
          <TopologyTab
            graphData={graphData}
            selectedEntity={nav.selectedEntity}
            navigateTo={nav.navigateTo}
          />
        )}
        {nav.activeTab === 'cross' && <CrossSheetTab />}
        {nav.activeTab === 'json' && <JsonExportTab />}
      </div>
    </div>
  )
}
