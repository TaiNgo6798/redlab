import type { DisplayType, RedmineProject, TimeScope, UserHours } from '../../../utils/api'

export type ViewName = 'overview' | 'settings' | 'otp' | 'ticket-sync'
export type ShowState = 'notConfigured' | 'needsPermission' | 'error' | 'loading' | 'main'
export type StatusType = 'loading' | 'success' | 'error'
export type ConnectionStatus = { message: string; type: StatusType }
export type StatsErrorKind = 'not_configured' | 'permission' | 'other'
export type BadgeTimeScope = 'today' | 'week' | 'month'

export interface Settings {
  redmineUrl: string
  redmineApiKey: string
  gitlabUrl: string
  gitlabToken: string
  badgeDisplayType: DisplayType
  rankingDisplayType: DisplayType
  badgeTimeScope: BadgeTimeScope
  hoursPerDay: number
  projectId: string | null
}

export const DEFAULT_SETTINGS: Settings = {
  redmineUrl: '',
  redmineApiKey: '',
  gitlabUrl: '',
  gitlabToken: '',
  badgeDisplayType: 'logged',
  rankingDisplayType: 'logged',
  badgeTimeScope: 'month',
  hoursPerDay: 6.5,
  projectId: null,
}

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
  errorKind?: StatsErrorKind
}

export interface CachedStats {
  lastSyncedAt: number
  stats: Stats
}

export type { DisplayType, RedmineProject, TimeScope, UserHours }
