import type { DisplayType, RedmineProject, TimeScope, UserHours } from '../../../utils/api'

export type ViewName = 'overview' | 'settings' | 'otp' | 'ticket-sync'
export type ShowState = 'notConfigured' | 'needsPermission' | 'error' | 'loading' | 'main'
export type StatusType = 'loading' | 'success' | 'error'
export type ConnectionStatus = { message: string; type: StatusType }
export type StatsErrorKind = 'not_configured' | 'permission' | 'other'
export type BadgeTimeScope = 'today' | 'week' | 'month'

export enum TimelogSyncInterval {
  OneMinute = 1,
  FiveMinutes = 5,
  FifteenMinutes = 15,
  ThirtyMinutes = 30,
  OneHour = 60,
}

export const TIMELOG_SYNC_INTERVAL_OPTIONS: { value: TimelogSyncInterval; label: string }[] = [
  { value: TimelogSyncInterval.OneMinute, label: '1 min' },
  { value: TimelogSyncInterval.FiveMinutes, label: '5 min' },
  { value: TimelogSyncInterval.FifteenMinutes, label: '15 min' },
  { value: TimelogSyncInterval.ThirtyMinutes, label: '30 min' },
  { value: TimelogSyncInterval.OneHour, label: '1 hour' },
]

const TIMELOG_SYNC_INTERVALS = new Set<number>(
  TIMELOG_SYNC_INTERVAL_OPTIONS.map(option => option.value),
)

export function parseTimelogSyncInterval(value: unknown): TimelogSyncInterval {
  return TIMELOG_SYNC_INTERVALS.has(value as number)
    ? (value as TimelogSyncInterval)
    : TimelogSyncInterval.OneMinute
}

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
  timelogSyncInterval: TimelogSyncInterval
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
  timelogSyncInterval: TimelogSyncInterval.OneMinute,
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
