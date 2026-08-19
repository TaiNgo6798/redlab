import { useCallback, useEffect, useRef, useState } from 'react'
import type { ShowState } from '../../../shared/types/index'
import type { ProcessedTicket } from '../types/index'
import { fetchAndProcessTickets } from '../../../../utils/ticketSyncEngine'
import { hasOriginPermission, permissionErrorMessage } from '../../../../utils/permissions'

export function useTicketSync() {
  const [tickets, setTickets] = useState<ProcessedTicket[]>([])
  const [showState, setShowState] = useState<ShowState>('loading')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const isFetchingRef = useRef(false)

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    setIsSyncing(true)
    setSyncProgress(0)

    try {
      const cached = await chrome.storage.local.get(['cachedTickets'])
      if (cached.cachedTickets) {
        setTickets(cached.cachedTickets as ProcessedTicket[])
        setShowState('main')
      } else {
        setShowState('loading')
      }
      setError(null)

      const stored = await chrome.storage.sync.get({
        redmineUrl: '',
        redmineApiKey: '',
        gitlabUrl: '',
        gitlabToken: '',
      }) as { redmineUrl: string; redmineApiKey: string; gitlabUrl: string; gitlabToken: string }
      const { redmineUrl, redmineApiKey, gitlabUrl, gitlabToken } = stored

      if (!gitlabUrl || !gitlabToken) {
        setShowState('notConfigured')
        return
      }

      if (!redmineUrl || !redmineApiKey) {
        setShowState('notConfigured')
        return
      }

      const missing: string[] = []
      if (!(await hasOriginPermission(redmineUrl))) missing.push('Redmine')
      if (!(await hasOriginPermission(gitlabUrl))) missing.push('GitLab')
      if (missing.length > 0) {
        setError(permissionErrorMessage(missing))
        setShowState('needsPermission')
        return
      }

      const processedTickets = await fetchAndProcessTickets(
        redmineUrl,
        redmineApiKey,
        gitlabUrl,
        gitlabToken,
        setSyncProgress
      )

      setTickets(processedTickets)
      setShowState('main')
      
      void chrome.storage.local.set({ cachedTickets: processedTickets })

      const ticketStates: Record<string, string> = {}
      for (const t of processedTickets) {
        const ticketKey = t.id !== null ? String(t.id) : (t.mrs[0]?.url || 'unknown')
        const problemFlags: string[] = []
        for (const mr of t.mrs) {
          if (mr.has_conflicts && !problemFlags.includes('conflict')) problemFlags.push('conflict')
          if (mr.has_failed_pipeline && !problemFlags.includes('test_failed')) problemFlags.push('test_failed')
          if (mr.has_open_review && !problemFlags.includes('review')) problemFlags.push('review')
        }
        ticketStates[ticketKey] = problemFlags.sort().join(',')
      }

      const result = await chrome.storage.local.get(['knownTicketStates'])
      const knownTicketStates = (result.knownTicketStates || {}) as Record<string, string>
      void chrome.storage.local.set({
        knownTicketStates: { ...knownTicketStates, ...ticketStates },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync tickets')
      setShowState((prev) => prev === 'main' ? 'main' : 'error')
    } finally {
      setIsSyncing(false)
      isFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  // Re-check after first-time credentials are saved (or cleared)
  useEffect(() => {
    const onStorageChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ) => {
      if (area !== 'sync') return
      if (
        !changes.redmineUrl &&
        !changes.redmineApiKey &&
        !changes.gitlabUrl &&
        !changes.gitlabToken
      ) {
        return
      }
      void fetchData()
    }
    chrome.storage.onChanged.addListener(onStorageChanged)
    return () => chrome.storage.onChanged.removeListener(onStorageChanged)
  }, [fetchData])

  return { tickets, showState, error, isSyncing, syncProgress, refresh: fetchData }
}


