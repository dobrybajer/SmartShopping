import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DraftView } from '../DraftView'
import { useShoppingStore, type DraftItem } from '@/store/useShoppingStore'
import { shoppingListService } from '@/services/shoppingListService'
import { useI18nStore } from '@/i18n'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    household: { id: 'household-123', name: 'Dom Testowy' },
    user: { id: 'user-1' }
  })
}))

const mockGetActiveListsSummary = vi.spyOn(
  shoppingListService,
  'getActiveListsSummary'
).mockResolvedValue([])

const mockCreateActiveListFromDraft = vi.spyOn(
  shoppingListService,
  'createActiveListFromDraft'
).mockResolvedValue({
  id: 'list-1',
  household_id: 'household-123',
  name: 'Aktywna Lista',
  status: 'active',
  is_default: true,
  target_date: '2026-08-25',
  created_at: '2026-08-25T20:00:00Z',
  updated_at: '2026-08-25T20:00:00Z',
  items: []
} as any)

describe('DraftView - Selective Item Checkout & Multi-List Transfer Flows', () => {
  const sampleItems: DraftItem[] = [
    {
      id: 'draft-1',
      name: 'Mleko 3.2%',
      unit_type: 'ml',
      category_name: 'dairy',
      sort_order: 1,
      quantity: 1000,
      is_ad_hoc: false,
      meal_source: 'Naleśniki'
    },
    {
      id: 'draft-2',
      name: 'Chleb Żytni',
      unit_type: 'pcs',
      category_name: 'bakery',
      sort_order: 2,
      quantity: 1,
      is_ad_hoc: true
    }
  ]

  beforeEach(() => {
    localStorage.clear()
    useI18nStore.getState().setLanguage('pl')
    useShoppingStore.setState({
      activeHouseholdId: 'household-123',
      draftsByHousehold: { 'household-123': sampleItems },
      draftItems: sampleItems
    })
    vi.clearAllMocks()
    mockGetActiveListsSummary.mockResolvedValue([])
  })

  it('Flow 01: renders all items in draft, all selected by default', () => {
    render(<DraftView />)

    expect(screen.getByText('Mleko 3.2%')).toBeInTheDocument()
    expect(screen.getByText('Chleb Żytni')).toBeInTheDocument()

    // Checkboxes should all be in checked state
    const checkboxes = screen.getAllByRole('checkbox')
    // 1 header select-all checkbox + 2 item checkboxes = 3 checkboxes
    expect(checkboxes).toHaveLength(3)

    // All checkboxes checked by default
    checkboxes.forEach((cb) => {
      expect(cb).toHaveAttribute('data-state', 'checked')
    })

    // Active list button should be enabled
    const generateBtn = screen.getByRole('button', { name: /Przenieś do Listy Zakupów/i })
    expect(generateBtn).toBeEnabled()
  })

  it('Flow 02: unchecking a single item updates selected count and opens transfer sheet with remaining item in draft', async () => {
    render(<DraftView />)

    const itemCheckboxes = screen.getAllByRole('checkbox')
    // Uncheck second item (index 2)
    fireEvent.click(itemCheckboxes[2])

    expect(itemCheckboxes[2]).toHaveAttribute('data-state', 'unchecked')
    expect(screen.getByText('1 z 2 zaznaczonych')).toBeInTheDocument()

    // Click transfer CTA to open sheet
    const transferBtn = screen.getByRole('button', { name: /Przenieś do Listy Zakupów/i })
    fireEvent.click(transferBtn)

    // In sheet, click confirm creation
    const confirmBtn = await screen.findByRole('button', { name: /Utwórz Listę/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(mockCreateActiveListFromDraft).toHaveBeenCalledWith(
        'household-123',
        expect.any(String),
        [expect.objectContaining({ id: 'draft-1', name: 'Mleko 3.2%' })],
        false
      )
    })

    // The remaining unselected item (draft-2) must remain in the store draftItems
    const remainingInStore = useShoppingStore.getState().draftItems
    expect(remainingInStore).toHaveLength(1)
    expect(remainingInStore[0].id).toBe('draft-2')
  })

  it('Flow 03: Deselect all unchecks all items and disables transfer CTA; Select all re-checks all', () => {
    render(<DraftView />)

    // Header button is "Odznacz wszystkie" when all are selected
    const toggleAllBtn = screen.getByText('Odznacz wszystkie')
    fireEvent.click(toggleAllBtn)

    // All item checkboxes become unchecked
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[1]).toHaveAttribute('data-state', 'unchecked')
    expect(checkboxes[2]).toHaveAttribute('data-state', 'unchecked')

    // CTA button becomes disabled with noItemsSelected prompt
    expect(screen.getByText('Wybierz co najmniej 1 pozycję')).toBeInTheDocument()
    const transferBtn = screen.getByRole('button', { name: /Wybierz co najmniej 1 pozycję/i })
    expect(transferBtn).toBeDisabled()

    // Now header button says "Zaznacz wszystkie"
    const selectAllBtn = screen.getByText('Zaznacz wszystkie')
    fireEvent.click(selectAllBtn)

    // All items checked again
    expect(checkboxes[1]).toHaveAttribute('data-state', 'checked')
    expect(checkboxes[2]).toHaveAttribute('data-state', 'checked')
    expect(screen.getByRole('button', { name: /Przenieś do Listy Zakupów/i })).toBeEnabled()
  })
})
