import { describe, expect, it } from 'vitest'
import {
  appendMealToDraftItems,
  appendMultipleItemsToDraftItems,
  appendSingleItemToDraftItems
} from '../draftCalculations'
import type { DraftItem, MealWithIngredients } from '@/store/useShoppingStore'

describe('draftCalculations', () => {
  it('appendMealToDraftItems scales non-pantry ingredients by targetKcal and aggregates quantities', () => {
    const meal: MealWithIngredients = {
      id: 'meal-1',
      household_id: 'hh-1',
      name: 'Owsianka',
      description: null,
      preparation_steps: null,
      comments: null,
      category_id: 1,
      tags: null,
      ingredients: [
        {
          id: 'ing-1',
          meal_id: 'meal-1',
          product_id: 'prod-oats',
          base_quantity: 100,
          is_pantry_item: false,
          product: {
            id: 'prod-oats',
            household_id: 'hh-1',
            name: 'Płatki owsiane',
            unit_type: 'g',
            category_id: 2,
            kcal_per_100: 400,
            protein_per_100: 12,
            carbs_per_100: 60,
            fat_per_100: 7,
            parent_id: null,
            is_general: false,
            is_ad_hoc: false,
            type: 'Household'
          }
        },
        {
          id: 'ing-pantry',
          meal_id: 'meal-1',
          product_id: 'prod-salt',
          base_quantity: 5,
          is_pantry_item: true,
          product: {
            id: 'prod-salt',
            household_id: 'hh-1',
            name: 'Sól',
            unit_type: 'g',
            category_id: 3,
            kcal_per_100: 0,
            protein_per_100: 0,
            carbs_per_100: 0,
            fat_per_100: 0,
            parent_id: null,
            is_general: false,
            is_ad_hoc: false,
            type: 'Household'
          }
        }
      ]
    }

    const result = appendMealToDraftItems([], meal, 600)
    expect(result).toHaveLength(1)
    expect(result[0].product_id).toBe('prod-oats')
    expect(result[0].quantity).toBe(150)
    expect(result[0].meal_source).toBe('Owsianka')
  })

  it('appendSingleItemToDraftItems and appendMultipleItemsToDraftItems merge catalog and ad-hoc items and adopt categories', () => {
    const initial: DraftItem[] = []
    const afterFirst = appendSingleItemToDraftItems(initial, {
      product_id: 'prod-1',
      name: 'Mleko',
      unit_type: 'ml',
      category_name: 'other',
      quantity: 500
    })

    const afterSecond = appendMultipleItemsToDraftItems(afterFirst, [
      {
        product_id: 'prod-1',
        name: 'Mleko',
        unit_type: 'ml',
        category_id: 4,
        category_name: 'Nabiał',
        sort_order: 2,
        quantity: 250
      },
      {
        name: 'Gąbki kuchenne',
        unit_type: 'pcs',
        quantity: 2,
        is_ad_hoc: true
      },
      {
        name: 'gąbki kuchenne',
        unit_type: 'pcs',
        category_id: 9,
        category_name: 'Chemia',
        quantity: 1,
        is_ad_hoc: true
      }
    ])

    expect(afterSecond).toHaveLength(2)
    expect(afterSecond[0]).toMatchObject({
      product_id: 'prod-1',
      quantity: 750,
      category_id: 4,
      category_name: 'Nabiał',
      sort_order: 2
    })
    expect(afterSecond[1]).toMatchObject({
      name: 'Gąbki kuchenne',
      quantity: 3,
      category_id: 9,
      category_name: 'Chemia',
      is_ad_hoc: true
    })
  })
})
