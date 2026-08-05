import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getDateRange } from './api';

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
