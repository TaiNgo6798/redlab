import type { ProcessedMR, TicketEvaluation } from '../types/index'
import { GROUP_CHIP_STATUS, PROBLEM_RULES } from '../../../../utils/ticketSyncRules'

export type MRChipStatus = 'failed' | 'conflict' | 'review' | 'merged' | 'closed' | 'open'

/** All problem/base statuses on an MR, severity order from PROBLEM_RULES. */
export function getMRStatuses(mr: ProcessedMR): MRChipStatus[] {
  const statuses: MRChipStatus[] = []
  for (const rule of PROBLEM_RULES) {
    if (mr[rule.flag]) statuses.push(rule.chip as MRChipStatus)
  }
  if (statuses.length > 0) return statuses
  if (mr.state === 'merged') return ['merged']
  if (mr.state === 'closed') return ['closed']
  return ['open']
}

/**
 * One pill per MR.
 * Prefer the status that matches the current group when the MR has it;
 * otherwise show the MR's own primary status.
 */
export function getChipStatusForGroup(mr: ProcessedMR, groupKey: TicketEvaluation): MRChipStatus {
  const statuses = getMRStatuses(mr)
  const groupStatus = GROUP_CHIP_STATUS[groupKey] as MRChipStatus | undefined
  if (groupStatus && statuses.includes(groupStatus)) return groupStatus
  return statuses[0]
}
