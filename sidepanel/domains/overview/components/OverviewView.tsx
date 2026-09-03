import { Progress, Spin, Tag, Typography, Button } from 'antd'
import {
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  SettingOutlined,
  SyncOutlined,
  ThunderboltFilled,
} from '@ant-design/icons'
import { useId, useMemo, useState } from 'react'
import { GlassSelect } from '../../../shared/components/GlassSelect'
import { PanelCard } from '../../../shared/components/PanelCard'
import { formatHours, getTimeAgo } from '../../../shared/utils/time'
import {
  parseTimelogSyncInterval,
  TIMELOG_SYNC_INTERVAL_OPTIONS,
  TimelogSyncInterval,
  type DisplayType,
  type OverviewSettings,
  type ShowState,
  type Stats,
  type StatsUser,
  type UserHours,
} from '../../../shared/types/index'
import { useHistoryStats } from '../hooks/useHistoryStats'
import { PERIOD_OPTIONS, PERIOD_LABELS, formatPeriodRange, type OverviewPeriod } from '../consts/periods'

const { Text } = Typography

function StatsCard({ loggedHours, expectedHours, remainingHours }: { loggedHours: number; expectedHours: number; remainingHours: number }) {
  const progress = useMemo(() => expectedHours > 0 ? Math.min(100, (loggedHours / expectedHours) * 100) : 0, [expectedHours, loggedHours])
  const progressColor = useMemo(() => {
    if (progress >= 100) return 'var(--color-success)'
    if (progress >= 80) return { '0%': 'var(--color-warning)', '100%': 'var(--color-success)' }
    return { '0%': 'var(--color-accent)', '100%': 'var(--color-warning)' }
  }, [progress])

  return (
    <>
      <section className="mb-4 flex items-center justify-around rounded-xl bg-gradient-to-br from-bg-secondary to-bg-card p-3 shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
        <div className="flex flex-col items-center gap-1"><Text type="secondary" className="text-[10px] uppercase tracking-wider">Logged</Text><span className="text-xl font-bold">{formatHours(loggedHours)}</span></div>
        <div className="h-10 w-px bg-white/10"></div>
        <div className="flex flex-col items-center gap-1"><Text type="secondary" className="text-[10px] uppercase tracking-wider">Expected</Text><span className="text-xl font-bold">{formatHours(expectedHours)}</span></div>
        <div className="h-10 w-px bg-white/10"></div>
        <div className="flex flex-col items-center gap-1"><Text type="secondary" className="text-[10px] uppercase tracking-wider">Remaining</Text><span className="text-xl font-bold text-accent-light">{formatHours(remainingHours)}</span></div>
      </section>
      <section className="mb-4 flex items-center gap-3">
        <Progress
          percent={progress}
          showInfo={false}
          strokeColor={progressColor}
          trailColor="var(--color-bg-card)"
          size={['100%', 8]}
          className="flex-1"
        />
        <span className="min-w-[45px] text-right text-sm font-semibold">{Math.round(progress)}%</span>
      </section>
    </>
  )
}

function RankingSection({ ranking, displayType, expectedHours, periodLabel, hasProject, currentUser }: {
  ranking: UserHours[]
  displayType: DisplayType
  expectedHours: number
  periodLabel: string
  hasProject: boolean
  currentUser: StatsUser | null
}) {
  const sortedRanking = useMemo(() => {
    const sorted = [...ranking]
    if (displayType === 'remaining') {
      sorted.sort((a, b) => Math.max(0, expectedHours - a.hours) - Math.max(0, expectedHours - b.hours))
    }
    return sorted
  }, [ranking, displayType, expectedHours])

  if (!hasProject) return <Text type="secondary" className="block py-4 text-center text-sm">Configure a project in settings to see ranking</Text>
  if (ranking.length === 0) return <Text type="secondary" className="block py-4 text-center text-sm">No time entries found</Text>

  const medals = ['🥇', '🥈', '🥉']
  return (
    <>
      <h2 className="mb-3 flex items-center gap-2 border-b border-white/10 pb-2 text-sm">🏆 Leaderboard<Tag className="m-0">{displayType === 'remaining' ? 'Remaining' : 'Logged'}</Tag><Tag className="m-0 border-0">{periodLabel}</Tag></h2>
      {sortedRanking.map((user, index) => {
        const displayHours = displayType === 'remaining' ? Math.max(0, expectedHours - user.hours) : user.hours
        return (
          <div key={user.id} className={`mb-1.5 flex cursor-pointer items-center rounded-lg bg-bg-card p-2.5 transition-transform duration-200 hover:translate-x-1 ${currentUser?.id === user.id ? 'border border-accent bg-gradient-to-r from-bg-card to-accent/20' : ''}`}>
            <span className="w-8 flex-shrink-0 text-center text-[20px] leading-none">{medals[index] || index + 1}</span>
            <div className="ml-2 min-w-0 flex-1"><Text className="block truncate text-sm font-medium">{user.name}{currentUser?.id === user.id ? ' (You)' : ''}</Text></div>
            <Tag className="ranking-hours-tag ml-2 min-w-[50px] flex-shrink-0 border-0 text-center font-bold">{formatHours(displayHours)}</Tag>
          </div>
        )
      })}
    </>
  )
}

