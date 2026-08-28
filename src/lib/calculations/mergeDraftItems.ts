import type { DraftItem } from '@/store/useShoppingStore'
import type { ActiveListItemWithProduct } from '@/services/shoppingListService'

export interface ItemToUpdate {
  id: string
  total_quantity: number
  is_checked: boolean
}

export interface ItemToInsert {
  product_id?: string
  total_quantity: number
  is_checked: boolean
  added_ad_hoc: boolean
  name: string
  category_id?: number | null
}

export interface MergeCalculationResult {
  itemsToUpdate: ItemToUpdate[]
  itemsToInsert: ItemToInsert[]
  mergedTotalCount: number
}

/**
 * Aggregates duplicate items within a draft list by product_id or ad-hoc name.
 */
export function aggregateDraftItems(draftItems: DraftItem[]): Array<{
  product_id?: string
  name: string
  quantity: number
  is_ad_hoc: boolean
  category_id?: number | null
}> {
  const aggregatedMap = new Map<
    string,
    { product_id?: string; name: string; quantity: number; is_ad_hoc: boolean; category_id?: number | null }
  >()

  for (const item of draftItems) {
    if (item.quantity <= 0) continue

    const catSuffix = item.category_id ? `_cat_${item.category_id}` : ''
    const key = item.product_id ? `prod_${item.product_id}${catSuffix}` : `adhoc_${item.name.trim().toLowerCase()}${catSuffix}`
    const existing = aggregatedMap.get(key)

    if (existing) {
      existing.quantity = Math.round((existing.quantity + item.quantity) * 10) / 10
      if (!existing.category_id && item.category_id) {
        existing.category_id = item.category_id
      }
    } else {
      aggregatedMap.set(key, {
        product_id: item.product_id,
        name: item.name.trim(),
        quantity: item.quantity,
        is_ad_hoc: !!item.is_ad_hoc,
        category_id: item.category_id ?? null
      })
    }
  }

  return Array.from(aggregatedMap.values())
}

/**
 * Merges incoming draft items into existing active list items.
 * - Sums quantities for items already present on the list.
 * - Resets `is_checked = false` for matched items so the newly added quantity is pending purchase.
 * - Collects unmatched items as new items to insert.
 */
export function mergeDraftItemsIntoActiveList(
  existingItems: ActiveListItemWithProduct[],
  draftItems: DraftItem[]
): MergeCalculationResult {
  const aggregatedDraft = aggregateDraftItems(draftItems)
  const itemsToUpdate: ItemToUpdate[] = []
  const itemsToInsert: ItemToInsert[] = []

  // Create lookup maps for existing items taking category_id into account
  const existingByProductId = new Map<string, ActiveListItemWithProduct>()
  const existingByAdHocName = new Map<string, ActiveListItemWithProduct>()

  for (const item of existingItems) {
    const catSuffix = item.category_id ? `_cat_${item.category_id}` : ''
    if (item.product_id) {
      existingByProductId.set(`${item.product_id}${catSuffix}`, item)
    } else if (item.product?.name) {
      existingByAdHocName.set(`${item.product.name.trim().toLowerCase()}${catSuffix}`, item)
    } else if (item.ad_hoc_name) {
      existingByAdHocName.set(`${item.ad_hoc_name.trim().toLowerCase()}${catSuffix}`, item)
    }
  }

  for (const draft of aggregatedDraft) {
    let matchedItem: ActiveListItemWithProduct | undefined
    const catSuffix = draft.category_id ? `_cat_${draft.category_id}` : ''

    if (draft.product_id && existingByProductId.has(`${draft.product_id}${catSuffix}`)) {
      matchedItem = existingByProductId.get(`${draft.product_id}${catSuffix}`)
    } else if (draft.is_ad_hoc && existingByAdHocName.has(`${draft.name.toLowerCase()}${catSuffix}`)) {
      matchedItem = existingByAdHocName.get(`${draft.name.toLowerCase()}${catSuffix}`)
    }

    if (matchedItem) {
      const newQuantity = Math.round((matchedItem.total_quantity + draft.quantity) * 10) / 10
      itemsToUpdate.push({
        id: matchedItem.id,
        total_quantity: newQuantity,
        is_checked: false // Reset checked status so user sees item to buy
      })
    } else {
      itemsToInsert.push({
        product_id: draft.product_id,
        total_quantity: draft.quantity,
        is_checked: false,
        added_ad_hoc: draft.is_ad_hoc,
        name: draft.name,
        category_id: draft.category_id ?? null
      })
    }
  }

  const mergedTotalCount = existingItems.length + itemsToInsert.length

  return {
    itemsToUpdate,
    itemsToInsert,
    mergedTotalCount
  }
}
