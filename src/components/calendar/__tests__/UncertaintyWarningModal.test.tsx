import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UncertaintyWarningModal } from '../UncertaintyWarningModal'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import { useMealPlanStore } from '@/store/useMealPlanStore'
import { mealPlanService } from '@/services/mealPlanService'
import type { MealPlanItem, MissingIngredient } from '@/types/calendar'

vi.mock('@/hooks/useDeviceLayout', () => ({
  useDeviceLayout: vi.fn()
}))

vi.mock('@/services/mealPlanService', () => ({
  mealPlanService: {
    updateMealPlan: vi.fn(),
    createRestoreDraftPayload: vi.fn((missing) => ({
      product_id: missing.productId,
      name: missing.productName,
      unit_type: missing.unitType,
      quantity: missing.requiredQuantity,
      is_ad_hoc: false
    }))
  }
}))

describe('UncertaintyWarningModal (MED-03 Dual Layout)', () => {
  const mockPlan: MealPlanItem = {
    id: 'plan-unc-1',
    household_id: 'hh-1',
    date: '2026-11-12',
    meal_id: 'meal-1',
    meal_category_id: 2,
    custom_name: null,
    is_ad_hoc: false,
    servings: 2,
    target_kcal: null,
    notes: null,
    sort_order: 0,
    is_uncertainty_dismissed: false,
    created_at: '2026-11-10T00:00:00Z',
    updated_at: '2026-11-10T00:00:00Z',
    meal: {
      id: 'meal-1',
      household_id: 'hh-1',
      name: 'Makaron z pesto',
      description: null,
      preparation_steps: null,
      comments: null,
      category_id: 2,
      tags: [],
      ingredients: []
    }
  }

  const missingIngredients: MissingIngredient[] = [
    {
      productId: 'prod-pesto',
      productName: 'Pesto bazyliowe',
      requiredQuantity: 100,
      unitType: 'g'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    useMealPlanStore.setState({ mealPlans: [mockPlan] })
  })

  it('Desktop Dialog: dismisses uncertainty alert and closes modal', async () => {
    vi.mocked(useDeviceLayout).mockReturnValue({ isDesktop: true, isMobile: false } as ReturnType<
      typeof useDeviceLayout
    >)
    vi.mocked(mealPlanService.updateMealPlan).mockResolvedValue(true)
    const onClose = vi.fn()

    render(
      <UncertaintyWarningModal
        isOpen={true}
        onClose={onClose}
        planItem={mockPlan}
        missingIngredients={missingIngredients}
      />
    )

    const dismissBtn = screen.getByRole('button', { name: /Zrozumiałem \/ Ignoruj brak|Got it \/ Ignore missing/i })
    fireEvent.click(dismissBtn)

    await waitFor(() => {
      expect(mealPlanService.updateMealPlan).toHaveBeenCalledWith('plan-unc-1', {
        is_uncertainty_dismissed: true
      })
      expect(useMealPlanStore.getState().mealPlans[0].is_uncertainty_dismissed).toBe(true)
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('Mobile Sheet: renders bottom sheet and dismisses uncertainty cleanly', async () => {
    vi.mocked(useDeviceLayout).mockReturnValue({ isDesktop: false, isMobile: true } as ReturnType<
      typeof useDeviceLayout
    >)
    vi.mocked(mealPlanService.updateMealPlan).mockResolvedValue(true)
    const onClose = vi.fn()

    render(
      <UncertaintyWarningModal
        isOpen={true}
        onClose={onClose}
        planItem={mockPlan}
        missingIngredients={missingIngredients}
      />
    )

    const dismissBtn = screen.getByRole('button', { name: /Zrozumiałem \/ Ignoruj brak|Got it \/ Ignore missing/i })
    fireEvent.click(dismissBtn)

    await waitFor(() => {
      expect(mealPlanService.updateMealPlan).toHaveBeenCalledWith('plan-unc-1', {
        is_uncertainty_dismissed: true
      })
      expect(onClose).toHaveBeenCalled()
    })
  })
})

