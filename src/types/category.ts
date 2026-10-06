import type { Database } from '@/types/supabase'

export type RawCategoryRow = Database['public']['Tables']['product_categories']['Row']
export type RawCategoryInsert = Database['public']['Tables']['product_categories']['Insert']
export type RawCategoryUpdate = Database['public']['Tables']['product_categories']['Update']

export type HouseholdCategorySettingRow = Database['public']['Tables']['household_category_settings']['Row']
export type HouseholdCategorySettingInsert = Database['public']['Tables']['household_category_settings']['Insert']
export type HouseholdCategorySettingUpdate = Database['public']['Tables']['household_category_settings']['Update']

export interface ResolvedCategory {
  id: number
  name: string
  is_global: boolean
  household_id: string | null
  sort_order: number // resolved custom_sort_order or default (category.sort_order * 10)
  is_hidden: boolean
  is_non_food?: boolean
  custom_name?: string | null
  has_active_items?: boolean
  assigned_products_count?: number
}

export interface CategoryReorderItem {
  category_id: number
  custom_sort_order: number
  is_hidden?: boolean
}

export interface CreateCustomCategoryInput {
  name: string
  household_id: string
}
