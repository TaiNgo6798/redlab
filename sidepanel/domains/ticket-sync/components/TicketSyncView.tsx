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
  [TicketGroup.ReadyToTest]: 'border-status-merged-deep/30',
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
      className: 'border-status-merged-deep/30 bg-status-merged-deep/10 text-status-merged',
    },
    icon: <CheckCircleOutlined aria-hidden className="text-status-merged-tint text-sm" />,
    titleClassName: 'm-0 text-xs font-bold text-status-merged uppercase tracking-wider',
    badgeClassName: 'm-0 border border-status-merged-deep/30 bg-status-merged-deep/15 text-xs text-status-merged font-semibold rounded-full px-2',
  },
  [TicketGroup.ResolvedSubtask]: {
    title: 'Resolved Sub-tasks',
    icon: <ApartmentOutlined aria-hidden className="text-status-draft-tint text-sm" />,
    titleClassName: 'm-0 text-xs font-bold text-status-draft uppercase tracking-wider',
    badgeClassName: 'm-0 border border-status-draft-deep/30 bg-status-draft-deep/15 text-xs text-status-draft font-semibold rounded-full px-2',
  },
  [TicketGroup.Active]: {
    title: 'Active Tickets & MRs',
    icon: <BranchesOutlined aria-hidden className="text-accent-light text-sm" />,
    titleClassName: 'm-0 text-xs font-bold text-text-secondary uppercase tracking-wider',
    badgeClassName: 'm-0 border border-white/10 bg-white/5 text-xs text-text-secondary rounded-full px-2',
  },
}

function getTicketStatusClass(status?: string): string {
  const normalized = status?.toLowerCase() ?? ''
  if (normalized.includes('resolved') || normalized.includes('closed') || normalized.includes('done')) {
    return 'bg-status-merged-tint/20 text-status-merged'
  }
  if (normalized.includes('progress') || normalized.includes('developing')) {
    return 'bg-status-open-tint/20 text-status-open'
  }
  if (normalized.includes('feedback') || normalized.includes('review') || normalized.includes('testing')) {
    return 'bg-status-review-tint/20 text-status-review'
  }
  if (normalized.includes('new') || normalized.includes('open')) {
    return 'bg-status-new-tint/20 text-status-new'
  }
  return 'bg-status-draft-tint/15 text-status-draft'
}

