import type { ShowState, Stats, StatsUser, OverviewSettings, UserHours } from '../../../shared/types/index'

export interface OverviewViewProps {
  currentSettings: OverviewSettings | null
  currentUser: StatsUser | null
  rankingData: UserHours[]
  stats: Omit<Stats, 'ranking'> | null
  lastSyncedAt: number
  showState: ShowState
  errorMessage: string
  onRetry: () => void
  onConfigure: () => void
}
