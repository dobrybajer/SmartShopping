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

vi.mock('@/services/shoppingListService', () => ({
  shoppingListService: {
    getCalendarPipelineItems: vi.fn().mockResolvedValue({
      activeListItems: [],
      archivedListItems: []
    })
  }
}))

vi.mock('@/store/useToastStore', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn()
  }
}))

vi.mock('@/services/shoppingListService', () => ({
  shoppingListService: {
    getCalendarPipelineItems: vi.fn().mockResolvedValue({
      activeListItems: [],
      archivedListItems: []
    })
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
    is_uncertainty_dismissed: false,
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
            is_general: false,
            parent_id: null,
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
      draftsByHousehold: {},
      activeListItems: [],
      archivedListItems: []
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

  it('dismissUncertainty updates is_uncertainty_dismissed optimistically and persists via service (MED-03)', async () => {
    vi.mocked(mealPlanService.updateMealPlan).mockResolvedValueOnce(true)
    useMealPlanStore.setState({ mealPlans: [mockPlan] })

    const success = await useMealPlanStore.getState().dismissUncertainty('plan-1')

    expect(success).toBe(true)
    expect(mealPlanService.updateMealPlan).toHaveBeenCalledWith('plan-1', {
      is_uncertainty_dismissed: true
    })
    expect(useMealPlanStore.getState().mealPlans[0].is_uncertainty_dismissed).toBe(true)
  })

  it('loadMealPlans syncs active and archived list pipeline items into useShoppingStore (HIGH-11)', async () => {
    const { shoppingListService } = await import('@/services/shoppingListService')
    const activeItem = {
      id: 'active-1',
      shopping_list_id: 'list-1',
      product_id: 'prod-oats',
      total_quantity: 50,
      is_checked: false,
      added_ad_hoc: false,
      in_pantry: false,
      meal_plan_item_id: 'plan-1'
    }
    const archivedItem = {
      id: 'arch-1',
      shopping_list_id: 'list-old',
      product_id: 'prod-milk',
      total_quantity: 1,
      is_checked: true,
      added_ad_hoc: false,
      in_pantry: false,
      meal_plan_item_id: 'plan-1'
    }

    vi.mocked(mealPlanService.getMealPlans).mockResolvedValueOnce([mockPlan])
    vi.mocked(shoppingListService.getCalendarPipelineItems).mockResolvedValueOnce({
      activeListItems: [activeItem],
      archivedListItems: [archivedItem]
    })

    await useMealPlanStore.getState().loadMealPlans('house-1')

    expect(shoppingListService.getCalendarPipelineItems).toHaveBeenCalledWith('house-1')
    expect(useShoppingStore.getState().activeListItems).toEqual([activeItem])
    expect(useShoppingStore.getState().archivedListItems).toEqual([archivedItem])
  })
})
