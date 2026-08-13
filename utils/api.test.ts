import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getDateRange, hasOpenReview } from './api';

describe('hasOpenReview', () => {
  const note = (
    authorId: number,
    overrides: Partial<{
      system: boolean
      resolvable: boolean
      resolved: boolean
      created_at: string
      body: string
    }> = {},
  ) => ({
    system: false,
    resolvable: false,
    resolved: false,
    author: { id: authorId },
    created_at: '2026-08-03T04:28:42.711Z',
    body: 'LGTM',
    ...overrides,
  })

  // MR !1892: reviewer left LGTM, author did not reply, MR is approved
  it('does not flag unanswered review when the MR is approved', () => {
    const discussions = [{ notes: [note(19)] }]
    expect(hasOpenReview(discussions, 110, true)).toBe(false)
  })

  it('flags unanswered top-level review when the MR is not approved', () => {
    const discussions = [{ notes: [note(19)] }]
    expect(hasOpenReview(discussions, 110, false)).toBe(true)
  })

  it('flags unresolved thread when someone else had the last word', () => {
    const discussions = [{
      notes: [
        note(19, { resolvable: true, resolved: false, created_at: '2026-08-01T00:00:00.000Z' }),
        note(19, { resolvable: true, resolved: false, created_at: '2026-08-02T00:00:00.000Z' }),
      ],
    }]
    expect(hasOpenReview(discussions, 110)).toBe(true)
  })

  it('does not flag unresolved thread when approved', () => {
    const discussions = [{
      notes: [note(19, { resolvable: true, resolved: false })],
    }]
    expect(hasOpenReview(discussions, 110, true)).toBe(false)
  })

  it('does not flag when the author already replied', () => {
    const discussions = [{
      notes: [
        note(19, { created_at: '2026-08-01T00:00:00.000Z' }),
        note(110, { created_at: '2026-08-02T00:00:00.000Z' }),
      ],
    }]
    expect(hasOpenReview(discussions, 110)).toBe(false)
  })
})

describe('getDateRange — completed calendar periods', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Noon local time so date components are unambiguous across timezones.
    vi.setSystemTime(new Date(2026, 6, 6, 12, 0, 0)); // 2026-07-06
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('lastMonth = previous full calendar month', () => {
    expect(getDateRange('lastMonth')).toEqual({ from: '2026-06-01', to: '2026-06-30' });
  });

  it('last3Months = three full months before current, ending last month', () => {
    expect(getDateRange('last3Months')).toEqual({ from: '2026-04-01', to: '2026-06-30' });
  });

  it('last6Months = six full months before current', () => {
    expect(getDateRange('last6Months')).toEqual({ from: '2026-01-01', to: '2026-06-30' });
  });

  it('lastYear = previous full calendar year', () => {
    expect(getDateRange('lastYear')).toEqual({ from: '2025-01-01', to: '2025-12-31' });
  });

  it('crosses the year boundary correctly (February reference)', () => {
    vi.setSystemTime(new Date(2026, 1, 15, 12, 0, 0)); // 2026-02-15
    expect(getDateRange('lastMonth')).toEqual({ from: '2026-01-01', to: '2026-01-31' });
    expect(getDateRange('last3Months')).toEqual({ from: '2025-11-01', to: '2026-01-31' });
    expect(getDateRange('last6Months')).toEqual({ from: '2025-08-01', to: '2026-01-31' });
    expect(getDateRange('lastYear')).toEqual({ from: '2025-01-01', to: '2025-12-31' });
  });
});
