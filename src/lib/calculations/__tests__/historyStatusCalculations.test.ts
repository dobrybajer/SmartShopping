import { describe, it, expect } from 'vitest'
import { calculateHistoryListStatus } from '../historyStatusCalculations'

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
