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

