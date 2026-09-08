import { describe, it, expect } from 'vitest'
import {
  getMRStatusFlags,
  isReadyToTest,
  isResolvedNoMr,
  getTicketGroup,
  groupTickets,
  DISPLAY_GROUPS,
  MR_STATUS_FLAG_CONFIG,
} from './mrChips'
import { TicketGroup, type ProcessedMR, type ProcessedTicket } from '../types/index'

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

describe('isResolvedNoMr', () => {
  it('returns true when ticket is resolved and has no MRs', () => {
    const ticket = createTicket({
      status: 'Resolved',
      mrs: [],
    })
    expect(isResolvedNoMr(ticket)).toBe(true)
  })

  it('returns true when ticket is resolved (case-insensitive) and has no MRs', () => {
    const ticket = createTicket({
      status: 'resolved',
      mrs: [],
    })
    expect(isResolvedNoMr(ticket)).toBe(true)
  })

  it('returns false when ticket is resolved but has MRs', () => {
    const ticket = createTicket({
      status: 'Resolved',
      mrs: [createMR({ state: 'merged' })],
    })
    expect(isResolvedNoMr(ticket)).toBe(false)
  })

  it('returns false when ticket is not resolved even if it has no MRs', () => {
    const ticket = createTicket({
      status: 'In Progress',
      mrs: [],
    })
    expect(isResolvedNoMr(ticket)).toBe(false)
  })

  it('returns false when ticket has no id', () => {
    const ticket = createTicket({
      id: null,
      status: 'Resolved',
      mrs: [],
    })
    expect(isResolvedNoMr(ticket)).toBe(false)
  })

  it('returns false when ticket has no status', () => {
    const ticket = createTicket({
      status: undefined,
      mrs: [],
    })
    expect(isResolvedNoMr(ticket)).toBe(false)
  })
})

describe('getTicketGroup', () => {
  it('returns TicketGroup.ReadyToTest when ticket is resolved with all MRs merged', () => {
    const ticket = createTicket({
      status: 'Resolved',
      mrs: [createMR({ state: 'merged' })],
    })
    expect(getTicketGroup(ticket)).toBe(TicketGroup.ReadyToTest)
  })

  it('returns TicketGroup.ResolvedNoMr when ticket is resolved with no MRs', () => {
    const ticket = createTicket({
      status: 'Resolved',
      mrs: [],
    })
    expect(getTicketGroup(ticket)).toBe(TicketGroup.ResolvedNoMr)
  })

  it('returns TicketGroup.Active when ticket is in progress or has open MRs', () => {
    const ticket = createTicket({
      status: 'In Progress',
      mrs: [createMR({ state: 'opened' })],
    })
    expect(getTicketGroup(ticket)).toBe(TicketGroup.Active)
  })
})

describe('DISPLAY_GROUPS & groupTickets', () => {
  it('defines the correct ordering of display groups', () => {
    expect(DISPLAY_GROUPS).toEqual([
      TicketGroup.ReadyToTest,
      TicketGroup.ResolvedNoMr,
      TicketGroup.Active,
    ])
  })

  it('correctly partitions a list of tickets into groups', () => {
    const ready = createTicket({ status: 'Resolved', mrs: [createMR({ state: 'merged' })] })
    const resolvedNoMr = createTicket({ status: 'Resolved', mrs: [] })
    const active = createTicket({ status: 'In Progress', mrs: [createMR({ state: 'opened' })] })

    const grouped = groupTickets([ready, resolvedNoMr, active])

    expect(grouped[TicketGroup.ReadyToTest]).toEqual([ready])
    expect(grouped[TicketGroup.ResolvedNoMr]).toEqual([resolvedNoMr])
    expect(grouped[TicketGroup.Active]).toEqual([active])
  })
})


