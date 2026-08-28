import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import type { DraftItem } from '@/store/useShoppingStore'
import { formatDate, getLocalDateISOString } from '@/lib/utils'
import { mergeDraftItemsIntoActiveList } from '@/lib/calculations/mergeDraftItems'
import { sortHistoryListsByCompletionDate } from '@/lib/calculations/historyStatusCalculations'

const isUuid = (val?: string | null): val is string =>
  !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

export type ShoppingList = Database['public']['Tables']['shopping_lists']['Row']
export type ShoppingListItem = Database['public']['Tables']['shopping_list_items']['Row']

export interface ActiveListItemWithProduct extends Omit<ShoppingListItem, 'category_id'> {
  category_id?: number | null
  category?: {
    id: number
    name: string
    sort_order: number
  } | null
  product?: {
    id: string
    name: string
    unit_type: 'g' | 'ml' | 'pcs'
    category_id: number | null
    category?: {
      id: number
      name: string
      sort_order: number
    }
  }
  ad_hoc_name?: string
}

export interface ActiveListWithDetails extends ShoppingList {
  items: ActiveListItemWithProduct[]
}

export interface ShoppingListSummary {
  id: string
  household_id: string
  name: string
  status: 'draft' | 'active' | 'archived'
  is_default: boolean
  target_date: string | null
  created_at: string | null
  updated_at: string | null
  completed_at?: string | null
  total_items: number
  unchecked_items: number
}

export interface HistoryListItemSummary {
  id: string
  is_checked: boolean | null
}

