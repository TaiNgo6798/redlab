import { useMemo } from 'react'
import { Button, Spin, Tag, Typography, Progress } from 'antd'
import {
  ExclamationCircleOutlined,
  SettingOutlined,
  SyncOutlined,
  BranchesOutlined,
  CommentOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  CheckOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  ApartmentOutlined,
} from '@ant-design/icons'
import { PanelCard } from '../../../shared/components/PanelCard'
import { TicketGroup, type ProcessedTicket, type MRStatusFlag } from '../types/index'
import type { ShowState } from '../../../shared/types/index'
import {
  MR_STATUS_FLAG_CONFIG,
  getMRStatusFlags,
  getTicketGroup,
  groupTickets,
  isNoCodeTicket,
  DISPLAY_GROUPS,
} from '../utils/mrChips'
import { countUniqueMrs, groupBySharedMrs } from '../utils/sharedMrGroups'
import { ResolvedSubtaskList } from './ResolvedSubtaskList'

const { Text } = Typography

export const TICKET_CARD_BORDER: Partial<Record<TicketGroup, string>> = {
  [TicketGroup.ReadyToTest]: 'border-emerald-500/30',
}

interface TicketGroupSublabel {
  text: string
  className: string
}

interface TicketGroupConfig {
  title: string
  sublabel?: TicketGroupSublabel
  icon: React.ReactNode
  titleClassName: string
  badgeClassName: string
}

export const TICKET_GROUP_CONFIG: Record<TicketGroup, TicketGroupConfig> = {
  [TicketGroup.ReadyToTest]: {
    title: 'Ready to Test',
    sublabel: {
      text: 'Mark to Testable',
      className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    },
    icon: <CheckCircleOutlined className="text-emerald-400 text-sm" />,
    titleClassName: 'text-xs font-bold text-emerald-300 uppercase tracking-wider',
    badgeClassName: 'm-0 border border-emerald-500/30 bg-emerald-500/15 text-xs text-emerald-300 font-semibold rounded-full px-2',
  },
  [TicketGroup.ResolvedSubtask]: {
    title: 'Resolved Sub-tasks',
    icon: <ApartmentOutlined className="text-slate-400 text-sm" />,
    titleClassName: 'text-xs font-bold text-slate-300 uppercase tracking-wider',
    badgeClassName: 'm-0 border border-slate-500/30 bg-slate-500/15 text-xs text-slate-300 font-semibold rounded-full px-2',
  },
  [TicketGroup.Active]: {
    title: 'Active Tickets & MRs',
    icon: <BranchesOutlined className="text-accent-light text-sm" />,
    titleClassName: 'text-xs font-bold text-text-secondary uppercase tracking-wider',
    badgeClassName: 'm-0 border border-white/10 bg-white/5 text-xs text-text-secondary rounded-full px-2',
  },
}

function getTicketStatusClass(status?: string): string {
  const normalized = status?.toLowerCase() ?? ''
  if (normalized.includes('resolved') || normalized.includes('closed') || normalized.includes('done')) {
    return 'bg-emerald-400/20 text-emerald-300'
  }
  if (normalized.includes('progress') || normalized.includes('developing')) {
    return 'bg-sky-400/20 text-sky-300'
  }
  if (normalized.includes('feedback') || normalized.includes('review') || normalized.includes('testing')) {
    return 'bg-amber-400/20 text-amber-200'
  }
  if (normalized.includes('new') || normalized.includes('open')) {
    return 'bg-violet-400/20 text-violet-300'
  }
  return 'bg-slate-400/15 text-slate-300'
}

function renderStatusFlagIcon(flag: MRStatusFlag) {
  switch (flag) {
    case 'has_review':
      return <CommentOutlined className="text-[10px]" />
    case 'test_failed':
      return <CloseCircleOutlined className="text-[10px]" />
    case 'conflict':
      return <WarningOutlined className="text-[10px]" />
    case 'merged':
      return <CheckOutlined className="text-[10px]" />
    case 'draft':
      return <EditOutlined className="text-[10px]" />
    case 'open':
    default:
      return <span className="h-1.5 w-1.5 rounded-full bg-current" />
  }
}

