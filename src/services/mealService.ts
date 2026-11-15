import { supabase } from '@/lib/supabase'
import { isUuid } from '@/lib/utils'
import type { Database } from '@/types/supabase'
import type { MealIngredientWithProduct, MealWithIngredients } from '@/store/useShoppingStore'

type RawMealQueryRow = Database['public']['Tables']['meals']['Row'] & {
  ingredients: MealIngredientWithProduct[] | null
}

const MEAL_SELECT_QUERY = `
  *,
  ingredients:meal_ingredients(
    id,
    meal_id,
    product_id,
    reference_product_id,
    base_quantity,
    is_pantry_item,
    product:products!meal_ingredients_product_id_fkey(*),
    reference_product:products!meal_ingredients_reference_product_id_fkey(*)
  )
`

function mapRawMealRow(m: RawMealQueryRow): MealWithIngredients {
  return {
    id: m.id,
    household_id: m.household_id,
    type: m.type || (m.household_id ? 'Household' : 'Global'),
    name: m.name,
    description: m.description,
    preparation_steps: m.preparation_steps,
    comments: m.comments,
    category_id: m.category_id,
    tags: m.tags,
    ingredients: (m.ingredients || []).map((ing) => ({
      id: ing.id,
      meal_id: ing.meal_id,
      product_id: ing.product_id,
      reference_product_id: ing.reference_product_id,
      base_quantity: ing.base_quantity,
      is_pantry_item: ing.is_pantry_item,
      product: ing.product,
      reference_product: ing.reference_product
    }))
  }
}

export type MealCategory = Database['public']['Tables']['meal_categories']['Row']
export type MealInsert = Database['public']['Tables']['meals']['Insert']

