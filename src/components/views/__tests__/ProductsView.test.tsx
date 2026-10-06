import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProductsView } from '../ProductsView'
import { usePantryStore } from '@/store/usePantryStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useI18nStore } from '@/i18n'
import { productService, type Product } from '@/services/productService'
import type { PantryItemWithDetails } from '@/types/pantry'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    household: { id: 'hh-123', name: 'Dom Testowy' },
    user: { id: 'user-1' }
  })
}))

vi.mock('@/services/productService', () => ({
  productService: {
    getProducts: vi.fn(),
    getCategories: vi.fn().mockResolvedValue([]),
    createProduct: vi.fn(),
    deleteProduct: vi.fn()
  }
}))

vi.mock('@/services/categoryService', () => ({
  categoryService: {
    getCategoriesWithSettings: vi.fn().mockResolvedValue([])
  }
}))

describe('ProductsView - Pantry Stock Badges & Quick Action (ADR-008 Phase 4)', () => {
  const sampleProducts: Product[] = [
    {
      id: 'prod-milk',
      household_id: 'hh-123',
      name: 'Mleko 3.2%',
      category_id: 3,
      unit_type: 'ml',
      kcal_per_100: 50,
      protein_per_100: 3.3,
      carbs_per_100: 4.8,
      fat_per_100: 3.2,
      type: 'Household',
      is_ad_hoc: false
    },
    {
      id: 'prod-bread',
      household_id: 'hh-123',
      name: 'Chleb Żytni',
      category_id: 2,
      unit_type: 'g',
      kcal_per_100: 220,
      protein_per_100: 7,
      carbs_per_100: 45,
      fat_per_100: 1.5,
      type: 'Household',
      is_ad_hoc: false
    }
  ]

  const samplePantryItems: PantryItemWithDetails[] = [
    {
      id: 'pantry-1',
      household_id: 'hh-123',
      product_id: 'prod-milk',
      ad_hoc_name: null,
      category_id: 3,
      quantity: 1500,
      unit_type: 'ml',
      last_purchased_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      last_verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      product: {
        id: 'prod-milk',
        name: 'Mleko 3.2%',
        unit_type: 'ml',
        category_id: 3
      }
    }
  ]

  beforeEach(() => {
    useI18nStore.getState().setLanguage('pl')
    vi.mocked(productService.getProducts).mockResolvedValue(sampleProducts)

    useCategoryStore.setState({
      activeHouseholdId: 'hh-123',
      categoriesByHousehold: {
        'hh-123': [
          {
            id: 2,
            name: 'bakery',
            is_global: true,
            household_id: null,
            sort_order: 20,
            is_hidden: false
          },
          {
            id: 3,
            name: 'dairy',
            is_global: true,
            household_id: null,
            sort_order: 30,
            is_hidden: false
          }
        ]
      }
    })

    usePantryStore.setState({
      activeHouseholdId: 'hh-123',
      pantryItems: samplePantryItems,
      pantryMapByProductId: {
        'prod-milk': samplePantryItems[0]
      },
      pantryMapByAdHocName: {},
      isLoading: false
    })
  })

  it('Flow 01: renders product cards and shows pantry stock badge for items in pantry', async () => {
    render(<ProductsView />)

    await waitFor(() => {
      expect(screen.getByText('Mleko 3.2%')).toBeInTheDocument()
      expect(screen.getByText('Chleb Żytni')).toBeInTheDocument()
    })

    // Mleko is in pantry with 1500 ml -> shows stock badge
    expect(screen.getByText('1500 ml')).toBeInTheDocument()
  })

  it('Flow 02: clicking pantry icon button opens AddPantryItemDialog prefilled with the product', async () => {
    render(<ProductsView />)

    await waitFor(() => {
      expect(screen.getByText('Mleko 3.2%')).toBeInTheDocument()
    })

    const pantryButtons = screen.getAllByTitle(/Zarządzaj w spiżarni|Dodaj do spiżarni/i)
    expect(pantryButtons.length).toBeGreaterThanOrEqual(2)

    fireEvent.click(pantryButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Dodaj do Spiżarni')).toBeInTheDocument()
    })
  })
})
