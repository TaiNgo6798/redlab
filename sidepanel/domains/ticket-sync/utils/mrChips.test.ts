import { describe, it, expect } from 'vitest'
import type { ProcessedMR } from '../types/index'
import { getMRStatuses, getChipStatusForGroup } from './mrChips'

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

describe('getMRStatuses', () => {
  it('returns open for a clean opened MR', () => {
    expect(getMRStatuses(createMR())).toEqual(['open'])
  })

  it('returns merged / closed for terminal states', () => {
    expect(getMRStatuses(createMR({ state: 'merged' }))).toEqual(['merged'])
    expect(getMRStatuses(createMR({ state: 'closed' }))).toEqual(['closed'])
  })

  it('lists problem statuses in severity order: failed > conflict > review', () => {
    expect(
      getMRStatuses(
        createMR({
          has_failed_pipeline: true,
          has_conflicts: true,
          has_open_review: true,
        }),
      ),
    ).toEqual(['failed', 'conflict', 'review'])
  })

  it('does not fall through to open/merged when any problem flag is set', () => {
    expect(getMRStatuses(createMR({ state: 'merged', has_open_review: true }))).toEqual(['review'])
    expect(getMRStatuses(createMR({ state: 'opened', has_conflicts: true }))).toEqual(['conflict'])
  })

  it('returns only failed when that is the sole problem', () => {
    expect(getMRStatuses(createMR({ has_failed_pipeline: true }))).toEqual(['failed'])
  })
})

describe('getChipStatusForGroup', () => {
  const multiStatusMR = createMR({
    iid: 10,
    repo: 'repo-b',
    has_failed_pipeline: true,
    has_open_review: true,
  })

  const cleanOpenMR = createMR({
    iid: 3,
    repo: 'repo-c',
  })

  const conflictOnlyMR = createMR({
    iid: 99,
    has_conflicts: true,
  })

  it('prefers group-matching status when MR has failed+review', () => {
    expect(getChipStatusForGroup(multiStatusMR, 'test_failed')).toBe('failed')
    expect(getChipStatusForGroup(multiStatusMR, 'review')).toBe('review')
  })

  it('keeps sibling MRs on their own status inside a problem group', () => {
    // repo-c is only open — still shows open inside Test Failed / Review
    expect(getChipStatusForGroup(cleanOpenMR, 'test_failed')).toBe('open')
    expect(getChipStatusForGroup(cleanOpenMR, 'review')).toBe('open')
    expect(getChipStatusForGroup(cleanOpenMR, 'conflicts')).toBe('open')
  })

  it('uses primary severity when group has no matching status on the MR', () => {
    // failed+review MR inside conflicts group → no conflict flag → primary is failed
    expect(getChipStatusForGroup(multiStatusMR, 'conflicts')).toBe('failed')
    // conflict-only MR inside test_failed → primary is conflict
    expect(getChipStatusForGroup(conflictOnlyMR, 'test_failed')).toBe('conflict')
  })

  it('prefers conflict when MR has conflict and group is conflicts', () => {
    const mr = createMR({ has_conflicts: true, has_open_review: true, has_failed_pipeline: true })
    expect(getChipStatusForGroup(mr, 'conflicts')).toBe('conflict')
    expect(getChipStatusForGroup(mr, 'test_failed')).toBe('failed')
    expect(getChipStatusForGroup(mr, 'review')).toBe('review')
  })

  it('shows merged pill in ready group and open pill in open group', () => {
    const merged = createMR({ state: 'merged' })
    const opened = createMR({ state: 'opened' })
    expect(getChipStatusForGroup(merged, 'ready')).toBe('merged')
    expect(getChipStatusForGroup(opened, 'open')).toBe('open')
  })

  it('falls back to primary for draft/others groups without a chip mapping', () => {
    expect(getChipStatusForGroup(multiStatusMR, 'draft')).toBe('failed')
    expect(getChipStatusForGroup(multiStatusMR, 'others')).toBe('failed')
    expect(getChipStatusForGroup(cleanOpenMR, 'draft')).toBe('open')
  })

  it('covers a multi-MR ticket: chips per group for each MR', () => {
    const repoB = createMR({
      iid: 10,
      repo: 'repo-b',
      has_failed_pipeline: true,
      has_open_review: true,
    })
    const repoC = createMR({ iid: 3, repo: 'repo-c' })
    const repoA = createMR({
      iid: 11,
      repo: 'repo-a',
      has_failed_pipeline: true,
      has_open_review: true,
    })
    const mrs = [repoB, repoC, repoA]

    // Test Failed: matching MRs show failed; sibling keeps open
    expect(mrs.map((mr) => getChipStatusForGroup(mr, 'test_failed'))).toEqual([
      'failed',
      'open',
      'failed',
    ])

    // Has Open Review: matching MRs show review; sibling keeps open
    expect(mrs.map((mr) => getChipStatusForGroup(mr, 'review'))).toEqual([
      'review',
      'open',
      'review',
    ])
  })

  it('does not invent open when only problem flags exist', () => {
    const mr = createMR({ has_failed_pipeline: true, has_open_review: true })
    // open group has mapping, but MR is not a clean open — no open in statuses
    expect(getChipStatusForGroup(mr, 'open')).toBe('failed')
  })
})
