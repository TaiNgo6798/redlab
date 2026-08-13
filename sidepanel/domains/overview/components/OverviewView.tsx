import { Progress, Spin, Tag, Typography, Button } from 'antd'
import { ExclamationCircleOutlined, LockOutlined, SettingOutlined, SyncOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'
import { GlassSelect } from '../../../shared/components/GlassSelect'
import { PanelCard } from '../../../shared/components/PanelCard'
import { formatHours, getTimeAgo } from '../../../shared/utils/time'
import type { DisplayType, OverviewSettings, ShowState, Stats, StatsUser, UserHours } from '../../../shared/types/index'
import { useHistoryStats } from '../hooks/useHistoryStats'
import { PERIOD_OPTIONS, PERIOD_LABELS, formatPeriodRange, type OverviewPeriod } from '../consts/periods'

const { Text } = Typography

function StatsCard({ loggedHours, expectedHours, remainingHours }: { loggedHours: number; expectedHours: number; remainingHours: number }) {
  const progress = useMemo(() => expectedHours > 0 ? Math.min(100, (loggedHours / expectedHours) * 100) : 0, [expectedHours, loggedHours])
  const progressColor = useMemo(() => {
    if (progress >= 100) return '#4CAF50'
    if (progress >= 80) return { '0%': '#FFA726', '100%': '#4CAF50' }
    return { '0%': '#007990', '100%': '#FFA726' }
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
      <section className="mb-4 flex items-center gap-3"><Progress percent={progress} showInfo={false} strokeColor={progressColor} trailColor="#0f3460" size={['100%', 8]} className="flex-1" /><span className="min-w-[45px] text-right text-sm font-semibold">{Math.round(progress)}%</span></section>
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

function TodayProgress({ loggedHours = 0, goalHours = 6.5 }: { loggedHours?: number; goalHours?: number }) {
  const percent = goalHours > 0 ? Math.min(100, (loggedHours / goalHours) * 100) : 0
  const remaining = Math.max(0, goalHours - loggedHours)
  return (
    <section className="mb-6 flex flex-col items-center rounded-2xl border border-white/10 bg-bg-secondary/50 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      <div className="relative mb-4 flex items-center justify-center"><Progress type="circle" percent={percent} strokeColor={{ '0%': '#10b981', '100%': '#22C55E' }} trailColor="rgba(255,255,255,0.05)" strokeWidth={8} width={160} format={() => <div className="flex flex-col items-center"><span className="text-3xl font-extrabold text-text-primary">{loggedHours.toFixed(1)}h</span><span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Today</span></div>} /></div>
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
  onRetry,
  onSync,
  onConfigure,
}: {
  currentSettings: OverviewSettings | null
  currentUser: StatsUser | null
  rankingData: UserHours[]
  stats: Omit<Stats, 'ranking'> | null
  lastSyncedAt: number
  showState: ShowState
  errorMessage: string
  isSyncing: boolean
  onRetry: () => void
  onSync: () => void
  onConfigure: () => void
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
          <TodayProgress loggedHours={stats.todayLoggedHours} goalHours={stats.settings?.hoursPerDay || 6.5} />

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
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
                  </span>
                  LIVE
                </span>
              ) : history.data ? (
                <span className="flex items-center gap-1 text-xs text-slate-400"><LockOutlined />{formatPeriodRange(history.data.from, history.data.to)}</span>
              ) : null}
              <Button type="text" size="small" icon={<SyncOutlined spin={isSyncing} />} onClick={onSync} title="Sync" />
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
