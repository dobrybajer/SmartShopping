import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CalendarView } from '../CalendarView'
import { useMealPlanStore } from '@/store/useMealPlanStore'
import { useAuth } from '@/context/AuthContext'
import { useShoppingStore } from '@/store/useShoppingStore'
import { usePantryStore } from '@/store/usePantryStore'
import type { MealPlanItem } from '@/types/calendar'

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn()
}))

vi.mock('@/services/mealService', () => ({
  mealService: {
    getMeals: vi.fn().mockResolvedValue([]),
    getMealCategories: vi.fn().mockResolvedValue([
      { id: 1, name: 'breakfast' },
      { id: 2, name: 'lunch' },
      { id: 3, name: 'dinner' }
    ])
  }
}))

vi.mock('@/services/mealPlanService', () => ({
  mealPlanService: {
    getMealPlans: vi.fn().mockResolvedValue([]),
    createMealPlan: vi.fn(),
    updateMealPlan: vi.fn(),
    deleteMealPlan: vi.fn(),
    duplicateMealPlanToDate: vi.fn(),
    createRestoreDraftPayload: vi.fn()
  }
}))

describe('CalendarView - Mobile PWA User Flow Suite (ADR-009)', () => {
  const mockHousehold = { id: 'hh-cal-1', name: 'Dom Testowy' }

  const mockPlan: MealPlanItem = {
    id: 'plan-1',
    household_id: 'hh-cal-1',
    date: '2026-10-15',
    meal_id: 'meal-1',
    meal_category_id: 1,
    custom_name: null,
    is_ad_hoc: false,
    servings: 1,
    target_kcal: null,
    notes: 'Pyszne śniadanie',
    sort_order: 0,
    created_at: '2026-10-07T00:00:00Z',
    updated_at: '2026-10-07T00:00:00Z',
    meal: {
      id: 'meal-1',
      household_id: 'hh-cal-1',
      name: 'Jajecznica z pomidorami',
      description: null,
      preparation_steps: null,
      comments: null,
      category_id: 1,
      tags: [],
      ingredients: [
        {
          id: 'ing-1',
          meal_id: 'meal-1',
          product_id: 'prod-egg',
          base_quantity: 3,
          is_pantry_item: false,
          product: {
            id: 'prod-egg',
            household_id: 'hh-cal-1',
            name: 'Jajka',
            unit_type: 'pcs',
            category_id: 2,
            kcal_per_100: 75,
            protein_per_100: 6,
            carbs_per_100: 1,
            fat_per_100: 5,
            is_ad_hoc: false,
            type: 'Household'
          }
        }
      ]
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      household: mockHousehold,
      user: { id: 'user-1' } as any
    } as any)

    useMealPlanStore.setState({
      mealPlans: [mockPlan],
      isLoading: false,
      activeHouseholdId: 'hh-cal-1',
      viewMode: 'day',
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

  it('Flow 01: renders view switcher tabs (Miesiąc, Tydzień, Dzień) and loads meal plans', () => {
    render(<CalendarView />)

    expect(screen.getByText('Miesiąc')).toBeInTheDocument()
    expect(screen.getByText('Tydzień')).toBeInTheDocument()
    expect(screen.getByText('Dzień')).toBeInTheDocument()
  })

  it('Flow 02: in Day View, displays planned meal card, notes, and macro bar', () => {
    render(<CalendarView />)

    expect(screen.getByText('Jajecznica z pomidorami')).toBeInTheDocument()
    expect(screen.getByText('"Pyszne śniadanie"')).toBeInTheDocument()
    expect(screen.getByText('Jajka')).toBeInTheDocument()
    expect(screen.getByText('225')).toBeInTheDocument() // 3 * 75 kcal
  })

  it('Flow 03: switches to Week View when clicking Tydzień tab', () => {
    render(<CalendarView />)

    const weekTab = screen.getByText('Tydzień')
    fireEvent.click(weekTab)

    expect(useMealPlanStore.getState().viewMode).toBe('week')
    expect(screen.getByText('Roboczy (Pn-Pt)')).toBeInTheDocument()
    expect(screen.getByText('Pełny (Pn-Nd)')).toBeInTheDocument()
  })

  it('Flow 04: switches to Month View when clicking Miesiąc tab', () => {
    render(<CalendarView />)

    const monthTab = screen.getByText('Miesiąc')
    fireEvent.click(monthTab)

    expect(useMealPlanStore.getState().viewMode).toBe('month')
  })

  it('Flow 05: transfers meal to draft when clicking "Dodaj do koszyka"', () => {
    render(<CalendarView />)

    const transferButton = screen.getByText('Dodaj do koszyka')
    fireEvent.click(transferButton)

    const draftItems = useShoppingStore.getState().draftItems
    expect(draftItems).toHaveLength(1)
    expect(draftItems[0].name).toBe('Jajka')
    expect(draftItems[0].meal_plan_item_id).toBe('plan-1')
  })
})
