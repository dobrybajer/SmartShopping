import { supabase } from '@/lib/supabase'
import type {
  RawCategoryRow,
  HouseholdCategorySettingRow,
  CategoryReorderItem
} from '@/types/category'

const isUuid = (val?: string | null): val is string =>
  !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

export const categoryService = {
  /**
   * Fetches all global categories and household custom categories,
   * alongside any per-household category settings (custom order and visibility).
   */
  async getCategoriesWithSettings(householdId?: string | null): Promise<{
    categories: RawCategoryRow[]
    settings: HouseholdCategorySettingRow[]
  }> {
    try {
      let catQuery = supabase.from('product_categories').select('*')

      if (isUuid(householdId)) {
        catQuery = catQuery.or(`household_id.is.null,household_id.eq.${householdId}`)
      } else {
        catQuery = catQuery.is('household_id', null)
      }

      const { data: categories, error: catError } = await catQuery.order('sort_order', {
        ascending: true
      })

      if (catError) {
        console.error('[categoryService.getCategoriesWithSettings] Error fetching categories:', catError)
        return { categories: [], settings: [] }
      }

      let settings: HouseholdCategorySettingRow[] = []
      if (isUuid(householdId)) {
        const { data: settingsData, error: settingsError } = await supabase
          .from('household_category_settings')
          .select('*')
          .eq('household_id', householdId!)

        if (settingsError) {
          console.error(
            '[categoryService.getCategoriesWithSettings] Error fetching settings:',
            settingsError
          )
        } else if (settingsData) {
          settings = settingsData
        }
      }

      return {
        categories: categories || [],
        settings
      }
    } catch (err) {
      console.error('[categoryService.getCategoriesWithSettings] Unexpected error:', err)
      return { categories: [], settings: [] }
    }
  },

  /**
   * Creates a new custom category scoped to the user's active household.
   */
  async createCustomCategory(
    householdId: string,
    name: string
  ): Promise<RawCategoryRow | null> {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .insert({
          household_id: householdId,
          name: name.trim(),
          sort_order: 99
        })
        .select('*')
        .single()

      if (error) {
        console.error('[categoryService.createCustomCategory] Error:', error)
        return null
      }

      return data
    } catch (err) {
      console.error('[categoryService.createCustomCategory] Unexpected error:', err)
      return null
    }
  },

  /**
   * Updates an existing custom category's name (only permitted if owned by household).
   */
  async updateCustomCategory(
    categoryId: number,
    householdId: string,
    name: string
  ): Promise<RawCategoryRow | null> {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .update({
          name: name.trim()
        })
        .eq('id', categoryId)
        .eq('household_id', householdId)
        .select('*')
        .single()

      if (error) {
        console.error('[categoryService.updateCustomCategory] Error:', error)
        return null
      }

      return data
    } catch (err) {
      console.error('[categoryService.updateCustomCategory] Unexpected error:', err)
      return null
    }
  },

  /**
   * Deletes a custom category (PostgreSQL ON DELETE SET NULL on products).
   */
  async deleteCustomCategory(
    categoryId: number,
    householdId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', categoryId)
        .eq('household_id', householdId)

      if (error) {
        console.error('[categoryService.deleteCustomCategory] Error:', error)
        return false
      }

      return true
    } catch (err) {
      console.error('[categoryService.deleteCustomCategory] Unexpected error:', err)
      return false
    }
  },

  /**
   * Batch upserts per-household category settings (sort order and visibility).
   */
  async batchUpsertCategorySettings(
    householdId: string,
    settings: CategoryReorderItem[]
  ): Promise<boolean> {
    if (!householdId || settings.length === 0) return true

    try {
      const rowsToUpsert = settings.map((item) => ({
        household_id: householdId,
        category_id: item.category_id,
        custom_sort_order: item.custom_sort_order,
        ...(item.is_hidden !== undefined ? { is_hidden: item.is_hidden } : {})
      }))

      const { error } = await supabase
        .from('household_category_settings')
        .upsert(rowsToUpsert, {
          onConflict: 'household_id,category_id'
        })

      if (error) {
        console.error('[categoryService.batchUpsertCategorySettings] Error:', error)
        return false
      }

      return true
    } catch (err) {
      console.error('[categoryService.batchUpsertCategorySettings] Unexpected error:', err)
      return false
    }
  },

  /**
   * Toggles visibility for a single category within a household.
   */
  async toggleCategoryVisibility(
    householdId: string,
    categoryId: number,
    isHidden: boolean,
    currentSortOrder: number
  ): Promise<boolean> {
    if (!householdId) return false

    try {
      const { error } = await supabase
        .from('household_category_settings')
        .upsert(
          {
            household_id: householdId,
            category_id: categoryId,
            is_hidden: isHidden,
            custom_sort_order: currentSortOrder
          },
          {
            onConflict: 'household_id,category_id'
          }
        )

      if (error) {
        console.error('[categoryService.toggleCategoryVisibility] Error:', error)
        return false
      }

      return true
    } catch (err) {
      console.error('[categoryService.toggleCategoryVisibility] Unexpected error:', err)
      return false
    }
  }
}
