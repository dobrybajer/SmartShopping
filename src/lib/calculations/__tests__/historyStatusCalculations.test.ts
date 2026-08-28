import { describe, it, expect } from 'vitest'
import {
  calculateHistoryListStatus,
  getHistoryListCompletionDate,
  sortHistoryListsByCompletionDate
} from '../historyStatusCalculations'

describe('calculateHistoryListStatus pure calculation', () => {
  it('returns completed when all items are checked (total > 0 and checked === total)', () => {
    const items = [
      { id: '1', is_checked: true },
      { id: '2', is_checked: true },
      { id: '3', is_checked: true }
    ]

    const result = calculateHistoryListStatus(items)

    expect(result).toEqual({
      status: 'completed',
      checkedCount: 3,
      totalCount: 3,
      isFullyCompleted: true,
      isPartiallyCompleted: false,
      isNotCompleted: false
    })
  })

  it('returns partially_completed when some but not all items are checked', () => {
    const items = [
      { id: '1', is_checked: true },
      { id: '2', is_checked: false },
      { id: '3', is_checked: true }
    ]

    const result = calculateHistoryListStatus(items)

    expect(result).toEqual({
      status: 'partially_completed',
      checkedCount: 2,
      totalCount: 3,
      isFullyCompleted: false,
      isPartiallyCompleted: true,
      isNotCompleted: false
    })
  })

  it('returns not_completed when no items are checked', () => {
    const items = [
      { id: '1', is_checked: false },
      { id: '2', is_checked: false }
    ]

    const result = calculateHistoryListStatus(items)

    expect(result).toEqual({
      status: 'not_completed',
      checkedCount: 0,
      totalCount: 2,
      isFullyCompleted: false,
      isPartiallyCompleted: false,
      isNotCompleted: true
    })
  })

  it('returns not_completed when list has empty items array', () => {
    const result = calculateHistoryListStatus([])

    expect(result).toEqual({
      status: 'not_completed',
      checkedCount: 0,
      totalCount: 0,
      isFullyCompleted: false,
      isPartiallyCompleted: false,
      isNotCompleted: true
    })
  })

  it('returns not_completed when items is null or undefined', () => {
    expect(calculateHistoryListStatus(null).status).toBe('not_completed')
    expect(calculateHistoryListStatus(undefined).status).toBe('not_completed')
  })

  it('correctly treats null or undefined is_checked values as unchecked', () => {
    const items = [
      { id: '1', is_checked: true },
      { id: '2', is_checked: null },
      { id: '3', is_checked: undefined }
    ]

    const result = calculateHistoryListStatus(items)

    expect(result).toEqual({
      status: 'partially_completed',
      checkedCount: 1,
      totalCount: 3,
      isFullyCompleted: false,
      isPartiallyCompleted: true,
      isNotCompleted: false
    })
  })
})

describe('getHistoryListCompletionDate & sortHistoryListsByCompletionDate', () => {
  it('resolves completion date using priority completed_at > updated_at > created_at > target_date', () => {
    const listWithCompleted = {
      completed_at: '2026-08-25T18:00:00Z',
      updated_at: '2026-08-25T17:00:00Z',
      created_at: '2026-08-25T10:00:00Z'
    }
    expect(getHistoryListCompletionDate(listWithCompleted).toISOString()).toBe('2026-08-25T18:00:00.000Z')

    const listWithUpdated = {
      completed_at: null,
      updated_at: '2026-08-25T17:00:00Z',
      created_at: '2026-08-25T10:00:00Z'
    }
    expect(getHistoryListCompletionDate(listWithUpdated).toISOString()).toBe('2026-08-25T17:00:00.000Z')

    const listWithCreated = {
      completed_at: null,
      updated_at: null,
      created_at: '2026-08-25T10:00:00Z'
    }
    expect(getHistoryListCompletionDate(listWithCreated).toISOString()).toBe('2026-08-25T10:00:00.000Z')

    const listWithTarget = {
      completed_at: null,
      updated_at: null,
      created_at: null,
      target_date: '2026-08-20'
    }
    expect(getHistoryListCompletionDate(listWithTarget).toISOString()).toContain('2026-08-20')
  })

  it('sorts shopping lists in descending order of completion date', () => {
    const lists = [
      { id: 'list-older', completed_at: '2026-08-20T10:00:00Z' },
      { id: 'list-newest', completed_at: '2026-08-28T22:00:00Z' },
      { id: 'list-middle', completed_at: '2026-08-24T15:00:00Z' }
    ]

    const sorted = sortHistoryListsByCompletionDate(lists)

    expect(sorted.map((l) => l.id)).toEqual(['list-newest', 'list-middle', 'list-older'])
  })
})

