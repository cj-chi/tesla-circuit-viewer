import { useState, useCallback } from 'react'

export function useNavigation() {
  const [selectedEntity, setSelectedEntity] = useState(null) // { type: 'connector'|'signal', id: string }
  const [history, setHistory] = useState([])
  const [activeTab, setActiveTab] = useState('topology')

  const navigateTo = useCallback((type, id) => {
    const entity = { type, id }
    setSelectedEntity(entity)
    setHistory(prev => [...prev, entity])
    // 自動切換到對應的分頁
    if (type === 'connector') setActiveTab('connectors')
    if (type === 'signal') setActiveTab('signals')
  }, [])

  const goBack = useCallback(() => {
    setHistory(prev => {
      if (prev.length <= 1) {
        setSelectedEntity(null)
        return []
      }
      const next = prev.slice(0, -1)
      setSelectedEntity(next[next.length - 1] || null)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedEntity(null)
  }, [])

  return {
    selectedEntity,
    history,
    activeTab,
    setActiveTab,
    navigateTo,
    goBack,
    clearSelection,
  }
}
