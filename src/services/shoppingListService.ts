import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import type { DraftItem } from '@/store/useShoppingStore'
import { formatDate, getLocalDateISOString } from '@/lib/utils'
import { translate } from '@/i18n'
import { trackLocalListMutation } from '@/lib/realtime/localMutationTracker'
import {
  archiveActiveList,
  getHistoryLists,
  loadArchivedFallbackItems
} from './shoppingList/shoppingListArchive'
import { getCalendarPipelineItems } from './shoppingList/shoppingListPipeline'
import {
  addItemsToActiveList,
  insertDraftItemsToList
} from './shoppingList/shoppingListTransfer'
import {
  deleteListItem,
  healUncategorizedListItems,
  toggleItemChecked,
  toggleItemInPantry,
  updateItemQuantity
} from './shoppingList/shoppingListItems'
import type {
  ActiveListItemWithProduct,
  ActiveListWithDetails,
  CalendarPipelineItems,
  HistoryListItemSummary,
  HistoryShoppingList,
  RawActiveListItemRow,
  ShoppingList,
  ShoppingListItem,
  ShoppingListSummary,
  SummaryListJoinRow
} from './shoppingList/shoppingListTypes'

export type {
  ActiveListItemWithProduct,
  ActiveListWithDetails,
  CalendarPipelineItems,
  HistoryListItemSummary,
  HistoryShoppingList,
  ShoppingList,
  ShoppingListItem,
  ShoppingListSummary
}

