import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddCalendarMealDialog } from '../AddCalendarMealDialog'
import { WeeklyTemplatesModal } from '../WeeklyTemplatesModal'
import { UncertaintyWarningModal } from '../UncertaintyWarningModal'
import { useI18nStore } from '@/i18n'
import { useAuth } from '@/hooks/useAuth'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import { mealService } from '@/services/mealService'
import { useMealPlanStore } from '@/store/useMealPlanStore'
import type { MealPlanItem, WeeklyMealTemplate } from '@/types/calendar'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn()
}))

vi.mock('@/hooks/useDeviceLayout', () => ({
  useDeviceLayout: vi.fn()
}))

vi.mock('@/services/mealService', () => ({
  mealService: {
    getMeals: vi.fn(),
    getMealCategories: vi.fn()
  }
}))

describe('Calendar Modals i18n, 44px Touch Targets & ConfirmDelete (NORM-14 & NORM-15)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useI18nStore.getState().setLanguage('en')
    vi.mocked(useAuth).mockReturnValue({
      household: { id: 'hh-1', name: 'Test Home' },
      user: { id: 'user-1' }
    } as never)
    vi.mocked(useDeviceLayout).mockReturnValue({
      isDesktop: false,
      isMobile: true,
      layoutMode: 'mobile',
      setLayoutMode: vi.fn()
    } as never)
    vi.mocked(mealService.getMeals).mockResolvedValue([
      {
        id: 'meal-1',
        household_id: 'hh-1',
        name: 'Pancakes',
        description: null,
        preparation_steps: null,
        comments: null,
        category_id: 1,
        tags: [],
        type: 'Household',
        ingredients: [
          {
            id: 'ing-1',
            meal_id: 'meal-1',
            product_id: 'prod-1',
            reference_product_id: null,
            base_quantity: 200,
            is_pantry_item: false,
            product: null,
            reference_product: null
          }
        ]
      }
    ] as never)
    vi.mocked(mealService.getMealCategories).mockResolvedValue([
      { id: 1, name: 'breakfast' },
      { id: 2, name: 'lunch' }
    ])
  })

  it('renders AddCalendarMealDialog completely translated in EN with 44px servings steppers', async () => {
    render(
      <AddCalendarMealDialog
        isOpen={true}
        onClose={vi.fn()}
        initialDate="2026-11-16"
      />
    )

    expect(await screen.findByText('1 ingredients')).toBeInTheDocument()
    expect(screen.getByText('Breakfast')).toBeInTheDocument()
    expect(screen.getByText('Lunch')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. 650')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. Family dinner, 2-day meal prep')).toBeInTheDocument()
    expect(screen.queryByText(/składników|np\. 650|Nazwa dania/)).not.toBeInTheDocument()

    // Switch to ad-hoc to check customNameLabel translation
    fireEvent.click(screen.getByRole('button', { name: /Quick meal/i }))
    expect(screen.getByText('Meal name')).toBeInTheDocument()

    const decBtn = screen.getByRole('button', { name: 'Decrease' })
    const incBtn = screen.getByRole('button', { name: 'Increase' })
    expect(decBtn.className).toContain('min-w-[44px]')
    expect(decBtn.className).toContain('min-h-[44px]')
    expect(incBtn.className).toContain('min-w-[44px]')
    expect(incBtn.className).toContain('min-h-[44px]')
  })

  it('requires ConfirmDeleteDialog and enforces 44px delete button in WeeklyTemplatesModal', async () => {
    const deleteSpy = vi.fn()
    const sampleTemplate: WeeklyMealTemplate = {
      id: '11111111-1111-4111-8111-111111111111',
      household_id: 'hh-1',
      name: 'Clean Eating Week',
      created_at: '2026-11-01T10:00:00Z',
      entries: [
        {
          day_offset: 0,
          meal_id: 'meal-1',
          meal_name: 'Oatmeal',
          meal_category_id: 1,
          custom_name: null,
          is_ad_hoc: false,
          servings: 2,
          target_kcal: null,
          notes: null,
          sort_order: 0
        }
      ]
    }

    useMealPlanStore.setState({
      weeklyTemplates: [sampleTemplate],
      deleteWeeklyTemplate: deleteSpy
    })

    render(
      <WeeklyTemplatesModal
        open={true}
        onOpenChange={vi.fn()}
        weekStartMondayIso="2026-11-16"
        weekRangeLabel="16 - 22 Nov 2026"
        currentWeekMealsCount={1}
        numDays={7}
      />
    )

    const trashBtn = screen.getByRole('button', { name: 'Delete' })
    expect(trashBtn.className).toContain('min-w-[44px]')
    expect(trashBtn.className).toContain('min-h-[44px]')

    fireEvent.click(trashBtn)
    expect(deleteSpy).not.toHaveBeenCalled()

    // ConfirmDeleteDialog opens and confirms deletion
    const confirmBtns = await screen.findAllByRole('button', { name: /Delete/i })
    const dialogConfirmBtn = confirmBtns[confirmBtns.length - 1]
    fireEvent.click(dialogConfirmBtn)

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111')
    })
  })

  it('renders UncertaintyWarningModal without hardcoded Polish fallbacks in EN', () => {
    const planItem: MealPlanItem = {
      id: 'plan-u1',
      household_id: 'hh-1',
      date: '2026-11-16',
      meal_id: null,
      meal_category_id: 1,
      custom_name: null,
      is_ad_hoc: false,
      servings: 1,
      target_kcal: null,
      notes: null,
      sort_order: 0,
      is_uncertainty_dismissed: false,
      created_at: '',
      updated_at: '',
      meal: null
    }

    render(
      <UncertaintyWarningModal
        isOpen={true}
        onClose={vi.fn()}
        planItem={planItem}
        missingIngredients={[
          {
            productId: 'prod-1',
            productName: 'Oats',
            requiredQuantity: 100,
            unitType: 'g'
          }
        ]}
      />
    )

    expect(screen.getAllByText(/Meal/).length).toBeGreaterThan(0)
    expect(screen.queryByText('Posiłek')).not.toBeInTheDocument()

    const restoreBtn = screen.getByRole('button', { name: 'Restore to cart' })
    expect(restoreBtn.className).toContain('min-h-[44px]')
    fireEvent.click(restoreBtn)

    expect(screen.getByText('Restored')).toBeInTheDocument()
    expect(screen.queryByText('Przywrócono')).not.toBeInTheDocument()
  })
})
