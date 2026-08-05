import { describe, it, expect } from 'vitest';
import { formatPeriodRange, PERIOD_OPTIONS } from './periods';

describe('formatPeriodRange', () => {
  it('single month within a year', () => {
    expect(formatPeriodRange('2026-06-01', '2026-06-30')).toBe('Jun 2026');
  });
  it('month span within a year', () => {
    expect(formatPeriodRange('2026-04-01', '2026-06-30')).toBe('Apr–Jun 2026');
  });
  it('full previous year', () => {
    expect(formatPeriodRange('2025-01-01', '2025-12-31')).toBe('Jan–Dec 2025');
  });
  it('span crossing a year boundary', () => {
    expect(formatPeriodRange('2025-11-01', '2026-01-31')).toBe('Nov 2025 – Jan 2026');
  });
});

describe('PERIOD_OPTIONS', () => {
  it('starts with This Month and has 5 options', () => {
    expect(PERIOD_OPTIONS).toHaveLength(5);
    expect(PERIOD_OPTIONS[0]).toEqual({ value: 'month', label: 'This Month' });
  });
});
