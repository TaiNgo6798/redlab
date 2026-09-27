import { useMemo, useState } from 'react'
import { Tag } from 'antd'
import { ExportOutlined, RightOutlined } from '@ant-design/icons'
import { PanelCard } from '../../../shared/components/PanelCard'
import type { ProcessedTicket, TicketParent } from '../types/index'
import { groupByParent, type SubtaskGroup } from '../utils/subtaskGroups'

function parentLabel(parent: TicketParent): string {
  return parent.title ? `#${parent.id} ${parent.title}` : `#${parent.id}`
}

interface SubtaskLineProps {
  ticket: ProcessedTicket
  parent?: TicketParent
}

function SubtaskLine({ ticket, parent }: SubtaskLineProps) {
  return (
    <div className="flex items-center gap-2 min-w-0 px-3 py-1.5 rounded-xl bg-bg-primary/60 hover:bg-bg-primary/90 border border-white/5 hover:border-accent-light/40 text-sm transition-all">
      <a
        href={ticket.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-1 items-center gap-2 min-w-0 no-underline"
        title={`#${ticket.id} - ${ticket.title}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
        <span className="font-bold text-accent-light shrink-0">#{ticket.id}</span>
        <span className="truncate text-text-primary group-hover:text-accent-light transition-colors">
          {ticket.title}
        </span>
      </a>
      {parent && (
        <a
          href={parent.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1 text-xs text-text-secondary hover:text-accent-light no-underline"
          title={`Open ${parentLabel(parent)}`}
        >
          · of #{parent.id}
          <ExportOutlined className="text-[10px]" />
        </a>
      )}
    </div>
  )
}

function SubtaskGroupCard({ parent, subtasks }: SubtaskGroup) {
  const [expanded, setExpanded] = useState(false)

  return (
    <PanelCard className="p-2 flex flex-col gap-1.5">
      <div className="flex items-center gap-2 min-w-0 px-1">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="flex flex-1 items-center gap-2 min-w-0 bg-transparent border-0 p-0 cursor-pointer text-left text-sm"
          title={parentLabel(parent)}
        >
          <RightOutlined
            className={`shrink-0 text-[10px] text-text-secondary transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
          <span className="font-bold text-accent-light shrink-0">#{parent.id}</span>
          {parent.title && <span className="truncate text-text-primary">{parent.title}</span>}
          {parent.status && <span className="shrink-0 text-xs text-text-secondary">· {parent.status}</span>}
          <Tag className="m-0 ml-auto shrink-0 border border-white/10 bg-white/5 text-[11px] text-text-secondary rounded-full px-2">
            {subtasks.length} sub-tasks resolved
          </Tag>
        </button>
        <a
          href={parent.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-text-secondary hover:text-accent-light"
          title={`Open ${parentLabel(parent)}`}
        >
          <ExportOutlined className="text-[10px]" />
        </a>
      </div>
      {expanded &&
        subtasks.map((ticket) => <SubtaskLine key={ticket.id} ticket={ticket} />)}
    </PanelCard>
  )
}

export function ResolvedSubtaskList({ tickets }: { tickets: ProcessedTicket[] }) {
  const groups = useMemo(() => groupByParent(tickets), [tickets])

  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) =>
        group.subtasks.length === 1 ? (
          <SubtaskLine key={group.parent.id} ticket={group.subtasks[0]} parent={group.parent} />
        ) : (
          <SubtaskGroupCard key={group.parent.id} {...group} />
        ),
      )}
    </div>
  )
}
