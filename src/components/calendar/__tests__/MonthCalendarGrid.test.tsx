import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MonthCalendarGrid } from '../MonthCalendarGrid'
import { useMealPlanStore } from '@/store/useMealPlanStore'
import { usePantryStore } from '@/store/usePantryStore'
import { useShoppingStore } from '@/store/useShoppingStore'

describe('MonthCalendarGrid Accessibility & Keyboard Navigation (NORM-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useMealPlanStore.setState({ mealPlans: [] })
    usePantryStore.setState({ pantryItems: [] })
    useShoppingStore.setState({ draftItems: [] })
  })

  it('renders WAI-ARIA grid, rows, columnheaders, gridcells, and accessible month switcher controls', () => {
    render(<MonthCalendarGrid selectedDate="2026-11-11" onOpenDayView={vi.fn()} />)

    expect(screen.getByRole('grid')).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')).toHaveLength(7)
    expect(screen.getAllByRole('gridcell').length).toBeGreaterThanOrEqual(28)
    expect(screen.getByRole('button', { name: /Poprzedni miesiąc|Previous month/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Następny miesiąc|Next month/i })).toBeInTheDocument()

    const selectedCell = screen
      .getAllByRole('gridcell')
      .find((c) => c.getAttribute('aria-selected') === 'true')
    expect(selectedCell).toBeDefined()
  })

  it('supports arrow-key navigation across calendar days and opens day view on click', () => {
    const onOpenDayView = vi.fn()
    render(<MonthCalendarGrid selectedDate="2026-11-11" onOpenDayView={onOpenDayView} />)

    const day11 = screen.getByRole('button', { name: /^2026-11-11/ })
    day11.focus()
    expect(day11).toHaveFocus()

    fireEvent.keyDown(day11, { key: 'ArrowRight' })
    const day12 = screen.getByRole('button', { name: /^2026-11-12/ })
    expect(day12).toHaveFocus()

    fireEvent.keyDown(day12, { key: 'ArrowDown' })
    const day19 = screen.getByRole('button', { name: /^2026-11-19/ })
    expect(day19).toHaveFocus()

    fireEvent.keyDown(day19, { key: 'Home' })
    const day16 = screen.getByRole('button', { name: /^2026-11-16/ }) // Monday of that week
    expect(day16).toHaveFocus()

    fireEvent.click(day16)
    expect(onOpenDayView).toHaveBeenCalledWith('2026-11-16')
  })

  it('visually highlights selected date when it is not today (MED-11)', () => {
    render(<MonthCalendarGrid selectedDate="2026-11-11" onOpenDayView={vi.fn()} />)

    const selectedBtn = screen.getByRole('button', { name: /^2026-11-11/ })
    expect(selectedBtn.className).toContain('ring-2')
    expect(selectedBtn.className).toContain('ring-primary/60')
  })
})

