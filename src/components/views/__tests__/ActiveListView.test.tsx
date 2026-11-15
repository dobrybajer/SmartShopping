import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ActiveListView } from '../ActiveListView'
import { useShoppingStore } from '@/store/useShoppingStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { shoppingListService } from '@/services/shoppingListService'
import { notificationService } from '@/services/notificationService'
import { useI18nStore } from '@/i18n'
import { getPendingMutations, clearOfflineQueue } from '@/lib/offline/offlineMutationQueue'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    household: { id: 'household-123', name: 'Dom Testowy' },
    user: { id: 'user-1' }
  })
}))

vi.mock('@/hooks/useActiveListRealtime', () => ({
  useActiveListRealtime: vi.fn()
}))

const sampleSummaries = [
  {
    id: 'list-1',
    household_id: 'household-123',
    name: 'Bieżące Spożywcze',
    status: 'active' as const,
    is_default: true,
    target_date: '2026-08-26',
    created_at: '2026-08-26T10:00:00Z',
    updated_at: '2026-08-26T10:00:00Z',
    total_items: 2,
    unchecked_items: 1
  },
  {
    id: 'list-2',
    household_id: 'household-123',
    name: 'Dom i Majsterkowanie',
    status: 'active' as const,
    is_default: false,
    target_date: null,
    created_at: '2026-08-20T10:00:00Z',
    updated_at: '2026-08-20T10:00:00Z',
    total_items: 1,
    unchecked_items: 1
  }
]

const sampleListDetails1 = {
  id: 'list-1',
  household_id: 'household-123',
  name: 'Bieżące Spożywcze',
  status: 'active' as const,
  is_default: true,
  target_date: '2026-08-26',
  created_at: '2026-08-26T10:00:00Z',
  updated_at: '2026-08-26T10:00:00Z',
  preset_tags: null,
  items: [
    {
      id: 'item-1',
      shopping_list_id: 'list-1',
      product_id: 'prod-milk',
      total_quantity: 1,
      is_checked: false,
      added_ad_hoc: false,
      product: {
        id: 'prod-milk',
        name: 'Mleko 3.2%',
        unit_type: 'pcs' as const,
        category_id: 1,
        category: { id: 1, name: 'dairy', sort_order: 1 }
      }
    },
    {
      id: 'item-2',
      shopping_list_id: 'list-1',
      product_id: 'prod-bread',
      total_quantity: 1,
      is_checked: true,
      added_ad_hoc: false,
      product: {
        id: 'prod-bread',
        name: 'Chleb Żytni',
        unit_type: 'pcs' as const,
        category_id: 2,
        category: { id: 2, name: 'bakery', sort_order: 2 }
      }
    }
  ]
}

const sampleListDetails2 = {
  id: 'list-2',
  household_id: 'household-123',
  name: 'Dom i Majsterkowanie',
  status: 'active' as const,
  is_default: false,
  target_date: null,
  created_at: '2026-08-20T10:00:00Z',
  updated_at: '2026-08-20T10:00:00Z',
  preset_tags: null,
  items: [
    {
      id: 'item-sponge',
      shopping_list_id: 'list-2',
      product_id: null,
      total_quantity: 2,
      is_checked: false,
      added_ad_hoc: true,
      ad_hoc_name: 'Gąbki do naczyń',
      product: {
        id: 'adhoc-sponge',
        name: 'Gąbki do naczyń',
        unit_type: 'pcs' as const,
        category_id: null
      }
    }
  ]
}

