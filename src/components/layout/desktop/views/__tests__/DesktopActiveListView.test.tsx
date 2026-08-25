import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DesktopActiveListView } from '../DesktopActiveListView'
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
      total_quantity: 2,
      is_checked: false,
      added_ad_hoc: false,
      product: {
        id: 'prod-milk',
        name: 'Mleko 3.2%',
        unit_type: 'pcs' as const,
        category_id: 1,
        category: { id: 1, name: 'dairy', sort_order: 1 }
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
      id: 'item-hammer',
      shopping_list_id: 'list-2',
      product_id: null,
      total_quantity: 1,
      is_checked: false,
      added_ad_hoc: true,
      ad_hoc_name: 'Młotek',
      product: {
        id: 'adhoc-hammer',
        name: 'Młotek',
        unit_type: 'pcs' as const,
        category_id: null
      }
    }
  ]
}

describe('DesktopActiveListView - Desktop Segmented Tabs & Multi-List Management', () => {
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

  it('Flow 01: renders segmented tabs for active lists in desktop header', async () => {
    render(<DesktopActiveListView />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Bieżące Spożywcze/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Dom i Majsterkowanie/i })).toBeInTheDocument()
    })

    expect(screen.getByText('Mleko 3.2%')).toBeInTheDocument()
  })

  it('Flow 02: clicking segmented tab switches list and displays target items', async () => {
    render(<DesktopActiveListView />)

    await waitFor(() => {
      expect(screen.getByText('Mleko 3.2%')).toBeInTheDocument()
    })

    const tab2 = screen.getByRole('button', { name: /Dom i Majsterkowanie/i })
    fireEvent.click(tab2)

    await waitFor(() => {
      expect(screen.getByText('Młotek')).toBeInTheDocument()
    })
  })
})
