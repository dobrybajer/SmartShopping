import { supabase } from '@/lib/supabase'
import type { DraftItem } from '@/store/useShoppingStore'
import { sortHistoryListsByCompletionDate } from '@/lib/calculations/historyStatusCalculations'
import { notificationService } from '../notificationService'
import { pantryService } from '../pantryService'
import { translate } from '@/i18n'
import { trackLocalListMutation } from '@/lib/realtime/localMutationTracker'
import type {
  ActiveListItemWithProduct,
  ArchivedItemsSnapshot,
  ArchiveRpcResult,
  HistoryShoppingList,
  RawActiveListItemRow,
  ShoppingList
} from './shoppingListTypes'

async function dispatchArchiveNotification(
  listId: string,
  householdId: string,
  listName?: string | null
): Promise<void> {
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser()
    const clearedByName =
      user?.user_metadata?.name || user?.email?.split('@')[0] || translate('common.householdMember')
    await notificationService.notify(
      'LIST_CLEARED_OR_ARCHIVED',
      {
        listId,
        listName: listName || translate('common.shoppingList'),
        clearedByName,
        action: 'archived'
      },
      householdId
    )
  } catch (e) {
    console.warn('[shoppingListService] Failed to dispatch archive push notification:', e)
  }
}

function isMissingRpcError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === 'PGRST202' || error.code === '42883') return true
  const msg = (error.message || '').toLowerCase()
  return (
    msg.includes('could not find the function') ||
    (msg.includes('function') && msg.includes('does not exist')) ||
    msg.includes('function not found')
  )
}

async function archiveActiveListLegacyFallback(
  listId: string,
  householdId: string
): Promise<DraftItem[]> {
  const { data: currentList } = await supabase
    .from('shopping_lists')
    .select('name, original_name')
    .eq('id', listId)
    .maybeSingle()

  const originalName = currentList?.original_name || currentList?.name || null
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('shopping_lists')
    .update({
      status: 'archived',
      is_default: false,
      completed_at: now,
      updated_at: now,
      original_name: originalName
    })
    .eq('id', listId)

  if (error) {
    console.error('Error archiving list:', error)
    return []
  }

  await dispatchArchiveNotification(listId, householdId, currentList?.name)

  try {
    const { data: checkedItems } = await supabase
      .from('shopping_list_items')
      .select(`
        id,
        product_id,
        total_quantity,
        is_checked,
        in_pantry,
        added_ad_hoc,
        category_id,
        product:products(
          id,
          name,
          unit_type,
          category_id
        )
      `)
      .eq('shopping_list_id', listId)
      .eq('is_checked', true)

    if (checkedItems && checkedItems.length > 0) {
      const typedChecked = checkedItems as unknown as ActiveListItemWithProduct[]
      const itemsToIngest = typedChecked
        .filter((item) => !item.in_pantry)
        .map((item) => ({
          product_id: item.product_id || item.product?.id || null,
          ad_hoc_name: !item.product_id && item.product?.name ? item.product.name : null,
          quantity: item.total_quantity,
          unit_type: item.product?.unit_type || 'pcs',
          category_id: item.category_id || item.product?.category_id || null
        }))

      if (itemsToIngest.length > 0) {
        await pantryService.batchIngestPurchasedItems(householdId, itemsToIngest)
      }
    }
  } catch (ingestErr) {
    console.warn('[shoppingListService.archiveActiveList] Failed auto-ingesting into pantry:', ingestErr)
  }

  const { data: uncheckedItems } = await supabase
    .from('shopping_list_items')
    .select(`
      *,
      category:product_categories(*),
      product:products(
        id,
        name,
        unit_type,
        category_id,
        category:product_categories(*)
      )
    `)
    .eq('shopping_list_id', listId)
    .eq('is_checked', false)

  const remainingDraftItems: DraftItem[] = []

  if (uncheckedItems && uncheckedItems.length > 0) {
    const typedUnchecked = uncheckedItems as unknown as ActiveListItemWithProduct[]
    typedUnchecked
      .filter((item) => !item.in_pantry)
      .forEach((item) => {
        if (item.product) {
          const catId =
            item.category_id ??
            item.category?.id ??
            item.product.category_id ??
            item.product.category?.id ??
            undefined
          const catName = item.category?.name || item.product.category?.name || 'other'
          const catSortOrder = item.category?.sort_order ?? item.product.category?.sort_order ?? 99

          remainingDraftItems.push({
            id: `archived_rem_${item.id}`,
            product_id: item.product.id,
            name: item.product.name,
            unit_type: item.product.unit_type,
            category_id: catId,
            category_name: catName,
            sort_order: catSortOrder,
            quantity: item.total_quantity,
            is_ad_hoc: Boolean(item.added_ad_hoc)
          })
        }
      })
  }

  return remainingDraftItems
}

