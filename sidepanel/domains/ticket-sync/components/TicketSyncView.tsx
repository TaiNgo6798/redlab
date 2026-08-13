import { Button, Spin, Tag, Typography, Progress } from 'antd'
import { ExclamationCircleOutlined, SettingOutlined, SyncOutlined } from '@ant-design/icons'
import { PanelCard } from '../../../shared/components/PanelCard'
import type { ProcessedTicket, TicketGroup, TicketEvaluation } from '../types/index'
import type { ShowState } from '../../../shared/types/index'
import {
  type MRChipStatus,
  getChipStatusForGroup,
} from '../utils/mrChips'

const { Text } = Typography

function GroupIcon({ type }: { type: TicketEvaluation }) {
  const baseClass = "w-5 h-5";
  switch (type) {
    case 'ready':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${baseClass} text-[#4CAF50]`}>
          <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'draft':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${baseClass} text-gray-400`}>
          <path d="M12 4l8 8-8 8-8-8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      );
    case 'conflicts':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${baseClass} text-danger`}>
          <path d="M12 4l6 10H6z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="12" y1="9" x2="12" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="14" r="1.5" fill="currentColor" />
        </svg>
      );
    case 'test_failed':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${baseClass} text-danger`}>
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M9 9l6 6M15 9l-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'review':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${baseClass} text-warning`}>
          <path d="M4 6h12v8h-4l-4 4v-4H4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="16" cy="6" r="2.5" fill="currentColor" />
        </svg>
      );
    case 'open':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${baseClass} text-[#00a3b8]`}>
          <path d="M8 6v12 M16 18c0-5-8-5-8-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="8" cy="6" r="2" fill="currentColor" />
          <circle cx="8" cy="18" r="2" fill="currentColor" />
          <circle cx="16" cy="18" r="2" fill="currentColor" />
        </svg>
      );
    case 'others':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`${baseClass} text-gray-400`}>
          <path d="M12 3l8 4-8 4-8-4 8-4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 11l8 4 8-4 M4 15l8 4 8-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}

const CHIP_TAG_CLASS: Record<MRChipStatus, string> = {
  failed: 'mr-tag--danger',
  conflict: 'mr-tag--conflict',
  review: 'mr-tag--warning',
  merged: 'mr-tag--merged',
  closed: 'mr-tag--closed',
  open: 'mr-tag--opened',
}

function renderMRIcon(status: MRChipStatus) {
  if (status === 'failed') {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="mr-tag__icon">
        <path fillRule="evenodd" clipRule="evenodd" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm5.28-2.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
      </svg>
    )
  }
  if (status === 'conflict') {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="mr-tag__icon">
        <path fillRule="evenodd" clipRule="evenodd" d="M8.893 1.5c-.183-.311-.52-.5-.893-.5s-.71.189-.893.5L.184 13.5c-.19.324-.195.733-.015 1.06A.996.996 0 0 0 1.042 15h13.916a.996.996 0 0 0 .873-.44c.18-.327.175-.736-.015-1.06L8.893 1.5Zm-1.893 4v4h2V5.5H7Zm1 7.5a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z"/>
      </svg>
    )
  }
  if (status === 'review') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" className="mr-tag__icon">
        <path d="M4 6h12v8h-4l-4 4v-4H4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="6" r="2.5" fill="currentColor" />
      </svg>
    )
  }
  if (status === 'merged') {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="mr-tag__icon">
        <path fillRule="evenodd" clipRule="evenodd" d="M5.5 3.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-.044 2.31a2.5 2.5 0 1 0-1.706.076v4.228a2.501 2.501 0 1 0 1.5 0V8.373a5.735 5.735 0 0 0 3.86 1.864 2.501 2.501 0 1 0 .01-1.504 4.254 4.254 0 0 1-3.664-2.922ZM11.5 10.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-6 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
      </svg>
    )
  }
  if (status === 'closed') {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="mr-tag__icon">
        <path fillRule="evenodd" clipRule="evenodd" d="M1.22 1.22a.75.75 0 0 1 1.06 0L3.5 2.44l1.22-1.22a.75.75 0 0 1 1.06 1.06L4.56 3.5l1.22 1.22a.75.75 0 0 1-1.06 1.06L3.5 4.56 2.28 5.78a.75.75 0 0 1-1.06-1.06L2.44 3.5 1.22 2.28a.75.75 0 0 1 0-1.06ZM7.5 3.5a.75.75 0 0 1 .75-.75h2.25a2.75 2.75 0 0 1 2.75 2.75v4.614a2.501 2.501 0 1 1-1.5 0V5.5c0-.69-.56-1.25-1.25-1.25H8.25a.75.75 0 0 1-.75-.75Zm5 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-8-1a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm1.5 0a2.5 2.5 0 1 1-3.25-2.386V7.75a.75.75 0 0 1 1.5 0v2.364A2.501 2.501 0 0 1 6 12.5Z" />
      </svg>
    )
  }

  // open
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="mr-tag__icon">
      <path fillRule="evenodd" clipRule="evenodd" d="M10.34 1.22a.75.75 0 0 0-1.06 0L7.53 2.97 7 3.5l.53.53 1.75 1.75a.75.75 0 1 0 1.06-1.06l-.47-.47h.63c.69 0 1.25.56 1.25 1.25v4.614a2.501 2.501 0 1 0 1.5 0V5.5a2.75 2.75 0 0 0-2.75-2.75h-.63l.47-.47a.75.75 0 0 0 0-1.06ZM13.5 12.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-9 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm1.5 0a2.5 2.5 0 1 1-3.25-2.386V5.886a2.501 2.501 0 1 1 1.5 0v4.228A2.501 2.501 0 0 1 6 12.5Zm-1.5-9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
    </svg>
  )
}

