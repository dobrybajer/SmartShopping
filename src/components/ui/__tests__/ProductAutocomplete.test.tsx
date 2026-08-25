import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductAutocomplete } from '../ProductAutocomplete'
import type { Product } from '@/services/productService'

const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Awokado Hass',
    unit_type: 'pcs',
    category_id: 1,
    type: 'Household',
    is_ad_hoc: false,
    household_id: 'hh-1',
    kcal_per_100: 160,
    protein_per_100: 2,
    fat_per_100: 15,
    carbs_per_100: 9
  },
  {
    id: 'prod-2',
    name: 'Bagietka czosnkowa',
    unit_type: 'pcs',
    category_id: 2,
    type: 'Global',
    is_ad_hoc: false,
    household_id: null,
    kcal_per_100: 250,
    protein_per_100: 6,
    fat_per_100: 5,
    carbs_per_100: 45
  },
  {
    id: 'prod-3',
    name: 'Płyn do naczyń',
    unit_type: 'pcs',
    category_id: 3,
    type: 'Household',
    is_ad_hoc: true,
    household_id: 'hh-1',
    kcal_per_100: 0,
    protein_per_100: 0,
    fat_per_100: 0,
    carbs_per_100: 0
  }
]

describe('ProductAutocomplete', () => {
  it('renders input with placeholder', () => {
    render(
      <ProductAutocomplete
        value=""
        onChange={() => {}}
        products={mockProducts}
        onSelectProduct={() => {}}
        placeholder="Szukaj produktu..."
      />
    )

    expect(screen.getByPlaceholderText('Szukaj produktu...')).toBeInTheDocument()
  })

  it('shows suggestions on focus and filters by prefix or substring', () => {
    const handleChange = vi.fn()
    const { rerender } = render(
      <ProductAutocomplete
        value=""
        onChange={handleChange}
        products={mockProducts}
        onSelectProduct={() => {}}
        placeholder="Szukaj..."
      />
    )

    const input = screen.getByPlaceholderText('Szukaj...')
    fireEvent.focus(input)

    // Should display all mock products when query is empty
    expect(screen.getByText('Awokado Hass')).toBeInTheDocument()
    expect(screen.getByText('Bagietka czosnkowa')).toBeInTheDocument()
    expect(screen.getByText('Płyn do naczyń')).toBeInTheDocument()

    // Query matching substring "czosnkowa"
    rerender(
      <ProductAutocomplete
        value="czosnkowa"
        onChange={handleChange}
        products={mockProducts}
        onSelectProduct={() => {}}
        placeholder="Szukaj..."
      />
    )

    expect(screen.getByText('Bagietka czosnkowa')).toBeInTheDocument()
    expect(screen.queryByText('Awokado Hass')).not.toBeInTheDocument()
  })

  it('calls onSelectProduct when clicking an option', () => {
    const handleSelect = vi.fn()
    const handleChange = vi.fn()

    render(
      <ProductAutocomplete
        value=""
        onChange={handleChange}
        products={mockProducts}
        onSelectProduct={handleSelect}
        placeholder="Szukaj..."
      />
    )

    const input = screen.getByPlaceholderText('Szukaj...')
    fireEvent.focus(input)

    const item = screen.getByText('Awokado Hass')
    fireEvent.mouseDown(item)

    expect(handleSelect).toHaveBeenCalledWith(mockProducts[0])
    expect(handleChange).toHaveBeenCalledWith('Awokado Hass')
  })
})
