import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { JsonRecipeImportDialog } from '../JsonRecipeImportDialog'
import { useAuth } from '@/hooks/useAuth'
import { productService } from '@/services/productService'
import { mealService } from '@/services/mealService'

vi.mock('@/hooks/useAuth')
vi.mock('@/services/productService')
vi.mock('@/services/mealService')

describe('JsonRecipeImportDialog - Component & Real-Time Flow Tests', () => {
  const mockHousehold = { id: 'hh-test-1', name: 'Dom Testowy' }
  const mockExistingProducts = [
    {
      id: 'prod-spaghetti',
      name: 'Makaron Spaghetti',
      unit_type: 'g',
      kcal_per_100: 350
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      household: mockHousehold
    } as never)
    vi.mocked(productService.getProducts).mockResolvedValue(mockExistingProducts as never)
    vi.mocked(productService.createProduct).mockImplementation(async (input) => ({
      id: 'new-prod-id',
      household_id: input.household_id ?? null,
      name: input.name,
      unit_type: input.unit_type ?? 'g',
      category_id: input.category_id ?? null,
      kcal_per_100: input.kcal_per_100 ?? null,
      protein_per_100: input.protein_per_100 ?? null,
      carbs_per_100: input.carbs_per_100 ?? null,
      fat_per_100: input.fat_per_100 ?? null,
      is_ad_hoc: input.is_ad_hoc ?? false,
      is_general: input.is_general ?? false,
      parent_id: input.parent_id ?? null,
      type: input.type ?? 'Household'
    }))
    vi.mocked(mealService.createMeal).mockResolvedValue({ id: 'new-meal-id' } as never)

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    })
  })

  it('Flow 01: Renders dialog with title, shortcut badge, and empty hint when opened', () => {
    render(<JsonRecipeImportDialog open={true} onOpenChange={vi.fn()} />)

    expect(screen.getByText(/Importuj przepis|Import Recipe/i)).toBeInTheDocument()
    expect(screen.getByText(/CTRL \+ ALT \+ P/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Wklej tutaj kod JSON|Paste recipe JSON/i)).toBeInTheDocument()
    expect(screen.getByText(/Wstaw przykład/i)).toBeInTheDocument()
  })

  it('Flow 02: Real-time validation shows syntax error alert on broken JSON', () => {
    render(<JsonRecipeImportDialog open={true} onOpenChange={vi.fn()} />)

    const textarea = screen.getByPlaceholderText(/Wklej tutaj kod JSON|Paste recipe JSON/i)
    fireEvent.change(textarea, { target: { value: '{ broken json: true' } })

    expect(screen.getByText(/Błąd składni JSON|JSON Syntax Error/i)).toBeInTheDocument()
  })

  it('Flow 03: Real-time validation shows schema errors when required fields are missing', () => {
    render(<JsonRecipeImportDialog open={true} onOpenChange={vi.fn()} />)

    const textarea = screen.getByPlaceholderText(/Wklej tutaj kod JSON|Paste recipe JSON/i)
    fireEvent.change(textarea, {
      target: {
        value: JSON.stringify({
          description: 'Bez nazwy i bez składników'
        })
      }
    })

    expect(screen.getByText(/Błędy zgodności ze schematem|Schema Validation Errors/i)).toBeInTheDocument()
    expect(screen.getByText(/Brak wymaganej nazwy przepisu/i)).toBeInTheDocument()
  })

  it('Flow 04: "Wstaw przykład" inserts valid template and activates Save button', () => {
    render(<JsonRecipeImportDialog open={true} onOpenChange={vi.fn()} />)

    const insertBtn = screen.getByText(/Wstaw przykład/i)
    fireEvent.click(insertBtn)

    expect(screen.getByText(/Poprawny format JSON|Valid JSON format/i)).toBeInTheDocument()
    expect(screen.getByText(/Gotowy do zapisu/i)).toBeInTheDocument()

    const saveBtn = screen.getByRole('button', { name: /Zapisz przepis|Save Recipe/i })
    expect(saveBtn).not.toBeDisabled()
  })

  it('Flow 05: "Odrzuć" clears text and closes modal', () => {
    const handleOpenChange = vi.fn()
    render(<JsonRecipeImportDialog open={true} onOpenChange={handleOpenChange} />)

    const textarea = screen.getByPlaceholderText(/Wklej tutaj kod JSON|Paste recipe JSON/i)
    fireEvent.change(textarea, { target: { value: '{"some": "data"}' } })

    const discardBtn = screen.getByRole('button', { name: /Odrzuć|Discard/i })
    fireEvent.click(discardBtn)

    expect(handleOpenChange).toHaveBeenCalledWith(false)
  })

  it('Flow 06: "Kopiuj szablon JSON" writes template to clipboard', async () => {
    render(<JsonRecipeImportDialog open={true} onOpenChange={vi.fn()} />)

    const copyBtn = screen.getByRole('button', { name: /Kopiuj szablon JSON|Copy JSON Template/i })
    await act(async () => {
      fireEvent.click(copyBtn)
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalled()
  })

  it('Flow 07: Saves recipe, auto-creates missing product, matches existing product, and triggers success callback', async () => {
    const handleSuccess = vi.fn()
    const handleOpenChange = vi.fn()

    render(
      <JsonRecipeImportDialog
        open={true}
        onOpenChange={handleOpenChange}
        onSuccess={handleSuccess}
      />
    )

    const recipeData = {
      name: 'Spaghetti Bolognese',
      description: 'Klasyczny makaron po bolońsku',
      preparation_steps: '1. Gotuj makaron.\n2. Przygotuj sos.',
      tags: ['Obiad', 'Włoska'],
      ingredients: [
        {
          name: 'Makaron Spaghetti', // Already in catalog
          quantity: 200,
          unit: 'g'
        },
        {
          name: 'Mięso mielone wołowe', // New product, not in catalog
          quantity: 300,
          unit: 'g',
          kcal_per_100: 250,
          protein_per_100: 20,
          fat_per_100: 18
        }
      ]
    }

    const textarea = screen.getByPlaceholderText(/Wklej tutaj kod JSON|Paste recipe JSON/i)
    fireEvent.change(textarea, { target: { value: JSON.stringify(recipeData) } })

    const saveBtn = screen.getByRole('button', { name: /Zapisz przepis|Save Recipe/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      // 1. Should have fetched existing products
      expect(productService.getProducts).toHaveBeenCalledWith('hh-test-1')
      // 2. Should have created new product "Mięso mielone wołowe"
      expect(productService.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Mięso mielone wołowe',
          unit_type: 'g',
          kcal_per_100: 250
        })
      )
      // 3. Should have created meal with both ingredients
      expect(mealService.createMeal).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Spaghetti Bolognese',
          ingredients: expect.arrayContaining([
            expect.objectContaining({
              product_id: 'prod-spaghetti',
              base_quantity: 200
            }),
            expect.objectContaining({
              product_id: 'new-prod-id',
              base_quantity: 300
            })
          ])
        })
      )
      // 4. Success callback called
      expect(handleSuccess).toHaveBeenCalled()
      expect(handleOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('Flow 08: Forces Household scope and household_id even when pasted JSON specifies type Global (HIGH-12)', async () => {
    render(<JsonRecipeImportDialog open={true} onOpenChange={vi.fn()} />)

    const globalRecipeData = {
      name: 'Przepis z sieci',
      type: 'Global',
      ingredients: [
        {
          name: 'Ryż jaśminowy',
          quantity: 100,
          unit: 'g'
        }
      ]
    }

    const textarea = screen.getByPlaceholderText(/Wklej tutaj kod JSON|Paste recipe JSON/i)
    fireEvent.change(textarea, { target: { value: JSON.stringify(globalRecipeData) } })

    const saveBtn = screen.getByRole('button', { name: /Zapisz przepis|Save Recipe/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(productService.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ryż jaśminowy',
          household_id: 'hh-test-1',
          type: 'Household'
        })
      )
      expect(mealService.createMeal).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Przepis z sieci',
          household_id: 'hh-test-1',
          type: 'Household'
        })
      )
    })
  })
})
