import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { HistoryView } from '../HistoryView'
import { shoppingListService } from '@/services/shoppingListService'
import { useI18nStore } from '@/i18n'
import type { HistoryShoppingList } from '@/services/shoppingListService'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    household: { id: 'household-123', name: 'Dom Testowy' },
    user: { id: 'user-1' }
  })
}))

const sampleHistoryLists: HistoryShoppingList[] = [
  {
    id: 'history-1',
    household_id: 'household-123',
    name: 'Nowa Nazwa Listy',
    original_name: 'Zakupy Weekendowe',
    status: 'archived',
    is_default: false,
    target_date: '2026-08-25',
    created_at: '2026-08-25T14:30:00Z',
    updated_at: '2026-08-25T19:45:00Z',
    completed_at: '2026-08-25T19:45:00Z',
    preset_tags: null,
    items: [
      { id: 'item-1', is_checked: true },
      { id: 'item-2', is_checked: true }
    ]
  },
  {
    id: 'history-2',
    household_id: 'household-123',
    name: null,
    original_name: null,
    status: 'archived',
    is_default: false,
    target_date: '2026-08-20',
    created_at: '2026-08-20T09:15:00Z',
    updated_at: '2026-08-20T11:00:00Z',
    completed_at: '2026-08-20T11:00:00Z',
    preset_tags: null,
    items: [
      { id: 'item-3', is_checked: true },
      { id: 'item-4', is_checked: false }
    ]
  },
  {
    id: 'history-3',
    household_id: 'household-123',
    name: 'Niekupione Zakupy',
    original_name: 'Niekupione Zakupy',
    status: 'archived',
    is_default: false,
    target_date: '2026-08-18',
    created_at: '2026-08-18T16:00:00Z',
    updated_at: '2026-08-18T17:20:00Z',
    completed_at: '2026-08-18T17:20:00Z',
    preset_tags: null,
    items: [
      { id: 'item-5', is_checked: false },
      { id: 'item-6', is_checked: false }
    ]
  }
]

