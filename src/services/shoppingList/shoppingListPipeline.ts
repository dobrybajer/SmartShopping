import { supabase } from '@/lib/supabase'
import type {
  ArchivedItemsSnapshot,
  CalendarPipelineItems,
  ShoppingListItem
} from './shoppingListTypes'

interface PipelineListJoinRow {
  id: string
  status: 'draft' | 'active' | 'archived' | null
  updated_at: string | null
  archived_items_snapshot?: unknown
  items?: ShoppingListItem[] | null
}

/**
 * Fetches shopping_list_items from active and recent archived lists for calendar pipeline status calculation.
 * Falls back to `shopping_list_items_archive` or `archived_items_snapshot` if rows were purged on archive.
 */
export async function getCalendarPipelineItems(
  householdId: string
): Promise<CalendarPipelineItems> {
  if (!householdId) {
    return { activeListItems: [], archivedListItems: [] }
  }

  const { data, error } = await supabase
    .from('shopping_lists')
    .select(`
      id,
      status,
      updated_at,
      archived_items_snapshot,
      items:shopping_list_items(
        id,
        shopping_list_id,
        product_id,
        total_quantity,
        is_checked,
        added_ad_hoc,
        category_id,
        in_pantry,
        meal_plan_item_id,
        updated_at
      )
    `)
    .eq('household_id', householdId)
    .in('status', ['active', 'archived'])
    .order('updated_at', { ascending: false })
    .limit(30)

  if (error || !data) {
    if (error) {
      console.error('[shoppingListPipeline] Error fetching calendar pipeline items:', error)
    }
    return { activeListItems: [], archivedListItems: [] }
  }

  const rows = data as unknown as PipelineListJoinRow[]
  const activeListItems: ShoppingListItem[] = []
  const archivedListItems: ShoppingListItem[] = []
  const archivedListsNeedingFallback: PipelineListJoinRow[] = []

  for (const list of rows) {
    const items = Array.isArray(list.items) ? list.items : []
    if (list.status === 'active') {
      activeListItems.push(...items)
    } else if (list.status === 'archived') {
      if (items.length > 0) {
        archivedListItems.push(...items)
      } else {
        archivedListsNeedingFallback.push(list)
      }
    }
  }

  if (archivedListsNeedingFallback.length > 0) {
    const fallbackIds = archivedListsNeedingFallback.map((l) => l.id)
    const archiveRowsByListId = new Map<string, ShoppingListItem[]>()
    const archiveTable = supabase.from('shopping_list_items_archive')

    if (archiveTable && typeof archiveTable.select === 'function') {
      const { data: archiveData } = await archiveTable
        .select(
          'id, shopping_list_id, product_id, total_quantity, is_checked, added_ad_hoc, category_id, in_pantry, meal_plan_item_id, updated_at'
        )
        .in('shopping_list_id', fallbackIds)

      if (Array.isArray(archiveData)) {
        for (const row of archiveData as unknown as ShoppingListItem[]) {
          const listKey = row.shopping_list_id || ''
          const existing = archiveRowsByListId.get(listKey) || []
          existing.push(row)
          archiveRowsByListId.set(listKey, existing)
        }
      }
    }

    for (const list of archivedListsNeedingFallback) {
      const archivedFromTable = archiveRowsByListId.get(list.id)
      if (archivedFromTable && archivedFromTable.length > 0) {
        archivedListItems.push(...archivedFromTable)
        continue
      }
      if (list.archived_items_snapshot && typeof list.archived_items_snapshot === 'object') {
        const snapshot = list.archived_items_snapshot as ArchivedItemsSnapshot
        if (Array.isArray(snapshot.items)) {
          snapshot.items.forEach((snap, idx) => {
            archivedListItems.push({
              id: snap.id || `${list.id}_snap_${idx}`,
              shopping_list_id: list.id,
              product_id: snap.product_id ?? null,
              total_quantity: Number(snap.total_quantity ?? 1),
              is_checked: Boolean(snap.is_checked),
              added_ad_hoc: false,
              category_id: null,
              in_pantry: Boolean(snap.in_pantry),
              meal_plan_item_id: snap.meal_plan_item_id ?? null,
              updated_at: list.updated_at
            })
          })
        }
      }
    }
  }

  return { activeListItems, archivedListItems }
}
