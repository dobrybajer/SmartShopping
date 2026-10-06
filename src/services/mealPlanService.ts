import { supabase } from '@/lib/supabase'
import type {
  MealPlanItem,
  CreateCalendarMealInput,
  UpdateCalendarMealInput,
  MissingIngredient
} from '@/types/calendar'
import type { AddToDraftPayload } from '@/store/useShoppingStore'

export const mealPlanService = {
  /**
   * Fetches meal plans for a given household, optionally bounded by a start and end date (inclusive).
   */
  async getMealPlans(
    householdId: string,
    startDate?: string,
    endDate?: string
  ): Promise<MealPlanItem[]> {
    if (!householdId) return []

    let query = supabase
      .from('meal_plans')
      .select(`
        *,
        meal:meals(
          id,
          household_id,
          name,
          description,
          preparation_steps,
          comments,
          category_id,
          tags,
          type,
          ingredients:meal_ingredients(
            id,
            meal_id,
            product_id,
            base_quantity,
            is_pantry_item,
            product:products(*)
          )
        )
      `)
      .eq('household_id', householdId)

    if (startDate) {
      query = query.gte('date', startDate)
    }
    if (endDate) {
      query = query.lte('date', endDate)
    }

    const { data, error } = await query
      .order('date', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[mealPlanService] Error fetching meal plans:', error)
      return []
    }

    return (data || []).map((row: any) => ({
      ...row,
      meal: row.meal
        ? {
            ...row.meal,
            ingredients: (row.meal.ingredients || []).map((ing: any) => ({
              ...ing,
              product: ing.product || null
            }))
          }
        : null
    }))
  },

  /**
   * Creates a new meal plan entry for a household.
   */
  async createMealPlan(input: CreateCalendarMealInput): Promise<MealPlanItem | null> {
    const { data, error } = await supabase
      .from('meal_plans')
      .insert({
        household_id: input.household_id,
        date: input.date,
        meal_id: input.meal_id || null,
        meal_category_id: input.meal_category_id || null,
        custom_name: input.custom_name || null,
        is_ad_hoc: input.is_ad_hoc ?? false,
        servings: input.servings ?? 1,
        target_kcal: input.target_kcal ?? null,
        notes: input.notes || null,
        sort_order: input.sort_order ?? 0
      })
      .select(`
        *,
        meal:meals(
          id,
          household_id,
          name,
          description,
          preparation_steps,
          comments,
          category_id,
          tags,
          type,
          ingredients:meal_ingredients(
            id,
            meal_id,
            product_id,
            base_quantity,
            is_pantry_item,
            product:products(*)
          )
        )
      `)
      .single()

    if (error || !data) {
      console.error('[mealPlanService] Error creating meal plan:', error)
      return null
    }

    return {
      ...(data as any),
      meal: (data as any).meal
        ? {
            ...(data as any).meal,
            ingredients: ((data as any).meal.ingredients || []).map((ing: any) => ({
              ...ing,
              product: ing.product || null
            }))
          }
        : null
    }
  },

  /**
   * Updates an existing meal plan entry.
   */
  async updateMealPlan(id: string, updates: UpdateCalendarMealInput): Promise<boolean> {
    const { error } = await supabase
      .from('meal_plans')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('[mealPlanService] Error updating meal plan:', error)
      return false
    }

    return true
  },

  /**
   * Deletes a meal plan entry.
   */
  async deleteMealPlan(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[mealPlanService] Error deleting meal plan:', error)
      return false
    }

    return true
  },

  /**
   * Duplicates an existing meal plan item to another date.
   */
  async duplicateMealPlanToDate(
    sourceItem: MealPlanItem,
    targetDate: string
  ): Promise<MealPlanItem | null> {
    return this.createMealPlan({
      household_id: sourceItem.household_id,
      date: targetDate,
      meal_id: sourceItem.meal_id,
      meal_category_id: sourceItem.meal_category_id,
      custom_name: sourceItem.custom_name,
      is_ad_hoc: sourceItem.is_ad_hoc,
      servings: sourceItem.servings,
      target_kcal: sourceItem.target_kcal,
      notes: sourceItem.notes,
      sort_order: sourceItem.sort_order + 1
    })
  },

  /**
   * Creates an AddToDraftPayload item to restore a missing ingredient (1-click restore).
   */
  createRestoreDraftPayload(
    missing: MissingIngredient,
    planItem: MealPlanItem,
    dayLabel?: string
  ): AddToDraftPayload {
    const mealName = planItem.meal?.name || planItem.custom_name || 'Posiłek'
    const source = dayLabel ? `${dayLabel} · ${mealName} (Przywrócono)` : `${mealName} (Przywrócono)`

    return {
      product_id: missing.productId,
      name: missing.productName,
      unit_type: missing.unitType,
      quantity: missing.requiredQuantity,
      is_ad_hoc: false,
      meal_source: source,
      meal_plan_item_id: planItem.id
    }
  }
}
