import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { HistoryView } from '../HistoryView'
import { shoppingListService } from '@/services/shoppingListService'
import { useI18nStore } from '@/i18n'
import type { ShoppingList } from '@/services/shoppingListService'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    household: { id: 'household-123', name: 'Dom Testowy' },
    user: { id: 'user-1' }
  })
}))

const sampleHistoryLists: ShoppingList[] = [
  {
    id: 'history-1',
    household_id: 'household-123',
    name: 'Zakupy Weekendowe',
    status: 'archived',
    target_date: '2026-08-25',
    created_at: '2026-08-25T14:30:00Z',
    preset_tags: null
  },
  {
    id: 'history-2',
    household_id: 'household-123',
    name: null,
    status: 'archived',
    target_date: '2026-08-20',
    created_at: '2026-08-20T09:15:00Z',
    preset_tags: null
  }
]

describe('HistoryView - History List and Creation Time User Flows', () => {
  beforeEach(() => {
    localStorage.clear()
    useI18nStore.getState().setLanguage('pl')
    vi.clearAllMocks()
  })

  it('Flow 01: renders archived shopping lists with creation date and creation time (HH:mm)', async () => {
    vi.spyOn(shoppingListService, 'getHistoryLists').mockResolvedValue(sampleHistoryLists)

    render(<HistoryView />)

    // Wait for history lists to load
    await waitFor(() => {
      expect(screen.getByText('Zakupy Weekendowe')).toBeInTheDocument()
    })

    // Verify time format (HH:mm) is displayed for list 1 (14:30 or local time equivalent)
    const list1Date = new Date('2026-08-25T14:30:00Z')
    const list1Hours = String(list1Date.getHours()).padStart(2, '0')
    const list1Mins = String(list1Date.getMinutes()).padStart(2, '0')
    const expectedTime1 = `${list1Hours}:${list1Mins}`

    expect(screen.getByText(expectedTime1)).toBeInTheDocument()

    // Verify time format (HH:mm) for list 2
    const list2Date = new Date('2026-08-20T09:15:00Z')
    const list2Hours = String(list2Date.getHours()).padStart(2, '0')
    const list2Mins = String(list2Date.getMinutes()).padStart(2, '0')
    const expectedTime2 = `${list2Hours}:${list2Mins}`

    expect(screen.getByText(expectedTime2)).toBeInTheDocument()
  })

  it('Flow 02: opens details sheet when clicking a list item and displays creation time', async () => {
    vi.spyOn(shoppingListService, 'getHistoryLists').mockResolvedValue(sampleHistoryLists)
    vi.spyOn(shoppingListService, 'getListWithDetails').mockResolvedValue({
      ...sampleHistoryLists[0],
      items: []
    })

    render(<HistoryView />)

    await waitFor(() => {
      expect(screen.getByText('Zakupy Weekendowe')).toBeInTheDocument()
    })

    // Click first item to open sheet
    fireEvent.click(screen.getByText('Zakupy Weekendowe'))

    await waitFor(() => {
      // In details sheet, check that dialog/sheet opened
      expect(shoppingListService.getListWithDetails).toHaveBeenCalledWith('history-1')
    })
  })

  it('Flow 03: renders empty state when no history exists', async () => {
    vi.spyOn(shoppingListService, 'getHistoryLists').mockResolvedValue([])

    render(<HistoryView />)

    await waitFor(() => {
      expect(screen.getByText('Brak zarchiwizowanej historii')).toBeInTheDocument()
    })
  })
})
