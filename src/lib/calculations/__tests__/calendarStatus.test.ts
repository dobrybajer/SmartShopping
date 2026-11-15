import { describe, it, expect } from 'vitest'
import {
  calculateMealPlanStatus,
  calculateMealPlanStatusesMap,
  calculateDayMacros,
  generateDraftItemsFromMealPlan,
  generateDraftItemsFromMealPlans,
  getEffectiveMultiplier
} from '../calendarStatus'
import { addDaysISO, formatLocalDateISO } from '@/lib/utils'
import type { MealPlanItem } from '@/types/calendar'
import type { DraftItem } from '@/store/useShoppingStore'
import type { Database } from '@/types/supabase'
import type { PantryItem } from '@/types/pantry'

type ShoppingListItemRow = Database['public']['Tables']['shopping_list_items']['Row']

describe('calendarStatus - Pure Calculations Engine (ADR-009)', () => {
  const mockProduct1 = {
    id: 'prod-1',
    household_id: 'house-1',
    name: 'Eggs',
    unit_type: 'pcs' as const,
    category_id: 2,
    kcal_per_100: 70, // 70 kcal per pcs
    protein_per_100: 6,
    carbs_per_100: 0.5,
    fat_per_100: 5,
    is_ad_hoc: false,
    is_general: false,
    parent_id: null,
    type: 'Household' as const
  }

  const mockProduct2 = {
    id: 'prod-2',
    household_id: 'house-1',
    name: 'Butter',
    unit_type: 'g' as const,
    category_id: 2,
    kcal_per_100: 720,
    protein_per_100: 1,
    carbs_per_100: 1,
    fat_per_100: 80,
    is_ad_hoc: false,
    is_general: false,
    parent_id: null,
    type: 'Household' as const
  }

  const mockMealPlan: MealPlanItem = {
    id: 'plan-101',
    household_id: 'house-1',
    date: '2026-10-15',
    meal_id: 'meal-1',
    meal_category_id: 1, // Breakfast
    custom_name: null,
    is_ad_hoc: false,
    servings: 2,
    target_kcal: null,
    notes: 'Breakfast with eggs and butter',
    sort_order: 0,
    is_uncertainty_dismissed: false,
    created_at: '2026-10-07T00:00:00Z',
    updated_at: '2026-10-07T00:00:00Z',
    meal: {
      id: 'meal-1',
      household_id: 'house-1',
      name: 'Scrambled Eggs',
      description: 'Tasty breakfast',
      preparation_steps: 'Fry eggs with butter',
      comments: null,
      category_id: 1,
      tags: ['breakfast'],
      ingredients: [
        {
          id: 'ing-1',
          meal_id: 'meal-1',
          product_id: 'prod-1',
          base_quantity: 2, // 2 pcs base -> 4 pcs for 2 servings
          is_pantry_item: false,
          product: mockProduct1
        },
        {
          id: 'ing-2',
          meal_id: 'meal-1',
          product_id: 'prod-2',
          base_quantity: 10, // 10g base -> 20g for 2 servings
          is_pantry_item: false,
          product: mockProduct2
        }
      ]
    }
  }

  describe('calculateMealPlanStatus', () => {
    it('returns "planned" when meal has not yet entered draft or shopping list', () => {
      const res = calculateMealPlanStatus(mockMealPlan, {
        draftItems: [],
        activeListItems: []
      })

      expect(res.status).toBe('planned')
      expect(res.totalIngredients).toBe(2)
      expect(res.inDraftCount).toBe(0)
      expect(res.missingIngredients).toHaveLength(0)
    })

    it('returns "bought" for past dates', () => {
      const res = calculateMealPlanStatus(mockMealPlan, {
        isPastDate: true
      })
      expect(res.status).toBe('bought')
    })

    it('returns "bought" if 100% of ingredients are covered by the domestic pantry', () => {
      const pantryItems: PantryItem[] = [
        {
          id: 'p-1',
          household_id: 'house-1',
          product_id: 'prod-1',
          ad_hoc_name: null,
          category_id: 2,
          quantity: 10, // needs 4
          unit_type: 'pcs',
          last_purchased_at: null,
          last_verified_at: null,
          created_at: '',
          updated_at: ''
        },
        {
          id: 'p-2',
          household_id: 'house-1',
          product_id: 'prod-2',
          ad_hoc_name: null,
          category_id: 2,
          quantity: 50, // needs 20
          unit_type: 'g',
          last_purchased_at: null,
          last_verified_at: null,
          created_at: '',
          updated_at: ''
        }
      ]

      const res = calculateMealPlanStatus(mockMealPlan, {
        pantryItems,
        draftItems: []
      })

      expect(res.status).toBe('bought')
      expect(res.pantryCoveredCount).toBe(2)
    })

    it('returns "in_draft" when all needed ingredients are currently in the shopping cart (Draft)', () => {
      const draftItems: DraftItem[] = [
        {
          id: 'd-1',
          product_id: 'prod-1',
          name: 'Eggs',
          unit_type: 'pcs',
          category_name: 'dairy',
          sort_order: 1,
          quantity: 4,
          is_ad_hoc: false,
          meal_plan_item_id: 'plan-101'
        },
        {
          id: 'd-2',
          product_id: 'prod-2',
          name: 'Butter',
          unit_type: 'g',
          category_name: 'dairy',
          sort_order: 1,
          quantity: 20,
          is_ad_hoc: false,
          meal_plan_item_id: 'plan-101'
        }
      ]

      const res = calculateMealPlanStatus(mockMealPlan, { draftItems })
      expect(res.status).toBe('in_draft')
      expect(res.inDraftCount).toBe(2)
    })

    it('returns "in_list" when ingredients are on active shopping list', () => {
      const activeListItems: ShoppingListItemRow[] = [
        {
          id: 'item-1',
          shopping_list_id: 'list-1',
          product_id: 'prod-1',
          total_quantity: 4,
          is_checked: false,
          added_ad_hoc: false,
          in_pantry: false,
          meal_plan_item_id: 'plan-101'
        },
        {
          id: 'item-2',
          shopping_list_id: 'list-1',
          product_id: 'prod-2',
          total_quantity: 20,
          is_checked: false,
          added_ad_hoc: false,
          in_pantry: false,
          meal_plan_item_id: 'plan-101'
        }
      ]

      const res = calculateMealPlanStatus(mockMealPlan, { activeListItems })
      expect(res.status).toBe('in_list')
      expect(res.inListCount).toBe(2)
    })

    it('returns "bought" when all non-pantry ingredients are checked off', () => {
      const activeListItems: ShoppingListItemRow[] = [
        {
          id: 'item-1',
          shopping_list_id: 'list-1',
          product_id: 'prod-1',
          total_quantity: 4,
          is_checked: true,
          added_ad_hoc: false,
          in_pantry: false,
          meal_plan_item_id: 'plan-101'
        },
        {
          id: 'item-2',
          shopping_list_id: 'list-1',
          product_id: 'prod-2',
          total_quantity: 20,
          is_checked: true,
          added_ad_hoc: false,
          in_pantry: false,
          meal_plan_item_id: 'plan-101'
        }
      ]

      const res = calculateMealPlanStatus(mockMealPlan, { activeListItems })
      expect(res.status).toBe('bought')
      expect(res.boughtCount).toBe(2)
    })

    it('treats checked/in_pantry archived list items as "bought", but rejects unchecked archived items (HIGH-11)', () => {
      const archivedChecked: ShoppingListItemRow[] = [
        {
          id: 'arch-1',
          shopping_list_id: 'list-old',
          product_id: 'prod-1',
          total_quantity: 4,
          is_checked: true,
          added_ad_hoc: false,
          in_pantry: false,
          meal_plan_item_id: 'plan-101'
        },
        {
          id: 'arch-2',
          shopping_list_id: 'list-old',
          product_id: 'prod-2',
          total_quantity: 20,
          is_checked: false,
          added_ad_hoc: false,
          in_pantry: true,
          meal_plan_item_id: 'plan-101'
        }
      ]

      const boughtRes = calculateMealPlanStatus(mockMealPlan, { archivedListItems: archivedChecked })
      expect(boughtRes.status).toBe('bought')
      expect(boughtRes.boughtCount).toBe(1)
      expect(boughtRes.pantryCoveredCount).toBe(1)

      const archivedUnchecked: ShoppingListItemRow[] = [
        {
          ...archivedChecked[0],
          is_checked: true
        },
        {
          ...archivedChecked[1],
          is_checked: false,
          in_pantry: false
        }
      ]

      const uncertainRes = calculateMealPlanStatus(mockMealPlan, {
        archivedListItems: archivedUnchecked
      })
      expect(uncertainRes.status).toBe('uncertain')
      expect(uncertainRes.boughtCount).toBe(1)
      expect(uncertainRes.missingIngredients.map((m) => m.productId)).toEqual(['prod-2'])
    })

    it('triggers "uncertain" (⚠️) when an ingredient was deleted from draft/list', () => {
      // User only has eggs in draft, butter was removed!
      const draftItems: DraftItem[] = [
        {
          id: 'd-1',
          product_id: 'prod-1',
          name: 'Eggs',
          unit_type: 'pcs',
          category_name: 'dairy',
          sort_order: 1,
          quantity: 4,
          is_ad_hoc: false,
          meal_plan_item_id: 'plan-101'
        }
      ]

      const res = calculateMealPlanStatus(mockMealPlan, { draftItems })
      expect(res.status).toBe('uncertain')
      expect(res.missingIngredients).toHaveLength(1)
      expect(res.missingIngredients[0].productId).toBe('prod-2')
      expect(res.missingIngredients[0].productName).toBe('Butter')
      expect(res.missingIngredients[0].requiredQuantity).toBe(20)
    })

    it('suppresses "uncertain" status when is_uncertainty_dismissed is true (MED-03)', () => {
      const dismissedPlan: MealPlanItem = {
        ...mockMealPlan,
        is_uncertainty_dismissed: true
      }

      // Eggs are bought on active list, Butter is missing/deleted
      const activeListItems: ShoppingListItemRow[] = [
        {
          id: 'item-1',
          shopping_list_id: 'list-1',
          product_id: 'prod-1',
          total_quantity: 4,
          is_checked: true,
          added_ad_hoc: false,
          in_pantry: false,
          meal_plan_item_id: 'plan-101'
        }
      ]

      const resBought = calculateMealPlanStatus(dismissedPlan, { activeListItems })
      expect(resBought.status).toBe('bought')
      expect(resBought.missingIngredients).toHaveLength(1)

      // When remaining item is only in draft, dismissed plan falls back to in_draft
      const draftItems: DraftItem[] = [
        {
          id: 'd-1',
          product_id: 'prod-1',
          name: 'Eggs',
          unit_type: 'pcs',
          category_name: 'dairy',
          sort_order: 1,
          quantity: 4,
          is_ad_hoc: false,
          meal_plan_item_id: 'plan-101'
        }
      ]

      const resDraft = calculateMealPlanStatus(dismissedPlan, { draftItems })
      expect(resDraft.status).toBe('in_draft')
    })
  })

  describe('calculateDayMacros', () => {
    it('accurately calculates scaled calories and macros for 2 servings', () => {
      const macros = calculateDayMacros([mockMealPlan])

      // 4 eggs: 4 * 70 = 280 kcal, 4 * 6 = 24g protein, 4 * 0.5 = 2g carbs, 4 * 5 = 20g fat
      // 20g butter: 20/100 * 720 = 144 kcal, 20/100 * 1 = 0.2g protein, 20/100 * 1 = 0.2g carbs, 20/100 * 80 = 16g fat
      // Total kcal: 280 + 144 = 424 kcal
      // Total protein: 24.2g
      // Total carbs: 2.2g
      // Total fat: 36g

      expect(macros.kcal).toBe(424)
      expect(macros.protein).toBeCloseTo(24.2, 1)
      expect(macros.carbs).toBeCloseTo(2.2, 1)
      expect(macros.fat).toBeCloseTo(36, 1)
    })

    it('accounts for ad-hoc meals with target_kcal', () => {
      const adHocPlan: MealPlanItem = {
        id: 'adhoc-1',
        household_id: 'house-1',
        date: '2026-10-15',
        meal_id: null,
        meal_category_id: 3,
        custom_name: 'Dinner Out',
        is_ad_hoc: true,
        servings: 1,
        target_kcal: 650,
        notes: null,
        sort_order: 1,
        is_uncertainty_dismissed: false,
        created_at: '',
        updated_at: ''
      }

      const macros = calculateDayMacros([mockMealPlan, adHocPlan])
      expect(macros.kcal).toBe(424 + 650)
    })
  })

  describe('generateDraftItemsFromMealPlan', () => {
    it('creates draft items with scaled quantities and plan link', () => {
      const items = generateDraftItemsFromMealPlan(mockMealPlan, {
        dayLabel: 'Wtorek',
        excludePantryItems: false
      })

      expect(items).toHaveLength(2)
      expect(items[0]).toEqual({
        product_id: 'prod-1',
        name: 'Eggs',
        unit_type: 'pcs',
        category_id: 2,
        category_name: undefined,
        quantity: 4,
        is_ad_hoc: false,
        meal_source: 'Wtorek · Scrambled Eggs',
        meal_plan_item_id: 'plan-101'
      })
      expect(items[1].quantity).toBe(20)
    })

    it('excludes items already fully stocked in the domestic pantry', () => {
      const pantryItems: PantryItem[] = [
        {
          id: 'p-1',
          household_id: 'house-1',
          product_id: 'prod-2',
          ad_hoc_name: null,
          category_id: 2,
          quantity: 100, // plenty of butter!
          unit_type: 'g',
          last_purchased_at: null,
          last_verified_at: null,
          created_at: '',
          updated_at: ''
        }
      ]

      const items = generateDraftItemsFromMealPlan(mockMealPlan, {
        dayLabel: 'Wtorek',
        excludePantryItems: true,
        pantryItems
      })

      // Only eggs should be in draft, butter is stocked in pantry
      expect(items).toHaveLength(1)
      expect(items[0].product_id).toBe('prod-1')
    })

    it('scales recipe meal quantities and macros proportionally when target_kcal is set (MED-08)', () => {
      // Base 1-serving meal is 2 eggs (140 kcal) + 10g butter (72 kcal) = 212 kcal
      // Setting target_kcal = 636 kcal -> effective multiplier = 636 / 212 = 3
      const targetKcalPlan: MealPlanItem = {
        ...mockMealPlan,
        servings: 1,
        target_kcal: 636
      }

      expect(getEffectiveMultiplier(targetKcalPlan)).toBeCloseTo(3, 4)

      const macros = calculateDayMacros([targetKcalPlan])
      expect(macros.kcal).toBe(636)

      const items = generateDraftItemsFromMealPlan(targetKcalPlan, {
        excludePantryItems: false
      })
      expect(items[0].quantity).toBe(6) // 2 * 3 pcs
      expect(items[1].quantity).toBe(30) // 10 * 3 g
    })
  })

  describe('Local date ISO helpers (MED-10)', () => {
    it('shifts dates in local calendar time without UTC timezone drift', () => {
      expect(addDaysISO('2026-11-15', 1)).toBe('2026-11-16')
      expect(addDaysISO('2026-11-15', -1)).toBe('2026-11-14')
      expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01')
      expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28')

      const localDate = new Date(2026, 10, 15, 0, 30, 0) // 00:30 local time
      expect(formatLocalDateISO(localDate)).toBe('2026-11-15')
    })
  })

  describe('O(1) batch statuses & cumulative pantry allocation (MED-15 & MED-16)', () => {
    it('prevents double-counting pantry stock across multiple planned meals in statuses and batch draft transfer', () => {
      const mealA: MealPlanItem = {
        ...mockMealPlan,
        id: 'plan-a',
        date: '2026-11-16',
        servings: 1 // needs 2 Eggs + 10g Butter
      }
      const mealB: MealPlanItem = {
        ...mockMealPlan,
        id: 'plan-b',
        date: '2026-11-17',
        servings: 1 // needs 2 Eggs + 10g Butter
      }

      // Pantry only has 2 Eggs and 15g Butter -> covers mealA fully (0 Eggs & 5g Butter left), so mealB still needs both!
      const pantryItems: PantryItem[] = [
        {
          id: 'pan-eggs',
          household_id: 'house-1',
          product_id: 'prod-1',
          ad_hoc_name: null,
          category_id: 2,
          quantity: 2,
          unit_type: 'pcs',
          last_purchased_at: null,
          last_verified_at: null,
          created_at: '',
          updated_at: ''
        },
        {
          id: 'pan-butter',
          household_id: 'house-1',
          product_id: 'prod-2',
          ad_hoc_name: null,
          category_id: 2,
          quantity: 15,
          unit_type: 'g',
          last_purchased_at: null,
          last_verified_at: null,
          created_at: '',
          updated_at: ''
        }
      ]

      const pantryMapByProductId = new Map<string, PantryItem>(
        pantryItems.map((p) => [p.product_id!, p])
      )

      const statuses = calculateMealPlanStatusesMap(
        [mealA, mealB],
        { pantryItems, pantryMapByProductId, pantryItemsByParentId: new Map() },
        '2026-11-15'
      )

      expect(statuses.get('plan-a')?.status).toBe('bought')
      expect(statuses.get('plan-b')?.status).toBe('planned')
      expect(statuses.get('plan-b')?.pantryCoveredCount).toBe(0)

      const batchedDraft = generateDraftItemsFromMealPlans([mealA, mealB], {
        pantryItems,
        pantryMapByProductId,
        pantryItemsByParentId: new Map(),
        excludePantryItems: true
      })

      expect(batchedDraft).toHaveLength(2)
      expect(batchedDraft.every((d) => d.meal_plan_item_id === 'plan-b')).toBe(true)
    })
  })
})
