import type { Database, UnitEnum } from '@/types/supabase'

export type PantryItem = Database['public']['Tables']['pantry_items']['Row']
export type PantryItemInsert = Database['public']['Tables']['pantry_items']['Insert']
export type PantryItemUpdate = Database['public']['Tables']['pantry_items']['Update']

export interface PantryItemWithDetails extends PantryItem {
  product?: {
    id: string
    name: string
    unit_type: UnitEnum
    category_id: number | null
    category?: {
      id: number
      name: string
      sort_order: number
      is_non_food?: boolean
    } | null
  } | null
  category?: {
    id: number
    name: string
    sort_order: number
    is_non_food?: boolean
  } | null
}

export interface CreatePantryItemPayload {
  household_id: string
  product_id?: string | null
  ad_hoc_name?: string | null
  category_id?: number | null
  quantity: number
  unit_type: UnitEnum
  last_purchased_at?: string | null
  last_verified_at?: string | null
}
