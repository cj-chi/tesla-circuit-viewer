import { useState, useMemo } from 'react'
import Fuse from 'fuse.js'
import { CONNECTORS } from '../data/connectors'
import { SIGNALS } from '../data/signals'

const connectorFuse = new Fuse(CONNECTORS, {
  keys: [
    { name: 'id', weight: 0.4 },
    { name: 'module', weight: 0.25 },
    { name: 'description', weight: 0.2 },
    { name: 'pins.signal', weight: 0.15 },
  ],
  threshold: 0.35,
  includeScore: true,
  includeMatches: true,
})

const signalFuse = new Fuse(SIGNALS, {
  keys: [
    { name: 'id', weight: 0.35 },
    { name: 'name', weight: 0.35 },
    { name: 'path', weight: 0.15 },
    { name: 'color', weight: 0.15 },
  ],
  threshold: 0.35,
  includeScore: true,
  includeMatches: true,
})

export function useSearch() {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    if (!query || query.length < 1) return { connectors: [], signals: [] }

    const connResults = connectorFuse.search(query).slice(0, 8)
    const sigResults = signalFuse.search(query).slice(0, 8)

    return {
      connectors: connResults.map(r => ({ ...r.item, score: r.score, matches: r.matches })),
      signals: sigResults.map(r => ({ ...r.item, score: r.score, matches: r.matches })),
    }
  }, [query])

  return { query, setQuery, results }
}
