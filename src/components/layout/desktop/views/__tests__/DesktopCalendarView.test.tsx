import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DesktopCalendarView } from '../DesktopCalendarView'
import { useMealPlanStore } from '@/store/useMealPlanStore'
import { useAuth } from '@/context/AuthContext'
import type { MealPlanItem } from '@/types/calendar'

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn()
}))

vi.mock('@/services/mealService', () => ({
  mealService: {
    getMeals: vi.fn().mockResolvedValue([]),
    getMealCategories: vi.fn().mockResolvedValue([])
  }
}))

vi.mock('@/services/mealPlanService', () => ({
  mealPlanService: {
    getMealPlans: vi.fn().mockResolvedValue([]),
    createMealPlan: vi.fn(),
    updateMealPlan: vi.fn(),
    deleteMealPlan: vi.fn(),
    duplicateMealPlanToDate: vi.fn()
  }
}))

describe('DesktopCalendarView - Desktop User Flow Suite (ADR-009)', () => {
  const mockHousehold = { id: 'hh-desk-1', name: 'Desktop Household' }

  const mockPlan: MealPlanItem = {
    id: 'plan-desk-1',
    household_id: 'hh-desk-1',
    date: '2026-10-15',
    meal_id: null,
    meal_category_id: 2,
    custom_name: 'Pierogi z jagodami',
    is_ad_hoc: true,
    servings: 2,
    target_kcal: 500,
    notes: null,
    sort_order: 0,
    created_at: '2026-10-07T00:00:00Z',
    updated_at: '2026-10-07T00:00:00Z',
    meal: null
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('smartshopping_layout_preference', 'desktop')
    vi.mocked(useAuth).mockReturnValue({
      household: mockHousehold,
      user: { id: 'user-1' } as any
    } as any)

    useMealPlanStore.setState({
      mealPlans: [mockPlan],
      isLoading: false,
      activeHouseholdId: 'hh-desk-1',
      viewMode: 'week',
      weekRangeMode: 'workweek',
      selectedDate: '2026-10-15'
    })
  })

  it('Flow 01: renders desktop header with title, view switcher, and quick add button', () => {
    render(<DesktopCalendarView />)

    expect(screen.getByText('Planer Posiłków & Kalendarz')).toBeInTheDocument()
    expect(screen.getByText('Miesiąc')).toBeInTheDocument()
    expect(screen.getByText('Tydzień')).toBeInTheDocument()
    expect(screen.getByText('Dzień')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dodaj posiłek/i })).toBeInTheDocument()
  })

  it('Flow 02: in Week View, renders workweek columns and displays planned meal', () => {
    render(<DesktopCalendarView />)

    expect(screen.getByText('Pierogi z jagodami')).toBeInTheDocument()
    expect(screen.getByText(/2 porcji/)).toBeInTheDocument()
  })

  it('Flow 03: clicking Day View tab switches to day view resolution', () => {
    render(<DesktopCalendarView />)

    const dayTab = screen.getByText('Dzień')
    fireEvent.click(dayTab)

    expect(useMealPlanStore.getState().viewMode).toBe('day')
  })
})
