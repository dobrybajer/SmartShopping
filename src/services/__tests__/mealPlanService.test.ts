import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mealPlanService } from '../mealPlanService'
import { calculateDayMacros } from '@/lib/calculations/calendarStatus'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}))

describe('mealPlanService', () => {
  const mockPlan = {
    id: 'plan-1',
    household_id: 'hh-1',
    date: '2026-10-15',
    meal_id: 'meal-1',
    meal_category_id: 1,
    custom_name: null,
    is_ad_hoc: false,
    servings: 2,
    target_kcal: null,
    notes: null,
    sort_order: 0,
    created_at: '2026-10-07T00:00:00Z',
    updated_at: '2026-10-07T00:00:00Z',
    meal: {
      id: 'meal-1',
      name: 'Pancakes',
      ingredients: []
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getMealPlans returns items for a household', async () => {
    const orderMock3 = vi.fn().mockResolvedValue({ data: [mockPlan], error: null })
    const orderMock2 = vi.fn().mockReturnValue({ order: orderMock3 })
    const orderMock1 = vi.fn().mockReturnValue({ order: orderMock2 })
    const eqMock = vi.fn().mockReturnValue({ order: orderMock1 })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never)

    const res = await mealPlanService.getMealPlans('hh-1')

    expect(supabase.from).toHaveBeenCalledWith('meal_plans')
    expect(res).toHaveLength(1)
    expect(res[0].id).toBe('plan-1')
  })

  it('createMealPlan inserts and returns a new plan', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: mockPlan, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const insertMock = vi.fn().mockReturnValue({ select: selectMock })

    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as never)

    const res = await mealPlanService.createMealPlan({
      household_id: 'hh-1',
      date: '2026-10-15',
      meal_id: 'meal-1'
    })

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      household_id: 'hh-1',
      date: '2026-10-15'
    }))
    expect(res).toEqual(mockPlan)
  })

  it('deleteMealPlan removes entry by id', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(supabase.from).mockReturnValue({ delete: deleteMock } as never)

    const res = await mealPlanService.deleteMealPlan('plan-1')

    expect(deleteMock).toHaveBeenCalled()
    expect(eqMock).toHaveBeenCalledWith('id', 'plan-1')
    expect(res).toBe(true)
  })

  it('disambiguates PostgREST FK hints (PGRST201) and maps reference_product for calculateDayMacros (CRIT-05)', async () => {
    const planWithGeneralProduct = {
      ...mockPlan,
      servings: 2,
      meal: {
        id: 'meal-1',
        household_id: 'hh-1',
        name: 'Owsianka z mlekiem',
        description: null,
        preparation_steps: null,
        comments: null,
        category_id: 1,
        tags: [],
        type: 'Household' as const,
        ingredients: [
          {
            id: 'ing-general-1',
            meal_id: 'meal-1',
            product_id: 'prod-milk-general',
            reference_product_id: 'prod-milk-2pct',
            base_quantity: 200,
            is_pantry_item: false,
            product: {
              id: 'prod-milk-general',
              household_id: null,
              name: 'Mleko',
              unit_type: 'ml' as const,
              category_id: 3,
              kcal_per_100: null,
              protein_per_100: null,
              carbs_per_100: null,
              fat_per_100: null,
              is_ad_hoc: false,
              type: 'Global' as const,
              is_general: true,
              parent_id: null
            },
            reference_product: {
              id: 'prod-milk-2pct',
              household_id: null,
              name: 'Mleko 2%',
              unit_type: 'ml' as const,
              category_id: 3,
              kcal_per_100: 50,
              protein_per_100: 3.4,
              carbs_per_100: 4.8,
              fat_per_100: 2.0,
              is_ad_hoc: false,
              type: 'Global' as const,
              is_general: false,
              parent_id: 'prod-milk-general'
            }
          }
        ]
      }
    }

    const orderMock3 = vi.fn().mockResolvedValue({ data: [planWithGeneralProduct], error: null })
    const orderMock2 = vi.fn().mockReturnValue({ order: orderMock3 })
    const orderMock1 = vi.fn().mockReturnValue({ order: orderMock2 })
    const eqMock = vi.fn().mockReturnValue({ order: orderMock1 })
    const getSelectMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(supabase.from).mockReturnValue({ select: getSelectMock } as never)

    const plans = await mealPlanService.getMealPlans('hh-1')

    const getSelectQuery = getSelectMock.mock.calls[0][0] as string
    expect(getSelectQuery).toContain('reference_product_id')
    expect(getSelectQuery).toContain('product:products!meal_ingredients_product_id_fkey(*)')
    expect(getSelectQuery).toContain('reference_product:products!meal_ingredients_reference_product_id_fkey(*)')
    expect(getSelectQuery).not.toContain('product:products(*)')

    const singleMock = vi.fn().mockResolvedValue({ data: planWithGeneralProduct, error: null })
    const createSelectMock = vi.fn().mockReturnValue({ single: singleMock })
    const insertMock = vi.fn().mockReturnValue({ select: createSelectMock })
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as never)

    const createdPlan = await mealPlanService.createMealPlan({
      household_id: 'hh-1',
      date: '2026-10-15',
      meal_id: 'meal-1',
      servings: 2
    })

    const createSelectQuery = createSelectMock.mock.calls[0][0] as string
    expect(createSelectQuery).toContain('reference_product_id')
    expect(createSelectQuery).toContain('product:products!meal_ingredients_product_id_fkey(*)')
    expect(createSelectQuery).toContain('reference_product:products!meal_ingredients_reference_product_id_fkey(*)')
    expect(createSelectQuery).not.toContain('product:products(*)')

    expect(plans[0].meal?.ingredients[0].reference_product_id).toBe('prod-milk-2pct')
    expect(plans[0].meal?.ingredients[0].reference_product?.kcal_per_100).toBe(50)
    expect(createdPlan?.meal?.ingredients[0].reference_product?.kcal_per_100).toBe(50)

    // 200ml * 2 servings = 400ml -> 4 * (50 kcal, 3.4g P, 4.8g C, 2.0g F)
    const dayMacros = calculateDayMacros(plans)
    expect(dayMacros).toEqual({
      kcal: 200,
      protein: 13.6,
      carbs: 19.2,
      fat: 8
    })
  })
})
