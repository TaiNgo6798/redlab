import {
  MRState,
  TicketGroup,
  isResolvedStatus,
  type ProcessedMR,
  type ProcessedTicket,
  type MRStatusFlag,
} from '../types/index'

export interface MRStatusFlagConfig {
  label: string
  className: string
}

export const MR_STATUS_FLAG_CONFIG: Record<MRStatusFlag, MRStatusFlagConfig> = {
  open: {
    label: 'open',
    className: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  },
  merged: {
    label: 'merged',
    className: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
  },
  draft: {
    label: 'draft',
    className: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  },
  has_review: {
    label: 'has review',
    className: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  },
  test_failed: {
    label: 'test failed',
    className: 'bg-red-500/20 text-red-400 border border-red-500/30',
  },
  conflict: {
    label: 'conflict',
    className: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
  },
}

/**
 * Returns status flags for an MR.
 * Detected flags (has review, test failed, conflict) take precedence over raw MR flags (open, merged, draft).
 */
export function getMRStatusFlags(mr: ProcessedMR): MRStatusFlag[] {
  const flags: MRStatusFlag[] = []

  if (mr.is_draft) {
    flags.push('draft')
  }
  if (mr.has_open_review) {
    flags.push('has_review')
  }
  if (mr.has_failed_pipeline) {
    flags.push('test_failed')
  }
  if (mr.has_conflicts) {
    flags.push('conflict')
  }

  if (flags.length > 0) {
    return flags
  }

  if (mr.state === MRState.Merged) {
    return ['merged']
  }

  return ['open']
}

/**
 * Classify a ticket into its sync display group.
 */
export function getTicketGroup(ticket: ProcessedTicket): TicketGroup {
  if (!ticket.id || !isResolvedStatus(ticket.status)) {
    return TicketGroup.Active
  }
  if (ticket.mrs.length === 0) {
    return ticket.parent ? TicketGroup.ResolvedSubtask : TicketGroup.ReadyToTest
  }
  return ticket.mrs.every((mr) => mr.state === MRState.Merged) ? TicketGroup.ReadyToTest : TicketGroup.Active
}

export function isReadyToTest(ticket: ProcessedTicket): boolean {
  return getTicketGroup(ticket) === TicketGroup.ReadyToTest
}

export function isResolvedSubtask(ticket: ProcessedTicket): boolean {
  return getTicketGroup(ticket) === TicketGroup.ResolvedSubtask
}

export function isNoCodeTicket(ticket: ProcessedTicket): boolean {
  return ticket.mrs.length === 0 && isReadyToTest(ticket)
}

export const DISPLAY_GROUPS: TicketGroup[] = [
  TicketGroup.ReadyToTest,
  TicketGroup.Active,
  TicketGroup.ResolvedSubtask,
]

/**
 * Group tickets by their sync display group.
 */
export function groupTickets(tickets: ProcessedTicket[]): Record<TicketGroup, ProcessedTicket[]> {
  const map: Record<TicketGroup, ProcessedTicket[]> = {
    [TicketGroup.ReadyToTest]: [],
    [TicketGroup.ResolvedSubtask]: [],
    [TicketGroup.Active]: [],
  }
  for (const ticket of tickets) {
    map[getTicketGroup(ticket)].push(ticket)
  }
  return map
}
