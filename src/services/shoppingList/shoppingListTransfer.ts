import { supabase } from '@/lib/supabase'
import type { DraftItem } from '@/store/useShoppingStore'
import { mergeDraftItemsIntoActiveList, aggregateDraftItems } from '@/lib/calculations/mergeDraftItems'
import { notificationService } from '../notificationService'
import { translate } from '@/i18n'
import {
  trackLocalItemMutation,
  trackLocalListMutation
} from '@/lib/realtime/localMutationTracker'
import type { ActiveListWithDetails } from './shoppingListTypes'

interface ShoppingListItemInsertRow {
  shopping_list_id: string
  product_id: string
  total_quantity: number
  is_checked: boolean
  added_ad_hoc: boolean
  category_id: number | null
  meal_plan_item_id: string | null
}

function buildAdHocKey(name: string, categoryId?: number | null): string {
  return `${name.trim().toLowerCase()}::${categoryId ?? 'null'}`
}

async function batchResolveAdHocProductIds(
  householdId: string,
  candidates: Array<{ name: string; category_id?: number | null }>
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>()
  if (candidates.length === 0) return resolved

  const uniqueCandidates = new Map<string, { name: string; categoryId: number | null }>()
  for (const item of candidates) {
    const categoryId = item.category_id ?? null
    const key = buildAdHocKey(item.name, categoryId)
    if (!uniqueCandidates.has(key)) {
      uniqueCandidates.set(key, { name: item.name, categoryId })
    }
  }

  const { data: existingProducts } = await supabase
    .from('products')
    .select('id, name, category_id')
    .eq('household_id', householdId)

  const existingByLowerName = new Map<string, Array<{ id: string; category_id: number | null }>>()
  for (const prod of existingProducts || []) {
    const lowerName = prod.name.trim().toLowerCase()
    const list = existingByLowerName.get(lowerName)
    const entry = { id: prod.id, category_id: prod.category_id ?? null }
    if (list) list.push(entry)
    else existingByLowerName.set(lowerName, [entry])
  }

  const categoryBackfills: Array<{ id: string; categoryId: number }> = []
  const productsToInsert: Array<{
    key: string
    payload: {
      household_id: string
      name: string
      unit_type: 'pcs'
      category_id: number | null
      is_ad_hoc: boolean
    }
  }> = []

  for (const [key, candidate] of uniqueCandidates.entries()) {
    const lowerName = candidate.name.trim().toLowerCase()
    const matches = existingByLowerName.get(lowerName) || []
    const matched = matches.find(
      (prod) => !candidate.categoryId || !prod.category_id || prod.category_id === candidate.categoryId
    )

    if (matched) {
      resolved.set(key, matched.id)
      if (!matched.category_id && candidate.categoryId) {
        matched.category_id = candidate.categoryId
        categoryBackfills.push({ id: matched.id, categoryId: candidate.categoryId })
      }
    } else {
      productsToInsert.push({
        key,
        payload: {
          household_id: householdId,
          name: candidate.name,
          unit_type: 'pcs',
          category_id: candidate.categoryId,
          is_ad_hoc: true
        }
      })
    }
  }

  if (categoryBackfills.length > 0) {
    await Promise.all(
      categoryBackfills.map(({ id, categoryId }) =>
        supabase.from('products').update({ category_id: categoryId }).eq('id', id)
      )
    )
  }

  if (productsToInsert.length > 0) {
    const { data: inserted } = await supabase
      .from('products')
      .insert(productsToInsert.map((entry) => entry.payload))
      .select('id')

    if (inserted) {
      inserted.forEach((row, index) => {
        const entry = productsToInsert[index]
        if (entry && row?.id) {
          resolved.set(entry.key, row.id)
        }
      })
    }
  }

  return resolved
}

async function insertShoppingListItemsWithFallback(
  rowsToInsert: ShoppingListItemInsertRow[],
  errorPrefix: string
): Promise<void> {
  if (rowsToInsert.length === 0) return

  const { error: insertErr } = await supabase
    .from('shopping_list_items')
    .insert(rowsToInsert)

  if (insertErr) {
    if (insertErr.code === '42703') {
      const fallbackRows = rowsToInsert.map(({ category_id: _cat, ...rest }) => rest)
      const { error: retryErr } = await supabase
        .from('shopping_list_items')
        .insert(fallbackRows)
      if (retryErr) {
        console.error(`${errorPrefix} (fallback):`, retryErr)
      }
    } else {
      console.error(`${errorPrefix}:`, insertErr)
    }
  }
}