function TicketTitleLine({ ticket }: { ticket: ProcessedTicket }) {
  const isNoTicket = !ticket.id || ticket.title === 'No ticket'
  const statusClass = getTicketStatusClass(ticket.status)

  return (
    <div className="flex items-center gap-2 min-w-0">
      {!isNoTicket ? (
        <>
          {ticket.status && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold border border-transparent leading-none shrink-0 ${statusClass}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {ticket.status}
            </span>
          )}
          {ticket.url ? (
            <a
              href={ticket.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-1.5 truncate text-sm font-medium text-text-primary no-underline flex-1 min-w-0"
              title={`#${ticket.id} - ${ticket.title}`}
            >
              <span className="font-bold text-accent-light shrink-0">#{ticket.id}</span>
              <span className="truncate group-hover:text-accent-light group-hover:underline transition-colors">
                {ticket.title}
              </span>
            </a>
          ) : (
            <div
              className="flex items-center gap-1.5 truncate text-sm font-medium text-text-primary flex-1 min-w-0"
              title={`#${ticket.id} - ${ticket.title}`}
            >
              <span className="font-bold text-accent-light shrink-0">#{ticket.id}</span>
              <span className="truncate">{ticket.title}</span>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold border border-transparent bg-slate-400/15 text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            No ticket
          </span>
          <span className="text-xs text-text-secondary italic">Untracked Merge Requests</span>
        </div>
      )}
    </div>
  )
}

export interface TicketPairCardProps {
  tickets: ProcessedTicket[]
  group?: TicketGroup
}

export function TicketPairCard({
  tickets,
  group: explicitGroup,
}: TicketPairCardProps) {
  const [ticket] = tickets
  const group = explicitGroup ?? getTicketGroup(ticket)
  const borderClass = TICKET_CARD_BORDER[group] ?? ''

  return (
    <PanelCard
      className={`p-3.5 flex flex-col gap-3 transition-all duration-200 hover:border-accent-light/40 ${borderClass}`}
    >
      <div className="flex flex-col gap-2">
        {tickets.map((linkedTicket, index) => (
          <TicketTitleLine key={linkedTicket.id ?? index} ticket={linkedTicket} />
        ))}
      </div>

      {isNoCodeTicket(ticket) ? (
        <span className="self-start inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium leading-none bg-slate-400/15 text-slate-300 border border-transparent">
          no code
        </span>
      ) : (
        <div className="flex flex-col gap-1.5">
          {ticket.mrs.map((mr) => {
            const flags = getMRStatusFlags(mr)
            return (
              <a
                key={`${mr.repo}-${mr.iid}`}
                href={mr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="no-underline group"
                title={mr.title ? `${mr.repo}!${mr.iid}: ${mr.title}` : `${mr.repo}!${mr.iid}`}
              >
                <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-bg-primary/60 hover:bg-bg-primary/90 border border-white/5 hover:border-accent-light/40 transition-all cursor-pointer">
                  {/* Left: Repo & IID */}
                  <div className="flex items-center gap-2 min-w-0">
                    <BranchesOutlined className="text-accent-light text-xs shrink-0" />
                    <span className="text-xs font-semibold text-text-primary group-hover:text-accent-light transition-colors truncate">
                      {mr.repo}
                    </span>
                    <span className="text-[11px] font-mono font-medium text-accent-light bg-accent/15 px-1.5 py-0.2 rounded shrink-0">
                      !{mr.iid}
                    </span>
                  </div>

                  {/* Right: Status Flags */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {flags.map((flag) => {
                      const config = MR_STATUS_FLAG_CONFIG[flag]
                      return (
                        <span
                          key={flag}
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium leading-none ${config.className}`}
                        >
                          {renderStatusFlagIcon(flag)}
                          <span>{config.label}</span>
                        </span>
                      )
                    })}
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      )}

      {/* Notice for Ready to Test cards */}
      {group === TicketGroup.ReadyToTest && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <CheckCircleOutlined className="text-emerald-400 shrink-0 text-xs" />
            <span className="font-medium truncate">
              Test & mark {tickets.length === 1 ? 'ticket' : 'tickets'} as Testable
            </span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {tickets.map(
              (linkedTicket) =>
                linkedTicket.url && (
                  <a
                    key={linkedTicket.id}
                    href={linkedTicket.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 font-semibold text-emerald-300 hover:text-emerald-200 hover:underline inline-flex items-center gap-1 text-[11px]"
                  >
                    <span>{tickets.length === 1 ? 'Open Ticket' : `#${linkedTicket.id}`}</span>
                    <ArrowRightOutlined className="text-[9px]" />
                  </a>
                ),
            )}
          </div>
        </div>
      )}
    </PanelCard>
  )
}

interface TicketGroupItemsProps {
  group: TicketGroup
  tickets: ProcessedTicket[]
}

export function TicketGroupItems({ group, tickets }: TicketGroupItemsProps) {
  if (group === TicketGroup.ResolvedSubtask) {
    return <ResolvedSubtaskList tickets={tickets} />
  }

  return (
    <div className="flex flex-col gap-3">
      {groupBySharedMrs(tickets).map((cardTickets, index) => (
        <TicketPairCard
          key={
            cardTickets[0].id !== null
              ? cardTickets.map((ticket) => ticket.id).join('-')
              : `no-ticket-${cardTickets[0].mrs[0]?.url || index}`
          }
          tickets={cardTickets}
          group={group}
        />
      ))}
    </div>
  )
}

interface TicketSyncViewProps {
  tickets: ProcessedTicket[]
  showState: ShowState
  isSyncing: boolean
  syncProgress: number
  error: string | null
  onRefresh: () => void
  onConfigure: () => void
}

export function TicketSyncView({
  tickets,
  showState,
  isSyncing,
  syncProgress,
  error,
  onRefresh,
  onConfigure,
}: TicketSyncViewProps) {
  const totalMRs = countUniqueMrs(tickets)
  const groupedTickets = useMemo(() => groupTickets(tickets), [tickets])

  const hasSpecialGroup =
    groupedTickets[TicketGroup.ReadyToTest].length > 0 ||
    groupedTickets[TicketGroup.ResolvedSubtask].length > 0

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 fade-in">
      {showState === 'notConfigured' && (
        <PanelCard className="p-6 text-center">
          <ExclamationCircleOutlined className="mb-3 text-2xl text-warning" />
          <Text type="secondary" className="mb-4 block">
            Configure your Redmine and GitLab credentials in Settings to use Ticket Sync.
          </Text>
          <Button type="primary" icon={<SettingOutlined />} onClick={onConfigure}>
            Open Settings
          </Button>
        </PanelCard>
      )}

      {showState === 'needsPermission' && (
        <PanelCard className="p-6 text-center">
          <ExclamationCircleOutlined className="mb-3 text-2xl text-danger" />
          <Text type="danger" className="mb-4 block">
            {error}
          </Text>
          <Button type="primary" icon={<SettingOutlined />} onClick={onConfigure}>
            Open Settings
          </Button>
        </PanelCard>
      )}

      {showState === 'error' && (
        <PanelCard className="p-6 text-center">
          <ExclamationCircleOutlined className="mb-3 text-2xl text-danger" />
          <Text type="danger" className="mb-4 block">
            {error}
          </Text>
          <Button onClick={onRefresh}>Retry</Button>
        </PanelCard>
      )}

      {showState === 'loading' && (
        <PanelCard className="flex flex-col items-center justify-center p-10">
          <Spin size="large" />
          <Text className="mt-3 text-text-secondary">Syncing tickets & MRs...</Text>
        </PanelCard>
      )}

      {showState === 'main' && (
        <>
          {/* Header Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Sync Overview
              </span>
              <Tag className="m-0 border border-white/10 bg-white/5 text-xs text-text-secondary rounded-full px-2">
                {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'} • {totalMRs} MRs
              </Tag>
            </div>
            {!isSyncing && (
              <Button
                type="text"
                size="small"
                icon={<SyncOutlined className="text-text-secondary hover:text-accent-light" />}
                onClick={onRefresh}
                title="Refresh Tickets"
              />
            )}
          </div>

          {/* Sync Progress */}
          {isSyncing && (
            <PanelCard className="flex flex-col gap-1.5 p-3">
              <div className="flex justify-between text-xs text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <SyncOutlined spin className="text-accent-light" />
                  Syncing latest MRs & tickets...
                </span>
                <span className="font-mono">{syncProgress}%</span>
              </div>
              <Progress
                percent={syncProgress}
                showInfo={false}
                size={['100%', 4]}
                strokeColor={{ from: 'var(--color-accent-light)', to: 'var(--color-success)' }}
              />
            </PanelCard>
          )}

          {/* Ticket List */}
          {tickets.length === 0 ? (
            <PanelCard className="p-8 text-center flex flex-col items-center justify-center gap-2">
              <span className="text-3xl mb-1">🎉</span>
              <span className="text-base font-semibold text-text-primary">All Caught Up</span>
              <Text type="secondary" className="block text-xs max-w-[240px]">
                No active merge requests or pending tickets found on your account.
              </Text>
            </PanelCard>
          ) : (
            <div className="flex flex-col gap-5">
              {DISPLAY_GROUPS.map((group) => {
                const groupTickets = groupedTickets[group]
                if (groupTickets.length === 0) return null

                const showHeader = group !== TicketGroup.Active || hasSpecialGroup
                const config = TICKET_GROUP_CONFIG[group]

                return (
                  <div key={group} className="flex flex-col gap-2.5">
                    {showHeader && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {config.icon}
                          <span className={config.titleClassName}>
                            {config.title}
                          </span>
                          <Tag className={config.badgeClassName}>
                            {groupTickets.length}
                          </Tag>
                        </div>
                        {config.sublabel && (
                          <Tag
                            className={`m-0 text-[11px] font-medium border rounded-md px-1.5 py-0 leading-none ${config.sublabel.className}`}
                          >
                            {config.sublabel.text}
                          </Tag>
                        )}
                      </div>
                    )}
                    <TicketGroupItems group={group} tickets={groupTickets} />
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </main>
  )
}
