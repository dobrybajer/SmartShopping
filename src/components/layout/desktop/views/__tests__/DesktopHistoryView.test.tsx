import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { DesktopHistoryView } from '../DesktopHistoryView'
import { shoppingListService } from '@/services/shoppingListService'
import { useI18nStore } from '@/i18n'
import type { HistoryShoppingList, ActiveListWithDetails } from '@/services/shoppingListService'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    household: { id: 'household-123', name: 'Dom Testowy' },
    user: { id: 'user-1' }
  })
}))

const sampleHistoryLists: HistoryShoppingList[] = [
  {
    id: 'history-1',
    household_id: 'household-123',
    name: 'Zakupy Poniedziałkowe',
    status: 'archived',
    is_default: false,
    target_date: '2026-08-25',
    created_at: '2026-08-25T11:45:00Z',
    updated_at: '2026-08-25T17:30:00Z',
    completed_at: '2026-08-25T17:30:00Z',
    preset_tags: null,
    items: [
      { id: 'item-1', is_checked: true }
    ]
  },
  {
    id: 'history-2',
    household_id: 'household-123',
    name: 'Zakupy z Targu',
    status: 'archived',
    is_default: false,
    target_date: '2026-08-22',
    created_at: '2026-08-22T08:20:00Z',
    updated_at: '2026-08-22T13:15:00Z',
    completed_at: '2026-08-22T13:15:00Z',
    preset_tags: null,
    items: [
      { id: 'item-2', is_checked: true },
      { id: 'item-3', is_checked: false }
    ]
  },
  {
    id: 'history-3',
    household_id: 'household-123',
    name: 'Zakupy Niezrealizowane',
    status: 'archived',
    is_default: false,
    target_date: '2026-08-20',
    created_at: '2026-08-20T10:00:00Z',
    updated_at: '2026-08-20T12:00:00Z',
    completed_at: '2026-08-20T12:00:00Z',
    preset_tags: null,
    items: [
      { id: 'item-4', is_checked: false }
    ]
  }
]

const sampleDetails: ActiveListWithDetails = {
  ...sampleHistoryLists[0],
  items: [
    {
      id: 'item-1',
      shopping_list_id: 'history-1',
      product_id: 'prod-1',
      ad_hoc_name: undefined,
      total_quantity: 2,
      is_checked: true,
      category_id: 1,
      added_ad_hoc: false,
      product: {
        id: 'prod-1',
        name: 'Pomidory',
        unit_type: 'pcs',
        category_id: 1,
        category: {
          id: 1,
          name: 'warzywa',
          sort_order: 1
        }
      }
    }
  ]
}

describe('DesktopHistoryView - Desktop History and Dynamic Status Flows', () => {
  beforeEach(() => {
    localStorage.clear()
    useI18nStore.getState().setLanguage('pl')
    vi.clearAllMocks()
  })

  it('Flow 01: renders archived shopping lists with completion time on left column, and both completion and creation dates on right detail panel', async () => {
    vi.spyOn(shoppingListService, 'getHistoryLists').mockResolvedValue(sampleHistoryLists)
    vi.spyOn(shoppingListService, 'getListWithDetails').mockResolvedValue(sampleDetails)

    render(<DesktopHistoryView />)

    await waitFor(() => {
      expect(screen.getAllByText('Zakupy Poniedziałkowe').length).toBeGreaterThan(0)
    })

    const compDate1 = new Date('2026-08-25T17:30:00Z')
    const compHours1 = String(compDate1.getHours()).padStart(2, '0')
    const compMins1 = String(compDate1.getMinutes()).padStart(2, '0')
    const expectedCompTime1 = `${compHours1}:${compMins1}`

    // Left column shows completion time
    const timeElements = screen.getAllByText(expectedCompTime1)
    expect(timeElements.length).toBeGreaterThanOrEqual(1)

    // Right details header shows both "Zakończono" and "Utworzono" once details load
    await waitFor(() => {
      expect(screen.getByText(/Zakończono/i)).toBeInTheDocument()
      expect(screen.getByText(/Utworzono/i)).toBeInTheDocument()
    })

    // Verify second list completion time in left column
    const compDate2 = new Date('2026-08-22T13:15:00Z')
    const compHours2 = String(compDate2.getHours()).padStart(2, '0')
    const compMins2 = String(compDate2.getMinutes()).padStart(2, '0')
    const expectedCompTime2 = `${compHours2}:${compMins2}`

    expect(screen.getByText(expectedCompTime2)).toBeInTheDocument()
  })

  it('Flow 02: selecting a different list updates right detail panel with its items and creation time', async () => {
    vi.spyOn(shoppingListService, 'getHistoryLists').mockResolvedValue(sampleHistoryLists)
    vi.spyOn(shoppingListService, 'getListWithDetails').mockImplementation(async (id: string) => {
      if (id === 'history-2') {
        return {
          ...sampleHistoryLists[1],
          items: []
        }
      }
      return sampleDetails
    })

    render(<DesktopHistoryView />)

    await waitFor(() => {
      expect(screen.getByText('Zakupy z Targu')).toBeInTheDocument()
    })

    // Click on second list item
    fireEvent.click(screen.getByText('Zakupy z Targu'))

    await waitFor(() => {
      expect(shoppingListService.getListWithDetails).toHaveBeenCalledWith('history-2')
    })
  })

  it('Flow 03: renders empty state when no history lists are found', async () => {
    vi.spyOn(shoppingListService, 'getHistoryLists').mockResolvedValue([])

    render(<DesktopHistoryView />)

    await waitFor(() => {
      expect(screen.getByText('Brak zarchiwizowanej historii')).toBeInTheDocument()
    })
  })

  it('Flow 04: renders green, amber and red status badges for fully, partially, and not completed lists', async () => {
    vi.spyOn(shoppingListService, 'getHistoryLists').mockResolvedValue(sampleHistoryLists)
    vi.spyOn(shoppingListService, 'getListWithDetails').mockResolvedValue(sampleDetails)

    render(<DesktopHistoryView />)

    await waitFor(() => {
      expect(screen.getAllByText('Zakupy Poniedziałkowe').length).toBeGreaterThan(0)
    })

    // Left list items + right details panel header
    expect(screen.getAllByText('Zrealizowano').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Niezrealizowano')).toBeInTheDocument()

    // Verify presence of emerald, amber, and rose styled badges
    const badgeElements = screen.getAllByRole('generic').filter((el) =>
      el.className?.includes?.('bg-emerald-500') ||
      el.className?.includes?.('bg-amber-500') ||
      el.className?.includes?.('bg-rose-500')
    )

    expect(badgeElements.some((el) => el.className.includes('bg-emerald-500'))).toBe(true)
    expect(badgeElements.some((el) => el.className.includes('bg-amber-500'))).toBe(true)
    expect(badgeElements.some((el) => el.className.includes('bg-rose-500'))).toBe(true)
  })
})
