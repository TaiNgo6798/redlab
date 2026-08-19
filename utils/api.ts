// API utilities for RedLab

// ============== Types ==============

export type TimeScope = 'today' | 'week' | 'month' | 'lastMonth' | 'last3Months' | 'last6Months' | 'lastYear'
export type DisplayType = 'logged' | 'remaining'

export interface DateRange {
  from: string
  to: string
}

export interface RedmineUser {
  id: number
  login: string
  name: string
}

export interface RedmineProject {
  id: number
  name: string
}

export interface RedmineTimeEntry {
  id: number
  hours: number
  spent_on: string
  user: RedmineUser
  project: RedmineProject
}

export interface UserHours {
  id: number
  name: string
  hours: number
}

// ============== GitLab Types ==============

export interface GitlabUser {
  id: number
  username: string
  name: string
}

export interface GitlabMR {
  id: number
  iid: number
  title: string
  web_url: string
  state: 'merged' | 'opened' | 'closed'
  project_id: number
  has_conflicts: boolean
  draft?: boolean
  head_pipeline?: {
    id: number
    status: string
  }
}

export interface ResolvedTicket {
  id: number
  title: string
  url: string
}

interface RedmineIssueStatus {
  id: number
  name: string
}

interface RedmineResolvedIssue {
  id: number
  subject: string
  status: RedmineIssueStatus
}

interface GitlabDiscussionNote {
  system: boolean
  resolvable: boolean
  resolved: boolean
  author: { id: number }
  created_at: string
  body: string
}

interface GitlabDiscussion {
  notes: GitlabDiscussionNote[]
}

// ============== Date Utilities ==============

export function getDateRange(scope: TimeScope): DateRange {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const date = today.getDate()
  const day = today.getDay()

  let from: Date
  let to: Date

  switch (scope) {
    case 'today':
      from = to = today
      break
    case 'week': {
      const monday = new Date(today)
      const diff = day === 0 ? -6 : 1 - day
      monday.setDate(date + diff)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      from = monday
      to = sunday
      break
    }
    case 'lastMonth':
      from = new Date(year, month - 1, 1)
      to = new Date(year, month, 0)
      break
    case 'last3Months':
      from = new Date(year, month - 3, 1)
      to = new Date(year, month, 0)
      break
    case 'last6Months':
      from = new Date(year, month - 6, 1)
      to = new Date(year, month, 0)
      break
    case 'lastYear':
      from = new Date(year - 1, 0, 1)
      to = new Date(year - 1, 11, 31)
      break
    case 'month':
    default:
      from = new Date(year, month, 1)
      to = new Date(year, month + 1, 0)
      break
  }

  return { from: formatDate(from), to: formatDate(to) }
}

export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getWorkingDays(fromStr: string, toStr: string): number {
  const from = new Date(fromStr)
  const to = new Date(toStr)
  let count = 0
  const current = new Date(from)

  while (current <= to) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}

// ============== API Functions ==============

const isBackground =
  typeof window === 'undefined' &&
  typeof self !== 'undefined' &&
  self.constructor.name === 'ServiceWorkerGlobalScope'

async function apiCall<T>(action: string, args: any[]): Promise<T> {
  if (isBackground) {
    throw new Error('apiCall should not be called from background')
  }

  const response = await chrome.runtime.sendMessage({
    type: 'API_REQUEST',
    action,
    args,
  }) as any

  if (response && response.error) {
    throw new Error(response.error)
  }

  return response as T
}

/** Always hit the network — never the browser HTTP cache. */
function freshFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  return fetch(input, { ...init, cache: 'no-store' })
}

function redmineHeaders(apiKey: string): HeadersInit {
  return {
    'X-Redmine-API-Key': apiKey,
    'Content-Type': 'application/json',
  }
}

