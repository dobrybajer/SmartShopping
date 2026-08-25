import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import type { DraftItem } from '@/store/useShoppingStore'
import { formatDate, getLocalDateISOString } from '@/lib/utils'

export type ShoppingList = Database['public']['Tables']['shopping_lists']['Row']
export type ShoppingListItem = Database['public']['Tables']['shopping_list_items']['Row']

export interface ActiveListItemWithProduct extends ShoppingListItem {
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

export interface HistoryListItemSummary {
  id: string
  is_checked: boolean | null
}

export interface HistoryShoppingList extends ShoppingList {
  items?: HistoryListItemSummary[]
}

export const shoppingListService = {
  async getActiveList(householdId: string): Promise<ActiveListWithDetails | null> {
    const { data: listData, error: listErr } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('household_id', householdId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .maybeSingle()

    if (listErr) {
      console.error('Error fetching active shopping list:', listErr)
      return null
    }

    if (!listData) return null

    const { data: itemsData, error: itemsErr } = await supabase
      .from('shopping_list_items')
      .select(`
        *,
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
      console.error('Error fetching active shopping list items:', itemsErr)
    }

    return {
      ...listData,
      items: (itemsData || []).map((item: any) => ({
        ...item,
        product: item.product
      }))
    }
  },

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

    return {
      ...listData,
      items: (itemsData || []).map((item: any) => ({
        ...item,
        product: item.product
      }))
    }
  },

  async createActiveListFromDraft(
    householdId: string,
    listName: string,
    draftItems: DraftItem[]
  ): Promise<ActiveListWithDetails | null> {
    if (!draftItems || draftItems.length === 0) return null

    // 1. Check if an active list already exists - if so, archive it
    const currentActive = await this.getActiveList(householdId)
    if (currentActive) {
      await this.archiveActiveList(currentActive.id, householdId)
    }

    // 2. Insert new shopping list record with status = 'active'
    const { data: newList, error: listErr } = await supabase
      .from('shopping_lists')
      .insert({
        household_id: householdId,
        name: listName || `Groceries ${formatDate(new Date())}`,
        status: 'active',
        target_date: getLocalDateISOString()
      })
      .select('*')
      .single()

    if (listErr || !newList) {
      console.error('Error creating active shopping list:', listErr)
      return null
    }

    // 3. Aggregate quantities for repeated items
    const aggregatedMap = new Map<string, { product_id?: string; total_quantity: number; added_ad_hoc: boolean; name: string }>()

    for (const item of draftItems) {
      const key = item.product_id ? `prod_${item.product_id}` : `adhoc_${item.name}`
      const existing = aggregatedMap.get(key)

      if (existing) {
        existing.total_quantity = Math.round((existing.total_quantity + item.quantity) * 10) / 10
      } else {
        aggregatedMap.set(key, {
          product_id: item.product_id,
          total_quantity: item.quantity,
          added_ad_hoc: item.is_ad_hoc,
          name: item.name
        })
      }
    }

    // 4. For ad-hoc products, ensure record exists in products table
    const itemsToInsert = []

    for (const [, value] of aggregatedMap) {
      let productId = value.product_id

      if (!productId && value.added_ad_hoc) {
        // Create ad-hoc entry in products table
        const { data: adHocProduct } = await supabase
          .from('products')
          .insert({
            household_id: householdId,
            name: value.name,
            unit_type: 'pcs',
            is_ad_hoc: true
          })
          .select('id')
          .single()

        if (adHocProduct) {
          productId = adHocProduct.id
        }
      }

      if (productId) {
        itemsToInsert.push({
          shopping_list_id: newList.id,
          product_id: productId,
          total_quantity: value.total_quantity,
          is_checked: false,
          added_ad_hoc: value.added_ad_hoc
        })
      }
    }

    if (itemsToInsert.length > 0) {
      const { error: insertItemsErr } = await supabase
        .from('shopping_list_items')
        .insert(itemsToInsert)

      if (insertItemsErr) {
        console.error('Error adding shopping list items:', insertItemsErr)
      }
    }

    return this.getActiveList(householdId)
  },

  async updateListName(listId: string, name: string): Promise<boolean> {
    const { error } = await supabase
      .from('shopping_lists')
      .update({ name: name.trim() })
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
    // 1. Update status to 'archived'
    const { error } = await supabase
      .from('shopping_lists')
      .update({ status: 'archived' })
      .eq('id', listId)

    if (error) {
      console.error('Error archiving list:', error)
      return []
    }

    // 2. Fetch unchecked items (is_checked = false)
    const { data: uncheckedItems } = await supabase
      .from('shopping_list_items')
      .select(`
        *,
        product:products(
          id,
          name,
          unit_type,
          category_id
        )
      `)
      .eq('shopping_list_id', listId)
      .eq('is_checked', false)

    const remainingDraftItems: DraftItem[] = []

    if (uncheckedItems && uncheckedItems.length > 0) {
      uncheckedItems.forEach((item: any) => {
        if (item.product) {
          remainingDraftItems.push({
            id: `archived_rem_${item.id}`,
            product_id: item.product.id,
            name: item.product.name,
            unit_type: item.product.unit_type,
            category_id: item.product.category_id,
            category_name: 'other',
            sort_order: 99,
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
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching shopping list history:', error)
      return []
    }
    return (data as any) || []
  }
}
