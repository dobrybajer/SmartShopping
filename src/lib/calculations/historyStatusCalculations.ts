export type HistoryListCompletionStatus = 'completed' | 'partially_completed' | 'not_completed'

export interface ItemCheckSummary {
  id?: string
  is_checked?: boolean | null
}

export interface HistoryStatusResult {
  status: HistoryListCompletionStatus
  checkedCount: number
  totalCount: number
  isFullyCompleted: boolean
  isPartiallyCompleted: boolean
  isNotCompleted: boolean
}

/**
 * Determines the completion status of a shopping list based on its items' checked statuses.
 * 
 * Rules:
 * 1. All items checked (total > 0 and checked === total) -> 'completed' ("Zrealizowano", green)
 * 2. Some items checked (total > 0 and checked > 0 and checked < total) -> 'partially_completed' ("Zrealizowano", yellow-orange)
 * 3. None checked (checked === 0 or total === 0) -> 'not_completed' ("Niezrealizowano", red)
 */
export function calculateHistoryListStatus(
  items?: ItemCheckSummary[] | null
): HistoryStatusResult {
  if (!items || items.length === 0) {
    return {
      status: 'not_completed',
      checkedCount: 0,
      totalCount: 0,
      isFullyCompleted: false,
      isPartiallyCompleted: false,
      isNotCompleted: true
    }
  }

  const totalCount = items.length
  const checkedCount = items.filter((item) => !!item.is_checked).length

  if (checkedCount === totalCount && totalCount > 0) {
    return {
      status: 'completed',
      checkedCount,
      totalCount,
      isFullyCompleted: true,
      isPartiallyCompleted: false,
      isNotCompleted: false
    }
  }

  if (checkedCount > 0) {
    return {
      status: 'partially_completed',
      checkedCount,
      totalCount,
      isFullyCompleted: false,
      isPartiallyCompleted: true,
      isNotCompleted: false
    }
  }

  return {
    status: 'not_completed',
    checkedCount: 0,
    totalCount,
    isFullyCompleted: false,
    isPartiallyCompleted: false,
    isNotCompleted: true
  }
}

export interface HistoryListDateFields {
  completed_at?: string | null
  updated_at?: string | null
  created_at?: string | null
  target_date?: string | null
}

/**
 * Resolves the primary completion date of a shopping list with fallback order:
 * completed_at -> updated_at -> created_at -> target_date.
 */
export function getHistoryListCompletionDate(list: HistoryListDateFields): Date {
  const dateStr = list.completed_at || list.updated_at || list.created_at || list.target_date
  return dateStr ? new Date(dateStr) : new Date()
}

/**
 * Sorts shopping lists descending by their resolved completion date.
 * (Newest completed lists first).
 */
export function sortHistoryListsByCompletionDate<T extends HistoryListDateFields>(lists: T[]): T[] {
  return [...lists].sort((a, b) => {
    const timeA = getHistoryListCompletionDate(a).getTime()
    const timeB = getHistoryListCompletionDate(b).getTime()
    return timeB - timeA
  })
}

