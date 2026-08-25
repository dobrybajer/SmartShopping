import type { ShoppingListSummary } from '@/services/shoppingListService'

export interface ActiveListMetrics {
  totalItems: number
  checkedItems: number
  uncheckedItems: number
  progressPercentage: number
}

/**
 * Sorts active shopping lists giving priority to the default list,
 * followed by the most recently updated lists.
 */
export function sortActiveLists(lists: ShoppingListSummary[]): ShoppingListSummary[] {
  return [...lists].sort((a, b) => {
    // 1. Default list always comes first
    if (a.is_default && !b.is_default) return -1
    if (!a.is_default && b.is_default) return 1

    // 2. Most recently updated list
    const aTime = new Date(a.updated_at || a.created_at || 0).getTime()
    const bTime = new Date(b.updated_at || b.created_at || 0).getTime()
    if (bTime !== aTime) return bTime - aTime

    // 3. Fallback alphabetical
    return (a.name || '').localeCompare(b.name || '')
  })
}

/**
 * Computes shopping progress metrics for a list of items.
 */
export function calculateActiveListMetrics(
  items: Array<{ is_checked: boolean | null }>
): ActiveListMetrics {
  const totalItems = items.length
  if (totalItems === 0) {
    return {
      totalItems: 0,
      checkedItems: 0,
      uncheckedItems: 0,
      progressPercentage: 0
    }
  }

  const checkedItems = items.filter((item) => !!item.is_checked).length
  const uncheckedItems = totalItems - checkedItems
  const progressPercentage = Math.round((checkedItems / totalItems) * 100)

  return {
    totalItems,
    checkedItems,
    uncheckedItems,
    progressPercentage
  }
}

/**
 * Determines the target list ID when opening the app or falling back after deletion.
 */
export function findDefaultOrFirstListId(lists: ShoppingListSummary[]): string | null {
  if (!lists || lists.length === 0) return null
  const defaultList = lists.find((l) => l.is_default)
  if (defaultList) return defaultList.id
  const sorted = sortActiveLists(lists)
  return sorted[0]?.id || null
}

/**
 * Determines the target list ID for cart transfer.
 * Priority:
 * 1. Default active list (if any list is marked as is_default = true)
 * 2. Last selected active list from store (if valid and present in lists)
 * 3. First list in the sorted lists array
 */
export function findTargetTransferListId(
  lists: ShoppingListSummary[],
  selectedActiveListId?: string | null
): string | null {
  if (!lists || lists.length === 0) return null

  // 1. Any list marked as default has top priority
  const defaultList = lists.find((l) => l.is_default)
  if (defaultList) return defaultList.id

  // 2. If no default exists, check last selected active list
  if (selectedActiveListId) {
    const selected = lists.find((l) => l.id === selectedActiveListId)
    if (selected) return selected.id
  }

  // 3. Fallback to first available list in sorted order
  const sorted = sortActiveLists(lists)
  return sorted[0]?.id || null
}