export interface HistoryShoppingList extends ShoppingList {
  items?: HistoryListItemSummary[]
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
        items:shopping_list_items(id, is_checked)
      `)
      .eq('household_id', householdId)
      .eq('status', 'active')
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching active lists summary:', error)
      return []
    }

    return (data || []).map((list: any) => {
      const items = list.items || []
      const uncheckedCount = items.filter((i: any) => !i.is_checked).length
      return {
        id: list.id,
        household_id: list.household_id,
        name: list.name || 'Shopping List',
        status: list.status,
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
  async getActiveList(householdId: string, preferredListId?: string | null): Promise<ActiveListWithDetails | null> {
    if (preferredListId) {
      const details = await this.getListWithDetails(preferredListId)
      if (details && details.household_id === householdId && details.status === 'active') {
        return details
      }
    }

    // Fallback to default or newest active list
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

    const rawItems = itemsData || []

    // Self-healing: if any item has neither item.category_id nor item.product.category_id,
    // match against other products in the household that have a category_id!
    const uncategorizedItems = rawItems.filter(
      (item: any) => !item.category_id && item.product && !item.product.category_id && item.product.name
    )

    if (uncategorizedItems.length > 0 && isUuid(listData.household_id)) {
      const names = Array.from(
        new Set(uncategorizedItems.map((i: any) => (i.product.name as string).trim()))
      )

      const { data: matchedProds } = await supabase
        .from('products')
        .select(`
          id,
          name,
          category_id,
          category:product_categories(*)
        `)
        .eq('household_id', listData.household_id)
        .in('name', names)
        .not('category_id', 'is', null)

      if (matchedProds && matchedProds.length > 0) {
        const prodByName = new Map<string, any>()
        matchedProds.forEach((p) => prodByName.set(p.name.trim().toLowerCase(), p))

        for (const item of rawItems) {
          if (!item.category_id && item.product && !item.product.category_id) {
            const match = prodByName.get(item.product.name.trim().toLowerCase())
            if (match) {
              item.product.category_id = match.category_id
              item.product.category = match.category
              // Proactively heal this ad-hoc product row in DB
              supabase
                .from('products')
                .update({ category_id: match.category_id })
                .eq('id', item.product.id)
                .then(() => { })
            }
          }
        }
      }
    }

    return {
      ...listData,
      is_default: !!listData.is_default,
      items: rawItems.map((item: any) => ({
        ...item,
        category_id: item.category_id ?? null,
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

    // If marked as default, unset existing default lists for this household
    if (isDefault) {
      await supabase
        .from('shopping_lists')
        .update({ is_default: false })
        .eq('household_id', householdId)
        .eq('status', 'active')
    }

    // 1. Insert new shopping list record with status = 'active'
    const { data: newList, error: listErr } = await supabase
      .from('shopping_lists')
      .insert({
        household_id: householdId,
        name: listName.trim() || `Groceries ${formatDate(new Date())}`,
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

    // 2. Aggregate quantities and insert items
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
        name: listName.trim() || `Shopping List ${formatDate(new Date())}`,
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
   * Sums quantities for items already present, resets is_checked = false, and inserts new items.
   */
  async addItemsToActiveList(
    listId: string,
    householdId: string,
    draftItems: DraftItem[]
  ): Promise<ActiveListWithDetails | null> {
    if (!draftItems || draftItems.length === 0) {
      return this.getListWithDetails(listId)
    }

    const existingList = await this.getListWithDetails(listId)
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
      const rowsToInsert = []
      for (const item of itemsToInsert) {
        let productId = item.product_id

        if (!productId && item.added_ad_hoc) {
          // Check if product already exists in household by name
          const { data: existingProd } = await supabase
            .from('products')
            .select('id, category_id')
            .eq('household_id', householdId)
            .ilike('name', item.name.trim())
            .maybeSingle()

          // If an existing product has the same category (or no category), reuse it.
          // If the existing product has a DIFFERENT category, create an ad-hoc product with the temporary category
          // to preserve the user's intended aisle!
          if (existingProd && (!item.category_id || !existingProd.category_id || existingProd.category_id === item.category_id)) {
            productId = existingProd.id
            if (!existingProd.category_id && item.category_id) {
              await supabase
                .from('products')
                .update({ category_id: item.category_id })
                .eq('id', existingProd.id)
            }
          } else {
            const { data: adHocProduct } = await supabase
              .from('products')
              .insert({
                household_id: householdId,
                name: item.name,
                unit_type: 'pcs',
                category_id: item.category_id || null,
                is_ad_hoc: true
              })
              .select('id')
              .single()

            if (adHocProduct) {
              productId = adHocProduct.id
            }
          }
        }

        if (productId) {
          rowsToInsert.push({
            shopping_list_id: listId,
            product_id: productId,
            total_quantity: item.total_quantity,
            is_checked: false,
            added_ad_hoc: item.added_ad_hoc,
            category_id: item.category_id || null
          })
        }
      }

      if (rowsToInsert.length > 0) {
        const { error: insertErr } = await supabase
          .from('shopping_list_items')
          .insert(rowsToInsert)

        if (insertErr) {
          if (insertErr.code === '42703') {
            // Column category_id does not exist yet in DB: fallback without category_id
            const fallbackRows = rowsToInsert.map(({ category_id: _cat, ...rest }) => rest)
            const { error: retryErr } = await supabase
              .from('shopping_list_items')
              .insert(fallbackRows)
            if (retryErr) {
              console.error('Error inserting merged items (fallback):', retryErr)
            }
          } else {
            console.error('Error inserting merged items:', insertErr)
          }
        }
      }
    }

    // 3. Touch updated_at on the shopping list
    await supabase
      .from('shopping_lists')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', listId)

    return this.getListWithDetails(listId)
  },

  /**
   * Sets a specific active list as the default list for the household.
   */
  async setDefaultActiveList(listId: string, householdId: string): Promise<boolean> {
    // 1. Unset all other lists
    const { error: unsetErr } = await supabase
      .from('shopping_lists')
      .update({ is_default: false })
      .eq('household_id', householdId)
      .eq('status', 'active')

    if (unsetErr) {
      console.error('Error unsetting default list:', unsetErr)
    }

    // 2. Set designated list as default
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
    // 1. Delete associated items
    const { error: itemsErr } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('shopping_list_id', listId)

    if (itemsErr) {
      console.error('Error deleting list items:', itemsErr)
    }

    // 2. Delete the shopping list record
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

  async toggleItemChecked(itemId: string, isChecked: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('shopping_list_items')
      .update({ is_checked: isChecked })
      .eq('id', itemId)

    if (error) {
      console.error('Error updating item checked status:', error)
      return false
    }
    return true
  },

  async updateItemQuantity(itemId: string, totalQuantity: number): Promise<boolean> {
    const { error } = await supabase
      .from('shopping_list_items')
      .update({ total_quantity: totalQuantity })
      .eq('id', itemId)

    if (error) {
      console.error('Error updating item quantity:', error)
      return false
    }
    return true
  },

  async deleteListItem(itemId: string): Promise<boolean> {
    const { error } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      console.error('Error deleting list item:', error)
      return false
    }
    return true
  },

  async archiveActiveList(listId: string, _householdId: string): Promise<DraftItem[]> {
    // 1. Fetch current list to capture its original name at moment of closing
    const { data: currentList } = await supabase
      .from('shopping_lists')
      .select('name, original_name')
      .eq('id', listId)
      .maybeSingle()

    const originalName = currentList?.original_name || currentList?.name || null

    // 2. Update status to 'archived' and record completion timestamp + original_name
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

    // 3. Fetch unchecked items (is_checked = false)
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
      uncheckedItems.forEach((item: any) => {
        if (item.product) {
          const catId = item.category_id ?? item.category?.id ?? item.product.category_id ?? item.product.category?.id ?? undefined
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
            is_ad_hoc: item.added_ad_hoc
          })
        }
      })
    }

    return remainingDraftItems
  },

  async getHistoryLists(householdId: string): Promise<HistoryShoppingList[]> {
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
    const lists = ((data as any) || []) as HistoryShoppingList[]
    return sortHistoryListsByCompletionDate(lists)
  },

  /**
   * Internal helper to insert draft items into a shopping list.
   */
  async _insertDraftItemsToList(shoppingListId: string, householdId: string, draftItems: DraftItem[]) {
    const aggregatedMap = new Map<
      string,
      { product_id?: string; total_quantity: number; added_ad_hoc: boolean; name: string; category_id?: number | null }
    >()

    for (const item of draftItems) {
      const key = item.product_id ? `prod_${item.product_id}` : `adhoc_${item.name}`
      const existing = aggregatedMap.get(key)

      if (existing) {
        existing.total_quantity = Math.round((existing.total_quantity + item.quantity) * 10) / 10
        if (!existing.category_id && item.category_id) {
          existing.category_id = item.category_id
        }
      } else {
        aggregatedMap.set(key, {
          product_id: item.product_id,
          total_quantity: item.quantity,
          added_ad_hoc: !!item.is_ad_hoc,
          name: item.name,
          category_id: item.category_id || null
        })
      }
    }

    const itemsToInsert = []

    for (const [, value] of aggregatedMap) {
      let productId = value.product_id

      if (!productId && value.added_ad_hoc) {
        // Check if product already exists in household by name
        const { data: existingProd } = await supabase
          .from('products')
          .select('id, category_id')
          .eq('household_id', householdId)
          .ilike('name', value.name.trim())
          .maybeSingle()

        // If an existing product has the same category (or no category), reuse it.
        // If the existing product has a DIFFERENT category, create an ad-hoc product with the temporary category
        // to preserve the user's intended aisle!
        if (existingProd && (!value.category_id || !existingProd.category_id || existingProd.category_id === value.category_id)) {
          productId = existingProd.id
          if (!existingProd.category_id && value.category_id) {
            await supabase
              .from('products')
              .update({ category_id: value.category_id })
              .eq('id', existingProd.id)
          }
        } else {
          const { data: adHocProduct } = await supabase
            .from('products')
            .insert({
              household_id: householdId,
              name: value.name,
              unit_type: 'pcs',
              category_id: value.category_id || null,
              is_ad_hoc: true
            })
            .select('id')
            .single()

          if (adHocProduct) {
            productId = adHocProduct.id
          }
        }
      }

      if (productId) {
        itemsToInsert.push({
          shopping_list_id: shoppingListId,
          product_id: productId,
          total_quantity: value.total_quantity,
          is_checked: false,
          added_ad_hoc: value.added_ad_hoc,
          category_id: value.category_id || null
        })
      }
    }

    if (itemsToInsert.length > 0) {
      const { error: insertItemsErr } = await supabase
        .from('shopping_list_items')
        .insert(itemsToInsert)

      if (insertItemsErr) {
        if (insertItemsErr.code === '42703') {
          const fallbackRows = itemsToInsert.map(({ category_id: _cat, ...rest }) => rest)
          const { error: retryErr } = await supabase
            .from('shopping_list_items')
            .insert(fallbackRows)
          if (retryErr) {
            console.error('Error adding shopping list items (fallback):', retryErr)
          }
        } else {
          console.error('Error adding shopping list items:', insertItemsErr)
        }
      }
    }
  }
}
