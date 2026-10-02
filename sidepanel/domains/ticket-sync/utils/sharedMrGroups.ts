import type { ProcessedMR, ProcessedTicket } from '../types/index'

export function mrKey(mr: ProcessedMR): string {
  return `${mr.repo}!${mr.iid}`
}

function mrSetKey(ticket: ProcessedTicket): string | null {
  if (!ticket.id || ticket.mrs.length === 0) return null
  return ticket.mrs.map(mrKey).sort().join(',')
}

export function groupBySharedMrs(tickets: ProcessedTicket[]): ProcessedTicket[][] {
  const groups: ProcessedTicket[][] = []
  const byKey = new Map<string, ProcessedTicket[]>()
  for (const ticket of tickets) {
    const key = mrSetKey(ticket)
    const existing = key ? byKey.get(key) : undefined
    if (existing) {
      existing.push(ticket)
      continue
    }
    const group = [ticket]
    groups.push(group)
    if (key) byKey.set(key, group)
  }
  return groups
}

export function countUniqueMrs(tickets: ProcessedTicket[]): number {
  return new Set(tickets.flatMap((ticket) => ticket.mrs.map(mrKey))).size
}