function renderStatusFlagIcon(flag: MRStatusFlag) {
  switch (flag) {
    case 'has_review':
      return <CommentOutlined aria-hidden className="text-[11px]" />
    case 'test_failed':
      return <CloseCircleOutlined aria-hidden className="text-[11px]" />
    case 'conflict':
      return <WarningOutlined aria-hidden className="text-[11px]" />
    case 'merged':
      return <CheckOutlined aria-hidden className="text-[11px]" />
    case 'draft':
      return <EditOutlined aria-hidden className="text-[11px]" />
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
              className="group flex min-h-6 items-center gap-1.5 truncate rounded text-sm font-medium text-text-primary no-underline flex-1 min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-light"
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
          <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold border border-transparent bg-status-draft-tint/15 text-status-draft">
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
      className={`p-3.5 flex flex-col gap-3 transition-colors duration-200 hover:border-accent-light/40 ${borderClass}`}
    >
      <div className="flex flex-col gap-2">
        {tickets.map((linkedTicket, index) => (
          <TicketTitleLine key={linkedTicket.id ?? index} ticket={linkedTicket} />
        ))}
      </div>

      {isNoCodeTicket(ticket) ? (
        <span className="self-start inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium leading-none bg-status-draft-tint/15 text-status-draft border border-transparent">
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
                className="no-underline group block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-light"
                title={mr.title ? `${mr.repo}!${mr.iid}: ${mr.title}` : `${mr.repo}!${mr.iid}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 px-3 py-1.5 rounded-xl bg-bg-primary/60 hover:bg-bg-primary/90 border border-white/5 hover:border-accent-light/40 transition-colors cursor-pointer">
                  {/* Left: Repo & IID */}
                  <div className="flex min-h-6 flex-1 basis-28 items-center gap-2 min-w-0">
                    <BranchesOutlined aria-hidden className="text-accent-light text-xs shrink-0" />
                    <span className="text-xs font-semibold text-text-primary group-hover:text-accent-light transition-colors truncate">
                      {mr.repo}
                    </span>
                    <span className="text-[11px] font-mono font-medium text-accent-light bg-accent/15 px-1.5 py-0.2 rounded shrink-0">
                      !{mr.iid}
                    </span>
                  </div>

                  {/* Right: Status Flags */}
                  <div className="ml-auto flex items-center gap-1.5 flex-wrap justify-end">
                    {flags.map((flag) => {
                      const config = MR_STATUS_FLAG_CONFIG[flag]
                      return (
                        <span
                          key={flag}
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium leading-none ${config.className}`}
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
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-status-merged-deep/10 border border-status-merged-deep/25 text-status-merged text-xs">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <CheckCircleOutlined aria-hidden className="text-status-merged-tint shrink-0 text-xs" />
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
                    className="shrink-0 min-h-6 rounded font-semibold text-status-merged hover:text-status-review hover:underline inline-flex items-center gap-1 text-[11px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-light"
                  >
                    <span>{tickets.length === 1 ? 'Open Ticket' : `#${linkedTicket.id}`}</span>
                    <ArrowRightOutlined aria-hidden className="text-[11px]" />
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
          <ExclamationCircleOutlined aria-hidden className="mb-3 text-2xl text-warning" />
          <Text type="secondary" className="mb-4 block">
            Configure your Redmine and GitLab credentials in Settings to use Ticket Sync.
          </Text>
          <Button type="primary" icon={<SettingOutlined aria-hidden />} onClick={onConfigure}>
            Open Settings
          </Button>
        </PanelCard>
      )}

      {showState === 'needsPermission' && (
        <PanelCard className="p-6 text-center">
          <ExclamationCircleOutlined aria-hidden className="mb-3 text-2xl text-danger" />
          <Text type="danger" className="mb-4 block">
            {error}
          </Text>
          <Button type="primary" icon={<SettingOutlined aria-hidden />} onClick={onConfigure}>
            Open Settings
          </Button>
        </PanelCard>
      )}

      {showState === 'error' && (
        <PanelCard className="p-6 text-center">
          <ExclamationCircleOutlined aria-hidden className="mb-3 text-2xl text-danger" />
          <span className="mb-1 block text-base font-semibold text-text-primary">Couldn't sync tickets</span>
          <Text type="danger" className="mb-4 block text-xs break-words">
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
                icon={<SyncOutlined aria-hidden className="text-text-secondary hover:text-accent-light" />}
                onClick={onRefresh}
                title="Refresh Tickets"
                aria-label="Refresh tickets"
              />
            )}
          </div>

          {error && !isSyncing && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-xl border border-status-review-tint/25 bg-status-review-tint/10 px-3 py-2 text-xs text-status-review"
            >
              <WarningOutlined aria-hidden className="mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">
                Last refresh failed{tickets.length > 0 ? ', showing cached tickets' : ''}. {error}
              </span>
            </div>
          )}

          {/* Sync Progress */}
          {isSyncing && (
            <PanelCard className="flex flex-col gap-1.5 p-3">
              <div className="flex justify-between text-xs text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <SyncOutlined aria-hidden spin className="text-accent-light" />
                  Syncing latest MRs & tickets...
                </span>
                <span className="font-mono">{syncProgress}%</span>
              </div>
              <Progress
                percent={syncProgress}
                showInfo={false}
                size={['100%', 4]}
                strokeColor="var(--color-accent-light)"
              />
            </PanelCard>
          )}

          {/* Ticket List */}
          {tickets.length === 0 ? (
            <PanelCard className="p-8 text-center flex flex-col items-center justify-center gap-2">
              <CheckCircleOutlined aria-hidden className="mb-1 text-3xl text-status-merged-tint" />
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
                          <h2 className={config.titleClassName}>
                            {config.title}
                          </h2>
                          <Tag className={config.badgeClassName}>
                            {groupTickets.length}
                          </Tag>
                        </div>
                        {config.sublabel && (
                          <Tag
                            className={`m-0 text-[11px] font-medium border rounded-md px-2 py-0.5 leading-none ${config.sublabel.className}`}
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