/** Paginate a Redmine collection endpoint (`?limit=&offset=`). */
async function fetchAllPages<T>(
  baseUrl: string,
  collectionKey: string,
  headers: HeadersInit,
  errorLabel: string,
): Promise<T[]> {
  const items: T[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const joiner = baseUrl.includes('?') ? '&' : '?'
    const response = await freshFetch(`${baseUrl}${joiner}limit=${limit}&offset=${offset}`, { headers })
    if (!response.ok) {
      throw new Error(`Failed to fetch ${errorLabel}: ${response.status}`)
    }

    const data = (await response.json()) as Record<string, T[]>
    const page = data[collectionKey] || []
    items.push(...page)

    if (page.length < limit) return items
    offset += limit
  }
}

export async function getCurrentUser(
  redmineUrl: string,
  redmineApiKey: string,
): Promise<RedmineUser> {
  if (!isBackground) return apiCall<RedmineUser>('getCurrentUser', [redmineUrl, redmineApiKey])

  const response = await freshFetch(`${redmineUrl}/users/current.json`, {
    headers: redmineHeaders(redmineApiKey),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status}`)
  }

  const data = (await response.json()) as { user: RedmineUser }
  return data.user
}

export async function getTimeEntries(
  redmineUrl: string,
  redmineApiKey: string,
  userId: number,
  scope: TimeScope,
): Promise<RedmineTimeEntry[]> {
  if (!isBackground) {
    return apiCall<RedmineTimeEntry[]>('getTimeEntries', [redmineUrl, redmineApiKey, userId, scope])
  }

  const { from, to } = getDateRange(scope)
  return fetchAllPages<RedmineTimeEntry>(
    `${redmineUrl}/time_entries.json?user_id=${userId}&from=${from}&to=${to}`,
    'time_entries',
    redmineHeaders(redmineApiKey),
    'time entries',
  )
}

export function calculateTotalHours(entries: RedmineTimeEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.hours, 0)
}

export async function getProjects(
  redmineUrl: string,
  redmineApiKey: string,
): Promise<RedmineProject[]> {
  if (!isBackground) return apiCall<RedmineProject[]>('getProjects', [redmineUrl, redmineApiKey])

  return fetchAllPages<RedmineProject>(
    `${redmineUrl}/projects.json`,
    'projects',
    redmineHeaders(redmineApiKey),
    'projects',
  )
}

export async function getMembersTimeEntries(
  redmineUrl: string,
  redmineApiKey: string,
  projectId: string | number,
  scope: TimeScope,
): Promise<RedmineTimeEntry[]> {
  if (!isBackground) {
    return apiCall<RedmineTimeEntry[]>('getMembersTimeEntries', [redmineUrl, redmineApiKey, projectId, scope])
  }

  const { from, to } = getDateRange(scope)
  return fetchAllPages<RedmineTimeEntry>(
    `${redmineUrl}/time_entries.json?project_id=${projectId}&from=${from}&to=${to}`,
    'time_entries',
    redmineHeaders(redmineApiKey),
    'project time entries',
  )
}

export function buildRanking(entries: RedmineTimeEntry[]): UserHours[] {
  const userHours: Record<number, UserHours> = {}

  for (const entry of entries) {
    const userId = entry.user.id
    if (!userHours[userId]) {
      userHours[userId] = { id: userId, name: entry.user.name, hours: 0 }
    }
    userHours[userId].hours += entry.hours
  }

  return Object.values(userHours).sort((a, b) => b.hours - a.hours)
}

// ============== GitLab API Functions ==============

export async function getResolvedTickets(
  redmineUrl: string,
  redmineApiKey: string,
): Promise<ResolvedTicket[]> {
  if (!isBackground) return apiCall<ResolvedTicket[]>('getResolvedTickets', [redmineUrl, redmineApiKey])

  const response = await freshFetch(
    `${redmineUrl}/issues.json?assigned_to_id=me&status_id=*&limit=100`,
    { headers: redmineHeaders(redmineApiKey) },
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch issues: ${response.status}`)
  }

  const data = (await response.json()) as { issues: RedmineResolvedIssue[] }
  const resolved = (data.issues || []).filter(
    (i) => i.status && i.status.name.toLowerCase() === 'resolved',
  )

  return resolved.map((i) => ({
    id: i.id,
    title: i.subject,
    url: `${redmineUrl}/issues/${i.id}`,
  }))
}

