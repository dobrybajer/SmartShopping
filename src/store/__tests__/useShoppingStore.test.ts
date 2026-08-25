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
})
