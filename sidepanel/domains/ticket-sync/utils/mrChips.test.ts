import { describe, it, expect } from 'vitest'
import { getMRStatusFlags, isReadyToTest, MR_STATUS_FLAG_CONFIG } from './mrChips'
import type { ProcessedMR, ProcessedTicket } from '../types/index'

function createMR(overrides: Partial<ProcessedMR> = {}): ProcessedMR {
  return {
    iid: 1,
    repo: 'repo-a',
    url: 'https://git.example/repo-a/-/merge_requests/1',
    state: 'opened',
    has_conflicts: false,
    has_open_review: false,
    is_draft: false,
    has_failed_pipeline: false,
    ...overrides,
  }
}

function createTicket(overrides: Partial<ProcessedTicket> = {}): ProcessedTicket {
  return {
    id: 123,
    title: 'Fix issue',
    url: 'https://redmine.example.com/issues/123',
    status: 'Resolved',
    mrs: [createMR({ state: 'merged' })],
    ...overrides,
  }
}

describe('mrChips / getMRStatusFlags', () => {
  it('returns [open] for a clean opened MR', () => {
    expect(getMRStatusFlags(createMR())).toEqual(['open'])
  })

  it('returns [merged] for a clean merged MR', () => {
    expect(getMRStatusFlags(createMR({ state: 'merged' }))).toEqual(['merged'])
  })

  it('returns [draft] for a clean draft opened MR', () => {
    expect(getMRStatusFlags(createMR({ is_draft: true }))).toEqual(['draft'])
  })

  it('returns [has_review] and hides [open] when review comments exist', () => {
    expect(getMRStatusFlags(createMR({ has_open_review: true }))).toEqual(['has_review'])
  })

  it('returns [test_failed] and hides [open] when pipeline failed', () => {
    expect(getMRStatusFlags(createMR({ has_failed_pipeline: true }))).toEqual(['test_failed'])
  })

  it('returns [conflict] and hides [open] when conflicts exist', () => {
    expect(getMRStatusFlags(createMR({ has_conflicts: true }))).toEqual(['conflict'])
  })

  it('returns multiple flags including draft and problem flags', () => {
    const mr = createMR({
      state: 'opened',
      is_draft: true,
      has_open_review: true,
      has_failed_pipeline: true,
      has_conflicts: true,
    })
    expect(getMRStatusFlags(mr)).toEqual([
      'draft',
      'has_review',
      'test_failed',
      'conflict',
    ])
  })

  it('has valid labels and classNames for all status flags in MR_STATUS_FLAG_CONFIG', () => {
    const flags = ['open', 'merged', 'draft', 'has_review', 'test_failed', 'conflict'] as const
    for (const flag of flags) {
      const config = MR_STATUS_FLAG_CONFIG[flag]
      expect(config).toBeDefined()
      expect(config.label).toBeTruthy()
      expect(config.className).toBeTruthy()
    }
  })
})

describe('isReadyToTest', () => {
  it('returns true when ticket is resolved and its single MR is merged', () => {
    const ticket = createTicket({
      status: 'Resolved',
      mrs: [createMR({ state: 'merged' })],
    })
    expect(isReadyToTest(ticket)).toBe(true)
  })

  it('returns true when ticket is resolved (case-insensitive) and all MRs are merged', () => {
    const ticket = createTicket({
      status: 'resolved',
      mrs: [createMR({ state: 'merged' }), createMR({ iid: 2, state: 'merged' })],
    })
    expect(isReadyToTest(ticket)).toBe(true)
  })

  it('returns false when ticket is resolved but one MR is still opened', () => {
    const ticket = createTicket({
      status: 'Resolved',
      mrs: [createMR({ state: 'merged' }), createMR({ iid: 2, state: 'opened' })],
    })
    expect(isReadyToTest(ticket)).toBe(false)
  })

  it('returns false when MRs are merged but ticket is not resolved', () => {
    const ticket = createTicket({
      status: 'In Progress',
      mrs: [createMR({ state: 'merged' })],
    })
    expect(isReadyToTest(ticket)).toBe(false)
  })

  it('returns false when ticket has no id (untracked MR)', () => {
    const ticket = createTicket({
      id: null,
      status: undefined,
      mrs: [createMR({ state: 'merged' })],
    })
    expect(isReadyToTest(ticket)).toBe(false)
  })

  it('returns false when ticket has no MRs', () => {
    const ticket = createTicket({
      status: 'Resolved',
      mrs: [],
    })
    expect(isReadyToTest(ticket)).toBe(false)
  })
})
