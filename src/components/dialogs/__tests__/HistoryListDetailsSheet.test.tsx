import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { HistoryListDetailsSheet } from '../HistoryListDetailsSheet'
import { shoppingListService } from '@/services/shoppingListService'
import { useShoppingStore } from '@/store/useShoppingStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useI18nStore } from '@/i18n'
import type { ShoppingList, ActiveListWithDetails } from '@/services/shoppingListService'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    household: { id: 'household-123', name: 'Dom Testowy' },
    user: { id: 'user-1' }
  })
}))

const sampleListRenamed: ShoppingList = {
  id: 'history-renamed-1',
  household_id: 'household-123',
  name: 'Nowa Nazwa Listy',
  original_name: 'Pierwotna Nazwa',
  status: 'archived',
  is_default: false,
  target_date: '2026-08-25',
  created_at: '2026-08-25T11:45:00Z',
  updated_at: '2026-08-25T17:30:00Z',
  completed_at: '2026-08-25T17:30:00Z',
  preset_tags: null
}

const sampleListUnchanged: ShoppingList = {
  id: 'history-unchanged-2',
  household_id: 'household-123',
  name: 'Standardowa Lista',
  original_name: 'Standardowa Lista',
  status: 'archived',
  is_default: false,
  target_date: '2026-08-22',
  created_at: '2026-08-22T08:20:00Z',
  updated_at: '2026-08-22T13:15:00Z',
  completed_at: '2026-08-22T13:15:00Z',
  preset_tags: null
}

const sampleDetails: ActiveListWithDetails = {
  ...sampleListRenamed,
  items: [
    {
      id: 'item-override-1',
      shopping_list_id: 'history-renamed-1',
      product_id: 'prod-1',
      ad_hoc_name: undefined,
      total_quantity: 3,
      is_checked: true,
      category_id: 5,
      category: {
        id: 5,
        name: 'Mrożonki',
        sort_order: 10
      },
      added_ad_hoc: false,
      product: {
        id: 'prod-1',
        name: 'Pizza Mrożona',
        unit_type: 'pcs',
        category_id: 1,
        category: {
          id: 1,
          name: 'Pieczywo',
          sort_order: 1
        }
      }
    }
  ]
}

describe('HistoryListDetailsSheet - Mobile Details, Category Overrides & Actions', () => {
  beforeEach(() => {
    localStorage.clear()
    useI18nStore.getState().setLanguage('pl')
    useShoppingStore.setState({ draftItems: [] })
    useCategoryStore.setState({ categoriesByHousehold: {} })
    vi.clearAllMocks()
  })

  it('renders original name below title if renamed, and hides it if name was unchanged', async () => {
    vi.spyOn(shoppingListService, 'getListWithDetails').mockResolvedValue(sampleDetails)

    const { rerender } = render(
      <HistoryListDetailsSheet
        list={sampleListRenamed}
        open={true}
        onOpenChange={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Nowa Nazwa Listy')).toBeInTheDocument()
      expect(screen.getByText('Pierwotna Nazwa')).toBeInTheDocument()
    })

    // Rerender with unchanged list
    rerender(
      <HistoryListDetailsSheet
        list={sampleListUnchanged}
        open={true}
        onOpenChange={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getAllByText('Standardowa Lista').length).toBe(1)
    })
  })

  it('renders 50/50 action buttons: "Dodaj do koszyka" and "Usuń listę" with ConfirmDeleteDialog', async () => {
    vi.spyOn(shoppingListService, 'getListWithDetails').mockResolvedValue(sampleDetails)
    const deleteSpy = vi.spyOn(shoppingListService, 'deleteShoppingList').mockResolvedValue(true)
    const onDeletedMock = vi.fn()

    render(
      <HistoryListDetailsSheet
        list={sampleListRenamed}
        open={true}
        onOpenChange={vi.fn()}
        onListDeleted={onDeletedMock}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Dodaj do koszyka/i)).toBeInTheDocument()
      expect(screen.getByText(/Usuń listę/i)).toBeInTheDocument()
    })

    // Click "Usuń listę" to trigger modal
    fireEvent.click(screen.getByText(/Usuń listę/i))

    await waitFor(() => {
      expect(screen.getByText('Usuwanie Listy Zakupów')).toBeInTheDocument()
    })

    // Confirm deletion
    const confirmBtn = screen.getByRole('button', { name: /Usuń/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('history-renamed-1')
      expect(onDeletedMock).toHaveBeenCalledWith('history-renamed-1')
    })
  })

  it('preserves item category override in grouping and draft addition', async () => {
    vi.spyOn(shoppingListService, 'getListWithDetails').mockResolvedValue(sampleDetails)

    render(
      <HistoryListDetailsSheet
        list={sampleListRenamed}
        open={true}
        onOpenChange={vi.fn()}
      />
    )

    await waitFor(() => {
      // Should show 'Mrożonki' (item category_id: 5), not 'Pieczywo' (product category_id: 1)
      expect(screen.getByText(/Mrożonki/i)).toBeInTheDocument()
      expect(screen.queryByText(/Pieczywo/i)).not.toBeInTheDocument()
    })

    // Click "Dodaj do koszyka" (restore all)
    fireEvent.click(screen.getByText(/Dodaj do koszyka/i))

    // Verify draft item retains category_id: 5
    const draftItems = useShoppingStore.getState().draftItems
    expect(draftItems.length).toBe(1)
    expect(draftItems[0].category_id).toBe(5)
    expect(draftItems[0].category_name).toBe('Mrożonki')
  })

  it('renders header in vertical sequence with non-breaking date lines and wrap-enabled status/summary badges', async () => {
    vi.spyOn(shoppingListService, 'getListWithDetails').mockResolvedValue(sampleDetails)

    render(
      <HistoryListDetailsSheet
        list={sampleListRenamed}
        open={true}
        onOpenChange={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Zakończono/i)).toBeInTheDocument()
      expect(screen.getByText(/Utworzono/i)).toBeInTheDocument()
    })

    // Completed date container must have whitespace-nowrap
    const completedContainer = screen.getByTitle('Zakończono')
    expect(completedContainer).toHaveClass('whitespace-nowrap')

    // Created date container must have whitespace-nowrap
    const createdContainer = screen.getByTitle('Utworzono')
    expect(createdContainer).toHaveClass('whitespace-nowrap')

    // Status and bought ratio badge wrapper must have flex-wrap
    const badgeWrapper = document.querySelector('.flex-wrap.items-center')
    expect(badgeWrapper).toBeInTheDocument()
    expect(badgeWrapper).toHaveClass('flex-wrap')
  })

  it('preserves historical category when adding single item via row button', async () => {
    vi.spyOn(shoppingListService, 'getListWithDetails').mockResolvedValue(sampleDetails)

    render(
      <HistoryListDetailsSheet
        list={sampleListRenamed}
        open={true}
        onOpenChange={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Pizza Mrożona')).toBeInTheDocument()
    })

    // Find the single-item add button in the item card (has title "Dodaj do koszyka")
    const singleAddBtns = screen.getAllByTitle(/Dodaj do koszyka/i)
    // The first one is the row button
    fireEvent.click(singleAddBtns[0])

    const draftItems = useShoppingStore.getState().draftItems
    expect(draftItems.length).toBe(1)
    expect(draftItems[0].name).toBe('Pizza Mrożona')
    expect(draftItems[0].category_id).toBe(5)
    expect(draftItems[0].category_name).toBe('Mrożonki')
  })
})
