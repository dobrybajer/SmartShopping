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
          is_general,
          parent_id,
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

      const { data: existingList, error: findErr } = await existingQuery
        .order('created_at', { ascending: true })
        .limit(1)
      const existing = existingList?.[0] ?? null

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
            ...(payload.expiration_date !== undefined ? { expiration_date: payload.expiration_date } : {}),
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
              is_general,
              parent_id,
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
          expiration_date: payload.expiration_date ?? null,
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
            is_general,
            parent_id,
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
   * Updates or clears the optional expiration date (YYYY-MM-DD) for a pantry item.
   */
  async updateExpirationDate(itemId: string, expirationDate: string | null): Promise<boolean> {
    const { error } = await supabase
      .from('pantry_items')
      .update({
        expiration_date: expirationDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)

    if (error) {
      console.error('[pantryService.updateExpirationDate] Error:', error)
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

    const validItems = items.filter((item) => item.quantity > 0 && (item.product_id || item.ad_hoc_name))
    if (validItems.length === 0) return true

    const now = new Date().toISOString()

    try {
      // 1. Aggregate incoming items by product_id / lower ad_hoc_name
      const aggregatedMap = new Map<
        string,
        {
          product_id: string | null
          ad_hoc_name: string | null
          quantity: number
          unit_type: UnitEnum
          category_id: number | null
        }
      >()

      for (const item of validItems) {
        const key = item.product_id
          ? `prod:${item.product_id}`
          : `adhoc:${(item.ad_hoc_name || '').trim().toLowerCase()}`
        const existingAgg = aggregatedMap.get(key)
        if (existingAgg) {
          existingAgg.quantity = Math.round((existingAgg.quantity + Number(item.quantity)) * 10) / 10
          if (!existingAgg.category_id && item.category_id) {
            existingAgg.category_id = item.category_id
          }
        } else {
          aggregatedMap.set(key, {
            product_id: item.product_id,
            ad_hoc_name: item.product_id ? null : item.ad_hoc_name?.trim() || null,
            quantity: Math.round(Number(item.quantity) * 10) / 10,
            unit_type: item.unit_type || 'pcs',
            category_id: item.category_id ?? null
          })
        }
      }

      // 2. Fetch existing pantry rows once
      const { data: existingRows, error: fetchErr } = await supabase
        .from('pantry_items')
        .select('id, product_id, ad_hoc_name, quantity, category_id, unit_type')
        .eq('household_id', householdId)

      if (fetchErr) {
        console.error('[pantryService.batchIngestPurchasedItems] Error fetching existing pantry items:', fetchErr)
        return false
      }

      const existingByProductId = new Map<string, (typeof existingRows)[number]>()
      const existingByAdHocName = new Map<string, (typeof existingRows)[number]>()
      for (const row of existingRows || []) {
        if (row.product_id) {
          existingByProductId.set(row.product_id, row)
        } else if (row.ad_hoc_name) {
          existingByAdHocName.set(row.ad_hoc_name.trim().toLowerCase(), row)
        }
      }

      const rowsToInsert: Array<{
        household_id: string
        product_id: string | null
        ad_hoc_name: string | null
        category_id: number | null
        quantity: number
        unit_type: UnitEnum
        last_purchased_at: string
        last_verified_at: string
        updated_at: string
      }> = []

      const updatePromises: Array<PromiseLike<unknown>> = []

      for (const agg of aggregatedMap.values()) {
        const existing = agg.product_id
          ? existingByProductId.get(agg.product_id)
          : agg.ad_hoc_name
            ? existingByAdHocName.get(agg.ad_hoc_name.toLowerCase())
            : undefined

        if (existing) {
          const newQty = Math.round((Number(existing.quantity) + agg.quantity) * 10) / 10
          updatePromises.push(
            supabase
              .from('pantry_items')
              .update({
                quantity: newQty,
                category_id: agg.category_id ?? existing.category_id,
                unit_type: agg.unit_type || existing.unit_type,
                last_purchased_at: now,
                last_verified_at: now,
                updated_at: now
              })
              .eq('id', existing.id)
          )
        } else {
          rowsToInsert.push({
            household_id: householdId,
            product_id: agg.product_id,
            ad_hoc_name: agg.ad_hoc_name,
            category_id: agg.category_id,
            quantity: Math.max(0, agg.quantity),
            unit_type: agg.unit_type,
            last_purchased_at: now,
            last_verified_at: now,
            updated_at: now
          })
        }
      }

      if (rowsToInsert.length > 0) {
        const { error: insertErr } = await supabase.from('pantry_items').insert(rowsToInsert)
        if (insertErr) {
          console.error('[pantryService.batchIngestPurchasedItems] Batch insert error:', insertErr)
          return false
        }
      }

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises)
      }

      return true
    } catch (err) {
      console.error('[pantryService.batchIngestPurchasedItems] Error ingesting items:', err)
      return false
    }
  },

  /**
   * Batch deduction when a cooked meal consumes ingredients from the household pantry.
   * Items reaching <= 0 are deleted automatically via updateQuantity.
   */
  async deductMealIngredients(
    updates: Array<{ pantryItemId: string; newQuantity: number }>
  ): Promise<boolean> {
    if (updates.length === 0) return true

    try {
      const results = await Promise.all(
        updates.map((u) => this.updateQuantity(u.pantryItemId, u.newQuantity))
      )
      return results.every(Boolean)
    } catch (err) {
      console.error('[pantryService.deductMealIngredients] Error deducting ingredients:', err)
      return false
    }
  }
}
