import type { DisplayType, RedmineProject, TimeScope, UserHours } from '../../../utils/api'

export type ViewName = 'overview' | 'settings' | 'otp' | 'ticket-sync'
export type ShowState = 'notConfigured' | 'error' | 'loading' | 'main'
export type StatusType = 'loading' | 'success' | 'error'

export interface OverviewSettings {
  badgeDisplayType: DisplayType
  rankingDisplayType: DisplayType
  badgeTimeScope: TimeScope
  rankingExpectedHours: number
  projectId: string | null
  hoursPerDay: number
}

export interface StatsUser {
  id: number
  login: string
  name: string
}

export interface Stats {
  user: StatsUser
  loggedHours: number
  expectedHours: number
  remainingHours: number
  todayLoggedHours: number
  ranking: UserHours[]
  settings: OverviewSettings
  error?: string
}

export interface CachedStats {
  lastSyncedAt: number
  stats: Stats
}

export type { DisplayType, RedmineProject, TimeScope, UserHours }
