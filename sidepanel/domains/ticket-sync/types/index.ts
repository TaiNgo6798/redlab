export type MRStatusFlag =
  | 'test_failed'
  | 'conflict'
  | 'merged'
  | 'open'
  | 'draft'
  | 'has_review'

export enum MRState {
  Merged = 'merged',
  Opened = 'opened',
  Closed = 'closed',
}

export interface ProcessedMR {
  id?: number
  iid: number
  repo: string
  url: string
  title?: string
  state: MRState | string
  has_conflicts: boolean
  has_open_review: boolean
  is_draft: boolean
  has_failed_pipeline: boolean
}

export interface TicketParent {
  id: number
  url: string
  title?: string
  status?: string
}

export interface ProcessedTicket {
  id: number | null
  title: string
  url?: string
  status?: string
  mrs: ProcessedMR[]
  parent?: TicketParent
}

export enum TicketGroup {
  ReadyToTest = 'ready_to_test',
  ResolvedSubtask = 'resolved_subtask',
  Active = 'active',
}

export enum RedmineTicketStatus {
  Resolved = 'resolved',
  Closed = 'closed',
  Rejected = 'rejected',
}

const FINISHED_STATUSES = new Set<string>([RedmineTicketStatus.Closed, RedmineTicketStatus.Rejected])

function normalizeStatus(status?: string | null): string | undefined {
  return status?.trim().toLowerCase()
}

export function isResolvedStatus(status?: string | null): boolean {
  return normalizeStatus(status) === RedmineTicketStatus.Resolved
}

export function isFinishedStatus(status?: string | null): boolean {
  return FINISHED_STATUSES.has(normalizeStatus(status) ?? '')
}
