export type TicketEvaluation = 'ready' | 'conflicts' | 'test_failed' | 'review' | 'draft' | 'open' | 'others'

export interface ProcessedMR {
  iid: number
  repo: string
  url: string
  state: string
  has_conflicts: boolean
  has_open_review: boolean
  is_draft: boolean
  has_failed_pipeline: boolean
}

export interface ProcessedTicket {
  id: number
  title: string
  url: string
  mrs: ProcessedMR[]
  /** All groups this ticket belongs to (can be more than one, e.g. conflicts + review). */
  evaluations: TicketEvaluation[]
}

export interface TicketGroup {
  key: TicketEvaluation
  label: string
  description?: string
  tickets: ProcessedTicket[]
}
