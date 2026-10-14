import { useMemo } from 'react'
import { Modal, Tag, Button } from 'antd'
import {
  ApartmentOutlined,
  CheckCircleOutlined,
  BranchesOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import { MOCK_TICKETS } from '../mock/mockTickets'
import { TicketGroup } from '../types/index'
import { DISPLAY_GROUPS, groupTickets } from '../utils/mrChips'
import { countUniqueMrs } from '../utils/sharedMrGroups'
import { TicketGroupItems } from './TicketSyncView'

interface MockTicketsModalProps {
  open: boolean
  onClose: () => void
}

interface ModalGroupSublabel {
  text: string
  className: string
}

interface ModalGroupConfig {
  title: string
  sublabel?: ModalGroupSublabel
  icon: React.ReactNode
  titleClassName: string
  badgeClassName: string
}

const MODAL_GROUP_CONFIG: Record<TicketGroup, ModalGroupConfig> = {
  [TicketGroup.ReadyToTest]: {
    title: 'Ready to Test',
    sublabel: {
      text: 'Action required',
      className: 'border-status-merged-deep/30 bg-status-merged-deep/10 text-status-merged',
    },
    icon: <CheckCircleOutlined aria-hidden className="text-status-merged-tint text-xs" />,
    titleClassName: 'text-[11px] font-bold text-status-merged uppercase tracking-wider',
    badgeClassName: 'm-0 border border-status-merged-deep/30 bg-status-merged-deep/15 text-xs text-status-merged font-semibold rounded-full px-1.5 py-0 leading-none',
  },
  [TicketGroup.ResolvedSubtask]: {
    title: 'Resolved Sub-tasks',
    icon: <ApartmentOutlined aria-hidden className="text-status-draft-tint text-xs" />,
    titleClassName: 'text-[11px] font-bold text-status-draft uppercase tracking-wider',
    badgeClassName: 'm-0 border border-status-draft-deep/30 bg-status-draft-deep/15 text-xs text-status-draft font-semibold rounded-full px-1.5 py-0 leading-none',
  },
  [TicketGroup.Active]: {
    title: 'Active Tickets & MRs',
    icon: <BranchesOutlined aria-hidden className="text-accent-light text-xs" />,
    titleClassName: 'text-[11px] font-bold text-text-secondary uppercase tracking-wider',
    badgeClassName: 'm-0 border border-white/10 bg-white/5 text-xs text-text-secondary rounded-full px-1.5 py-0 leading-none',
  },
}

export function MockTicketsModal({ open, onClose }: MockTicketsModalProps) {
  const groupedTickets = useMemo(() => groupTickets(MOCK_TICKETS), [])

  const totalMRs = countUniqueMrs(MOCK_TICKETS)

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closeIcon={<CloseOutlined aria-hidden className="text-white/40 hover:text-white transition-colors text-xs" />}
      title={
        <div className="flex items-center gap-2 pr-3">
          <div className="h-6 w-6 rounded-lg bg-accent/20 border border-accent-light/30 flex items-center justify-center text-accent-light text-xs">
            <BranchesOutlined aria-hidden />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-white leading-tight">
              Ticket Sync Cases
            </span>
            <span className="text-xs text-text-secondary font-normal">
              Status combinations preview
            </span>
          </div>
        </div>
      }
      width="96%"
      style={{ maxWidth: 560, width: 'calc(100% - 16px)', top: 14 }}
      styles={{
        mask: {
          background: 'rgba(0, 0, 0, 0.78)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        },
        content: {
          background: 'var(--color-bg-sidebar)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 16,
          padding: '16px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        },
        header: {
          background: 'transparent',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          paddingBottom: '12px',
          marginBottom: '12px',
        },
        body: {
          maxHeight: '74vh',
          overflowY: 'auto',
          paddingRight: '4px',
        },
      }}
    >
      <div className="flex flex-col gap-4 text-xs text-text-secondary modal-scrollbar">
        {/* Dataset Counter Strip */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
            All Cases
          </span>
          <span className="text-[11px] font-mono text-text-secondary bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
            {MOCK_TICKETS.length} tickets • {totalMRs} MRs
          </span>
        </div>

        {/* Groups */}
        <div className="flex flex-col gap-4">
          {DISPLAY_GROUPS.map((group) => {
            const groupTickets = groupedTickets[group]
            if (groupTickets.length === 0) return null
            const config = MODAL_GROUP_CONFIG[group]

            return (
              <div key={group} className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-0.5">
                  <div className="flex items-center gap-1.5">
                    {config.icon}
                    <span className={config.titleClassName}>
                      {config.title}
                    </span>
                    <Tag className={config.badgeClassName}>
                      {groupTickets.length}
                    </Tag>
                  </div>
                  {config.sublabel && (
                    <Tag className={`m-0 text-xs font-medium border rounded-md px-1.5 py-0 leading-none ${config.sublabel.className}`}>
                      {config.sublabel.text}
                    </Tag>
                  )}
                </div>
                <TicketGroupItems group={group} tickets={groupTickets} />
              </div>
            )
          })}
        </div>

        {/* Modal Footer Dismiss */}
        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-end">
          <Button
            size="small"
            onClick={onClose}
            className="text-xs bg-white/5 hover:bg-white/10 border-white/10 text-text-primary px-3 h-6 rounded-lg active:scale-95 transition-all"
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