describe('ActiveListView - Multi-Active List Navigation & Management Flow', () => {
  beforeEach(() => {
    localStorage.clear()
    clearOfflineQueue()
    useI18nStore.getState().setLanguage('pl')
    useShoppingStore.setState({
      activeHouseholdId: 'household-123',
      selectedActiveListId: 'list-1',
      activeListsSummary: sampleSummaries
    })
    vi.clearAllMocks()

    vi.spyOn(shoppingListService, 'getActiveListsSummary').mockResolvedValue(sampleSummaries)
    vi.spyOn(notificationService, 'notify').mockResolvedValue({
      success: true,
      sentCount: 0,
      totalCount: 0
    })
    vi.spyOn(shoppingListService, 'getListWithDetails').mockImplementation(async (id: string) => {
      if (id === 'list-2') return sampleListDetails2 as never
      return sampleListDetails1 as never
    })
  })

  it('Flow 01: renders horizontal chips for all active lists and marks default list', async () => {
    render(<ActiveListView />)

    await waitFor(() => {
      expect(screen.getAllByText('Bieżące Spożywcze').length).toBeGreaterThan(0)
      expect(screen.getByText('Dom i Majsterkowanie')).toBeInTheDocument()
    })

    // Items from list-1 rendered
    expect(screen.getByText('Mleko 3.2%')).toBeInTheDocument()
    expect(screen.getByText('Chleb Żytni')).toBeInTheDocument()
  })

  it('Flow 02: switching active list chip loads the selected list details', async () => {
    render(<ActiveListView />)

    await waitFor(() => {
      expect(screen.getAllByText('Bieżące Spożywcze').length).toBeGreaterThan(0)
    })

    // Click chip for list-2
    const chipList2 = screen.getByRole('button', { name: /Dom i Majsterkowanie/i })
    fireEvent.click(chipList2)

    await waitFor(() => {
      expect(screen.getByText('Gąbki do naczyń')).toBeInTheDocument()
    })
  })

  it('Flow 03: checking item updates state optimistically', async () => {
    const toggleSpy = vi.spyOn(shoppingListService, 'toggleItemChecked').mockResolvedValue(true)
    render(<ActiveListView />)

    await waitFor(() => {
      expect(screen.getByText('Mleko 3.2%')).toBeInTheDocument()
    })

    const checkboxes = screen.getAllByRole('checkbox')
    // Click unchecked milk checkbox (index 0)
    fireEvent.click(checkboxes[0])

    expect(toggleSpy).toHaveBeenCalledWith('item-1', true)
    await waitFor(() => {
      expect(shoppingListService.getActiveListsSummary).toHaveBeenCalledTimes(2)
    })
  })

  it('Flow 04: when network request fails, item remains checked and is enqueued into offline queue (CRIT-01)', async () => {
    vi.spyOn(shoppingListService, 'toggleItemChecked').mockResolvedValue(false)
    render(<ActiveListView />)

    await waitFor(() => {
      expect(screen.getByText('Mleko 3.2%')).toBeInTheDocument()
    })

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])

    // Wait a tick for async dispatch
    await waitFor(() => {
      const pending = getPendingMutations()
      expect(pending.some((m) => m.itemId === 'item-1' && m.payload.isChecked === true)).toBe(true)
    })

    // UI maintains checked state, no rollback
    expect(checkboxes[0]).toBeChecked()
  })

  it('Flow 05 (NORM-09): subscribes to category/aisle realtime updates on mount and cleans up on unmount', async () => {
    const unsubscribeSpy = vi.fn()
    const subscribeSpy = vi.fn().mockReturnValue(unsubscribeSpy)
    useCategoryStore.setState({ subscribeRealtime: subscribeSpy })

    const { unmount } = render(<ActiveListView />)

    await waitFor(() => {
      expect(subscribeSpy).toHaveBeenCalledWith('household-123')
    })

    unmount()
    expect(unsubscribeSpy).toHaveBeenCalledTimes(1)
  })

  it('Flow 06 (MED-16): sends LIST_COMPLETED notification when checking last unbought item alongside in_pantry items', async () => {
    vi.spyOn(shoppingListService, 'toggleItemChecked').mockResolvedValue(true)
    vi.spyOn(shoppingListService, 'getListWithDetails').mockResolvedValueOnce({
      ...sampleListDetails1,
      items: [
        sampleListDetails1.items[0],
        {
          ...sampleListDetails1.items[1],
          is_checked: false,
          in_pantry: true
        }
      ]
    } as never)

    render(<ActiveListView />)

    await waitFor(() => {
      expect(screen.getByText('Mleko 3.2%')).toBeInTheDocument()
    })

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])

    await waitFor(() => {
      expect(notificationService.notify).toHaveBeenCalledWith(
        'LIST_COMPLETED',
        expect.objectContaining({
          listId: 'list-1',
          listName: 'Bieżące Spożywcze'
        }),
        'household-123'
      )
    })
  })

  it('Flow 07 (MED-16): allows fractional decimal inline quantity editing (e.g. 1.5)', async () => {
    const updateQtySpy = vi.spyOn(shoppingListService, 'updateItemQuantity').mockResolvedValue(true)
    render(<ActiveListView />)

    await waitFor(() => {
      expect(screen.getByText('Mleko 3.2%')).toBeInTheDocument()
    })

    const qtyButtons = screen.getAllByRole('button', { name: /1\s*(szt|pcs)/i })
    fireEvent.click(qtyButtons[0])

    const input = screen.getByDisplayValue('1')
    expect(input).toHaveAttribute('inputMode', 'decimal')

    fireEvent.change(input, { target: { value: '1,5' } })
    expect(input).toHaveValue('1.5')

    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(updateQtySpy).toHaveBeenCalledWith('item-1', 1.5)
    })
  })
})
