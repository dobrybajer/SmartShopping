import { supabase } from '@/lib/supabase'
import { trackLocalItemMutation } from '@/lib/realtime/localMutationTracker'
import type { MatchedHealedProduct, RawActiveListItemRow } from './shoppingListTypes'

const isUuid = (val?: string | null): val is string =>
  !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

export async function healUncategorizedListItems(
  rawItems: RawActiveListItemRow[],
  householdId: string | null | undefined
): Promise<void> {
  const uncategorizedItems = rawItems.filter(
    (item): item is RawActiveListItemRow & { product: NonNullable<RawActiveListItemRow['product']> } =>
      !item.category_id && Boolean(item.product) && !item.product?.category_id && Boolean(item.product?.name)
  )

  if (uncategorizedItems.length === 0 || !isUuid(householdId)) return

  const names = Array.from(new Set(uncategorizedItems.map((i) => i.product.name.trim())))

  const { data: matchedProds } = await supabase
    .from('products')
    .select(`
      id,
      name,
      category_id,
      category:product_categories(*)
    `)
    .eq('household_id', householdId)
    .in('name', names)
    .not('category_id', 'is', null)

  if (!matchedProds || matchedProds.length === 0) return

  const healedProducts = matchedProds as unknown as MatchedHealedProduct[]
  const prodByName = new Map<string, MatchedHealedProduct>()
  healedProducts.forEach((p) => prodByName.set(p.name.trim().toLowerCase(), p))

  for (const item of rawItems) {
    if (!item.category_id && item.product && !item.product.category_id) {
      const match = prodByName.get(item.product.name.trim().toLowerCase())
      if (match) {
        item.product.category_id = match.category_id
        item.product.category = match.category ?? undefined
        supabase
          .from('products')
          .update({ category_id: match.category_id })
          .eq('id', item.product.id)
          .then(() => {})
      }
    }
  }
}

export async function toggleItemChecked(
  itemId: string,
  isChecked: boolean,
  clientTimestamp?: string
): Promise<boolean> {
  try {
    trackLocalItemMutation(itemId, { is_checked: isChecked })
    const nowIso = new Date().toISOString()

    // OCC Concurrency Check (CRIT-02):
    // If user is attempting to uncheck (isChecked === false) and provided a clientTimestamp,
    // verify if another user checked it on the server after clientTimestamp.
    if (!isChecked && clientTimestamp) {
      const { data: serverItem } = await supabase
        .from('shopping_list_items')
        .select('is_checked, updated_at')
        .eq('id', itemId)
        .maybeSingle()

      if (
        serverItem &&
        serverItem.is_checked &&
        serverItem.updated_at &&
        serverItem.updated_at > clientTimestamp
      ) {
        console.warn(`[OCC Conflict] Item ${itemId} was checked concurrently. Preserving is_checked = true.`)
        return true
      }
    }

    const { error } = await supabase
      .from('shopping_list_items')
      .update({
        is_checked: isChecked,
        updated_at: nowIso
      })
      .eq('id', itemId)

    if (error) {
      console.error('Error updating item checked status:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Error in toggleItemChecked:', err)
    return false
  }
}

export async function toggleItemInPantry(itemId: string, inPantry: boolean): Promise<boolean> {
  trackLocalItemMutation(itemId, { in_pantry: inPantry })
  const { error } = await supabase
    .from('shopping_list_items')
    .update({ in_pantry: inPantry })
    .eq('id', itemId)

  if (error) {
    console.error('Error updating item in_pantry status:', error)
    return false
  }
  return true
}

export async function updateItemQuantity(itemId: string, totalQuantity: number): Promise<boolean> {
  trackLocalItemMutation(itemId, { total_quantity: totalQuantity })
  const { error } = await supabase
    .from('shopping_list_items')
    .update({ total_quantity: totalQuantity })
    .eq('id', itemId)

  if (error) {
    console.error('Error updating item quantity:', error)
    return false
  }
  return true
}

export async function deleteListItem(itemId: string): Promise<boolean> {
  trackLocalItemMutation(itemId)
  const { error } = await supabase
    .from('shopping_list_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    console.error('Error deleting list item:', error)
    return false
  }
  return true
}