function TodayProgress({
  loggedHours = 0,
  goalHours = 6.5,
  isSyncing = false,
  onReload,
}: {
  loggedHours?: number
  goalHours?: number
  isSyncing?: boolean
  onReload?: () => void
}) {
  const percent = goalHours > 0 ? Math.min(100, (loggedHours / goalHours) * 100) : 0
  const remaining = Math.max(0, goalHours - loggedHours)
  const uid = useId().replace(/:/g, '')
  const gradId = `${uid}-grad`
  const electricGradId = `${uid}-electric-grad`
  return (
    <section className="mb-6 flex flex-col items-center rounded-2xl border border-white/10 bg-bg-secondary/50 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      <div
        className={`relative mb-4 flex h-[160px] w-[160px] items-center justify-center rounded-full outline-none transition-transform duration-200 select-none ${
          isSyncing
            ? 'today-progress-circle--syncing cursor-wait'
            : 'group cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
        }`}
        onClick={() => {
          if (!isSyncing && onReload) onReload()
        }}
        role="button"
        tabIndex={0}
        aria-busy={isSyncing}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isSyncing && onReload) {
            e.preventDefault()
            onReload()
          }
        }}
        title={isSyncing ? 'Syncing...' : "Reload today's hours"}
      >
        <svg className="pointer-events-none h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1="0" y1="50" x2="100" y2="50">
              <stop offset="0%" stopColor="var(--color-success)" />
              <stop offset="100%" stopColor="var(--color-accent-light)" />
            </linearGradient>
            <linearGradient id={electricGradId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="100">
              <stop offset="0%" stopColor="white" />
              <stop offset="50%" stopColor="var(--color-accent-light)" />
              <stop offset="100%" stopColor="var(--color-accent)" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="8" />
          {isSyncing ? (
            <>
              <g transform="rotate(-90 50 50)">
                <circle
                  className="today-progress-electric-arc"
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke={`url(#${electricGradId})`}
                  strokeWidth="8"
                  strokeLinecap="round"
                  pathLength="100"
                  strokeDasharray={percent > 0 ? `${percent} 100` : '100 100'}
                />
              </g>
              <g className="today-progress-electric-sparks">
                <circle cx="50" cy="4" r="3.5" />
                <circle cx="50" cy="96" r="2.5" />
              </g>
            </>
          ) : (
            percent > 0 && (
              <g transform="rotate(-90 50 50)">
                <circle
                  className="today-progress-arc"
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke={`url(#${gradId})`}
                  strokeWidth="8"
                  strokeLinecap="round"
                  pathLength="100"
                  strokeDasharray={`${percent} 100`}
                />
              </g>
            )
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className={`flex flex-col items-center transition-all duration-200 ${
              !isSyncing ? 'group-hover:opacity-0 group-hover:scale-90' : ''
            }`}
          >
            <span
              className={`text-3xl font-extrabold text-text-primary ${
                isSyncing ? 'today-progress-electric-text' : ''
              }`}
            >
              {loggedHours.toFixed(1)}h
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Today</span>
            {isSyncing && (
              <ThunderboltFilled className="today-progress-lightning-icon mt-1 text-sm text-accent-light" />
            )}
          </div>
          {!isSyncing && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center opacity-0 scale-75 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100">
              <SyncOutlined className="text-3xl text-accent-light" />
            </div>
          )}
        </div>
      </div>
      <div className="flex w-full justify-between gap-4 rounded-xl bg-white/5 p-3"><div className="flex flex-col"><Text className="text-[10px] uppercase tracking-wider text-slate-400">Daily Goal</Text><Text className="text-base font-bold text-slate-200">{goalHours.toFixed(1)}h</Text></div><div className="flex flex-col items-end"><Text className="text-[10px] uppercase tracking-wider text-slate-400">Remaining</Text><Text className="text-base font-bold text-accent-light">{remaining.toFixed(1)}h</Text></div></div>
    </section>
  )
}

