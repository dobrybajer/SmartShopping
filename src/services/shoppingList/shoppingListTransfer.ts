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

async function resolveOrCreateAdHocProductId(
  householdId: string,
  name: string,
  categoryId?: number | null
): Promise<string | undefined> {
  const { data: existingProd } = await supabase
    .from('products')
    .select('id, category_id')
    .eq('household_id', householdId)
    .ilike('name', name.trim())
    .maybeSingle()

  // If an existing product has the same category (or no category), reuse it.
  // If the existing product has a DIFFERENT category, create an ad-hoc product with the temporary category
  // to preserve the user's intended aisle!
  if (
    existingProd &&
    (!categoryId || !existingProd.category_id || existingProd.category_id === categoryId)
  ) {
    if (!existingProd.category_id && categoryId) {
      await supabase
        .from('products')
        .update({ category_id: categoryId })
        .eq('id', existingProd.id)
    }
    return existingProd.id
  }

  const { data: adHocProduct } = await supabase
    .from('products')
    .insert({
      household_id: householdId,
      name,
      unit_type: 'pcs',
      category_id: categoryId || null,
      is_ad_hoc: true
    })
    .select('id')
    .single()

  return adHocProduct?.id
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
  const itemsToInsert: ShoppingListItemInsertRow[] = []

  for (const item of aggregated) {
    let productId = item.product_id

    if (!productId && item.is_ad_hoc) {
      productId = await resolveOrCreateAdHocProductId(householdId, item.name, item.category_id)
    }

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

  // 1. Update existing items
  for (const update of itemsToUpdate) {
    trackLocalItemMutation(update.id, {
      total_quantity: update.total_quantity,
      is_checked: update.is_checked
    })
    await supabase
      .from('shopping_list_items')
      .update({
        total_quantity: update.total_quantity,
        is_checked: update.is_checked
      })
      .eq('id', update.id)
  }

  // 2. Insert new items (create ad-hoc products if needed)
  if (itemsToInsert.length > 0) {
    const rowsToInsert: ShoppingListItemInsertRow[] = []
    for (const item of itemsToInsert) {
      let productId = item.product_id

      if (!productId && item.added_ad_hoc) {
        productId = await resolveOrCreateAdHocProductId(householdId, item.name, item.category_id)
      }

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
