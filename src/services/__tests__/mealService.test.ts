import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mealService } from '../mealService'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}))

describe('mealService (HIGH-12 & HIGH-13)', () => {
  const validHouseholdUuid = '11111111-1111-4111-8111-111111111111'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getMeals interpolates household_id into PostgREST .or() filter only when valid UUID', async () => {
    const orderMock = vi.fn().mockResolvedValue({ data: [], error: null })
    const orMock = vi.fn().mockReturnValue({ order: orderMock })
    const selectMock = vi.fn().mockReturnValue({ or: orMock })

    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never)

    await mealService.getMeals(validHouseholdUuid)
    expect(orMock).toHaveBeenCalledWith(
      `household_id.eq.${validHouseholdUuid},type.eq.Global,household_id.is.null`
    )

    orMock.mockClear()

    await mealService.getMeals('hh-invalid,id.neq.0000')
    expect(orMock).toHaveBeenCalledWith('type.eq.Global,household_id.is.null')
  })

  it('updateMeal updates meal metadata, replaces ingredients, and returns updated meal with products', async () => {
    const eqMealsUpdateMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMealsUpdateMock })

    const eqDeleteIngredientsMock = vi.fn().mockResolvedValue({ error: null })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqDeleteIngredientsMock })
    const insertIngredientsMock = vi.fn().mockResolvedValue({ error: null })

    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: 'meal-1',
        household_id: validHouseholdUuid,
        type: 'Household',
        name: 'Updated Pancakes',
        description: 'Better',
        preparation_steps: 'Mix well',
        comments: null,
        category_id: 1,
        tags: ['Breakfast'],
        ingredients: [
          {
            id: 'ing-1',
            meal_id: 'meal-1',
            product_id: 'prod-1',
            reference_product_id: null,
            base_quantity: 250,
            is_pantry_item: false,
            product: null,
            reference_product: null
          }
        ]
      },
      error: null
    })
    const eqSelectByIdMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqSelectByIdMock })

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'meals') {
        return { update: updateMock, select: selectMock } as never
      }
      if (table === 'meal_ingredients') {
        return { delete: deleteMock, insert: insertIngredientsMock } as never
      }
      throw new Error(`Unexpected table ${table}`)
    })

    const result = await mealService.updateMeal('meal-1', {
      household_id: validHouseholdUuid,
      type: 'Household',
      name: 'Updated Pancakes',
      description: 'Better',
      preparation_steps: 'Mix well',
      category_id: 1,
      tags: ['Breakfast'],
      ingredients: [
        {
          product_id: 'prod-1',
          base_quantity: 250,
          is_pantry_item: false
        }
      ]
    })

    expect(updateMock).toHaveBeenCalledWith({
      name: 'Updated Pancakes',
      description: 'Better',
      preparation_steps: 'Mix well',
      comments: null,
      category_id: 1,
      tags: ['Breakfast']
    })
    expect(eqMealsUpdateMock).toHaveBeenCalledWith('id', 'meal-1')
    expect(eqDeleteIngredientsMock).toHaveBeenCalledWith('meal_id', 'meal-1')
    expect(insertIngredientsMock).toHaveBeenCalledWith([
      {
        meal_id: 'meal-1',
        product_id: 'prod-1',
        reference_product_id: null,
        base_quantity: 250,
        is_pantry_item: false
      }
    ])
    expect(result?.name).toBe('Updated Pancakes')
    expect(result?.category_id).toBe(1)
  })
})