export const shoppingListService = {
  /**
   * Fetches lightweight summary of all active lists for the household (for tabs/chips/badges).
   */
  async getActiveListsSummary(householdId: string): Promise<ShoppingListSummary[]> {
    const { data, error } = await supabase
      .from('shopping_lists')
      .select(`
        id,
        household_id,
        name,
        status,
        is_default,
        target_date,
        created_at,
        updated_at,
        items:shopping_list_items(id, is_checked, in_pantry)
      `)
      .eq('household_id', householdId)
      .eq('status', 'active')
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching active lists summary:', error)
      return []
    }

    const rows = (data ?? []) as unknown as SummaryListJoinRow[]
    return rows.map((list) => {
      const items = list.items || []
      const uncheckedCount = items.filter((i) => !i.is_checked && !i.in_pantry).length
      return {
        id: list.id,
        household_id: list.household_id || householdId,
        name: list.name || translate('common.shoppingList'),
        status: list.status || 'active',
        is_default: !!list.is_default,
        target_date: list.target_date,
        created_at: list.created_at,
        updated_at: list.updated_at,
        total_items: items.length,
        unchecked_items: uncheckedCount
      }
    })
  },

  /**
   * Fetches the active list for the household. If preferredListId is supplied, fetches that one.
   * Otherwise fetches default active list (or newest active list).
   */
  async getActiveList(
    householdId: string,
    preferredListId?: string | null
  ): Promise<ActiveListWithDetails | null> {
    if (preferredListId) {
      const details = await this.getListWithDetails(preferredListId)
      if (details && details.household_id === householdId && details.status === 'active') {
        return details
      }
    }

    const { data: listData, error: listErr } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('household_id', householdId)
      .eq('status', 'active')
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (listErr) {
      console.error('Error fetching active shopping list:', listErr)
      return null
    }

    if (!listData) return null

    return this.getListWithDetails(listData.id)
  },

  /**
   * Fetches a specific shopping list along with all its items and product metadata.
   */
  async getListWithDetails(listId: string): Promise<ActiveListWithDetails | null> {
    const { data: listData, error: listErr } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('id', listId)
      .maybeSingle()

    if (listErr || !listData) {
      console.error('Error fetching list details:', listErr)
      return null
    }

    const { data: itemsData, error: itemsErr } = await supabase
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
      .eq('shopping_list_id', listData.id)

    if (itemsErr) {
      console.error('Error fetching shopping list items:', itemsErr)
    }

    let rawItems = (itemsData ?? []) as unknown as RawActiveListItemRow[]

    if (rawItems.length === 0 && listData.status === 'archived') {
      rawItems = await loadArchivedFallbackItems(listData)
    }

    await healUncategorizedListItems(rawItems, listData.household_id)

    return {
      ...listData,
      is_default: !!listData.is_default,
      items: rawItems.map((item) => ({
        ...item,
        category_id: item.category_id ?? null,
        in_pantry: !!item.in_pantry,
        category: item.category ?? null,
        product: item.product
      }))
    }
  },

  /**
   * Creates a brand new active list from draft items WITHOUT archiving existing lists.
   */
  async createActiveListFromDraft(
    householdId: string,
    listName: string,
    draftItems: DraftItem[],
    isDefault = false
  ): Promise<ActiveListWithDetails | null> {
    if (!draftItems || draftItems.length === 0) return null

    if (isDefault) {
      await supabase
        .from('shopping_lists')
        .update({ is_default: false })
        .eq('household_id', householdId)
        .eq('status', 'active')
    }

    const { data: newList, error: listErr } = await supabase
      .from('shopping_lists')
      .insert({
        household_id: householdId,
        name: listName.trim() || `${translate('common.shoppingList')} ${formatDate(new Date())}`,
        status: 'active',
        is_default: isDefault,
        target_date: getLocalDateISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single()

    if (listErr || !newList) {
      console.error('Error creating active shopping list:', listErr)
      return null
    }

    await this._insertDraftItemsToList(newList.id, householdId, draftItems)

    return this.getListWithDetails(newList.id)
  },

  /**
   * Creates a new empty active list directly from the UI.
   */
  async createEmptyActiveList(
    householdId: string,
    listName: string,
    isDefault = false
  ): Promise<ActiveListWithDetails | null> {
    if (isDefault) {
      await supabase
        .from('shopping_lists')
        .update({ is_default: false })
        .eq('household_id', householdId)
        .eq('status', 'active')
    }

    const { data: newList, error: listErr } = await supabase
      .from('shopping_lists')
      .insert({
        household_id: householdId,
        name: listName.trim() || `${translate('common.shoppingList')} ${formatDate(new Date())}`,
        status: 'active',
        is_default: isDefault,
        target_date: getLocalDateISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single()

    if (listErr || !newList) {
      console.error('Error creating empty active list:', listErr)
      return null
    }

    return {
      ...newList,
      is_default: !!newList.is_default,
      items: []
    }
  },

  /**
   * Appends and merges draft items into an existing active list.
   */
  async addItemsToActiveList(
    listId: string,
    householdId: string,
    draftItems: DraftItem[]
  ): Promise<ActiveListWithDetails | null> {
    return addItemsToActiveList(listId, householdId, draftItems, (id) =>
      this.getListWithDetails(id)
    )
  },

  /**
   * Sets a specific active list as the default list for the household.
   */
  async setDefaultActiveList(listId: string, householdId: string): Promise<boolean> {
    trackLocalListMutation(listId)
    const { error: unsetErr } = await supabase
      .from('shopping_lists')
      .update({ is_default: false })
      .eq('household_id', householdId)
      .eq('status', 'active')

    if (unsetErr) {
      console.error('Error unsetting default list:', unsetErr)
    }

    const { error: setErr } = await supabase
      .from('shopping_lists')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', listId)

    if (setErr) {
      console.error('Error setting default list:', setErr)
      return false
    }

    return true
  },

  async updateListName(listId: string, name: string): Promise<boolean> {
    trackLocalListMutation(listId)
    const { data: currentList } = await supabase
      .from('shopping_lists')
      .select('status, name, original_name')
      .eq('id', listId)
      .maybeSingle()

    const updatePayload: Database['public']['Tables']['shopping_lists']['Update'] = {
      name: name.trim(),
      updated_at: new Date().toISOString()
    }

    if (currentList?.status === 'archived' && !currentList?.original_name && currentList?.name) {
      updatePayload.original_name = currentList.name
    }

    const { error } = await supabase
      .from('shopping_lists')
      .update(updatePayload)
      .eq('id', listId)

    if (error) {
      console.error('Error updating list name:', error)
      return false
    }
    return true
  },

  async deleteShoppingList(listId: string): Promise<boolean> {
    trackLocalListMutation(listId)
    const { error: itemsErr } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('shopping_list_id', listId)

    if (itemsErr) {
      console.error('Error deleting list items:', itemsErr)
    }

    const { error: listErr } = await supabase
      .from('shopping_lists')
      .delete()
      .eq('id', listId)

    if (listErr) {
      console.error('Error deleting shopping list:', listErr)
      return false
    }
    return true
  },

  toggleItemChecked,
  toggleItemInPantry,
  updateItemQuantity,
  deleteListItem,
  archiveActiveList,
  getHistoryLists,
  getCalendarPipelineItems,
  _insertDraftItemsToList: insertDraftItemsToList
}
