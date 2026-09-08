export type MRStatusFlag =
  | 'test_failed'
  | 'conflict'
  | 'merged'
  | 'open'
  | 'draft'
  | 'has_review'

export type MRState = 'merged' | 'opened' | 'closed' | string

export interface ProcessedMR {
  id?: number
  iid: number
  repo: string
  url: string
  title?: string
  state: MRState
  has_conflicts: boolean
  has_open_review: boolean
  is_draft: boolean
  has_failed_pipeline: boolean
}

export interface ProcessedTicket {
  id: number | null
  title: string
  url?: string
  status?: string
  mrs: ProcessedMR[]
}

export enum TicketGroup {
  ReadyToTest = 'ready_to_test',
  ResolvedNoMr = 'resolved_no_mr',
  Active = 'active',
}

export enum RedmineTicketStatus {
  Resolved = 'resolved',
}

export function isResolvedStatus(status?: string | null): boolean {
  return status?.trim().toLowerCase() === RedmineTicketStatus.Resolved
}



