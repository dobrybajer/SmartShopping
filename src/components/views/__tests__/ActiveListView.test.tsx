import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ActiveListView } from '../ActiveListView'
import { useShoppingStore } from '@/store/useShoppingStore'
import { shoppingListService } from '@/services/shoppingListService'
import { useI18nStore } from '@/i18n'

vi.mock('@/context/AuthContext', () => ({
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
    useI18nStore.getState().setLanguage('pl')
    useShoppingStore.setState({
      activeHouseholdId: 'household-123',
      selectedActiveListId: 'list-1',
      activeListsSummary: sampleSummaries
    })
    vi.clearAllMocks()

    vi.spyOn(shoppingListService, 'getActiveListsSummary').mockResolvedValue(sampleSummaries)
    vi.spyOn(shoppingListService, 'getListWithDetails').mockImplementation(async (id: string) => {
      if (id === 'list-2') return sampleListDetails2 as any
      return sampleListDetails1 as any
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
  })
})
