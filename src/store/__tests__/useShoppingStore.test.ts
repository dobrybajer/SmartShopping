import { describe, it, expect, beforeEach } from 'vitest'
import { useShoppingStore, type DraftItem } from '../useShoppingStore'

describe('useShoppingStore - Draft Management', () => {
  beforeEach(() => {
    localStorage.clear()
    useShoppingStore.setState({
      activeHouseholdId: 'household-1',
      draftsByHousehold: {},
      draftItems: []
    })
  })

  it('Flow 01: adds ad-hoc and product items to draft and updates state', () => {
    const store = useShoppingStore.getState()
    store.addAdHocToDraft({
      name: 'Milk',
      unit_type: 'ml',
      quantity: 1000,
      category_name: 'dairy'
    })

    store.addItemToDraft({
      product_id: 'prod-123',
      name: 'Eggs',
      unit_type: 'pcs',
      quantity: 10,
      category_name: 'eggs'
    })

    const items = useShoppingStore.getState().draftItems
    expect(items).toHaveLength(2)
    expect(items[0].name).toBe('Milk')
    expect(items[0].is_ad_hoc).toBe(true)
    expect(items[1].name).toBe('Eggs')
    expect(items[1].product_id).toBe('prod-123')
  })

  it('Flow 02: removeMultipleFromDraft removes only selected IDs from active household draft', () => {
    const initialItems: DraftItem[] = [
      {
        id: 'item-1',
        name: 'Bread',
        unit_type: 'pcs',
        category_name: 'bakery',
        sort_order: 1,
        quantity: 2,
        is_ad_hoc: true
      },
      {
        id: 'item-2',
        name: 'Butter',
        unit_type: 'g',
        category_name: 'dairy',
        sort_order: 2,
        quantity: 200,
        is_ad_hoc: false
      },
      {
        id: 'item-3',
        name: 'Coffee',
        unit_type: 'g',
        category_name: 'coffee',
        sort_order: 3,
        quantity: 500,
        is_ad_hoc: true
      }
    ]

    useShoppingStore.getState().setDraftItems(initialItems)
    expect(useShoppingStore.getState().draftItems).toHaveLength(3)

    // Remove item-1 and item-3, leaving item-2
    useShoppingStore.getState().removeMultipleFromDraft(['item-1', 'item-3'])

    const remaining = useShoppingStore.getState().draftItems
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe('item-2')
    expect(remaining[0].name).toBe('Butter')
  })

  it('Flow 03: clearDraft empties all items in the active household draft', () => {
    useShoppingStore.getState().addAdHocToDraft({
      name: 'Apples',
      unit_type: 'g',
      quantity: 500,
      category_name: 'fruits'
    })

    expect(useShoppingStore.getState().draftItems).toHaveLength(1)
    useShoppingStore.getState().clearDraft()
    expect(useShoppingStore.getState().draftItems).toHaveLength(0)
  })

  it('Flow 04: adopts category from incoming item when existing draft item was uncategorized or other', () => {
    // Initial item without category or marked 'other'
    useShoppingStore.getState().addItemToDraft({
      product_id: 'prod-456',
      name: 'Frozen Pizza',
      unit_type: 'pcs',
      quantity: 1,
      category_name: 'other'
    })

    expect(useShoppingStore.getState().draftItems[0].category_name).toBe('other')
    expect(useShoppingStore.getState().draftItems[0].category_id).toBeUndefined()

    // Add same product from history with specific category
    useShoppingStore.getState().addItemToDraft({
      product_id: 'prod-456',
      name: 'Frozen Pizza',
      unit_type: 'pcs',
      quantity: 2,
      category_id: 5,
      category_name: 'Mrożonki',
      sort_order: 10
    })

    const items = useShoppingStore.getState().draftItems
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(3)
    expect(items[0].category_id).toBe(5)
    expect(items[0].category_name).toBe('Mrożonki')
    expect(items[0].sort_order).toBe(10)
  })

  it('Flow 05 (HIGH-07): addMealToDraft scales targetKcal accurately for pcs units and general products with reference_product', () => {
    // 2 pcs of Eggs (70 kcal per 1 pc = 140 kcal) + 200ml general Milk with reference 2% Milk (50 kcal/100ml = 100 kcal)
    // Total base calories = 240 kcal. Target = 480 kcal -> multiplier = 2.0
    useShoppingStore.getState().addMealToDraft(
      {
        id: 'meal-scrambled-eggs',
        household_id: 'household-1',
        name: 'Jajecznica z mlekiem',
        description: null,
        preparation_steps: null,
        comments: null,
        category_id: 1,
        tags: [],
        ingredients: [
          {
            id: 'ing-eggs',
            meal_id: 'meal-scrambled-eggs',
            product_id: 'prod-eggs',
            base_quantity: 2,
            is_pantry_item: false,
            product: {
              id: 'prod-eggs',
              household_id: null,
              name: 'Jajka M',
              unit_type: 'pcs',
              category_id: 3,
              kcal_per_100: 70,
              protein_per_100: 6,
              carbs_per_100: 0.5,
              fat_per_100: 5,
              is_ad_hoc: false,
              type: 'Global',
              is_general: false,
              parent_id: null
            }
          },
          {
            id: 'ing-milk-gen',
            meal_id: 'meal-scrambled-eggs',
            product_id: 'prod-milk-general',
            reference_product_id: 'prod-milk-2pct',
            base_quantity: 200,
            is_pantry_item: false,
            product: {
              id: 'prod-milk-general',
              household_id: null,
              name: 'Mleko',
              unit_type: 'ml',
              category_id: 3,
              kcal_per_100: null,
              protein_per_100: null,
              carbs_per_100: null,
              fat_per_100: null,
              is_ad_hoc: false,
              type: 'Global',
              is_general: true,
              parent_id: null
            },
            reference_product: {
              id: 'prod-milk-2pct',
              household_id: null,
              name: 'Mleko 2%',
              unit_type: 'ml',
              category_id: 3,
              kcal_per_100: 50,
              protein_per_100: 3.4,
              carbs_per_100: 4.8,
              fat_per_100: 2,
              is_ad_hoc: false,
              type: 'Global',
              is_general: false,
              parent_id: 'prod-milk-general'
            }
          }
        ]
      },
      480
    )

    const items = useShoppingStore.getState().draftItems
    expect(items).toHaveLength(2)
    expect(items[0].product_id).toBe('prod-eggs')
    expect(items[0].quantity).toBe(4) // 2 pcs * 2.0
    expect(items[1].product_id).toBe('prod-milk-general')
    expect(items[1].quantity).toBe(400) // 200 ml * 2.0
  })
})