export function OverviewView({
  currentSettings,
  currentUser,
  rankingData,
  stats,
  lastSyncedAt,
  showState,
  errorMessage,
  isSyncing,
  syncInterval,
  onRetry,
  onSync,
  onConfigure,
  onSyncIntervalChange,
}: {
  currentSettings: OverviewSettings | null
  currentUser: StatsUser | null
  rankingData: UserHours[]
  stats: Omit<Stats, 'ranking'> | null
  lastSyncedAt: number
  showState: ShowState
  errorMessage: string
  isSyncing: boolean
  syncInterval: TimelogSyncInterval
  onRetry: () => void
  onSync?: () => void
  onConfigure: () => void
  onSyncIntervalChange: (interval: TimelogSyncInterval) => void
}) {
  const [period, setPeriod] = useState<OverviewPeriod>('month')

  // Reuse the cached live stats only when personal hours are month-scoped
  // (leaderboard is always monthly).
  const liveFromCache =
    period === 'month' &&
    currentSettings?.badgeTimeScope === 'month'

  const history = useHistoryStats(liveFromCache ? null : period, currentUser)
  const isLive = period === 'month'

  const card = liveFromCache
    ? { loggedHours: stats?.loggedHours ?? 0, expectedHours: stats?.expectedHours ?? 0, remainingHours: stats?.remainingHours ?? 0 }
    : history.data
  const ranking = liveFromCache ? rankingData : (history.data?.ranking ?? [])
  const rankingExpectedHours = liveFromCache
    ? (currentSettings?.rankingExpectedHours ?? 0)
    : (history.data?.rankingExpectedHours ?? 0)

  return (
    <main className="flex flex-1 flex-col">
      {showState === 'notConfigured' && <PanelCard className="p-6 text-center"><ExclamationCircleOutlined className="mb-3 text-2xl text-warning" /><Text type="secondary" className="mb-4 block">Configure your Redmine URL and API key to start tracking time.</Text><Button type="primary" onClick={onConfigure}>Open Settings</Button></PanelCard>}
      {showState === 'needsPermission' && (
        <PanelCard className="p-6 text-center">
          <ExclamationCircleOutlined className="mb-3 text-2xl text-danger" />
          <Text type="danger" className="mb-4 block">{errorMessage}</Text>
          <Button type="primary" icon={<SettingOutlined />} onClick={onConfigure}>
            Open Settings
          </Button>
        </PanelCard>
      )}
      {showState === 'error' && (
        <PanelCard className="p-6 text-center">
          <ExclamationCircleOutlined className="mb-3 text-2xl text-danger" />
          <Text type="danger" className="mb-4 block">{errorMessage}</Text>
          <Button onClick={onRetry}>Retry</Button>
        </PanelCard>
      )}
      {showState === 'loading' && <PanelCard className="flex flex-col items-center justify-center p-10"><Spin size="large" /><Text className="mt-3">Loading...</Text></PanelCard>}
      {showState === 'main' && stats && (
        <>
          <TodayProgress
            loggedHours={stats.todayLoggedHours}
            goalHours={stats.settings?.hoursPerDay || 6.5}
            isSyncing={isSyncing}
            onReload={onSync ?? onRetry}
          />

          <section className="mb-3 flex items-center justify-between gap-2">
            <GlassSelect
              size="small"
              value={period}
              onChange={(value) => setPeriod(value as OverviewPeriod)}
              options={PERIOD_OPTIONS}
              className="glass-select--pill min-w-[150px]"
            />
            <div className="flex items-center gap-1">
              {isLive ? (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <ClockCircleOutlined />
                  Cron
                </span>
              ) : history.data ? (
                <span className="flex items-center gap-1 text-xs text-slate-400"><LockOutlined />{formatPeriodRange(history.data.from, history.data.to)}</span>
              ) : null}
              <GlassSelect
                size="small"
                value={syncInterval}
                onChange={(value) => onSyncIntervalChange(parseTimelogSyncInterval(value))}
                options={TIMELOG_SYNC_INTERVAL_OPTIONS}
                className="glass-select--pill glass-select--narrow"
                popupMatchSelectWidth={false}
                aria-label="Auto-sync interval"
              />
            </div>
          </section>

          {history.loading ? (
            <PanelCard className="flex flex-col items-center justify-center p-8"><Spin /><Text className="mt-3">Loading period…</Text></PanelCard>
          ) : history.error ? (
            <PanelCard className="p-6 text-center"><ExclamationCircleOutlined className="mb-3 text-2xl text-danger" /><Text type="danger" className="mb-4 block">Couldn't load this period.</Text><Button onClick={history.retry}>Retry</Button></PanelCard>
          ) : card ? (
            <>
              <StatsCard loggedHours={card.loggedHours} expectedHours={card.expectedHours} remainingHours={card.remainingHours} />
              <section className="rounded-lg bg-bg-secondary p-3">
                <RankingSection
                  ranking={ranking}
                  displayType={currentSettings?.rankingDisplayType ?? 'logged'}
                  expectedHours={rankingExpectedHours}
                  periodLabel={PERIOD_LABELS[period]}
                  hasProject={!!currentSettings?.projectId}
                  currentUser={currentUser}
                />
              </section>
            </>
          ) : null}

          {lastSyncedAt ? <div className="py-2 text-center"><Text type="secondary" italic className="text-xs">Last synced: {getTimeAgo(lastSyncedAt)}</Text></div> : null}
        </>
      )}
      <footer className="mt-auto border-t border-white/10 pt-3 text-center"><Text type="secondary" italic className="text-xs">You aren't lazy, you just forget to log it!</Text></footer>
    </main>
  )
}
