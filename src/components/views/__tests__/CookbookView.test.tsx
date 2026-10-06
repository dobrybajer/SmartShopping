import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CookbookView } from '../CookbookView'
import { usePantryStore } from '@/store/usePantryStore'
import { useI18nStore } from '@/i18n'
import { mealService } from '@/services/mealService'
import type { MealWithIngredients } from '@/store/useShoppingStore'
import type { PantryItemWithDetails } from '@/types/pantry'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    household: { id: 'hh-123', name: 'Dom Testowy' },
    user: { id: 'user-1' }
  })
}))

vi.mock('@/services/mealService', () => ({
  mealService: {
    getMeals: vi.fn(),
    deleteMeal: vi.fn()
  }
}))

describe('CookbookView - Pantry Stock Badges & Recipe Availability (ADR-008 Phase 4)', () => {
  const samplePantryItems: PantryItemWithDetails[] = [
    {
      id: 'pantry-1',
      household_id: 'hh-123',
      product_id: 'prod-milk',
      ad_hoc_name: null,
      category_id: 3,
      quantity: 1000,
      unit_type: 'ml',
      last_purchased_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      last_verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      product: {
        id: 'prod-milk',
        name: 'Mleko',
        unit_type: 'ml',
        category_id: 3
      }
    },
    {
      id: 'pantry-2',
      household_id: 'hh-123',
      product_id: 'prod-eggs',
      ad_hoc_name: null,
      category_id: 3,
      quantity: 6,
      unit_type: 'pcs',
      last_purchased_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      last_verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      product: {
        id: 'prod-eggs',
        name: 'Jajka',
        unit_type: 'pcs',
        category_id: 3
      }
    }
  ]

  const sampleMeals: MealWithIngredients[] = [
    {
      id: 'meal-pancakes',
      household_id: 'hh-123',
      name: 'Naleśniki',
      category_id: null,
      description: 'Pyszne domowe naleśniki',
      preparation_steps: 'Wymieszaj składniki i usmaż.',
      comments: null,
      tags: ['Śniadanie'],
      type: 'Household',
      ingredients: [
        {
          id: 'ing-1',
          meal_id: 'meal-pancakes',
          product_id: 'prod-milk',
          base_quantity: 250,
          is_pantry_item: false,
          product: {
            id: 'prod-milk',
            household_id: 'hh-123',
            name: 'Mleko',
            unit_type: 'ml',
            category_id: 3,
            kcal_per_100: 50,
            protein_per_100: 3.3,
            carbs_per_100: 4.8,
            fat_per_100: 2,
            is_ad_hoc: false,
            type: 'Household'
          }
        },
        {
          id: 'ing-2',
          meal_id: 'meal-pancakes',
          product_id: 'prod-eggs',
          base_quantity: 2,
          is_pantry_item: false,
          product: {
            id: 'prod-eggs',
            household_id: 'hh-123',
            name: 'Jajka',
            unit_type: 'pcs',
            category_id: 3,
            kcal_per_100: 140,
            protein_per_100: 12,
            carbs_per_100: 1,
            fat_per_100: 10,
            is_ad_hoc: false,
            type: 'Household'
          }
        }
      ]
    },
    {
      id: 'meal-curry',
      household_id: 'hh-123',
      name: 'Curry z Kurczakiem',
      category_id: null,
      description: 'Aromatyczne curry',
      preparation_steps: 'Ugotuj kurczaka z sosem.',
      comments: null,
      tags: ['Obiad'],
      type: 'Household',
      ingredients: [
        {
          id: 'ing-3',
          meal_id: 'meal-curry',
          product_id: 'prod-chicken',
          base_quantity: 400,
          is_pantry_item: false,
          product: {
            id: 'prod-chicken',
            household_id: 'hh-123',
            name: 'Kurczak',
            unit_type: 'g',
            category_id: 4,
            kcal_per_100: 120,
            protein_per_100: 22,
            carbs_per_100: 0,
            fat_per_100: 3,
            is_ad_hoc: false,
            type: 'Household'
          }
        },
        {
          id: 'ing-4',
          meal_id: 'meal-curry',
          product_id: 'prod-milk',
          base_quantity: 200,
          is_pantry_item: false,
          product: {
            id: 'prod-milk',
            household_id: 'hh-123',
            name: 'Mleko',
            unit_type: 'ml',
            category_id: 3,
            kcal_per_100: 50,
            protein_per_100: 3.3,
            carbs_per_100: 4.8,
            fat_per_100: 2,
            is_ad_hoc: false,
            type: 'Household'
          }
        }
      ]
    }
  ]

  beforeEach(() => {
    useI18nStore.getState().setLanguage('pl')
    vi.mocked(mealService.getMeals).mockResolvedValue(sampleMeals)

    usePantryStore.setState({
      activeHouseholdId: 'hh-123',
      pantryItems: samplePantryItems,
      pantryMapByProductId: {
        'prod-milk': samplePantryItems[0],
        'prod-eggs': samplePantryItems[1]
      },
      pantryMapByAdHocName: {},
      isLoading: false
    })
  })

  it('Flow 01: renders recipe cards with pantry availability badges (all ingredients vs partial)', async () => {
    render(<CookbookView />)

    await waitFor(() => {
      expect(screen.getByText('Naleśniki')).toBeInTheDocument()
      expect(screen.getByText('Curry z Kurczakiem')).toBeInTheDocument()
    })

    // Naleśniki has 2/2 ingredients in pantry -> "Wszystkie składniki w spiżarni"
    expect(screen.getByText('Wszystkie składniki w spiżarni')).toBeInTheDocument()

    // Curry has 1/2 ingredients in pantry -> "1/2 składników w spiżarni"
    expect(screen.getByText('1/2 składników w spiżarni')).toBeInTheDocument()
  })

  it('Flow 02: clicking a recipe opens details sheet showing ingredient stock badges', async () => {
    render(<CookbookView />)

    await waitFor(() => {
      expect(screen.getByText('Naleśniki')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Naleśniki'))

    await waitFor(() => {
      expect(screen.getByText('Składniki (2)')).toBeInTheDocument()
    })

    // Both Mleko and Jajka show stock badges
    const inStockBadges = screen.getAllByText(/Dostępne w spiżarni/i)
    expect(inStockBadges.length).toBeGreaterThanOrEqual(2)
  })
})