export async function getGitlabUser(
  gitlabUrl: string,
  gitlabToken: string,
): Promise<GitlabUser> {
  if (!isBackground) return apiCall<GitlabUser>('getGitlabUser', [gitlabUrl, gitlabToken])

  const response = await freshFetch(`${gitlabUrl}/api/v4/user`, {
    headers: { 'PRIVATE-TOKEN': gitlabToken },
  })

  if (!response.ok) {
    throw new Error(`GitLab API error /user: ${response.status}`)
  }

  return (await response.json()) as GitlabUser
}

export async function searchGitlabMRs(
  gitlabUrl: string,
  gitlabToken: string,
  ticketId: number,
): Promise<GitlabMR[]> {
  if (!isBackground) return apiCall<GitlabMR[]>('searchGitlabMRs', [gitlabUrl, gitlabToken, ticketId])

  // with_merge_status_recheck: list endpoint often leaves merge_status unchecked,
  // which forces has_conflicts to false even when the MR has real conflicts.
  const response = await freshFetch(
    `${gitlabUrl}/api/v4/merge_requests?search=${ticketId}&state=all&scope=all&per_page=100&with_merge_status_recheck=true`,
    { headers: { 'PRIVATE-TOKEN': gitlabToken } },
  )

  if (!response.ok) return []
  const mrs = ((await response.json()) as GitlabMR[]) || []
  const ticketRegex = new RegExp(`\\b${ticketId}\\b`)

  return mrs.filter((mr) => mr.title && ticketRegex.test(mr.title) && mr.state !== 'closed')
}

/** Single-MR fetch — more reliable has_conflicts than the list endpoint. */
export async function getGitlabMR(
  gitlabUrl: string,
  gitlabToken: string,
  projectId: number,
  mrIid: number,
): Promise<GitlabMR | null> {
  if (!isBackground) return apiCall<GitlabMR | null>('getGitlabMR', [gitlabUrl, gitlabToken, projectId, mrIid])

  const response = await freshFetch(
    `${gitlabUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}`,
    { headers: { 'PRIVATE-TOKEN': gitlabToken } },
  )

  if (!response.ok) return null
  return (await response.json()) as GitlabMR
}

/**
 * Latest pipeline status for an MR (newest first).
 * Prefer this over head_pipeline on list/detail — that field is often missing.
 */
export async function getMRLatestPipelineStatus(
  gitlabUrl: string,
  gitlabToken: string,
  projectId: number,
  mrIid: number,
): Promise<string | null> {
  if (!isBackground) {
    return apiCall<string | null>('getMRLatestPipelineStatus', [gitlabUrl, gitlabToken, projectId, mrIid])
  }

  const response = await freshFetch(
    `${gitlabUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/pipelines?per_page=1`,
    { headers: { 'PRIVATE-TOKEN': gitlabToken } },
  )

  if (!response.ok) return null
  const pipelines = (await response.json()) as { status?: string }[]
  return pipelines[0]?.status ?? null
}

/** Unanswered review. Approved MRs are done — ignore leftover comments. */
export function hasOpenReview(
  discussions: GitlabDiscussion[],
  currentUserId: number,
  approved = false,
): boolean {
  if (approved) return false

  let latestReviewerCommentTime = 0
  let latestAuthorActivityTime = 0

  for (const discussion of discussions) {
    const notes = discussion.notes || []
    if (notes.length === 0) continue

    if (!notes[0].system && notes[0].resolvable && !notes[0].resolved) {
      const lastNote = notes[notes.length - 1]
      if (lastNote.author.id !== currentUserId) {
        return true
      }
    }

    for (const note of notes) {
      if (!note.created_at) continue
      const noteTime = new Date(note.created_at).getTime()

      if (!note.system && note.author.id !== currentUserId && noteTime > latestReviewerCommentTime) {
        latestReviewerCommentTime = noteTime
      }
      if (note.author.id === currentUserId && !note.system && noteTime > latestAuthorActivityTime) {
        latestAuthorActivityTime = noteTime
      }
    }
  }

  return latestReviewerCommentTime > latestAuthorActivityTime
}

