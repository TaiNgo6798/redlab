import type { TimeScope } from '../../../../utils/api'

export type OverviewPeriod = Extract<
  TimeScope,
  'month' | 'lastMonth' | 'last3Months' | 'last6Months' | 'lastYear'
>

export const PERIOD_OPTIONS: { value: OverviewPeriod; label: string }[] = [
  { value: 'month', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'last3Months', label: 'Last 3 Months' },
  { value: 'last6Months', label: 'Last 6 Months' },
  { value: 'lastYear', label: 'Last Year' },
]

export const PERIOD_LABELS: Record<OverviewPeriod, string> = Object.fromEntries(
  PERIOD_OPTIONS.map(o => [o.value, o.label]),
) as Record<OverviewPeriod, string>

/** Format a YYYY-MM-DD..YYYY-MM-DD range as a compact label, e.g. "Apr–Jun 2026". */
export function formatPeriodRange(from: string, to: string): string {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  const fMonth = new Date(fy, fm - 1).toLocaleString('en', { month: 'short' })
  const tMonth = new Date(ty, tm - 1).toLocaleString('en', { month: 'short' })
  if (fy === ty) {
    return fm === tm ? `${fMonth} ${fy}` : `${fMonth}–${tMonth} ${fy}`
  }
  return `${fMonth} ${fy} – ${tMonth} ${ty}`
}
