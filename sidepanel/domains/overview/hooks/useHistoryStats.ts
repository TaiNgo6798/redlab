import { useEffect, useRef, useState } from 'react'
import {
  getTimeEntries,
  getMembersTimeEntries,
  getDateRange,
  getWorkingDays,
  calculateTotalHours,
  buildRanking,
  type UserHours,
} from '../../../../utils/api'
import type { StatsUser } from '../../../shared/types/index'
import type { OverviewPeriod } from '../consts/periods'

export interface HistoryStats {
  from: string
  to: string
  loggedHours: number
  expectedHours: number
  remainingHours: number
  ranking: UserHours[]
  rankingExpectedHours: number
}

interface State {
  loading: boolean
  error: string | null
  data: HistoryStats | null
}

const DEFAULT_HOURS_PER_DAY = 6.5

export function useHistoryStats(period: OverviewPeriod | null, currentUser: StatsUser | null) {
  const [state, setState] = useState<State>({ loading: false, error: null, data: null })
  const cacheRef = useRef<Record<string, HistoryStats>>({})
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!period || !currentUser) {
      setState({ loading: false, error: null, data: null })
      return
    }

    const cached = cacheRef.current[period]
    if (cached) {
      setState({ loading: false, error: null, data: cached })
      return
    }

    let cancelled = false
    setState({ loading: true, error: null, data: null })

    void (async () => {
      try {
        const stored = await chrome.storage.sync.get([
          'redmineUrl', 'redmineApiKey', 'projectId', 'hoursPerDay',
        ])
        const redmineUrl = stored.redmineUrl as string
        const redmineApiKey = stored.redmineApiKey as string
        const projectId = (stored.projectId as string | null) ?? null
        const perDay = typeof stored.hoursPerDay === 'number' ? stored.hoursPerDay : DEFAULT_HOURS_PER_DAY

        const { from, to } = getDateRange(period)
        const expectedHours = getWorkingDays(from, to) * perDay

        const entries = await getTimeEntries(redmineUrl, redmineApiKey, currentUser.id, period)
        const loggedHours = calculateTotalHours(entries)
        const remainingHours = Math.max(0, expectedHours - loggedHours)

        let ranking: UserHours[] = []
        if (projectId) {
          const memberEntries = await getMembersTimeEntries(redmineUrl, redmineApiKey, projectId, period)
          ranking = buildRanking(memberEntries)
        }

        const data: HistoryStats = {
          from, to, loggedHours, expectedHours, remainingHours,
          ranking, rankingExpectedHours: expectedHours,
        }
        cacheRef.current[period] = data
        if (!cancelled) setState({ loading: false, error: null, data })
      } catch (err) {
        if (!cancelled) {
          setState({ loading: false, error: err instanceof Error ? err.message : 'Failed to load period', data: null })
        }
      }
    })()

    return () => { cancelled = true }
  }, [period, currentUser, reloadToken])

  const retry = () => setReloadToken(t => t + 1)
  return { ...state, retry }
}
