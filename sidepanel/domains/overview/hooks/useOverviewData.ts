import { useCallback, useEffect, useRef, useState } from 'react'
import type { CachedStats, OverviewSettings, ShowState, Stats, StatsUser, UserHours } from '../../../shared/types/index'

async function getCachedStats(): Promise<CachedStats | null> {
  const { cachedStats } = await chrome.storage.local.get('cachedStats')
  return (cachedStats as CachedStats) || null
}

async function getStats(): Promise<Stats> {
  const TIMEOUT_MS = 30000
  return await Promise.race([
    chrome.runtime.sendMessage({ action: 'getStats' }) as any,
    new Promise<Stats>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), TIMEOUT_MS)),
  ])
}

export function useOverviewData() {
  const [currentSettings, setCurrentSettings] = useState<OverviewSettings | null>(null)
  const [currentUser, setCurrentUser] = useState<StatsUser | null>(null)
  const [rankingData, setRankingData] = useState<UserHours[]>([])
  const [stats, setStats] = useState<Omit<Stats, 'ranking'> | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState(0)
  const [showState, setShowState] = useState<ShowState>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const isSyncingRef = useRef(false)

  const applyCached = useCallback((cached: CachedStats) => {
    setCurrentSettings(cached.stats.settings)
    setCurrentUser(cached.stats.user)
    setStats(cached.stats)
    setRankingData(cached.stats.ranking || [])
    setLastSyncedAt(cached.lastSyncedAt)
    setShowState('main')
  }, [])

  const syncData = useCallback(async (isBackgroundSync = false) => {
    if (isSyncingRef.current) return
    isSyncingRef.current = true
    setIsSyncing(true)

    try {
      const data = await getStats()
      if (data.errorKind === 'not_configured' || data.error === 'Not configured') {
        setShowState('notConfigured')
        return
      }
      if (data.errorKind === 'permission') {
        setShowState(prev => {
          if (prev !== 'main') {
            setErrorMessage(data.error ?? '')
            return 'needsPermission'
          }
          return prev
        })
        return
      }
      if (data.error) {
        setShowState(prev => {
          if (prev !== 'main') {
            setErrorMessage(data.error!)
            return 'error'
          }
          return prev
        })
        return
      }

      setCurrentSettings(data.settings)
      setCurrentUser(data.user)
      setStats(data)
      setRankingData(data.ranking || [])
      if (!isBackgroundSync) setShowState('main')

      const cached = await getCachedStats()
      if (cached) setLastSyncedAt(cached.lastSyncedAt)
    } catch (error) {
      setShowState(prev => {
        if (prev !== 'main') {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to sync data')
          return 'error'
        }
        return prev
      })
    } finally {
      isSyncingRef.current = false
      setIsSyncing(false)
    }
  }, [])

  const loadData = useCallback(async () => {
    const { redmineUrl, redmineApiKey } = await chrome.storage.sync.get(['redmineUrl', 'redmineApiKey'])
    if (!redmineUrl || !redmineApiKey) {
      setShowState('notConfigured')
      return
    }

    const cached = await getCachedStats()
    if (cached && cached.stats && !cached.stats.error) {
      applyCached(cached)
      syncData(true)
      return
    }

    setShowState('loading')
    await syncData(false)
  }, [applyCached, syncData])

  useEffect(() => {
    const onStorageChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ) => {
      if (area === 'local' && changes.cachedStats) {
        const cached = changes.cachedStats.newValue as CachedStats | undefined
        if (cached?.stats && !cached.stats.error) applyCached(cached)
        return
      }
      if (area !== 'sync') return
      if (!changes.redmineUrl && !changes.redmineApiKey) return
      void loadData()
    }
    chrome.storage.onChanged.addListener(onStorageChanged)
    return () => chrome.storage.onChanged.removeListener(onStorageChanged)
  }, [applyCached, loadData])

  return {
    currentSettings,
    currentUser,
    rankingData,
    stats,
    isSyncing,
    lastSyncedAt,
    showState,
    errorMessage,
    syncData,
    loadData,
  }
}
