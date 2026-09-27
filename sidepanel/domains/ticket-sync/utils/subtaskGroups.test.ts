import { describe, it, expect } from 'vitest'
import { groupByParent } from './subtaskGroups'
import type { ProcessedTicket, TicketParent } from '../types/index'

const PARENT: TicketParent = { id: 100, url: 'https://redmine.example.com/issues/100', title: 'Parent feature' }

function createSubtask(id: number, parent?: TicketParent): ProcessedTicket {
  return {
    id,
    title: `Sub-task ${id}`,
    url: `https://redmine.example.com/issues/${id}`,
    status: 'Resolved',
    mrs: [],
    parent,
  }
}

describe('groupByParent', () => {
  it('groups sub-tasks under their direct parent in input order', () => {
    const otherParent: TicketParent = { id: 200, url: 'https://redmine.example.com/issues/200' }
    const a = createSubtask(3, PARENT)
    const b = createSubtask(2, otherParent)
    const c = createSubtask(1, PARENT)

    expect(groupByParent([a, b, c])).toEqual([
      { parent: PARENT, subtasks: [a, c] },
      { parent: otherParent, subtasks: [b] },
    ])
  })

  it('skips tickets without a parent', () => {
    expect(groupByParent([createSubtask(1)])).toEqual([])
  })
})