function TicketCard({ ticket, groupKey }: { ticket: ProcessedTicket; groupKey: TicketEvaluation }) {
  const sortedMRs = [...ticket.mrs].sort((a, b) => {
    const stateWeight = (state: string) => {
      if (state === 'opened') return 0;
      if (state === 'merged') return 1;
      return 2;
    };
    return stateWeight(a.state) - stateWeight(b.state);
  });

  // All MRs of the ticket, one pill each; pill prefers group-matching status when present.
  const chips = sortedMRs.map((mr) => ({
    mr,
    status: getChipStatusForGroup(mr, groupKey),
  }))

  return (
    <div className="flex flex-col gap-1.5 border-b border-white/5 px-1 py-3 last:border-b-0">
      <a
        href={ticket.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block truncate text-sm font-medium text-text-primary no-underline hover:text-accent-light hover:underline"
        title={`#${ticket.id} - ${ticket.title}`}
      >
        #{ticket.id} - {ticket.title}
      </a>
      <div className="flex flex-wrap gap-1">
        {chips.map(({ mr, status }) => (
          <a
            key={`${mr.repo}-${mr.iid}`}
            href={mr.url}
            target="_blank"
            rel="noopener noreferrer"
            title={status}
          >
            <Tag className={`mr-tag ${CHIP_TAG_CLASS[status]} cursor-pointer border-0 text-xs font-semibold`}>
              {renderMRIcon(status)}
              <span>
                {mr.repo} !{mr.iid} ({status})
              </span>
            </Tag>
          </a>
        ))}
      </div>
    </div>
  )
}

function TicketGroupCard({ group }: { group: TicketGroup }) {
  return (
    <PanelCard className="p-4">
      <div className="mb-3 flex items-start gap-2 border-b border-white/10 pb-3">
        <div className="mt-0.5">
          <GroupIcon type={group.key} />
        </div>
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2">
            <h2 className="m-0 text-sm font-semibold">{group.label}</h2>
            <Tag className="m-0 border-0 text-xs leading-[18px]">{group.tickets.length}</Tag>
          </div>
          {group.description && (
            <span className="text-[11px] text-gray-400 mt-0.5 leading-tight">{group.description}</span>
          )}
        </div>
      </div>
      <div className="flex flex-col">
        {group.tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} groupKey={group.key} />
        ))}
      </div>
    </PanelCard>
  )
}

interface TicketSyncViewProps {
  groups: TicketGroup[]
  showState: ShowState
  isSyncing: boolean
  syncProgress: number
  error: string | null
  onRefresh: () => void
  onConfigure: () => void
}

export function TicketSyncView({ groups, showState, isSyncing, syncProgress, error, onRefresh, onConfigure }: TicketSyncViewProps) {

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
          <Text className="mt-3">Syncing tickets...</Text>
        </PanelCard>
      )}

      {showState === 'main' && (
        <>
          {!isSyncing && (
            <div className="flex justify-end">
              <Button type="text" size="small" icon={<SyncOutlined />} onClick={onRefresh} title="Sync" />
            </div>
          )}
          {isSyncing && (
            <div className="mb-4 flex flex-col">
              <div className="mb-1 flex justify-between text-xs text-text-secondary">
                <span>Syncing latest tickets...</span>
                <span>{syncProgress}%</span>
              </div>
              <Progress percent={syncProgress} showInfo={false} size={['100%', 4]} strokeColor={{ '0%': '#00a3b8', '100%': '#4CAF50' }} />
            </div>
          )}
          {groups.length === 0 ? (
            <PanelCard className="p-6 text-center">
              <span className="mb-2 block text-3xl">🎉</span>
              <Text type="secondary" className="block">No resolved tickets to sync</Text>
            </PanelCard>
          ) : (
            groups.map((group) => (
              <TicketGroupCard key={group.key} group={group} />
            ))
          )}
        </>
      )}
    </main>
  )
}
