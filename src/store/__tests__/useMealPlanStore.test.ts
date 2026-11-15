import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMealPlanStore } from '../useMealPlanStore'
import { mealPlanService } from '@/services/mealPlanService'
import { weeklyTemplateService } from '@/services/weeklyTemplateService'
import { useShoppingStore } from '@/store/useShoppingStore'
import { usePantryStore } from '@/store/usePantryStore'
import { toast } from '@/store/useToastStore'
import type { MealPlanItem, WeeklyMealTemplate } from '@/types/calendar'

vi.mock('@/services/mealPlanService', () => ({
  mealPlanService: {
    getMealPlans: vi.fn(),
    createMealPlan: vi.fn(),
    createMealPlansBatch: vi.fn(),
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

vi.mock('@/services/weeklyTemplateService', () => ({
  weeklyTemplateService: {
    getWeeklyTemplates: vi.fn().mockResolvedValue([]),
    saveWeeklyTemplate: vi.fn(async (tpl) => tpl),
    deleteWeeklyTemplate: vi.fn().mockResolvedValue(true),
    syncRemoteTemplates: vi.fn(async (_hhId, cached) => cached)
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

  it('loadMealPlans fetches bounded month +/- 7d window and updates store (MED-14)', async () => {
    vi.mocked(mealPlanService.getMealPlans).mockResolvedValueOnce([mockPlan])

    await useMealPlanStore.getState().loadMealPlans('house-1')

    expect(mealPlanService.getMealPlans).toHaveBeenCalledWith('house-1', '2026-09-24', '2026-11-07')
    expect(useMealPlanStore.getState().loadedWindow).toEqual({
      householdId: 'house-1',
      startDate: '2026-09-24',
      endDate: '2026-11-07'
    })
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

  it('transferWeekToDraft batches multi-day meals into 1 draft push, 1 toast, and shared pantry stock (MED-16)', () => {
    const day2Plan: MealPlanItem = {
      ...mockPlan,
      id: 'plan-2',
      date: '2026-10-16'
    }
    useMealPlanStore.setState({ mealPlans: [mockPlan, day2Plan] })
    // Pantry holds only 50g oats -> enough for plan-1 (50g), leaving 0g so plan-2 (50g) goes to draft
    usePantryStore.setState({
      pantryItems: [
        {
          id: 'p-oats',
          household_id: 'house-1',
          product_id: 'prod-oats',
          ad_hoc_name: null,
          category_id: 1,
          quantity: 50,
          unit_type: 'g',
          last_purchased_at: null,
          last_verified_at: null,
          expiration_date: null,
          created_at: '',
          updated_at: '',
          category: null,
          product: mockPlan.meal!.ingredients![0].product!
        }
      ]
    })

    const addedCount = useMealPlanStore.getState().transferWeekToDraft(['2026-10-15', '2026-10-16'])

    expect(addedCount).toBe(1)
    expect(useShoppingStore.getState().draftItems).toHaveLength(1)
    expect(useShoppingStore.getState().draftItems[0].meal_plan_item_id).toBe('plan-2')
    expect(toast.success).toHaveBeenCalledTimes(1)
  })

  it('syncs weekly templates with weeklyTemplateService during load, save, and delete (MED-17)', async () => {
    const remoteTpl: WeeklyMealTemplate = {
      id: '11111111-1111-4111-8111-111111111111',
      household_id: 'house-1',
      name: 'Zdalny Plan',
      created_at: '2026-10-01T10:00:00Z',
      entries: []
    }
    vi.mocked(mealPlanService.getMealPlans).mockResolvedValueOnce([mockPlan])
    vi.mocked(weeklyTemplateService.syncRemoteTemplates).mockResolvedValueOnce([remoteTpl])

    await useMealPlanStore.getState().loadMealPlans('house-1')
    expect(useMealPlanStore.getState().weeklyTemplates).toEqual([remoteTpl])

    useMealPlanStore.setState({ mealPlans: [{ ...mockPlan, date: '2026-10-12' }] })
    const saved = useMealPlanStore.getState().saveWeekAsTemplate('Roboczy Tydzień', '2026-10-12', 7)
    expect(saved).not.toBeNull()
    expect(weeklyTemplateService.saveWeeklyTemplate).toHaveBeenCalledWith(saved)

    useMealPlanStore.getState().deleteWeeklyTemplate(saved!.id)
    expect(weeklyTemplateService.deleteWeeklyTemplate).toHaveBeenCalledWith(saved!.id, 'house-1')
  })
})
