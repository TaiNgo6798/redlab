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
    className: 'bg-status-open-tint/20 text-status-open border border-transparent',
  },
  merged: {
    label: 'merged',
    className: 'bg-status-merged-tint/20 text-status-merged border border-transparent',
  },
  draft: {
    label: 'draft',
    className: 'bg-status-draft-tint/15 text-status-draft border border-transparent',
  },
  has_review: {
    label: 'has review',
    className: 'bg-status-review-tint/20 text-status-review border border-transparent',
  },
  test_failed: {
    label: 'test failed',
    className: 'bg-status-failed-tint/20 text-status-failed border border-transparent',
  },
  conflict: {
    label: 'conflict',
    className: 'bg-status-failed-tint/20 text-status-failed border border-transparent',
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
