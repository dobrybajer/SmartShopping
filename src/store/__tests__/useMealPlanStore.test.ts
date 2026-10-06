import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMealPlanStore } from '../useMealPlanStore'
import { mealPlanService } from '@/services/mealPlanService'
import { useShoppingStore } from '@/store/useShoppingStore'
import { usePantryStore } from '@/store/usePantryStore'
import type { MealPlanItem } from '@/types/calendar'

vi.mock('@/services/mealPlanService', () => ({
  mealPlanService: {
    getMealPlans: vi.fn(),
    createMealPlan: vi.fn(),
    updateMealPlan: vi.fn(),
    deleteMealPlan: vi.fn(),
    duplicateMealPlanToDate: vi.fn(),
    createRestoreDraftPayload: vi.fn((missing, planItem, date) => ({
      product_id: missing.productId,
      name: missing.productName,
      unit_type: missing.unitType,
      quantity: missing.requiredQuantity,
      is_ad_hoc: false,
      meal_source: `${date} · ${planItem.meal?.name} (Przywrócono)`,
      meal_plan_item_id: planItem.id
    }))
  }
}))

vi.mock('@/store/useToastStore', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn()
  }
}))

describe('useMealPlanStore', () => {
  const mockPlan: MealPlanItem = {
    id: 'plan-1',
    household_id: 'house-1',
    date: '2026-10-15',
    meal_id: 'meal-1',
    meal_category_id: 1,
    custom_name: null,
    is_ad_hoc: false,
    servings: 1,
    target_kcal: null,
    notes: null,
    sort_order: 0,
    created_at: '2026-10-07T00:00:00Z',
    updated_at: '2026-10-07T00:00:00Z',
    meal: {
      id: 'meal-1',
      household_id: 'house-1',
      name: 'Oatmeal',
      description: null,
      preparation_steps: null,
      comments: null,
      category_id: 1,
      tags: [],
      ingredients: [
        {
          id: 'ing-1',
          meal_id: 'meal-1',
          product_id: 'prod-oats',
          base_quantity: 50,
          is_pantry_item: false,
          product: {
            id: 'prod-oats',
            household_id: 'house-1',
            name: 'Oats',
            unit_type: 'g',
            category_id: 1,
            kcal_per_100: 380,
            protein_per_100: 13,
            carbs_per_100: 68,
            fat_per_100: 7,
            is_ad_hoc: false,
            type: 'Household'
          }
        }
      ]
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    useMealPlanStore.setState({
      mealPlans: [],
      isLoading: false,
      activeHouseholdId: 'house-1',
      viewMode: 'week',
      weekRangeMode: 'workweek',
      selectedDate: '2026-10-15'
    })
    useShoppingStore.setState({
      draftItems: [],
      draftsByHousehold: {}
    })
    usePantryStore.setState({
      pantryItems: []
    })
  })

  it('loadMealPlans fetches items and updates store', async () => {
    vi.mocked(mealPlanService.getMealPlans).mockResolvedValueOnce([mockPlan])

    await useMealPlanStore.getState().loadMealPlans('house-1')

    expect(mealPlanService.getMealPlans).toHaveBeenCalledWith('house-1', undefined, undefined)
    expect(useMealPlanStore.getState().mealPlans).toEqual([mockPlan])
    expect(useMealPlanStore.getState().isLoading).toBe(false)
  })

  it('addMealPlan adds item and replaces optimistic entry on success', async () => {
    vi.mocked(mealPlanService.createMealPlan).mockResolvedValueOnce(mockPlan)

    const res = await useMealPlanStore.getState().addMealPlan({
      household_id: 'house-1',
      date: '2026-10-15',
      meal_id: 'meal-1'
    })

    expect(res).toEqual(mockPlan)
    expect(useMealPlanStore.getState().mealPlans).toContainEqual(mockPlan)
  })

  it('addMealPlan rolls back if service fails', async () => {
    vi.mocked(mealPlanService.createMealPlan).mockResolvedValueOnce(null)

    const res = await useMealPlanStore.getState().addMealPlan({
      household_id: 'house-1',
      date: '2026-10-15',
      meal_id: 'meal-1'
    })

    expect(res).toBeNull()
    expect(useMealPlanStore.getState().mealPlans).toHaveLength(0)
  })

  it('updateMealPlan updates item optimistically and rolls back on failure', async () => {
    useMealPlanStore.setState({ mealPlans: [mockPlan] })
    vi.mocked(mealPlanService.updateMealPlan).mockResolvedValueOnce(false)

    const success = await useMealPlanStore.getState().updateMealPlan('plan-1', { servings: 3 })

    expect(success).toBe(false)
    expect(useMealPlanStore.getState().mealPlans[0].servings).toBe(1)
  })

  it('deleteMealPlan removes item and rolls back on failure', async () => {
    useMealPlanStore.setState({ mealPlans: [mockPlan] })
    vi.mocked(mealPlanService.deleteMealPlan).mockResolvedValueOnce(false)

    const success = await useMealPlanStore.getState().deleteMealPlan('plan-1')

    expect(success).toBe(false)
    expect(useMealPlanStore.getState().mealPlans).toHaveLength(1)
  })

  it('transferMealToDraft converts ingredients and transfers them to useShoppingStore', () => {
    useMealPlanStore.setState({ mealPlans: [mockPlan] })

    const count = useMealPlanStore.getState().transferMealToDraft(mockPlan, { excludePantryItems: false })

    expect(count).toBe(1)
    const draftItems = useShoppingStore.getState().draftItems
    expect(draftItems).toHaveLength(1)
    expect(draftItems[0].product_id).toBe('prod-oats')
    expect(draftItems[0].meal_plan_item_id).toBe('plan-1')
  })

  it('restoreMissingIngredient adds payload to shopping draft', () => {
    useMealPlanStore.getState().restoreMissingIngredient(
      {
        productId: 'prod-oats',
        productName: 'Oats',
        requiredQuantity: 50,
        unitType: 'g'
      },
      mockPlan
    )

    const draftItems = useShoppingStore.getState().draftItems
    expect(draftItems).toHaveLength(1)
    expect(draftItems[0].product_id).toBe('prod-oats')
    expect(draftItems[0].quantity).toBe(50)
  })
})
