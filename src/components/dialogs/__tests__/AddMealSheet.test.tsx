import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddMealSheet } from '../AddMealSheet'
import { useAuth } from '@/context/AuthContext'
import { productService } from '@/services/productService'
import { mealService } from '@/services/mealService'

vi.mock('@/context/AuthContext')
vi.mock('@/hooks/useDeviceLayout', () => ({
  useDeviceLayout: () => ({ isDesktop: true, isMobile: false })
}))
vi.mock('@/services/productService')
vi.mock('@/services/mealService')

describe('AddMealSheet Flow - Pantry Checkbox Removal & ProductFormSheet Integration', () => {
  const mockHousehold = { id: 'hh-1', name: 'Gospodarstwo Domowe' }
  const mockProducts = [
    {
      id: 'prod-1',
      name: 'Makaron Spaghetti',
      unit_type: 'g',
      category_id: 1,
      kcal_per_100: 350
    },
    {
      id: 'prod-2',
      name: 'Oliwa z oliwek',
      unit_type: 'ml',
      category_id: 2,
      kcal_per_100: 800
    }
  ]
  const mockCategories = [
    { id: 1, name: 'dry_goods', sort_order: 1 },
    { id: 2, name: 'oils', sort_order: 2 }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      household: mockHousehold
    } as any)
    vi.mocked(productService.getProducts).mockResolvedValue(mockProducts as any)
    vi.mocked(productService.getCategories).mockResolvedValue(mockCategories as any)
    vi.mocked(mealService.createMeal).mockResolvedValue({ id: 'meal-1' } as any)
  })

  it('Flow 01: Renders recipe form and verifies that "produkt spiżarniowy" checkbox is completely absent', async () => {
    render(<AddMealSheet open={true} onOpenChange={vi.fn()} />)

    // Wait for initial products to load
    await waitFor(() => {
      expect(productService.getProducts).toHaveBeenCalledWith('hh-1')
    })

    // Pantry checkbox must NOT be in the document
    expect(screen.queryByLabelText(/Produkt spiżarniowy/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /spiżarni/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/Produkt spiżarniowy \(na stanie\)/i)).not.toBeInTheDocument()
  })

  it('Flow 02: Clicking "+ Dodaj produkt" opens ProductFormSheet on top and prefills typed ingredient query without resetting recipe inputs', async () => {
    render(<AddMealSheet open={true} onOpenChange={vi.fn()} />)

    await waitFor(() => {
      expect(productService.getProducts).toHaveBeenCalled()
    })

    // 1. Fill recipe name
    const recipeNameInput = screen.getByPlaceholderText(/np\. Jajecznica z awokado|e\.g\. Scrambled eggs/i)
    fireEvent.change(recipeNameInput, { target: { value: 'Curry z ciecierzycą' } })

    // 2. Type an unlisted product name in the ingredient search autocomplete
    const searchInput = screen.getByPlaceholderText(/Szukaj produktu|Search product/i)
    fireEvent.change(searchInput, { target: { value: 'Mleczko kokosowe' } })

    // 3. Click "+ Dodaj Produkt" button
    const addProductBtn = screen.getByRole('button', { name: /Dodaj Produkt \+|Add Product \+/i })
    fireEvent.click(addProductBtn)

    // 4. ProductFormSheet modal should now be open
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Dodaj Nowy Produkt|Dodaj Produkt|Add Product/i, level: 3 })).toBeInTheDocument()
    })

    // The product name field inside ProductFormSheet should be prefilled with 'Mleczko kokosowe'
    const productNameInputs = screen.getAllByDisplayValue('Mleczko kokosowe')
    expect(productNameInputs.length).toBeGreaterThanOrEqual(1)

    // Recipe name 'Curry z ciecierzycą' in the background must remain intact!
    expect(screen.getByDisplayValue('Curry z ciecierzycą')).toBeInTheDocument()
  })

  it('Flow 03: Cancelling ProductFormSheet closes it and leaves filled recipe fields untouched', async () => {
    render(<AddMealSheet open={true} onOpenChange={vi.fn()} />)

    await waitFor(() => {
      expect(productService.getProducts).toHaveBeenCalled()
    })

    // Enter recipe name
    const recipeNameInput = screen.getByPlaceholderText(/np\. Jajecznica z awokado|e\.g\. Scrambled eggs/i)
    fireEvent.change(recipeNameInput, { target: { value: 'Zupa Dyniowa' } })

    // Open ProductFormSheet
    const addProductBtn = screen.getByRole('button', { name: /Dodaj Produkt \+|Add Product \+/i })
    fireEvent.click(addProductBtn)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Dodaj Nowy Produkt|Dodaj Produkt|Add Product/i, level: 3 })).toBeInTheDocument()
    })

    // Click Cancel in ProductFormSheet
    const cancelBtn = screen.getByRole('button', { name: /Anuluj|Cancel/i })
    fireEvent.click(cancelBtn)

    // Form inputs of the recipe must be preserved
    expect(screen.getByDisplayValue('Zupa Dyniowa')).toBeInTheDocument()
  })

  it('Flow 04: Creating a product in ProductFormSheet immediately updates available products and selects it in the ingredient inputs', async () => {
    const createdProduct = {
      id: 'prod-new-1',
      household_id: 'hh-1',
      name: 'Mleczko kokosowe',
      unit_type: 'ml',
      category_id: 1,
      kcal_per_100: 200,
      protein_per_100: 2,
      carbs_per_100: 3,
      fat_per_100: 20
    }
    vi.mocked(productService.createProduct).mockResolvedValue(createdProduct as any)

    render(<AddMealSheet open={true} onOpenChange={vi.fn()} />)

    await waitFor(() => {
      expect(productService.getProducts).toHaveBeenCalled()
    })

    // 1. Fill recipe name
    const recipeNameInput = screen.getByPlaceholderText(/np\. Jajecznica z awokado|e\.g\. Scrambled eggs/i)
    fireEvent.change(recipeNameInput, { target: { value: 'Zupa Tajska' } })

    // 2. Open ProductFormSheet
    const addProductBtn = screen.getByRole('button', { name: /Dodaj Produkt \+|Add Product \+/i })
    fireEvent.click(addProductBtn)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Dodaj Nowy Produkt|Dodaj Produkt|Add Product/i, level: 3 })).toBeInTheDocument()
    })

    // Fill ProductFormSheet name
    const nameInput = screen.getByPlaceholderText(/np\. Jogurt grecki|np\. Pierś z kurczaka/i)
    fireEvent.change(nameInput, { target: { value: 'Mleczko kokosowe' } })

    // Submit product creation
    const saveProductBtn = screen.getByRole('button', { name: /Dodaj Produkt|Add Product/i })
    fireEvent.click(saveProductBtn)

    // Wait for ProductFormSheet to close and product to be selected
    await waitFor(() => {
      expect(productService.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          household_id: 'hh-1',
          name: 'Mleczko kokosowe'
        })
      )
    })

    // The ingredient autocomplete input in AddMealSheet should now show 'Mleczko kokosowe'
    await waitFor(() => {
      const autocompleteInput = screen.getByPlaceholderText(/Szukaj produktu|Search product/i)
      expect(autocompleteInput).toHaveValue('Mleczko kokosowe')
    })

    // Recipe name is still preserved
    expect(screen.getByDisplayValue('Zupa Tajska')).toBeInTheDocument()

    // Add ingredient to recipe
    const plusButtons = screen.getAllByRole('button')
    // Find the add ingredient button (the Plus button next to quantity)
    const addIngredientBtn = plusButtons.find(b => b.querySelector('svg.lucide-plus') && b.closest('.flex.items-center.gap-2'))
    expect(addIngredientBtn).toBeDefined()
    fireEvent.click(addIngredientBtn!)

    // Now submit the whole meal
    const submitMealBtn = screen.getByRole('button', { name: /Utwórz Przepis|Save Recipe/i })
    fireEvent.click(submitMealBtn)

    // Verify mealService.createMeal was called with is_pantry_item: false
    await waitFor(() => {
      expect(mealService.createMeal).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Zupa Tajska',
          ingredients: [
            expect.objectContaining({
              product_id: 'prod-new-1',
              is_pantry_item: false
            })
          ]
        })
      )
    })
  })
})