export async function checkMRDiscussions(
  gitlabUrl: string,
  gitlabToken: string,
  projectId: number,
  mrIid: number,
  currentUserId: number,
): Promise<boolean> {
  if (!isBackground) {
    return apiCall<boolean>('checkMRDiscussions', [gitlabUrl, gitlabToken, projectId, mrIid, currentUserId])
  }

  const headers = { 'PRIVATE-TOKEN': gitlabToken }
  const [response, approvalsRes] = await Promise.all([
    freshFetch(
      `${gitlabUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/discussions?per_page=100`,
      { headers },
    ),
    freshFetch(
      `${gitlabUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/approvals`,
      { headers },
    ),
  ])

  if (!response.ok) return false

  let approved = false
  if (approvalsRes.ok) {
    const approvals = (await approvalsRes.json()) as { approved?: boolean }
    approved = Boolean(approvals.approved)
  }

  const discussions = ((await response.json()) as GitlabDiscussion[]) || []
  return hasOpenReview(discussions, currentUserId, approved)
}

export interface RedmineIssue {
  id: number
  subject: string
  status: {
    id: number
    name: string
  }
}

export async function getRedmineIssue(
  redmineUrl: string,
  redmineApiKey: string,
  issueId: number,
): Promise<RedmineIssue | null> {
  if (!isBackground) {
    return apiCall<RedmineIssue | null>('getRedmineIssue', [redmineUrl, redmineApiKey, issueId])
  }

  const response = await freshFetch(`${redmineUrl}/issues/${issueId}.json`, {
    headers: redmineHeaders(redmineApiKey),
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as { issue: RedmineIssue }
  return data.issue || null
}

export async function getUserMRs(
  gitlabUrl: string,
  gitlabToken: string,
  userId: number,
): Promise<GitlabMR[]> {
  if (!isBackground) return apiCall<GitlabMR[]>('getUserMRs', [gitlabUrl, gitlabToken, userId])

  const headers = { 'PRIVATE-TOKEN': gitlabToken }
  const [authoredRes, assignedRes, reviewerRes] = await Promise.all([
    freshFetch(
      `${gitlabUrl}/api/v4/merge_requests?author_id=${userId}&state=opened&per_page=100&with_merge_status_recheck=true`,
      { headers },
    ),
    freshFetch(
      `${gitlabUrl}/api/v4/merge_requests?assignee_id=${userId}&state=opened&per_page=100&with_merge_status_recheck=true`,
      { headers },
    ),
    freshFetch(
      `${gitlabUrl}/api/v4/merge_requests?reviewer_id=${userId}&state=opened&per_page=100&with_merge_status_recheck=true`,
      { headers },
    ),
  ])

  const authored = authoredRes.ok ? ((await authoredRes.json()) as GitlabMR[]) : []
  const assigned = assignedRes.ok ? ((await assignedRes.json()) as GitlabMR[]) : []
  const reviewed = reviewerRes.ok ? ((await reviewerRes.json()) as GitlabMR[]) : []

  const mrMap = new Map<number, GitlabMR>()
  for (const mr of [...authored, ...assigned, ...reviewed]) {
    mrMap.set(mr.id, mr)
  }

  return Array.from(mrMap.values())
}

export async function getOtherUserMRs(
  gitlabUrl: string,
  gitlabToken: string,
  userId: number,
): Promise<GitlabMR[]> {
  return getUserMRs(gitlabUrl, gitlabToken, userId)
}

