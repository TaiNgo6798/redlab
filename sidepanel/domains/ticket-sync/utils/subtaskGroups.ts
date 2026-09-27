import type { ProcessedTicket, TicketParent } from '../types/index'

export interface SubtaskGroup {
  parent: TicketParent
  subtasks: ProcessedTicket[]
}

export function groupByParent(tickets: ProcessedTicket[]): SubtaskGroup[] {
  const groups = new Map<number, SubtaskGroup>()
  for (const ticket of tickets) {
    if (!ticket.parent) continue
    const group = groups.get(ticket.parent.id)
    if (group) {
      group.subtasks.push(ticket)
    } else {
      groups.set(ticket.parent.id, { parent: ticket.parent, subtasks: [ticket] })
    }
  }
  return Array.from(groups.values())
}
