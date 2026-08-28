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
 * Produces a deterministic category suffix for aggregation and lookup maps.
 * Ensures items belonging to different aisles (e.g. bakery vs other/miscellaneous)
 * are never incorrectly merged into the same aisle.
 */
export function getCategorySuffix(categoryId?: number | null, categoryName?: string): string {
  if (categoryId != null) {
    return `_cat_${categoryId}`
  }
  if (categoryName && categoryName.trim().toLowerCase() !== 'other') {
    return `_catname_${categoryName.trim().toLowerCase()}`
  }
  return '_cat_other'
}

/**
 * Aggregates duplicate items within a draft list by product_id or ad-hoc name,
 * strictly keeping items in different categories separate.
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

    const catSuffix = getCategorySuffix(item.category_id, item.category_name)
    const key = item.product_id
      ? `prod_${item.product_id}${catSuffix}`
      : `adhoc_${item.name.trim().toLowerCase()}${catSuffix}`
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
 * Finds a matching item in the existing active list for a draft item.
 * Strictly respects aisle separation: items with different explicit categories
 * will NOT merge, ensuring separate items for different supermarket aisles.
 */
function findMatchingExistingItem(
  existingItems: ActiveListItemWithProduct[],
  draft: { product_id?: string; name: string; is_ad_hoc: boolean; category_id?: number | null }
): ActiveListItemWithProduct | undefined {
  if (draft.product_id) {
    const candidates = existingItems.filter((item) => item.product_id === draft.product_id)
    if (candidates.length === 0) return undefined

    // If draft has an explicit category_id:
    if (draft.category_id != null) {
      // 1. Look for candidate with identical effective category_id
      const exactMatch = candidates.find((item) => {
        const itemCatId = item.category_id ?? item.category?.id ?? item.product?.category_id ?? null
        return itemCatId === draft.category_id
      })
      if (exactMatch) return exactMatch

      // 2. Or candidate with no category assigned (null)
      return candidates.find((item) => {
        const itemCatId = item.category_id ?? item.category?.id ?? item.product?.category_id ?? null
        return itemCatId === null
      })
    }

    // If draft has NO explicit category_id:
    // Match first available candidate (preferring one without specific category override)
    const noCatMatch = candidates.find((item) => {
      const itemCatId = item.category_id ?? item.category?.id ?? item.product?.category_id ?? null
      return itemCatId === null
    })
    return noCatMatch || candidates[0]
  }

  if (draft.is_ad_hoc) {
    const normalizedName = draft.name.trim().toLowerCase()
    const candidates = existingItems.filter((item) => {
      const existingName = (item.ad_hoc_name || item.product?.name || '').trim().toLowerCase()
      return existingName === normalizedName
    })
    if (candidates.length === 0) return undefined

    if (draft.category_id != null) {
      const exactMatch = candidates.find((item) => {
        const itemCatId = item.category_id ?? item.category?.id ?? item.product?.category_id ?? null
        return itemCatId === draft.category_id
      })
      if (exactMatch) return exactMatch

      return candidates.find((item) => {
        const itemCatId = item.category_id ?? item.category?.id ?? item.product?.category_id ?? null
        return itemCatId === null
      })
    }

    return candidates[0]
  }

  return undefined
}

/**
 * Merges incoming draft items into existing active list items.
 * - Sums quantities for items already present on the list in the same category/aisle.
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

  // Keep track of which existing items have already been matched and updated in this batch
  const updatedExistingIds = new Set<string>()

  for (const draft of aggregatedDraft) {
    const matchedItem = findMatchingExistingItem(
      existingItems.filter((item) => !updatedExistingIds.has(item.id)),
      draft
    )

    if (matchedItem) {
      updatedExistingIds.add(matchedItem.id)
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
