import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CookMealDeductModal } from '../CookMealDeductModal'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import { usePantryStore } from '@/store/usePantryStore'
import { pantryService } from '@/services/pantryService'
import type { PantryItemWithDetails } from '@/types/pantry'

vi.mock('@/hooks/useDeviceLayout', () => ({
  useDeviceLayout: vi.fn()
}))

vi.mock('@/services/pantryService', () => ({
  pantryService: {
    getPantryItems: vi.fn(),
    addOrIncrementItem: vi.fn(),
    updateQuantity: vi.fn(),
    verifyItem: vi.fn(),
    deletePantryItem: vi.fn(),
    removeByProductOrName: vi.fn(),
    deductMealIngredients: vi.fn()
  }
}))

describe('CookMealDeductModal (MED-05 Dual Layout)', () => {
  const riceItem: PantryItemWithDetails = {
    id: 'pantry-rice',
    household_id: 'hh-1',
    product_id: 'prod-rice',
    ad_hoc_name: null,
    category_id: 3,
    quantity: 500,
    unit_type: 'g',
    last_purchased_at: '2026-11-01T12:00:00Z',
    last_verified_at: null,
    created_at: '2026-11-01T12:00:00Z',
    updated_at: '2026-11-01T12:00:00Z',
    product: {
      id: 'prod-rice',
      name: 'Ryż Basmati',
      unit_type: 'g',
      category_id: 3
    },
    category: null
  }

  beforeEach(() => {
    vi.clearAllMocks()
    usePantryStore.setState({
      activeHouseholdId: 'hh-1',
      pantryItems: [riceItem],
      pantryMapByProductId: { 'prod-rice': riceItem },
      pantryMapByAdHocName: {},
      pantryItemsByParentId: {}
    })
  })

  it('Desktop Dialog: displays matching pantry deductions and deducts checked ingredients on confirm', async () => {
    vi.mocked(useDeviceLayout).mockReturnValue({ isDesktop: true, isMobile: false } as ReturnType<
      typeof useDeviceLayout
    >)
    vi.mocked(pantryService.deductMealIngredients).mockResolvedValue(true)
    const onOpenChange = vi.fn()

    render(
      <CookMealDeductModal
        open={true}
        onOpenChange={onOpenChange}
        mealName="Curry z ryżem"
        ingredients={[
          { productId: 'prod-rice', productName: 'Ryż Basmati', requiredQuantity: 200, unitType: 'g' }
        ]}
      />
    )

    expect(screen.getByText('Ryż Basmati')).toBeInTheDocument()
    const confirmBtn = screen.getByRole('button', { name: /Zdejmij ze spiżarni|Deduct from pantry/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(pantryService.deductMealIngredients).toHaveBeenCalledWith([
        { pantryItemId: 'pantry-rice', newQuantity: 300 }
      ])
      expect(usePantryStore.getState().pantryItems[0].quantity).toBe(300)
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('Mobile Sheet: renders bottom sheet, unchecks skipped ingredient, and deducts selected ones', async () => {
    vi.mocked(useDeviceLayout).mockReturnValue({ isDesktop: false, isMobile: true } as ReturnType<
      typeof useDeviceLayout
    >)
    vi.mocked(pantryService.deductMealIngredients).mockResolvedValue(true)
    const saltItem: PantryItemWithDetails = {
      ...riceItem,
      id: 'pantry-salt',
      product_id: 'prod-salt',
      quantity: 200,
      product: {
        id: 'prod-salt',
        name: 'Sól',
        unit_type: 'g',
        category_id: 3
      }
    }
    usePantryStore.setState({
      pantryItems: [riceItem, saltItem],
      pantryMapByProductId: { 'prod-rice': riceItem, 'prod-salt': saltItem }
    })

    const onOpenChange = vi.fn()

    render(
      <CookMealDeductModal
        open={true}
        onOpenChange={onOpenChange}
        mealName="Curry z ryżem"
        ingredients={[
          { productId: 'prod-rice', productName: 'Ryż Basmati', requiredQuantity: 500, unitType: 'g' },
          { productId: 'prod-salt', productName: 'Sól', requiredQuantity: 10, unitType: 'g' }
        ]}
      />
    )

    fireEvent.click(screen.getByRole('checkbox', { name: 'Sól' }))

    const confirmBtn = screen.getByRole('button', { name: /Zdejmij ze spiżarni \(1\)|Deduct from pantry \(1\)/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(pantryService.deductMealIngredients).toHaveBeenCalledWith([
        { pantryItemId: 'pantry-rice', newQuantity: 0 }
      ])
      expect(usePantryStore.getState().pantryItems).toHaveLength(1)
      expect(usePantryStore.getState().pantryItems[0].id).toBe('pantry-salt')
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })
})
