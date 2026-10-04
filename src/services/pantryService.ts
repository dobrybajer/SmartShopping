import { supabase } from '@/lib/supabase'
import type {
  PantryItemWithDetails,
  CreatePantryItemPayload
} from '@/types/pantry'
import type { UnitEnum } from '@/types/supabase'

export const pantryService = {
  /**
   * Fetches all pantry items for a household, including product and category joins.
   */
  async getPantryItems(householdId: string): Promise<PantryItemWithDetails[]> {
    if (!householdId) return []

    const { data, error } = await supabase
      .from('pantry_items')
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
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[pantryService.getPantryItems] Error fetching pantry items:', error)
      return []
    }

    return (data || []) as unknown as PantryItemWithDetails[]
  },

  /**
   * Adds a new item or merges/increments quantity if already in pantry.
   */
  async addOrIncrementItem(
    payload: CreatePantryItemPayload,
    mode: 'increment' | 'set' = 'increment'
  ): Promise<PantryItemWithDetails | null> {
    const now = new Date().toISOString()
    const { household_id, product_id, ad_hoc_name, category_id, quantity, unit_type } = payload

    try {
      // 1. Check if product already exists
      let existingQuery = supabase
        .from('pantry_items')
        .select('*')
        .eq('household_id', household_id)

      if (product_id) {
        existingQuery = existingQuery.eq('product_id', product_id)
      } else if (ad_hoc_name) {
        existingQuery = existingQuery.ilike('ad_hoc_name', ad_hoc_name.trim())
      } else {
        return null
      }

      const { data: existing, error: findErr } = await existingQuery.maybeSingle()

      if (findErr) {
        console.error('[pantryService.addOrIncrementItem] Find error:', findErr)
      }

      if (existing) {
        const newQty =
          mode === 'increment'
            ? Math.round((Number(existing.quantity) + Number(quantity)) * 10) / 10
            : Number(quantity)

        const { data: updated, error: updateErr } = await supabase
          .from('pantry_items')
          .update({
            quantity: newQty,
            category_id: category_id ?? existing.category_id,
            unit_type: unit_type || existing.unit_type,
            last_purchased_at: payload.last_purchased_at || now,
            last_verified_at: payload.last_verified_at || now,
            updated_at: now
          })
          .eq('id', existing.id)
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
          .single()

        if (updateErr) {
          console.error('[pantryService.addOrIncrementItem] Update error:', updateErr)
          return null
        }
        return updated as unknown as PantryItemWithDetails
      }

      // 2. Insert new pantry item
      const { data: created, error: insertErr } = await supabase
        .from('pantry_items')
        .insert({
          household_id,
          product_id: product_id || null,
          ad_hoc_name: ad_hoc_name ? ad_hoc_name.trim() : null,
          category_id: category_id || null,
          quantity: Math.max(0, Number(quantity)),
          unit_type: unit_type || 'pcs',
          last_purchased_at: payload.last_purchased_at || now,
          last_verified_at: payload.last_verified_at || now,
          updated_at: now
        })
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
        .single()

      if (insertErr) {
        console.error('[pantryService.addOrIncrementItem] Insert error:', insertErr)
        return null
      }

      return created as unknown as PantryItemWithDetails
    } catch (err) {
      console.error('[pantryService.addOrIncrementItem] Unexpected error:', err)
      return null
    }
  },

  /**
   * Updates quantity on a pantry item. If quantity <= 0, deletes the item.
   */
  async updateQuantity(itemId: string, newQuantity: number): Promise<boolean> {
    if (newQuantity <= 0) {
      return this.deletePantryItem(itemId)
    }

    const { error } = await supabase
      .from('pantry_items')
      .update({
        quantity: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)

    if (error) {
      console.error('[pantryService.updateQuantity] Error:', error)
      return false
    }
    return true
  },

  /**
   * Verifies item stock: updates quantity and sets last_verified_at = NOW().
   * If quantity <= 0, deletes the item.
   */
  async verifyItem(itemId: string, newQuantity: number): Promise<boolean> {
    if (newQuantity <= 0) {
      return this.deletePantryItem(itemId)
    }

    const now = new Date().toISOString()
    const { error } = await supabase
      .from('pantry_items')
      .update({
        quantity: newQuantity,
        last_verified_at: now,
        updated_at: now
      })
      .eq('id', itemId)

    if (error) {
      console.error('[pantryService.verifyItem] Error:', error)
      return false
    }
    return true
  },

  /**
   * Deletes a pantry item by ID.
   */
  async deletePantryItem(itemId: string): Promise<boolean> {
    const { error } = await supabase
      .from('pantry_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      console.error('[pantryService.deletePantryItem] Error:', error)
      return false
    }
    return true
  },

  /**
   * Removes a pantry entry matching product_id or ad_hoc_name within household (for "Nie mam produktu").
   */
  async removeByProductOrName(
    householdId: string,
    productId?: string | null,
    adHocName?: string | null
  ): Promise<boolean> {
    if (!householdId) return false
    let query = supabase.from('pantry_items').delete().eq('household_id', householdId)

    if (productId) {
      query = query.eq('product_id', productId)
    } else if (adHocName) {
      query = query.ilike('ad_hoc_name', adHocName.trim())
    } else {
      return false
    }

    const { error } = await query
    if (error) {
      console.error('[pantryService.removeByProductOrName] Error:', error)
      return false
    }
    return true
  },

  /**
   * Auto-ingestion from active shopping list archival.
   * Items with in_pantry = false and is_checked = true are ingested into the pantry.
   */
  async batchIngestPurchasedItems(
    householdId: string,
    items: Array<{
      product_id: string | null
      ad_hoc_name?: string | null
      quantity: number
      unit_type?: UnitEnum
      category_id?: number | null
    }>
  ): Promise<boolean> {
    if (!householdId || items.length === 0) return true

    const now = new Date().toISOString()

    try {
      // Ingest sequentially or concurrently
      for (const item of items) {
        if (item.quantity <= 0) continue

        await this.addOrIncrementItem(
          {
            household_id: householdId,
            product_id: item.product_id,
            ad_hoc_name: item.ad_hoc_name,
            category_id: item.category_id,
            quantity: item.quantity,
            unit_type: item.unit_type || 'pcs',
            last_purchased_at: now,
            last_verified_at: now
          },
          'increment'
        )
      }
      return true
    } catch (err) {
      console.error('[pantryService.batchIngestPurchasedItems] Error ingesting items:', err)
      return false
    }
  }
}
