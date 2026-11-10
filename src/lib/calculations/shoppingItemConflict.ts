/**
 * Shopping List Item Conflict Resolution (CRIT-02: OCC)
 *
 * Core Business Rule:
 * In a multi-user household shopping simultaneously, if either partner
 * marked an item as checked (bought), it remains checked (`is_checked = true`).
 * A delayed or out-of-order network response or WebSocket update must never uncheck an
 * item that has already been purchased.
 */

export interface ShoppingConflictItem {
  id: string
  is_checked: boolean
  updated_at?: string | null
  total_quantity?: number
}

/**
 * Resolves concurrency conflicts between client and server/realtime shopping list item updates.
 */
export function resolveShoppingItemConflict<T extends ShoppingConflictItem>(
  currentItem: T,
  incomingItem: T
): T {
  // If either state marked the item as checked, it MUST remain checked
  const resolvedChecked = Boolean(currentItem.is_checked || incomingItem.is_checked)

  const currentTs = currentItem.updated_at ? new Date(currentItem.updated_at).getTime() : 0
  const incomingTs = incomingItem.updated_at ? new Date(incomingItem.updated_at).getTime() : 0

  // Base state is the fresher record by timestamp (or incoming if equal/missing)
  const baseItem = currentTs > incomingTs ? currentItem : incomingItem

  return {
    ...baseItem,
    is_checked: resolvedChecked,
    updated_at: currentTs > incomingTs ? currentItem.updated_at : incomingItem.updated_at
  }
}
