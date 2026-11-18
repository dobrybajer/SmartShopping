import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePantryStore } from '../usePantryStore'
import { pantryService } from '@/services/pantryService'
import type { PantryItemWithDetails } from '@/types/pantry'

vi.mock('@/services/pantryService', () => ({
  pantryService: {
    getPantryItems: vi.fn(),
    addOrIncrementItem: vi.fn(),
    updateQuantity: vi.fn(),
    verifyItem: vi.fn(),
    deletePantryItem: vi.fn(),
    removeByProductOrName: vi.fn(),
    deductMealIngredients: vi.fn(),
    updateExpirationDate: vi.fn()
  }
}))

vi.mock('@/store/useToastStore', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn()
  }
}))

describe('usePantryStore', () => {
  const mockPantryItem: PantryItemWithDetails = {
    id: 'pantry-1',
    household_id: 'hh-1',
    product_id: 'prod-100',
    ad_hoc_name: null,
    category_id: 1,
    quantity: 2,
    unit_type: 'pcs',
    last_purchased_at: '2026-09-01T12:00:00Z',
    last_verified_at: '2026-09-01T12:00:00Z',
    created_at: '2026-09-01T12:00:00Z',
    updated_at: '2026-09-01T12:00:00Z',
    product: {
      id: 'prod-100',
      name: 'Milk',
      unit_type: 'pcs',
      category_id: 1,
      category: {
        id: 1,
        name: 'dairy',
        is_non_food: false,
        sort_order: 1
      }
    },
    category: {
      id: 1,
      name: 'dairy',
      is_non_food: false,
      sort_order: 1
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    usePantryStore.getState().setActiveHousehold(null)
    usePantryStore.setState({
      pantryItems: [],
      pantryMapByProductId: {},
      pantryMapByAdHocName: {},
      pantryItemsByParentId: {},
      activeHouseholdId: null,
      isLoading: false
    })
  })

  it('Flow 01: loadPantryItems fetches items and populates O(1) lookup maps', async () => {
    vi.mocked(pantryService.getPantryItems).mockResolvedValue([mockPantryItem])

    usePantryStore.getState().setActiveHousehold('hh-1')
    await usePantryStore.getState().loadPantryItems('hh-1')

    const state = usePantryStore.getState()
    expect(state.pantryItems).toHaveLength(1)
    expect(state.pantryMapByProductId['prod-100']).toBeDefined()
    expect(state.pantryMapByProductId['prod-100'].quantity).toBe(2)
    expect(state.activeHouseholdId).toBe('hh-1')
  })

  it('Flow 02: updatePantryQuantity updates state optimistically and rolls back on failure', async () => {
    usePantryStore.setState({
      pantryItems: [mockPantryItem],
      pantryMapByProductId: { 'prod-100': mockPantryItem },
      pantryMapByAdHocName: {},
      activeHouseholdId: 'hh-1'
    })

    // Mock failure
    vi.mocked(pantryService.updateQuantity).mockResolvedValue(false)

    const success = await usePantryStore.getState().updatePantryQuantity('pantry-1', 5)

    expect(success).toBe(false)
    // Rolled back to original 2
    expect(usePantryStore.getState().pantryItems[0].quantity).toBe(2)
  })

  it('Flow 03: verifyPantryItem updates quantity and stamps last_verified_at', async () => {
    usePantryStore.setState({
      pantryItems: [mockPantryItem],
      pantryMapByProductId: { 'prod-100': mockPantryItem },
      pantryMapByAdHocName: {},
      activeHouseholdId: 'hh-1'
    })

    vi.mocked(pantryService.verifyItem).mockResolvedValue(true)

    const success = await usePantryStore.getState().verifyPantryItem('pantry-1', 3)

    expect(success).toBe(true)
    const updated = usePantryStore.getState().pantryItems[0]
    expect(updated.quantity).toBe(3)
    expect(updated.last_verified_at).not.toBe('2026-09-01T12:00:00Z')
  })

  it('Flow 04: deletePantryItem removes item optimistically from list and maps', async () => {
    usePantryStore.setState({
      pantryItems: [mockPantryItem],
      pantryMapByProductId: { 'prod-100': mockPantryItem },
      pantryMapByAdHocName: {},
      activeHouseholdId: 'hh-1'
    })

    vi.mocked(pantryService.deletePantryItem).mockResolvedValue(true)

    const success = await usePantryStore.getState().deletePantryItem('pantry-1')

    expect(success).toBe(true)
    expect(usePantryStore.getState().pantryItems).toHaveLength(0)
    expect(usePantryStore.getState().pantryMapByProductId['prod-100']).toBeUndefined()
  })

  it('Flow 05: addOrIncrementItem increments stock when mergeMode is increment', async () => {
    usePantryStore.setState({
      pantryItems: [mockPantryItem],
      pantryMapByProductId: { 'prod-100': mockPantryItem },
      pantryMapByAdHocName: {},
      activeHouseholdId: 'hh-1'
    })

    vi.mocked(pantryService.addOrIncrementItem).mockResolvedValue({
      ...mockPantryItem,
      quantity: 5
    })
    vi.mocked(pantryService.getPantryItems).mockResolvedValue([
      {
        ...mockPantryItem,
        quantity: 5
      }
    ])

    const success = await usePantryStore.getState().addOrIncrementItem(
      {
        household_id: 'hh-1',
        product_id: 'prod-100',
        quantity: 3,
        unit_type: 'pcs'
      },
      'increment'
    )

    expect(success).toBe(true)
    expect(usePantryStore.getState().pantryItems[0].quantity).toBe(5)
  })

  it('Flow 06: syncFromRealtime refreshes items and maps from household', async () => {
    usePantryStore.setState({
      pantryItems: [],
      pantryMapByProductId: {},
      pantryMapByAdHocName: {},
      activeHouseholdId: 'hh-1'
    })

    vi.mocked(pantryService.getPantryItems).mockResolvedValue([mockPantryItem])

    await usePantryStore.getState().syncFromRealtime()

    expect(usePantryStore.getState().pantryItems).toHaveLength(1)
    expect(usePantryStore.getState().pantryMapByProductId['prod-100']).toBeDefined()
  })

  it('Flow 07 (ADR-010): groups pantry items by parent_id in pantryItemsByParentId', async () => {
    const childItem1 = {
      ...mockPantryItem,
      id: 'pantry-child-1',
      product_id: 'prod-child-1',
      product: {
        ...mockPantryItem.product!,
        id: 'prod-child-1',
        name: 'Awokado Hass',
        parent_id: 'prod-parent-avo'
      }
    }
    const childItem2 = {
      ...mockPantryItem,
      id: 'pantry-child-2',
      product_id: 'prod-child-2',
      product: {
        ...mockPantryItem.product!,
        id: 'prod-child-2',
        name: 'Awokado Zielone',
        parent_id: 'prod-parent-avo'
      }
    }

    vi.mocked(pantryService.getPantryItems).mockResolvedValue([childItem1, childItem2])
    await usePantryStore.getState().loadPantryItems('hh-1')

    const state = usePantryStore.getState()
    expect(state.pantryItemsByParentId['prod-parent-avo']).toBeDefined()
    expect(state.pantryItemsByParentId['prod-parent-avo']).toHaveLength(2)
  })

  it('Flow 08 (MED-05): deductMealIngredients updates stock optimistically, removes depleted rows, and rolls back on failure', async () => {
    const secondItem: PantryItemWithDetails = {
      ...mockPantryItem,
      id: 'pantry-2',
      product_id: 'prod-200',
      quantity: 500,
      unit_type: 'g',
      product: {
        ...mockPantryItem.product!,
        id: 'prod-200',
        name: 'Makaron',
        unit_type: 'g'
      }
    }

    usePantryStore.setState({
      pantryItems: [mockPantryItem, secondItem],
      pantryMapByProductId: { 'prod-100': mockPantryItem, 'prod-200': secondItem },
      pantryMapByAdHocName: {},
      pantryItemsByParentId: {},
      activeHouseholdId: 'hh-1'
    })

    vi.mocked(pantryService.deductMealIngredients).mockResolvedValueOnce(true)

    const ok = await usePantryStore.getState().deductMealIngredients([
      { pantryItemId: 'pantry-1', newQuantity: 0 },
      { pantryItemId: 'pantry-2', newQuantity: 300 }
    ])

    expect(ok).toBe(true)
    const afterSuccess = usePantryStore.getState()
    expect(afterSuccess.pantryItems).toHaveLength(1)
    expect(afterSuccess.pantryMapByProductId['prod-100']).toBeUndefined()
    expect(afterSuccess.pantryMapByProductId['prod-200']?.quantity).toBe(300)

    // Failure rollback check
    vi.mocked(pantryService.deductMealIngredients).mockResolvedValueOnce(false)
    const failResult = await usePantryStore.getState().deductMealIngredients([
      { pantryItemId: 'pantry-2', newQuantity: 0 }
    ])
    expect(failResult).toBe(false)
    expect(usePantryStore.getState().pantryItems).toHaveLength(1)
    expect(usePantryStore.getState().pantryMapByProductId['prod-200']?.quantity).toBe(300)
  })

  it('Flow 09 (NORM-04): updateExpirationDate updates expiration_date optimistically and rolls back on failure', async () => {
    usePantryStore.setState({
      pantryItems: [mockPantryItem],
      pantryMapByProductId: { 'prod-100': mockPantryItem },
      pantryMapByAdHocName: {},
      pantryItemsByParentId: {},
      activeHouseholdId: 'hh-1'
    })

    vi.mocked(pantryService.updateExpirationDate).mockResolvedValueOnce(true)
    const ok = await usePantryStore.getState().updateExpirationDate('pantry-1', '2026-11-12')
    expect(ok).toBe(true)
    expect(usePantryStore.getState().pantryItems[0].expiration_date).toBe('2026-11-12')

    vi.mocked(pantryService.updateExpirationDate).mockResolvedValueOnce(false)
    const fail = await usePantryStore.getState().updateExpirationDate('pantry-1', null)
    expect(fail).toBe(false)
    expect(usePantryStore.getState().pantryItems[0].expiration_date).toBe('2026-11-12')
  })
})
