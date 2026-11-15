import type { ActiveListWithDetails, ShoppingListSummary } from '@/services/shoppingListService'
import { shoppingListService } from '@/services/shoppingListService'
import { resolveShoppingItemConflict } from '@/lib/calculations/shoppingItemConflict'
import { sortActiveLists } from '@/lib/calculations/activeListCalculations'
import { useShoppingStore } from '@/store/useShoppingStore'
import type { ActiveListRealtimeHandlers } from '@/hooks/useActiveListRealtime'

export interface ShoppingListItemRealtimeRow {
  id: string
  shopping_list_id?: string | null
  product_id?: string | null
  total_quantity?: number
  is_checked?: boolean | null
  in_pantry?: boolean | null
  category_id?: number | null
  updated_at?: string | null
}

function recalculateSummaries(
  summaries: ShoppingListSummary[],
  nextList: ActiveListWithDetails
): ShoppingListSummary[] {
  const totalItems = nextList.items.length
  const uncheckedItems = nextList.items.filter((i) => !i.is_checked && !i.in_pantry).length
  const updated = summaries.map((s) =>
    s.id === nextList.id
      ? {
          ...s,
          total_items: totalItems,
          unchecked_items: uncheckedItems
        }
      : s
  )
  return sortActiveLists(updated)
}

/**
 * Applies a single-item realtime UPDATE diff to the currently open active list,
 * respecting CRIT-02 OCC conflict resolution and updating summary badges without extra GET requests.
 */
export function applyActiveListItemUpdate(
  activeList: ActiveListWithDetails | null,
  incomingRow: ShoppingListItemRealtimeRow,
  summaries: ShoppingListSummary[]
): {
  nextList: ActiveListWithDetails | null
  nextSummaries: ShoppingListSummary[] | null
  needsFullRefresh: boolean
} {
  if (!activeList || !incomingRow.id) {
    return { nextList: null, nextSummaries: null, needsFullRefresh: false }
  }

  const existing = activeList.items.find((item) => item.id === incomingRow.id)
  if (!existing) {
    return { nextList: activeList, nextSummaries: null, needsFullRefresh: true }
  }

  // If category override changed to a different ID, fetch relational category metadata once
  if (
    incomingRow.category_id !== undefined &&
    incomingRow.category_id !== existing.category_id
  ) {
    return { nextList: activeList, nextSummaries: null, needsFullRefresh: true }
  }

  const resolved = resolveShoppingItemConflict(
    {
      id: existing.id,
      is_checked: Boolean(existing.is_checked),
      updated_at: existing.updated_at,
      total_quantity: existing.total_quantity
    },
    {
      id: incomingRow.id,
      is_checked:
        incomingRow.is_checked !== undefined
          ? Boolean(incomingRow.is_checked)
          : Boolean(existing.is_checked),
      updated_at: incomingRow.updated_at ?? existing.updated_at,
      total_quantity:
        incomingRow.total_quantity !== undefined
          ? Number(incomingRow.total_quantity)
          : existing.total_quantity
    }
  )

  const nextItems = activeList.items.map((item) =>
    item.id === incomingRow.id
      ? {
          ...item,
          is_checked: resolved.is_checked,
          total_quantity: resolved.total_quantity ?? item.total_quantity,
          in_pantry:
            incomingRow.in_pantry !== undefined ? incomingRow.in_pantry : item.in_pantry,
          updated_at: resolved.updated_at ?? item.updated_at
        }
      : item
  )

  const nextList: ActiveListWithDetails = {
    ...activeList,
    items: nextItems
  }

  return {
    nextList,
    nextSummaries: recalculateSummaries(summaries, nextList),
    needsFullRefresh: false
  }
}

/**
 * Applies a single-item realtime DELETE diff to the currently open active list.
 */
export function applyActiveListItemDelete(
  activeList: ActiveListWithDetails | null,
  deletedItemId: string,
  summaries: ShoppingListSummary[]
): {
  nextList: ActiveListWithDetails | null
  nextSummaries: ShoppingListSummary[] | null
} {
  if (!activeList || !deletedItemId) {
    return { nextList: null, nextSummaries: null }
  }

  const existed = activeList.items.some((item) => item.id === deletedItemId)
  if (!existed) {
    return { nextList: null, nextSummaries: null }
  }

  const nextList: ActiveListWithDetails = {
    ...activeList,
    items: activeList.items.filter((item) => item.id !== deletedItemId)
  }

  return {
    nextList,
    nextSummaries: recalculateSummaries(summaries, nextList)
  }
}

export function createActiveListRealtimeHandlers(params: {
  householdId: string | null | undefined
  getActiveList: () => ActiveListWithDetails | null
  setActiveList: (list: ActiveListWithDetails | null) => void
  setActiveListsSummary: (summaries: ShoppingListSummary[]) => void
}): ActiveListRealtimeHandlers {
  const { householdId, getActiveList, setActiveList, setActiveListsSummary } = params

  const onRefreshRequired = () => {
    if (!householdId) return
    shoppingListService.getActiveListsSummary(householdId).then((summaries) => {
      setActiveListsSummary(sortActiveLists(summaries))
      const currentListId = getActiveList()?.id
      if (currentListId) {
        shoppingListService.getListWithDetails(currentListId).then((fresh) => {
          if (fresh) setActiveList(fresh)
        })
      }
    })
  }

  const onItemUpdated = (row: ShoppingListItemRealtimeRow) => {
    const current = getActiveList()
    const result = applyActiveListItemUpdate(
      current,
      row,
      useShoppingStore.getState().activeListsSummary
    )
    if (result.needsFullRefresh && current?.id) {
      shoppingListService.getListWithDetails(current.id).then((fresh) => {
        if (fresh) setActiveList(fresh)
      })
      return
    }
    if (result.nextList) {
      setActiveList(result.nextList)
    }
    if (result.nextSummaries) {
      setActiveListsSummary(result.nextSummaries)
    }
  }

  const onItemDeleted = (itemId: string) => {
    const result = applyActiveListItemDelete(
      getActiveList(),
      itemId,
      useShoppingStore.getState().activeListsSummary
    )
    if (result.nextList) {
      setActiveList(result.nextList)
    }
    if (result.nextSummaries) {
      setActiveListsSummary(result.nextSummaries)
    }
  }

  return {
    onRefreshRequired,
    onItemUpdated,
    onItemDeleted
  }
}
