import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CategoryManagerContent } from '@/components/categories/CategoryManagerContent'
import { CategoryManagerDialog } from '../CategoryManagerDialog'
import { CategoryManagerSheet } from '../CategoryManagerSheet'
import { useCategoryStore } from '@/store/useCategoryStore'

vi.mock('@/store/useCategoryStore')

describe('CategoryManager User Flows (Mobile & Desktop)', () => {
  const mockReorder = vi.fn().mockResolvedValue(true)
  const mockToggleVisibility = vi.fn().mockResolvedValue(true)
  const mockCreateCustom = vi.fn().mockResolvedValue({ id: 101, name: 'Asian Market' })
  const mockUpdateCustom = vi.fn().mockResolvedValue(true)
  const mockDeleteCustom = vi.fn().mockResolvedValue(true)

  const mockCategories = [
    {
      id: 1,
      name: 'fruits_vegetables',
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
    },
    {
      id: 101,
      name: 'Przekąski BIO',
      is_global: false,
      household_id: 'hh-123',
      sort_order: 30,
      is_hidden: false
    }
  ]

  const mockLoadCategories = vi.fn()
  const mockSubscribeRealtime = vi.fn(() => vi.fn())

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCategoryStore).mockReturnValue({
      categoriesByHousehold: {
        'hh-123': mockCategories
      },
      loadCategories: mockLoadCategories,
      subscribeRealtime: mockSubscribeRealtime,
      reorderCategories: mockReorder,
      toggleVisibility: mockToggleVisibility,
      createCustomCategory: mockCreateCustom,
      updateCustomCategory: mockUpdateCustom,
      deleteCustomCategory: mockDeleteCustom
    } as any)
  })

  it('Flow 01: Renders category list with correct global vs custom badges and permissions', () => {
    render(<CategoryManagerContent householdId="hh-123" />)

    // Global categories should have Global badge
    const globalBadges = screen.getAllByText(/Global|Globalna/i)
    expect(globalBadges.length).toBeGreaterThanOrEqual(2)

    // Custom category should have Custom badge
    expect(screen.getByText(/Custom|Własna/i)).toBeInTheDocument()
    expect(screen.getByText('Przekąski BIO')).toBeInTheDocument()

    // Global categories cannot be deleted (only 1 delete button should exist, which belongs to custom category)
    const deleteButtons = screen.getAllByLabelText(/Delete category|Usuń kategorię/i)
    expect(deleteButtons).toHaveLength(1)

    // Global categories cannot be edited (only 1 edit button belongs to custom category)
    const editButtons = screen.getAllByLabelText(/Edit category|Edytuj kategorię/i)
    expect(editButtons).toHaveLength(1)
  })

  it('Flow 02: Reorders categories when clicking Move Down button', async () => {
    render(<CategoryManagerContent householdId="hh-123" />)

    const moveDownButtons = screen.getAllByLabelText(/Move aisle down|Przesuń alejkę niżej/i)
    // Click move down on first item (fruits_vegetables)
    fireEvent.click(moveDownButtons[0])

    await waitFor(() => {
      expect(mockReorder).toHaveBeenCalledWith('hh-123', [2, 1, 101])
    })
  })

  it('Flow 03: Toggles category visibility when clicking Eye button', async () => {
    render(<CategoryManagerContent householdId="hh-123" />)

    const hideButtons = screen.getAllByLabelText(/Hide category|Ukryj kategorię/i)
    fireEvent.click(hideButtons[0])

    await waitFor(() => {
      expect(mockToggleVisibility).toHaveBeenCalledWith('hh-123', 1, true)
    })
  })

  it('Flow 04: Validates category name on add (rejects empty and duplicates)', async () => {
    render(<CategoryManagerContent householdId="hh-123" />)

    const addButton = screen.getByRole('button', { name: /Add Category|Dodaj kategorię/i })
    const input = screen.getByPlaceholderText(/Category name|Nazwa kategorii/i)

    // Try submitting empty (button disabled)
    expect(addButton).toBeDisabled()

    // Try duplicate name
    fireEvent.change(input, { target: { value: 'Przekąski BIO' } })
    expect(addButton).not.toBeDisabled()
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(
        screen.getByText(/already exists|już istnieje/i)
      ).toBeInTheDocument()
      expect(mockCreateCustom).not.toHaveBeenCalled()
    })

    // Submit valid unique name
    fireEvent.change(input, { target: { value: 'Mrożonki' } })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(mockCreateCustom).toHaveBeenCalledWith('hh-123', 'Mrożonki')
    })
  })

  it('Flow 05: Desktop Dialog and Mobile Sheet render cleanly when open', () => {
    const { rerender } = render(
      <CategoryManagerDialog open={true} onOpenChange={vi.fn()} householdId="hh-123" />
    )
    expect(screen.getByText(/Supermarket Aisles & Categories|Alejki i Kategorie Sklepowe/i)).toBeInTheDocument()

    rerender(
      <CategoryManagerSheet open={true} onOpenChange={vi.fn()} householdId="hh-123" />
    )
    expect(screen.getByText(/Supermarket Aisles & Categories|Alejki i Kategorie Sklepowe/i)).toBeInTheDocument()
  })

  it('Flow 06: Always displays default global categories for new or unconfigured households', () => {
    // household 'hh-brand-new' has no custom configuration in categoriesByHousehold
    render(<CategoryManagerContent householdId="hh-brand-new" />)

    // Should load categories and subscribe to realtime on mount
    expect(mockLoadCategories).toHaveBeenCalledWith('hh-brand-new')
    expect(mockSubscribeRealtime).toHaveBeenCalledWith('hh-brand-new')

    // Should immediately render default global categories (e.g. Owoce i Warzywa, Pieczywo, Nabiał i Jaja...)
    expect(screen.getByText(/Owoce i Warzywa|Fruits & Vegetables/i)).toBeInTheDocument()
    expect(screen.getByText(/Pieczywo|Bakery/i)).toBeInTheDocument()
    expect(screen.getByText(/Nabiał i Jaja|Dairy & Eggs/i)).toBeInTheDocument()
    expect(screen.getByText(/Mięso i Ryby|Meat & Fish/i)).toBeInTheDocument()

    // Reorder buttons should be present and enabled for these default categories
    const moveButtons = screen.getAllByLabelText(/Move aisle|Przesuń alejkę/i)
    expect(moveButtons.length).toBeGreaterThanOrEqual(14)
  })
})
