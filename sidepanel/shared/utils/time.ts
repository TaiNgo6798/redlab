export function formatHours(hours: number): string {
  return `${hours.toFixed(1)}h`
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'always', style: 'narrow' })

export function getTimeAgo(timestamp: number): string {
  const seconds = Math.round((timestamp - Date.now()) / 1000)
  if (Math.abs(seconds) < 60) return 'just now'
  if (Math.abs(seconds) < 3600) return rtf.format(Math.round(seconds / 60), 'minute')
  if (Math.abs(seconds) < 86400) return rtf.format(Math.round(seconds / 3600), 'hour')
  return rtf.format(Math.round(seconds / 86400), 'day')
}
