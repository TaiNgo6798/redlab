import { describe, it, expect } from 'vitest'
import {
  getMRStatusFlags,
  isReadyToTest,
  isResolvedSubtask,
  getTicketGroup,
  groupTickets,
  isNoCodeTicket,
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

  it('returns true when a resolved root ticket has no MRs (no-code task)', () => {
    const ticket = createTicket({
      status: 'Resolved',
      mrs: [],
    })
    expect(isReadyToTest(ticket)).toBe(true)
  })

  it('returns false when a resolved sub-task has no MRs', () => {
    const ticket = createTicket({
      status: 'Resolved',
      mrs: [],
      parent: { id: 100, url: 'https://redmine.example.com/issues/100' },
    })
    expect(isReadyToTest(ticket)).toBe(false)
  })
})

const PARENT = { id: 100, url: 'https://redmine.example.com/issues/100', title: 'Parent feature' }

describe('isResolvedSubtask', () => {
  it('returns true when a resolved ticket with a parent has no MRs', () => {
    const ticket = createTicket({ status: 'Resolved', mrs: [], parent: PARENT })
    expect(isResolvedSubtask(ticket)).toBe(true)
  })

  it('returns true when status is resolved (case-insensitive)', () => {
    const ticket = createTicket({ status: 'resolved', mrs: [], parent: PARENT })
    expect(isResolvedSubtask(ticket)).toBe(true)
  })

  it('returns false when the ticket has no parent', () => {
    const ticket = createTicket({ status: 'Resolved', mrs: [] })
    expect(isResolvedSubtask(ticket)).toBe(false)
  })

  it('returns false when the sub-task has its own MRs', () => {
    const ticket = createTicket({ status: 'Resolved', parent: PARENT })
    expect(isResolvedSubtask(ticket)).toBe(false)
  })

  it('returns false when the sub-task is not resolved', () => {
    const ticket = createTicket({ status: 'In Progress', mrs: [], parent: PARENT })
    expect(isResolvedSubtask(ticket)).toBe(false)
  })

  it('returns false when ticket has no id', () => {
    const ticket = createTicket({ id: null, status: 'Resolved', mrs: [], parent: PARENT })
    expect(isResolvedSubtask(ticket)).toBe(false)
  })
})

describe('isNoCodeTicket', () => {
  it('returns true for a resolved root ticket with no MRs', () => {
    expect(isNoCodeTicket(createTicket({ status: 'Resolved', mrs: [] }))).toBe(true)
  })

  it('returns false for a resolved sub-task with no MRs', () => {
    expect(isNoCodeTicket(createTicket({ status: 'Resolved', mrs: [], parent: PARENT }))).toBe(false)
  })

  it('returns false for an unresolved ticket with no MRs', () => {
    expect(isNoCodeTicket(createTicket({ status: 'In Progress', mrs: [] }))).toBe(false)
  })

  it('returns false when the ticket has MRs', () => {
    expect(isNoCodeTicket(createTicket({ status: 'Resolved' }))).toBe(false)
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

  it('returns TicketGroup.ReadyToTest when a root ticket is resolved with no MRs', () => {
    const ticket = createTicket({ status: 'Resolved', mrs: [] })
    expect(getTicketGroup(ticket)).toBe(TicketGroup.ReadyToTest)
  })

  it('returns TicketGroup.ResolvedSubtask when a sub-task is resolved with no MRs', () => {
    const ticket = createTicket({ status: 'Resolved', mrs: [], parent: PARENT })
    expect(getTicketGroup(ticket)).toBe(TicketGroup.ResolvedSubtask)
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
      TicketGroup.Active,
      TicketGroup.ResolvedSubtask,
    ])
  })

  it('correctly partitions a list of tickets into groups', () => {
    const ready = createTicket({ status: 'Resolved', mrs: [createMR({ state: 'merged' })] })
    const noCode = createTicket({ status: 'Resolved', mrs: [] })
    const subtask = createTicket({ status: 'Resolved', mrs: [], parent: PARENT })
    const active = createTicket({ status: 'In Progress', mrs: [createMR({ state: 'opened' })] })

    const grouped = groupTickets([ready, noCode, subtask, active])

    expect(grouped[TicketGroup.ReadyToTest]).toEqual([ready, noCode])
    expect(grouped[TicketGroup.ResolvedSubtask]).toEqual([subtask])
    expect(grouped[TicketGroup.Active]).toEqual([active])
  })
})
