import { useCallback, useEffect, useRef, useState } from 'react'
import type { ShowState } from '../../../shared/types/index'
import type { TicketGroup } from '../types/index'
import { fetchAndProcessTickets, ticketStateKey } from '../../../../utils/ticketSyncEngine'
import { hasOriginPermission, permissionErrorMessage } from '../../../../utils/permissions'

export function useTicketSync() {
  const [groups, setGroups] = useState<TicketGroup[]>([])
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
      const cached = await chrome.storage.local.get(['cachedTicketGroups'])
      if (cached.cachedTicketGroups) {
        setGroups(cached.cachedTicketGroups as TicketGroup[])
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

      const groupedTickets = await fetchAndProcessTickets(
        redmineUrl,
        redmineApiKey,
        gitlabUrl,
        gitlabToken,
        setSyncProgress
      )

      setGroups(groupedTickets)
      setShowState('main')
      
      void chrome.storage.local.set({ cachedTicketGroups: groupedTickets })

      const ticketStates: Record<number, string> = {}
      for (const group of groupedTickets) {
        for (const t of group.tickets) {
          if (ticketStates[t.id]) continue
          ticketStates[t.id] = ticketStateKey(t.evaluations)
        }
      }

      const result = await chrome.storage.local.get(['knownTicketStates'])
      const knownTicketStates = (result.knownTicketStates || {}) as Record<number, string>
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

  return { groups, showState, error, isSyncing, syncProgress, refresh: fetchData }
}
