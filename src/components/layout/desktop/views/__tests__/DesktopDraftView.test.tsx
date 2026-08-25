import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DesktopDraftView } from '../DesktopDraftView'
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

describe('DesktopDraftView - Desktop Layout Item Selection & Transfer', () => {
  const sampleItems: DraftItem[] = [
    {
      id: 'draft-1',
      name: 'Oliwa z oliwek',
      unit_type: 'ml',
      category_name: 'oils',
      sort_order: 1,
      quantity: 500,
      is_ad_hoc: false,
      meal_source: 'Sałatka Grecka'
    },
    {
      id: 'draft-2',
      name: 'Ser Feta',
      unit_type: 'g',
      category_name: 'dairy',
      sort_order: 2,
      quantity: 200,
      is_ad_hoc: false,
      meal_source: 'Sałatka Grecka'
    },
    {
      id: 'draft-3',
      name: 'Ręcznik papierowy',
      unit_type: 'pcs',
      category_name: 'household',
      sort_order: 3,
      quantity: 2,
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

  it('Flow 01: renders items with checkboxes in desktop layout, showing breakdown in summary deck', () => {
    render(<DesktopDraftView />)

    expect(screen.getByText('Oliwa z oliwek')).toBeInTheDocument()
    expect(screen.getByText('Ser Feta')).toBeInTheDocument()
    expect(screen.getByText('Ręcznik papierowy')).toBeInTheDocument()

    // 3 item checkboxes
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(3)

    // Verify transfer button is enabled
    const transferBtn = screen.getByRole('button', { name: /Przenieś do Listy Zakupów/i })
    expect(transferBtn).toBeEnabled()
  })

  it('Flow 02: deselects items, opens transfer dialog and sends only selected items to active list', async () => {
    render(<DesktopDraftView />)

    const checkboxes = screen.getAllByRole('checkbox')
    // Deselect item 3 (Ręcznik papierowy - ad hoc, index 2)
    fireEvent.click(checkboxes[2])

    const transferBtn = screen.getByRole('button', { name: /Przenieś do Listy Zakupów \(2\)/i })
    fireEvent.click(transferBtn)

    // In dialog, click submit
    const confirmBtn = await screen.findByRole('button', { name: /Utwórz Listę/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(mockCreateActiveListFromDraft).toHaveBeenCalledWith(
        'household-123',
        expect.any(String),
        [
          expect.objectContaining({ id: 'draft-1' }),
          expect.objectContaining({ id: 'draft-2' })
        ],
        false
      )
    })

    // Unselected ad-hoc item remains in draft
    const remainingInStore = useShoppingStore.getState().draftItems
    expect(remainingInStore).toHaveLength(1)
    expect(remainingInStore[0].id).toBe('draft-3')
  })

  it('Flow 03: Deselect all and Select all buttons toggle state on desktop', () => {
    render(<DesktopDraftView />)

    const toggleAllBtn = screen.getByRole('button', { name: /Odznacz wszystkie/i })
    fireEvent.click(toggleAllBtn)

    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.forEach((cb) => {
      expect(cb).toHaveAttribute('data-state', 'unchecked')
    })

    const transferBtn = screen.getByRole('button', { name: /Wybierz co najmniej 1 pozycję/i })
    expect(transferBtn).toBeDisabled()

    const selectAllBtn = screen.getByRole('button', { name: /Zaznacz wszystkie/i })
    fireEvent.click(selectAllBtn)

    checkboxes.forEach((cb) => {
      expect(cb).toHaveAttribute('data-state', 'checked')
    })
    expect(screen.getByRole('button', { name: /Przenieś do Listy Zakupów/i })).toBeEnabled()
  })
})
