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
    <div className="flex items-center gap-2 min-w-0 px-3 py-1.5 rounded-xl bg-bg-primary/60 hover:bg-bg-primary/90 border border-white/5 hover:border-accent-light/40 text-sm transition-colors">
      <a
        href={ticket.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex min-h-6 flex-1 items-center gap-2 min-w-0 rounded no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-light"
        title={`#${ticket.id} - ${ticket.title}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-status-merged-tint shrink-0" />
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
          className="shrink-0 inline-flex min-h-6 items-center gap-1 rounded text-xs text-text-secondary hover:text-accent-light no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-light"
          title={`Open ${parentLabel(parent)}`}
        >
          · of #{parent.id}
          <ExportOutlined aria-hidden className="text-[11px]" />
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
          className="flex min-h-6 flex-1 items-center gap-2 min-w-0 rounded bg-transparent border-0 p-0 cursor-pointer text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-light"
          title={parentLabel(parent)}
        >
          <RightOutlined aria-hidden
            className={`shrink-0 text-[11px] text-text-secondary transition-transform ${expanded ? 'rotate-90' : ''}`}
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
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-secondary hover:text-accent-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-light"
          title={`Open ${parentLabel(parent)}`}
          aria-label={`Open ${parentLabel(parent)}`}
        >
          <ExportOutlined aria-hidden className="text-[11px]" />
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