export interface CreateMealInput {
  household_id?: string | null
  type?: 'Global' | 'Household'
  name: string
  description?: string
  preparation_steps?: string
  comments?: string
  category_id?: number | null
  tags?: string[]
  ingredients: Array<{
    product_id: string
    reference_product_id?: string | null
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
      console.error('Error fetching meal categories:', error)
      return []
    }
    return data || []
  },

  async getMeals(householdId: string): Promise<MealWithIngredients[]> {
    let query = supabase.from('meals').select(MEAL_SELECT_QUERY)

    if (isUuid(householdId)) {
      query = query.or(`household_id.eq.${householdId},type.eq.Global,household_id.is.null`)
    } else {
      query = query.or('type.eq.Global,household_id.is.null')
    }

    const { data, error } = await query.order('name', { ascending: true })

    if (error) {
      console.error('Error fetching meals:', error)
      return []
    }

    const rows = (data ?? []) as unknown as RawMealQueryRow[]
    return rows.map(mapRawMealRow)
  },

  async getMealById(mealId: string): Promise<MealWithIngredients | null> {
    const { data, error } = await supabase
      .from('meals')
      .select(MEAL_SELECT_QUERY)
      .eq('id', mealId)
      .maybeSingle()

    if (error || !data) {
      if (error) console.error('Error fetching meal by id:', error)
      return null
    }

    return mapRawMealRow(data as unknown as RawMealQueryRow)
  },

  async createMeal(input: CreateMealInput): Promise<MealWithIngredients | null> {
    const mealType = input.type || (input.household_id ? 'Household' : 'Global')
    const targetHouseholdId = mealType === 'Global' ? null : input.household_id

    // 1. Insert meal into `meals` table
    const { data: newMeal, error: mealErr } = await supabase
      .from('meals')
      .insert({
        household_id: targetHouseholdId,
        type: mealType,
        name: input.name,
        description: input.description || null,
        preparation_steps: input.preparation_steps || null,
        comments: input.comments || null,
        category_id: input.category_id ?? null,
        tags: input.tags || []
      })
      .select('*')
      .single()

    if (mealErr || !newMeal) {
      console.error('Error creating meal:', mealErr)
      return null
    }

    // 2. Insert ingredients into `meal_ingredients` table
    if (input.ingredients && input.ingredients.length > 0) {
      const ingredientsToInsert = input.ingredients.map((ing) => ({
        meal_id: newMeal.id,
        product_id: ing.product_id,
        reference_product_id: ing.reference_product_id || null,
        base_quantity: ing.base_quantity,
        is_pantry_item: ing.is_pantry_item || false
      }))

      const { error: ingErr } = await supabase
        .from('meal_ingredients')
        .insert(ingredientsToInsert)

      if (ingErr) {
        console.error('Error adding meal ingredients:', ingErr)
        return null
      }
    }

    const fetched = await this.getMealById(newMeal.id)
    if (fetched) return fetched

    const meals = await this.getMeals(input.household_id || '')
    return meals.find((m) => m.id === newMeal.id) || null
  },

  async createMealsBatch(inputs: CreateMealInput[]): Promise<MealWithIngredients[]> {
    if (inputs.length === 0) return []

    const mealPayloads = inputs.map((input) => {
      const mealType = input.type || (input.household_id ? 'Household' : 'Global')
      const targetHouseholdId = mealType === 'Global' ? null : input.household_id
      return {
        household_id: targetHouseholdId,
        type: mealType,
        name: input.name,
        description: input.description || null,
        preparation_steps: input.preparation_steps || null,
        comments: input.comments || null,
        category_id: input.category_id ?? null,
        tags: input.tags || []
      }
    })

    const { data: createdMeals, error: mealsErr } = await supabase
      .from('meals')
      .insert(mealPayloads)
      .select('*')

    if (mealsErr || !createdMeals || createdMeals.length === 0) {
      console.error('Error batch creating meals:', mealsErr)
      return []
    }

    const allIngredientsToInsert: Array<{
      meal_id: string
      product_id: string
      reference_product_id: string | null
      base_quantity: number
      is_pantry_item: boolean
    }> = []

    createdMeals.forEach((createdMeal, index) => {
      const input = inputs[index]
      if (!input?.ingredients?.length) return
      for (const ing of input.ingredients) {
        allIngredientsToInsert.push({
          meal_id: createdMeal.id,
          product_id: ing.product_id,
          reference_product_id: ing.reference_product_id || null,
          base_quantity: ing.base_quantity,
          is_pantry_item: ing.is_pantry_item || false
        })
      }
    })

    if (allIngredientsToInsert.length > 0) {
      const { error: ingErr } = await supabase
        .from('meal_ingredients')
        .insert(allIngredientsToInsert)

      if (ingErr) {
        console.error('Error batch adding meal ingredients:', ingErr)
        return []
      }
    }

    const createdIds = createdMeals.map((m) => m.id)
    const { data: hydratedRows, error: fetchErr } = await supabase
      .from('meals')
      .select(MEAL_SELECT_QUERY)
      .in('id', createdIds)

    if (fetchErr || !hydratedRows) {
      console.error('Error fetching batch created meals:', fetchErr)
      return []
    }

    const rows = (hydratedRows ?? []) as unknown as RawMealQueryRow[]
    return rows.map(mapRawMealRow)
  },

  async updateMeal(mealId: string, input: CreateMealInput): Promise<MealWithIngredients | null> {
    const { error: mealErr } = await supabase
      .from('meals')
      .update({
        name: input.name,
        description: input.description || null,
        preparation_steps: input.preparation_steps || null,
        comments: input.comments || null,
        category_id: input.category_id ?? null,
        tags: input.tags || []
      })
      .eq('id', mealId)

    if (mealErr) {
      console.error('Error updating meal:', mealErr)
      return null
    }

    const { error: deleteIngErr } = await supabase
      .from('meal_ingredients')
      .delete()
      .eq('meal_id', mealId)

    if (deleteIngErr) {
      console.error('Error clearing previous meal ingredients:', deleteIngErr)
      return null
    }

    if (input.ingredients && input.ingredients.length > 0) {
      const ingredientsToInsert = input.ingredients.map((ing) => ({
        meal_id: mealId,
        product_id: ing.product_id,
        reference_product_id: ing.reference_product_id || null,
        base_quantity: ing.base_quantity,
        is_pantry_item: ing.is_pantry_item || false
      }))

      const { error: ingErr } = await supabase
        .from('meal_ingredients')
        .insert(ingredientsToInsert)

      if (ingErr) {
        console.error('Error inserting updated meal ingredients:', ingErr)
        return null
      }
    }

    const updated = await this.getMealById(mealId)
    if (updated) return updated

    const meals = await this.getMeals(input.household_id || '')
    return meals.find((m) => m.id === mealId) || null
  },

  async deleteMeal(mealId: string): Promise<boolean> {
    const { error } = await supabase.from('meals').delete().eq('id', mealId)
    if (error) {
      console.error('Error deleting meal:', error)
      return false
    }
    return true
  }
}
