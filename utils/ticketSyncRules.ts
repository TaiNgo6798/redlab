import type { ProcessedMR, TicketEvaluation } from '../sidepanel/domains/ticket-sync/types/index'

/**
 * Single source of truth for stackable problem states (eval group + pill).
 * Order = pill severity when no group match (failed > conflict > review).
 */
export const PROBLEM_RULES = [
  { flag: 'has_failed_pipeline', evaluation: 'test_failed', chip: 'failed' },
  { flag: 'has_conflicts', evaluation: 'conflicts', chip: 'conflict' },
  { flag: 'has_open_review', evaluation: 'review', chip: 'review' },
] as const satisfies ReadonlyArray<{
  flag: keyof ProcessedMR
  evaluation: TicketEvaluation
  chip: string
}>

/** evaluation key → pill status (problems + residual groups). */
export const GROUP_CHIP_STATUS: Partial<Record<TicketEvaluation, string>> = {
  conflicts: 'conflict',
  test_failed: 'failed',
  review: 'review',
  ready: 'merged',
  open: 'open',
}

/** Stable cache/notification key for multi-group tickets. */
export function ticketStateKey(evaluations: TicketEvaluation[]): string {
  return [...evaluations].sort().join(',')
}
