import type { Database, UnitEnum } from '@/types/supabase'
import type { MealWithIngredients } from '@/store/useShoppingStore'

export type MealPlanRow = Database['public']['Tables']['meal_plans']['Row']
export type MealPlanInsert = Database['public']['Tables']['meal_plans']['Insert']
export type MealPlanUpdate = Database['public']['Tables']['meal_plans']['Update']

export type MealPlanStatus = 
  | 'planned'      // In calendar, not yet sent to draft or list
  | 'in_draft'     // Ingredients are in shopping cart (Draft)
  | 'in_list'      // Ingredients are on active shopping list
  | 'bought'       // All ingredients checked off, archived, or covered by pantry
  | 'uncertain'    // ⚠️ One or more ingredients deleted or missing before purchase

export interface MealPlanItem extends MealPlanRow {
  meal?: MealWithIngredients | null
}

export interface DayMacroSummary {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface MissingIngredient {
  productId: string
  productName: string
  requiredQuantity: number
  unitType: UnitEnum
}

export interface MealStatusDetails {
  status: MealPlanStatus
  totalIngredients: number
  boughtCount: number
  inListCount: number
  inDraftCount: number
  pantryCoveredCount: number
  missingIngredients: MissingIngredient[]
}

export type CalendarViewMode = 'month' | 'week' | 'day'
export type WeekRangeMode = 'workweek' | 'full' // workweek: Mon-Fri, full: Mon-Sun

export interface CreateCalendarMealInput {
  household_id: string
  date: string // YYYY-MM-DD
  meal_id?: string | null
  meal_category_id?: number | null
  custom_name?: string | null
  is_ad_hoc?: boolean
  servings?: number
  target_kcal?: number | null
  notes?: string | null
  sort_order?: number
}

export interface UpdateCalendarMealInput {
  date?: string
  meal_id?: string | null
  meal_category_id?: number | null
  custom_name?: string | null
  is_ad_hoc?: boolean
  servings?: number
  target_kcal?: number | null
  notes?: string | null
  sort_order?: number
}
