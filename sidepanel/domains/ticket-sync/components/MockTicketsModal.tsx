import { Modal, Tag, Button } from 'antd'
import { CheckCircleOutlined, BranchesOutlined, CloseOutlined } from '@ant-design/icons'
import { MOCK_TICKETS } from '../mock/mockTickets'
import { isReadyToTest } from '../utils/mrChips'
import { TicketPairCard } from './TicketSyncView'

interface MockTicketsModalProps {
  open: boolean
  onClose: () => void
}

export function MockTicketsModal({ open, onClose }: MockTicketsModalProps) {
  const readyTickets = MOCK_TICKETS.filter(isReadyToTest)
  const activeTickets = MOCK_TICKETS.filter((t) => !isReadyToTest(t))
  const totalMRs = MOCK_TICKETS.reduce((acc, t) => acc + t.mrs.length, 0)

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closeIcon={<CloseOutlined className="text-white/40 hover:text-white transition-colors text-xs" />}
      title={
        <div className="flex items-center gap-2 pr-3">
          <div className="h-6 w-6 rounded-lg bg-accent/20 border border-accent-light/30 flex items-center justify-center text-accent-light text-xs">
            <BranchesOutlined />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-white leading-tight">
              Ticket Sync Cases
            </span>
            <span className="text-[10px] text-text-secondary font-normal">
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
          border: '1px solid rgba(255, 255, 255, 0.09)',
          borderRadius: 18,
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
          {/* Ready to Test Group */}
          {readyTickets.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-0.5">
                <div className="flex items-center gap-1.5">
                  <CheckCircleOutlined className="text-emerald-400 text-xs" />
                  <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                    Ready to Test
                  </span>
                  <Tag className="m-0 border border-emerald-500/30 bg-emerald-500/15 text-[10px] text-emerald-300 font-semibold rounded-full px-1.5 py-0 leading-none">
                    {readyTickets.length}
                  </Tag>
                </div>
                <span className="text-[10px] text-text-secondary">
                  Action required
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {readyTickets.map((ticket, index) => (
                  <TicketPairCard
                    key={`modal-ready-${ticket.id || index}`}
                    ticket={ticket}
                    isReadyToTest={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Active Tickets Group */}
          {activeTickets.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 px-0.5">
                <BranchesOutlined className="text-accent-light text-xs" />
                <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  Active Tickets & MRs
                </span>
                <Tag className="m-0 border border-white/10 bg-white/5 text-[10px] text-text-secondary rounded-full px-1.5 py-0 leading-none">
                  {activeTickets.length}
                </Tag>
              </div>
              <div className="flex flex-col gap-2.5">
                {activeTickets.map((ticket, index) => (
                  <TicketPairCard
                    key={`modal-active-${ticket.id !== null ? ticket.id : index}`}
                    ticket={ticket}
                  />
                ))}
              </div>
            </div>
          )}
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
