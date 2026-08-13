import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import type { MealWithIngredients } from '@/store/useShoppingStore'

export type MealCategory = Database['public']['Tables']['meal_categories']['Row']
export type MealInsert = Database['public']['Tables']['meals']['Insert']

export interface CreateMealInput {
  household_id?: string | null
  type?: 'Global' | 'Household'
  name: string
  description?: string
  preparation_steps?: string
  comments?: string
  category_id?: number
  tags?: string[]
  ingredients: Array<{
    product_id: string
    base_quantity: number
    is_pantry_item?: boolean
  }>
}

export const mealService = {
  async getMealCategories(): Promise<MealCategory[]> {
    const { data, error } = await supabase
      .from('meal_categories')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.error('Błąd pobierania kategorii posiłków:', error)
      return []
    }
    return data || []
  },

  async getMeals(householdId: string): Promise<MealWithIngredients[]> {
    const { data, error } = await supabase
      .from('meals')
      .select(`
        *,
        ingredients:meal_ingredients(
          id,
          meal_id,
          product_id,
          base_quantity,
          is_pantry_item,
          product:products(*)
        )
      `)
      .or(`household_id.eq.${householdId},type.eq.Global,household_id.is.null`)
      .order('name', { ascending: true })

    if (error) {
      console.error('Błąd pobierania potraw:', error)
      return []
    }

    // Safely cast array
    return (data || []).map((m: any) => ({
      id: m.id,
      household_id: m.household_id,
      type: m.type || (m.household_id ? 'Household' : 'Global'),
      name: m.name,
      description: m.description,
      preparation_steps: m.preparation_steps,
      comments: m.comments,
      category_id: m.category_id,
      tags: m.tags,
      ingredients: (m.ingredients || []).map((ing: any) => ({
        id: ing.id,
        meal_id: ing.meal_id,
        product_id: ing.product_id,
        base_quantity: ing.base_quantity,
        is_pantry_item: ing.is_pantry_item,
        product: ing.product
      }))
    }))
  },

  async createMeal(input: CreateMealInput): Promise<MealWithIngredients | null> {
    const mealType = input.type || (input.household_id ? 'Household' : 'Global')
    const targetHouseholdId = mealType === 'Global' ? null : input.household_id

    // 1. Dodaj potrawę do tabeli `meals`
    const { data: newMeal, error: mealErr } = await supabase
      .from('meals')
      .insert({
        household_id: targetHouseholdId,
        type: mealType,
        name: input.name,
        description: input.description || null,
        preparation_steps: input.preparation_steps || null,
        comments: input.comments || null,
        category_id: input.category_id || null,
        tags: input.tags || []
      })
      .select('*')
      .single()

    if (mealErr || !newMeal) {
      console.error('Błąd tworzenia posiłku:', mealErr)
      return null
    }

    // 2. Dodaj składniki do `meal_ingredients`
    if (input.ingredients && input.ingredients.length > 0) {
      const ingredientsToInsert = input.ingredients.map((ing) => ({
        meal_id: newMeal.id,
        product_id: ing.product_id,
        base_quantity: ing.base_quantity,
        is_pantry_item: ing.is_pantry_item || false
      }))

      const { error: ingErr } = await supabase
        .from('meal_ingredients')
        .insert(ingredientsToInsert)

      if (ingErr) {
        console.error('Błąd dodawania składników posiłku:', ingErr)
      }
    }

    // Pobierz pełny obiekt potrawy z podpiętymi składnikami
    const meals = await this.getMeals(input.household_id || '')
    return meals.find((m) => m.id === newMeal.id) || null
  },

  async deleteMeal(mealId: string): Promise<boolean> {
    const { error } = await supabase.from('meals').delete().eq('id', mealId)
    if (error) {
      console.error('Błąd usuwania potrawy:', error)
      return false
    }
    return true
  }
}

