import { describe, it, expect } from 'vitest'
import {
  buildCookableIngredientsFromMeal,
  calculateMealPantryDeductions
} from '../pantryConsumption'
import type { PantryItemWithDetails } from '@/types/pantry'

function makePantryItem(overrides: Partial<PantryItemWithDetails>): PantryItemWithDetails {
  return {
    id: 'p-1',
    household_id: 'hh-1',
    product_id: 'prod-1',
    ad_hoc_name: null,
    category_id: 1,
    quantity: 1000,
    unit_type: 'g',
    last_purchased_at: '2026-11-01T12:00:00Z',
    last_verified_at: null,
    created_at: '2026-11-01T12:00:00Z',
    updated_at: '2026-11-01T12:00:00Z',
    category: null,
    product: {
      id: 'prod-1',
      name: 'Mąka',
      unit_type: 'g',
      category_id: 1
    },
    ...overrides
  }
}

describe('pantryConsumption (MED-05)', () => {
  it('calculates direct deductions cleanly without going below zero', () => {
    const eggsItem = makePantryItem({
      id: 'p-eggs',
      product_id: 'prod-eggs',
      quantity: 4,
      unit_type: 'pcs',
      product: { id: 'prod-eggs', name: 'Jajka', unit_type: 'pcs', category_id: 1 }
    })

    const flourItem = makePantryItem({
      id: 'p-flour',
      product_id: 'prod-flour',
      quantity: 500,
      unit_type: 'g',
      product: { id: 'prod-flour', name: 'Mąka', unit_type: 'g', category_id: 1 }
    })

    const deductions = calculateMealPantryDeductions(
      [
        { productId: 'prod-eggs', productName: 'Jajka', requiredQuantity: 6, unitType: 'pcs' },
        { productId: 'prod-flour', productName: 'Mąka', requiredQuantity: 200, unitType: 'g' }
      ],
      { 'prod-eggs': eggsItem, 'prod-flour': flourItem }
    )

    expect(deductions).toHaveLength(2)
    expect(deductions[0]).toMatchObject({
      pantryItemId: 'p-eggs',
      currentStock: 4,
      deductQuantity: 4,
      remainingStock: 0,
      willDeplete: true
    })
    expect(deductions[1]).toMatchObject({
      pantryItemId: 'p-flour',
      currentStock: 500,
      deductQuantity: 200,
      remainingStock: 300,
      willDeplete: false
    })
  })

  it('consumes hierarchical child items FIFO and supports unit conversion (l <-> ml)', () => {
    const olderChild = makePantryItem({
      id: 'p-milk-old',
      product_id: 'prod-milk-32',
      quantity: 0.5,
      unit_type: 'ml',
      last_purchased_at: '2026-10-25T10:00:00Z',
      product: {
        id: 'prod-milk-32',
        name: 'Mleko 3.2%',
        unit_type: 'ml',
        category_id: 2,
        parent_id: 'prod-milk-gen'
      }
    })
    olderChild.quantity = 300

    const newerChild = makePantryItem({
      id: 'p-milk-new',
      product_id: 'prod-milk-20',
      quantity: 1000,
      unit_type: 'ml',
      last_purchased_at: '2026-11-05T10:00:00Z',
      product: {
        id: 'prod-milk-20',
        name: 'Mleko 2%',
        unit_type: 'ml',
        category_id: 2,
        parent_id: 'prod-milk-gen'
      }
    })

    const deductions = calculateMealPantryDeductions(
      [
        {
          productId: 'prod-milk-gen',
          productName: 'Mleko',
          requiredQuantity: 500,
          unitType: 'ml',
          isGeneral: true
        }
      ],
      {},
      { 'prod-milk-gen': [newerChild, olderChild] }
    )

    expect(deductions).toHaveLength(2)
    expect(deductions[0]).toMatchObject({
      pantryItemId: 'p-milk-old',
      deductQuantity: 300,
      remainingStock: 0,
      willDeplete: true
    })
    expect(deductions[1]).toMatchObject({
      pantryItemId: 'p-milk-new',
      deductQuantity: 200,
      remainingStock: 800,
      willDeplete: false
    })
  })

  it('maps meal ingredients with servings/kcal multiplier cleanly via buildCookableIngredientsFromMeal', () => {
    const res = buildCookableIngredientsFromMeal(
      [
        {
          product_id: 'prod-1',
          base_quantity: 100,
          product: { name: 'Ryż', unit_type: 'g', is_general: false }
        },
        { product_id: null, base_quantity: 50, product: null }
      ],
      2.5
    )

    expect(res).toEqual([
      {
        productId: 'prod-1',
        productName: 'Ryż',
        requiredQuantity: 250,
        unitType: 'g',
        isGeneral: false
      }
    ])
  })
})

