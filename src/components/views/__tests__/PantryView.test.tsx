import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PantryView } from '../PantryView'
import { usePantryStore } from '@/store/usePantryStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useI18nStore } from '@/i18n'
import type { PantryItemWithDetails } from '@/types/pantry'
import { pantryService } from '@/services/pantryService'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    household: { id: 'hh-123', name: 'Dom Testowy' },
    user: { id: 'user-1' }
  })
}))

vi.mock('@/services/pantryService', () => ({
  pantryService: {
    getPantryItems: vi.fn(),
    addOrIncrementItem: vi.fn(),
    updateQuantity: vi.fn(),
    verifyItem: vi.fn(),
    deletePantryItem: vi.fn(),
    removeByProductOrName: vi.fn()
  }
}))

vi.mock('@/services/productService', () => ({
  productService: {
    getCategories: vi.fn().mockResolvedValue([]),
    getProducts: vi.fn().mockResolvedValue([]),
    createProduct: vi.fn()
  }
}))

vi.mock('@/services/categoryService', () => ({
  categoryService: {
    getCategoriesWithSettings: vi.fn().mockResolvedValue([])
  }
}))

describe('PantryView - Inventory Management & Freshness Verification Flows', () => {
  const sampleItems: PantryItemWithDetails[] = [
    {
      id: 'pantry-1',
      household_id: 'hh-123',
      product_id: 'prod-1',
      ad_hoc_name: null,
      category_id: 1,
      quantity: 2,
      unit_type: 'pcs',
      last_purchased_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago (fresh)
      last_verified_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      product: {
        id: 'prod-1',
        name: 'Mleko',
        unit_type: 'pcs',
        category_id: 1,
        category: {
          id: 1,
          name: 'dairy',
          is_non_food: false,
          sort_order: 1
        }
      },
      category: {
        id: 1,
        name: 'dairy',
        is_non_food: false,
        sort_order: 1
      }
    },
    {
      id: 'pantry-2',
      household_id: 'hh-123',
      product_id: 'prod-2',
      ad_hoc_name: null,
      category_id: 2,
      quantity: 500,
      unit_type: 'g',
      last_purchased_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(), // 10 days ago (old for food)
      last_verified_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      product: {
        id: 'prod-2',
        name: 'Chleb',
        unit_type: 'g',
        category_id: 2,
        category: {
          id: 2,
          name: 'bakery',
          is_non_food: false,
          sort_order: 2
        }
      },
      category: {
        id: 2,
        name: 'bakery',
        is_non_food: false,
        sort_order: 2
      }
    }
  ]

  beforeEach(() => {
    useI18nStore.getState().setLanguage('pl')
    vi.mocked(pantryService.getPantryItems).mockResolvedValue(sampleItems)

    usePantryStore.setState({
      activeHouseholdId: 'hh-123',
      pantryItems: sampleItems,
      pantryMapByProductId: {
        'prod-1': sampleItems[0],
        'prod-2': sampleItems[1]
      },
      pantryMapByAdHocName: {},
      isLoading: false
    })
    useCategoryStore.setState({
      activeHouseholdId: 'hh-123',
      categoriesByHousehold: {
        'hh-123': [
          {
            id: 1,
            name: 'dairy',
            is_global: true,
            household_id: null,
            sort_order: 10,
            is_hidden: false
          },
          {
            id: 2,
            name: 'bakery',
            is_global: true,
            household_id: null,
            sort_order: 20,
            is_hidden: false
          }
        ]
      }
    })
    vi.clearAllMocks()
    vi.mocked(pantryService.getPantryItems).mockResolvedValue(sampleItems)
  })

  it('Flow 01: renders pantry items grouped by aisle category with quantities', async () => {
    render(<PantryView />)

    await waitFor(() => {
      expect(screen.getByText('Spiżarnia Domowa')).toBeInTheDocument()
      expect(screen.getByText('Mleko')).toBeInTheDocument()
      expect(screen.getByText('Chleb')).toBeInTheDocument()
    })
    expect(screen.getByText(/2 szt\./)).toBeInTheDocument()
    expect(screen.getByText(/500 g/)).toBeInTheDocument()
  })

  it('Flow 02: clicking (+) and (-) steppers triggers store quantity updates', async () => {
    const updateSpy = vi.fn().mockResolvedValue(true)
    usePantryStore.setState({
      updatePantryQuantity: updateSpy
    })

    render(<PantryView />)

    await waitFor(() => {
      expect(screen.getAllByTitle('Zwiększ').length).toBeGreaterThan(0)
    })

    const plusButtons = screen.getAllByTitle('Zwiększ')
    fireEvent.click(plusButtons[0])

    expect(updateSpy).toHaveBeenCalledWith('pantry-1', 3)
  })

  it('Flow 03: searching filters items by name dynamically', async () => {
    render(<PantryView />)

    await waitFor(() => {
      expect(screen.getByText('Mleko')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Szukaj produktów w spiżarni...')
    fireEvent.change(searchInput, { target: { value: 'Chleb' } })

    expect(screen.getByText('Chleb')).toBeInTheDocument()
    expect(screen.queryByText('Mleko')).not.toBeInTheDocument()
  })

  it('Flow 04: clicking "Dodaj do Spiżarni" opens add item dialog', async () => {
    render(<PantryView />)

    await waitFor(() => {
      expect(screen.getByText('Spiżarnia Domowa')).toBeInTheDocument()
    })

    const addBtn = screen.getByRole('button', { name: /Dodaj do Spiżarni/i })
    fireEvent.click(addBtn)

    await waitFor(() => {
      expect(screen.getByText('Wybierz produkt z katalogu lub dodaj artykuł domowy')).toBeInTheDocument()
    })
  })
})
