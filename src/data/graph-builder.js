import { CONNECTORS } from './connectors'
import { SIGNALS } from './signals'

// 群組名稱 → 接頭 ID 的對應
const GROUP_ALIASES = {
  'MCU': ['X170', 'X171', 'X171A', 'X172', 'X172A'],
  'BCM': ['X050', 'X051', 'X053', 'X055', 'X030', 'X033'],
  'BCM-R': ['X050', 'X051', 'X053', 'X055'],
  'BCM-L': ['X030', 'X033'],
  'AMP': ['X560', 'X561', 'X563'],
  'Overhead Console': ['X299'],
}

/**
 * 解析訊號路徑字串，回傳接頭 ID 陣列
 * 例如 "MCU → BCM-R → X576" => ["X171", "X055", "X576"]
 */
function parseSignalPath(pathStr) {
  if (!pathStr) return []

  const segments = pathStr
    .replace(/↔/g, '→')
    .split(/\s*→\s*/)
    .map(s => s.trim())
    .filter(Boolean)

  const connIds = []
  for (const seg of segments) {
    // 直接接頭 ID 匹配（如 X576、X561-6）
    const directMatch = seg.match(/^(X\d{2,4}[A-Z]?)/)
    if (directMatch) {
      connIds.push(directMatch[1])
      continue
    }

    // 含替代選項的（如 "X568 (Base) / X565 (Prem)"）
    const altMatch = seg.match(/X\d{2,4}[A-Z]?/g)
    if (altMatch) {
      connIds.push(...altMatch)
      continue
    }

    // 群組名稱匹配
    const upperSeg = seg.toUpperCase().replace(/[^A-Z0-9-]/g, '')
    for (const [alias, ids] of Object.entries(GROUP_ALIASES)) {
      if (upperSeg === alias.toUpperCase().replace(/[^A-Z0-9-]/g, '')) {
        // 取群組中第一個作為代表
        connIds.push(ids[0])
        break
      }
    }
  }

  return [...new Set(connIds)]
}

/**
 * 找出與指定接頭相關的所有訊號
 */
export function findSignalsForConnector(connectorId) {
  return SIGNALS.filter(sig => {
    const pathConns = parseSignalPath(sig.path)
    return pathConns.includes(connectorId)
  })
}

/**
 * 找出與指定訊號相關的所有接頭
 */
export function findConnectorsForSignal(signalId) {
  const signal = SIGNALS.find(s => s.id === signalId)
  if (!signal) return []
  const pathConns = parseSignalPath(signal.path)
  return pathConns
    .map(id => CONNECTORS.find(c => c.id === id))
    .filter(Boolean)
}

/**
 * 建構 D3 圖形資料
 */
export function buildGraphData(systemFilter = 'all') {
  const filteredConns = systemFilter === 'all'
    ? CONNECTORS
    : CONNECTORS.filter(c => c.systems.includes(systemFilter))

  const filteredSigs = systemFilter === 'all'
    ? SIGNALS
    : SIGNALS.filter(s => s.systems.includes(systemFilter))

  const connIdSet = new Set(filteredConns.map(c => c.id))

  // 節點
  const nodes = filteredConns.map(c => ({
    id: c.id,
    module: c.module,
    type: c.type,
    group: c.group,
    systems: c.systems,
    description: c.description,
    pinCount: c.pins?.length || 0,
  }))

  // 邊：從訊號路徑推導
  const linksMap = new Map()
  for (const sig of filteredSigs) {
    const pathConns = parseSignalPath(sig.path).filter(id => connIdSet.has(id))
    for (let i = 0; i < pathConns.length - 1; i++) {
      const [a, b] = [pathConns[i], pathConns[i + 1]].sort()
      const key = `${a}|${b}`
      if (!linksMap.has(key)) {
        linksMap.set(key, {
          source: a,
          target: b,
          signals: [],
        })
      }
      linksMap.get(key).signals.push(sig)
    }
    // 如果路徑只有一個接頭，不形成邊（但仍可在節點上顯示）
  }

  const links = Array.from(linksMap.values())

  return { nodes, links }
}