export async function insertDraftItemsToList(
  shoppingListId: string,
  householdId: string,
  draftItems: DraftItem[]
): Promise<void> {
  const aggregated = aggregateDraftItems(draftItems)
  const adHocNeedingResolution = aggregated.filter((item) => !item.product_id && item.is_ad_hoc)
  const resolvedAdHocIds = await batchResolveAdHocProductIds(householdId, adHocNeedingResolution)

  const itemsToInsert: ShoppingListItemInsertRow[] = []

  for (const item of aggregated) {
    const productId =
      item.product_id ||
      (item.is_ad_hoc
        ? resolvedAdHocIds.get(buildAdHocKey(item.name, item.category_id))
        : undefined)

    if (productId) {
      itemsToInsert.push({
        shopping_list_id: shoppingListId,
        product_id: productId,
        total_quantity: item.quantity,
        is_checked: false,
        added_ad_hoc: item.is_ad_hoc,
        category_id: item.category_id || null,
        meal_plan_item_id: item.meal_plan_item_id || null
      })
    }
  }

  await insertShoppingListItemsWithFallback(itemsToInsert, 'Error adding shopping list items')
}

export async function addItemsToActiveList(
  listId: string,
  householdId: string,
  draftItems: DraftItem[],
  fetchListWithDetails: (id: string) => Promise<ActiveListWithDetails | null>
): Promise<ActiveListWithDetails | null> {
  if (!draftItems || draftItems.length === 0) {
    return fetchListWithDetails(listId)
  }

  const existingList = await fetchListWithDetails(listId)
  if (!existingList) {
    console.error('Target active list not found:', listId)
    return null
  }

  const { itemsToUpdate, itemsToInsert } = mergeDraftItemsIntoActiveList(
    existingList.items,
    draftItems
  )

  // 1. Update existing items concurrently (zero sequential N+1 loops)
  if (itemsToUpdate.length > 0) {
    for (const update of itemsToUpdate) {
      trackLocalItemMutation(update.id, {
        total_quantity: update.total_quantity,
        is_checked: update.is_checked
      })
    }
    await Promise.all(
      itemsToUpdate.map((update) =>
        supabase
          .from('shopping_list_items')
          .update({
            total_quantity: update.total_quantity,
            is_checked: update.is_checked
          })
          .eq('id', update.id)
      )
    )
  }

  // 2. Insert new items in a single batch (resolving ad-hoc products in bulk first)
  if (itemsToInsert.length > 0) {
    const adHocNeedingResolution = itemsToInsert.filter((item) => !item.product_id && item.added_ad_hoc)
    const resolvedAdHocIds = await batchResolveAdHocProductIds(householdId, adHocNeedingResolution)

    const rowsToInsert: ShoppingListItemInsertRow[] = []
    for (const item of itemsToInsert) {
      const productId =
        item.product_id ||
        (item.added_ad_hoc
          ? resolvedAdHocIds.get(buildAdHocKey(item.name, item.category_id))
          : undefined)

      if (productId) {
        rowsToInsert.push({
          shopping_list_id: listId,
          product_id: productId,
          total_quantity: item.total_quantity,
          is_checked: false,
          added_ad_hoc: item.added_ad_hoc,
          category_id: item.category_id || null,
          meal_plan_item_id: item.meal_plan_item_id || null
        })
      }
    }

    await insertShoppingListItemsWithFallback(rowsToInsert, 'Error inserting merged items')
  }

  // 3. Touch updated_at on the shopping list
  trackLocalListMutation(listId)
  await supabase
    .from('shopping_lists')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', listId)

  // 4. Notify household members of new items added
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser()
    const addedByName =
      user?.user_metadata?.name || user?.email?.split('@')[0] || translate('common.householdMember')
    const itemSummary =
      draftItems.length === 1
        ? draftItems[0].name
        : `${draftItems[0].name} (+${draftItems.length - 1})`

    await notificationService.notify(
      'LIST_ITEM_ADDED',
      {
        listId,
        listName: existingList.name || translate('common.shoppingList'),
        itemName: itemSummary,
        addedByName
      },
      householdId
    )
  } catch (e) {
    console.warn('[shoppingListService] Failed to dispatch push notification:', e)
  }

  return fetchListWithDetails(listId)
}