describe('HistoryView - History List, Creation Time and Dynamic Status Flows', () => {
  beforeEach(() => {
    localStorage.clear()
    useI18nStore.getState().setLanguage('pl')
    vi.clearAllMocks()
  })

  it('Flow 01: renders archived shopping lists with completion date and completion time (HH:mm)', async () => {
    vi.spyOn(shoppingListService, 'getHistoryLists').mockResolvedValue(sampleHistoryLists)

    render(<HistoryView />)

    // Wait for history lists to load
    await waitFor(() => {
      expect(screen.getByText('Nowa Nazwa Listy')).toBeInTheDocument()
      expect(screen.getByText('Zakupy Weekendowe')).toBeInTheDocument()
    })

    // Verify completion time format (HH:mm) is displayed for list 1 (19:45)
    const compDate1 = new Date('2026-08-25T19:45:00Z')
    const compHours1 = String(compDate1.getHours()).padStart(2, '0')
    const compMins1 = String(compDate1.getMinutes()).padStart(2, '0')
    const expectedTime1 = `${compHours1}:${compMins1}`

    expect(screen.getByText(expectedTime1)).toBeInTheDocument()

    // Verify completion time format (HH:mm) for list 2 (11:00)
    const compDate2 = new Date('2026-08-20T11:00:00Z')
    const compHours2 = String(compDate2.getHours()).padStart(2, '0')
    const compMins2 = String(compDate2.getMinutes()).padStart(2, '0')
    const expectedTime2 = `${compHours2}:${compMins2}`

    expect(screen.getByText(expectedTime2)).toBeInTheDocument()
  })

  it('Flow 02: opens details sheet when clicking a list item and displays both completion and creation time', async () => {
    vi.spyOn(shoppingListService, 'getHistoryLists').mockResolvedValue(sampleHistoryLists)
    vi.spyOn(shoppingListService, 'getListWithDetails').mockResolvedValue({
      ...sampleHistoryLists[0],
      items: []
    })

    render(<HistoryView />)

    await waitFor(() => {
      expect(screen.getByText('Nowa Nazwa Listy')).toBeInTheDocument()
    })

    // Click first item to open sheet
    fireEvent.click(screen.getByText('Nowa Nazwa Listy'))

    await waitFor(() => {
      // In details sheet, check that dialog/sheet opened and both dates are shown
      expect(shoppingListService.getListWithDetails).toHaveBeenCalledWith('history-1')
      expect(screen.getByText(/Zakończono/i)).toBeInTheDocument()
      expect(screen.getByText(/Utworzono/i)).toBeInTheDocument()
    })
  })

  it('Flow 03: renders empty state when no history exists', async () => {
    vi.spyOn(shoppingListService, 'getHistoryLists').mockResolvedValue([])

    render(<HistoryView />)

    await waitFor(() => {
      expect(screen.getByText('Brak zarchiwizowanej historii')).toBeInTheDocument()
    })
  })

  it('Flow 04: renders green "Zrealizowano", amber "Zrealizowano", and red "Niezrealizowano" status badges based on bought items', async () => {
    vi.spyOn(shoppingListService, 'getHistoryLists').mockResolvedValue(sampleHistoryLists)

    render(<HistoryView />)

    await waitFor(() => {
      expect(screen.getByText('Nowa Nazwa Listy')).toBeInTheDocument()
    })

    // List 1 (all bought): green badge with "Zrealizowano"
    const completedBadges = screen.getAllByText('Zrealizowano')
    expect(completedBadges.length).toBe(2) // List 1 (full) and List 2 (partial)

    // List 3 (none bought): red badge with "Niezrealizowano"
    expect(screen.getByText('Niezrealizowano')).toBeInTheDocument()

    // Check color classes on the badges
    const badgeElements = screen.getAllByRole('generic').filter((el) =>
      el.className?.includes?.('bg-emerald-500') ||
      el.className?.includes?.('bg-amber-500') ||
      el.className?.includes?.('bg-rose-500')
    )

    expect(badgeElements.some((el) => el.className.includes('bg-emerald-500'))).toBe(true)
    expect(badgeElements.some((el) => el.className.includes('bg-amber-500'))).toBe(true)
    expect(badgeElements.some((el) => el.className.includes('bg-rose-500'))).toBe(true)
  })

  it('Flow 05: renders original name when renamed, and omits line when name unchanged', async () => {
    vi.spyOn(shoppingListService, 'getHistoryLists').mockResolvedValue(sampleHistoryLists)

    render(<HistoryView />)

    await waitFor(() => {
      expect(screen.getByText('Nowa Nazwa Listy')).toBeInTheDocument()
    })

    // List 1 was renamed from 'Zakupy Weekendowe' to 'Nowa Nazwa Listy' -> original name is visible
    expect(screen.getByText('Zakupy Weekendowe')).toBeInTheDocument()

    // List 3 was not renamed (name === original_name === 'Niekupione Zakupy') -> only 1 instance exists
    expect(screen.getAllByText('Niekupione Zakupy').length).toBe(1)
  })

  it('Flow 06 (MED-14): paginates archived lists and loads older entries on clicking "Pokaż starsze listy"', async () => {
    const firstPagePlusOne = Array.from({ length: 31 }, (_, idx) => ({
      id: `arch-page1-${idx + 1}`,
      household_id: 'hh-1',
      name: `Archiwalna Lista ${idx + 1}`,
      original_name: `Archiwalna Lista ${idx + 1}`,
      status: 'archived' as const,
      is_default: false,
      target_date: null,
      created_at: '2026-10-01T10:00:00Z',
      updated_at: '2026-10-01T12:00:00Z',
      completed_at: '2026-10-01T12:00:00Z',
      items: [{ id: `i-${idx + 1}`, is_checked: true }]
    }))

    const secondPage = [
      {
        id: 'arch-page2-31',
        household_id: 'hh-1',
        name: 'Najstarsza Lista 31',
        original_name: 'Najstarsza Lista 31',
        status: 'archived' as const,
        is_default: false,
        target_date: null,
        created_at: '2026-09-15T10:00:00Z',
        updated_at: '2026-09-15T12:00:00Z',
        completed_at: '2026-09-15T12:00:00Z',
        items: [{ id: 'i-31', is_checked: true }]
      }
    ]

    const getHistorySpy = vi
      .spyOn(shoppingListService, 'getHistoryLists')
      .mockResolvedValueOnce(firstPagePlusOne as never)
      .mockResolvedValueOnce(secondPage as never)

    render(<HistoryView />)

    const loadMoreBtn = await screen.findByRole('button', { name: /Pokaż starsze listy/i })
    expect(screen.getByText('Archiwalna Lista 30')).toBeInTheDocument()
    expect(screen.queryByText('Archiwalna Lista 31')).not.toBeInTheDocument()

    fireEvent.click(loadMoreBtn)

    await waitFor(() => {
      expect(screen.getByText('Najstarsza Lista 31')).toBeInTheDocument()
    })
    expect(getHistorySpy).toHaveBeenNthCalledWith(1, 'household-123', { limit: 31, offset: 0 })
    expect(getHistorySpy).toHaveBeenNthCalledWith(2, 'household-123', { limit: 31, offset: 30 })
    expect(screen.queryByRole('button', { name: /Pokaż starsze listy/i })).not.toBeInTheDocument()
  })
})
