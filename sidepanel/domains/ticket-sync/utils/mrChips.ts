import type { ProcessedMR, ProcessedTicket, MRStatusFlag } from '../types/index'

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

  if (mr.state === 'merged') {
    return ['merged']
  }

  return ['open']
}

/**
 * Check if a ticket is resolved and all of its associated MRs are merged.
 */
export function isReadyToTest(ticket: ProcessedTicket): boolean {
  if (!ticket.id || !ticket.status || ticket.mrs.length === 0) {
    return false
  }
  return (
    ticket.status.trim().toLowerCase() === 'resolved' &&
    ticket.mrs.every((mr) => mr.state === 'merged')
  )
}