export async function archiveActiveList(listId: string, householdId: string): Promise<DraftItem[]> {
  trackLocalListMutation(listId)

  const { data: rpcData, error: rpcError } = await supabase.rpc('archive_shopping_list', {
    p_list_id: listId,
    p_household_id: householdId
  })

  if (!rpcError && rpcData && typeof rpcData === 'object') {
    const parsed = rpcData as unknown as ArchiveRpcResult
    await dispatchArchiveNotification(listId, householdId, parsed.list_name)

    const unchecked = Array.isArray(parsed.unchecked_items) ? parsed.unchecked_items : []
    return unchecked.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      name: item.name,
      unit_type: item.unit_type || 'pcs',
      category_id: item.category_id ?? undefined,
      category_name: item.category_name || 'other',
      sort_order: item.sort_order ?? 99,
      quantity: Number(item.quantity || 0),
      is_ad_hoc: Boolean(item.is_ad_hoc)
    }))
  }

  if (rpcError) {
    if (isMissingRpcError(rpcError)) {
      return archiveActiveListLegacyFallback(listId, householdId)
    }
    console.error('Error archiving list via RPC:', rpcError)
    return []
  }

  return archiveActiveListLegacyFallback(listId, householdId)
}

export async function getHistoryLists(householdId: string): Promise<HistoryShoppingList[]> {
  const { data, error } = await supabase
    .from('shopping_lists')
    .select(`
      *,
      items:shopping_list_items(
        id,
        is_checked
      )
    `)
    .eq('household_id', householdId)
    .eq('status', 'archived')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching shopping list history:', error)
    return []
  }
  const lists = ((data as unknown) || []) as HistoryShoppingList[]
  const hydratedLists = lists.map((list) => {
    if (list.items && list.items.length > 0) {
      return list
    }
    if (list.archived_items_snapshot && typeof list.archived_items_snapshot === 'object') {
      const snapshot = list.archived_items_snapshot as unknown as ArchivedItemsSnapshot
      if (Array.isArray(snapshot.items) && snapshot.items.length > 0) {
        return {
          ...list,
          items: snapshot.items.map((item, idx) => ({
            id: item.id || `${list.id}_snap_${idx}`,
            is_checked: Boolean(item.is_checked || item.in_pantry)
          }))
        }
      }
      if (typeof snapshot.total_items === 'number' && snapshot.total_items > 0) {
        const checked = Math.min(
          snapshot.total_items,
          Math.max(0, Number(snapshot.checked_items ?? 0))
        )
        return {
          ...list,
          items: Array.from({ length: snapshot.total_items }, (_, idx) => ({
            id: `${list.id}_snap_${idx}`,
            is_checked: idx < checked
          }))
        }
      }
    }
    return list
  })
  return sortHistoryListsByCompletionDate(hydratedLists)
}

export async function loadArchivedFallbackItems(listData: ShoppingList): Promise<RawActiveListItemRow[]> {
  const archiveTable = supabase.from('shopping_list_items_archive')
  if (archiveTable && typeof archiveTable.select === 'function') {
    const { data: archiveData, error: archiveErr } = await archiveTable
      .select(`
        *,
        category:product_categories(*),
        product:products(
          id,
          name,
          unit_type,
          category_id,
          category:product_categories(*)
        )
      `)
      .eq('shopping_list_id', listData.id)

    if (archiveErr) {
      console.error('Error fetching archived shopping list items:', archiveErr)
    } else if (archiveData && archiveData.length > 0) {
      return archiveData as unknown as RawActiveListItemRow[]
    }
  }

  if (
    listData.archived_items_snapshot &&
    typeof listData.archived_items_snapshot === 'object'
  ) {
    const snapshot = listData.archived_items_snapshot as unknown as ArchivedItemsSnapshot
    if (Array.isArray(snapshot.items) && snapshot.items.length > 0) {
      return snapshot.items.map((snap, idx) => ({
        id: snap.id || `${listData.id}_snap_${idx}`,
        shopping_list_id: listData.id,
        product_id: snap.product_id ?? null,
        category_id: null,
        total_quantity: Number(snap.total_quantity ?? 1),
        is_checked: Boolean(snap.is_checked),
        in_pantry: Boolean(snap.in_pantry),
        added_ad_hoc: false,
        meal_plan_item_id: null,
        updated_at: listData.updated_at
      }))
    }
  }

  return []
}
