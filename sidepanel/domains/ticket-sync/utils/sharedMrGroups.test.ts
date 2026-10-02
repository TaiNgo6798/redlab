import { describe, it, expect } from 'vitest'
import { countUniqueMrs, groupBySharedMrs } from './sharedMrGroups'
import type { ProcessedMR, ProcessedTicket } from '../types/index'

function createMR(repo: string, iid: number): ProcessedMR {
  return {
    iid,
    repo,
    url: `https://git.example/${repo}/-/merge_requests/${iid}`,
    state: 'opened',
    has_conflicts: false,
    has_open_review: false,
    is_draft: false,
    has_failed_pipeline: false,
  }
}

function createTicket(id: number | null, mrs: ProcessedMR[]): ProcessedTicket {
  return { id, title: `Ticket ${id}`, status: 'Resolved', mrs }
}

describe('groupBySharedMrs', () => {
  it('puts tickets with the same MR set on one card, in input order', () => {
    const a = createTicket(13504, [createMR('backend-worker', 668)])
    const b = createTicket(15888, [createMR('api-core', 1902)])
    const c = createTicket(13503, [createMR('backend-worker', 668)])

    expect(groupBySharedMrs([a, b, c])).toEqual([[a, c], [b]])
  })

  it('matches MR sets regardless of MR order', () => {
    const a = createTicket(1, [createMR('repo-a', 1), createMR('repo-b', 2)])
    const b = createTicket(2, [createMR('repo-b', 2), createMR('repo-a', 1)])

    expect(groupBySharedMrs([a, b])).toEqual([[a, b]])
  })

  it('keeps tickets that share only some MRs apart', () => {
    const a = createTicket(1, [createMR('repo-a', 1), createMR('repo-b', 2)])
    const b = createTicket(2, [createMR('repo-a', 1)])

    expect(groupBySharedMrs([a, b])).toEqual([[a], [b]])
  })

  it('never merges no-code tickets or untracked MRs', () => {
    const noCodeA = createTicket(1, [])
    const noCodeB = createTicket(2, [])
    const untrackedA = createTicket(null, [createMR('infra', 88)])
    const untrackedB = createTicket(null, [createMR('infra', 88)])

    expect(groupBySharedMrs([noCodeA, noCodeB, untrackedA, untrackedB])).toEqual([
      [noCodeA],
      [noCodeB],
      [untrackedA],
      [untrackedB],
    ])
  })
})

describe('countUniqueMrs', () => {
  it('counts an MR linked to several tickets once', () => {
    const shared = createMR('backend-worker', 668)
    expect(countUniqueMrs([createTicket(1, [shared]), createTicket(2, [shared, createMR('api-core', 1)])])).toBe(2)
  })
})
