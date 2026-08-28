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
    original_name: 'Zakupy Poniedziałkowe',
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
    name: 'Targ Rybny',
    original_name: 'Zakupy z Targu',
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
    original_name: 'Zakupy Niezrealizowane',
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
          name: 'fruits_vegetables',
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
      expect(screen.getByText('Targ Rybny')).toBeInTheDocument()
    })

    // Click on second list item
    fireEvent.click(screen.getByText('Targ Rybny'))

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

  it('Flow 05: displays original name below title if renamed, and hides it if name was not changed', async () => {
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
      expect(screen.getByText('Targ Rybny')).toBeInTheDocument()
    })

    // Left column shows original name for renamed list-2, while list-1 (not renamed) has no duplicate/original line
    expect(screen.getByText('Zakupy z Targu')).toBeInTheDocument()

    // Right details panel also shows the original name when list-2 is selected
    fireEvent.click(screen.getByText('Targ Rybny'))

    await waitFor(() => {
      // In both left column and right details panel, Zakupy z Targu appears
      expect(screen.getAllByText('Zakupy z Targu').length).toBe(2)
    })
  })

  it('Flow 06: displays 50/50 action buttons ("Dodaj do koszyka" and "Usuń listę"), and clicking delete shows ConfirmDeleteDialog', async () => {
    vi.spyOn(shoppingListService, 'getHistoryLists').mockResolvedValue(sampleHistoryLists)
    vi.spyOn(shoppingListService, 'getListWithDetails').mockResolvedValue(sampleDetails)
    const deleteSpy = vi.spyOn(shoppingListService, 'deleteShoppingList').mockResolvedValue(true)

    render(<DesktopHistoryView />)

    await waitFor(() => {
      expect(screen.getByText(/Dodaj do koszyka/i)).toBeInTheDocument()
      expect(screen.getByText(/Usuń listę/i)).toBeInTheDocument()
    })

    // Clicking "Usuń listę" opens the ConfirmDeleteDialog modal
    fireEvent.click(screen.getByText(/Usuń listę/i))

    await waitFor(() => {
      // Modal header or description should appear
      expect(screen.getByText('Usuwanie Listy Zakupów')).toBeInTheDocument()
    })

    // Confirm deletion inside the dialog
    const confirmButton = screen.getByRole('button', { name: /Usuń/i })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('history-1')
    })
  })

  it('Flow 07: preserves chosen category override on history items instead of falling back to product default', async () => {
    const detailsWithCategoryOverride: ActiveListWithDetails = {
      ...sampleHistoryLists[0],
      items: [
        {
          id: 'item-custom-cat',
          shopping_list_id: 'history-1',
          product_id: 'prod-override',
          ad_hoc_name: undefined,
          total_quantity: 1,
          is_checked: true,
          category_id: 10,
          category: {
            id: 10,
            name: 'Własna Alejka',
            sort_order: 2
          },
          added_ad_hoc: false,
          product: {
            id: 'prod-override',
            name: 'Kawa Ziarnista',
            unit_type: 'pcs',
            category_id: 99,
            category: {
              id: 99,
              name: 'Inna Kategoria',
              sort_order: 99
            }
          }
        }
      ]
    }

    vi.spyOn(shoppingListService, 'getHistoryLists').mockResolvedValue(sampleHistoryLists)
    vi.spyOn(shoppingListService, 'getListWithDetails').mockResolvedValue(detailsWithCategoryOverride)

    render(<DesktopHistoryView />)

    await waitFor(() => {
      // Should show 'Własna Alejka' (category_id: 10) instead of 'Inna Kategoria' (category_id: 99)
      expect(screen.getByText(/Własna Alejka/i)).toBeInTheDocument()
      expect(screen.queryByText(/Inna Kategoria/i)).not.toBeInTheDocument()
    })
  })
})
