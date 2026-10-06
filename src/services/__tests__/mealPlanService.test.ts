import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mealPlanService } from '../mealPlanService'
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

    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any)

    const res = await mealPlanService.getMealPlans('hh-1')

    expect(supabase.from).toHaveBeenCalledWith('meal_plans')
    expect(res).toHaveLength(1)
    expect(res[0].id).toBe('plan-1')
  })

  it('createMealPlan inserts and returns a new plan', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: mockPlan, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const insertMock = vi.fn().mockReturnValue({ select: selectMock })

    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any)

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

    vi.mocked(supabase.from).mockReturnValue({ delete: deleteMock } as any)

    const res = await mealPlanService.deleteMealPlan('plan-1')

    expect(deleteMock).toHaveBeenCalled()
    expect(eqMock).toHaveBeenCalledWith('id', 'plan-1')
    expect(res).toBe(true)
  })
})
