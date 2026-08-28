import { describe, it, expect } from 'vitest'
import {
  aggregateDraftItems,
  mergeDraftItemsIntoActiveList
} from '../mergeDraftItems'
import type { DraftItem } from '@/store/useShoppingStore'
import type { ActiveListItemWithProduct } from '@/services/shoppingListService'

describe('mergeDraftItems calculations', () => {
  describe('aggregateDraftItems', () => {
    it('aggregates duplicate product_id items by summing quantities', () => {
      const drafts: DraftItem[] = [
        {
          id: '1',
          product_id: 'prod-123',
          name: 'Milk',
          unit_type: 'ml',
          category_name: 'dairy',
          sort_order: 1,
          quantity: 500,
          is_ad_hoc: false
        },
        {
          id: '2',
          product_id: 'prod-123',
          name: 'Milk',
          unit_type: 'ml',
          category_name: 'dairy',
          sort_order: 1,
          quantity: 250,
          is_ad_hoc: false
        }
      ]

      const result = aggregateDraftItems(drafts)
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        product_id: 'prod-123',
        name: 'Milk',
        quantity: 750,
        is_ad_hoc: false,
        category_id: null
      })
    })

    it('aggregates ad-hoc items by normalized name', () => {
      const drafts: DraftItem[] = [
        {
          id: '1',
          name: 'Paper Towels',
          unit_type: 'pcs',
          category_name: 'other',
          sort_order: 99,
          quantity: 2,
          is_ad_hoc: true
        },
        {
          id: '2',
          name: 'paper towels ',
          unit_type: 'pcs',
          category_name: 'other',
          sort_order: 99,
          quantity: 3,
          is_ad_hoc: true
        }
      ]

      const result = aggregateDraftItems(drafts)
      expect(result).toHaveLength(1)
      expect(result[0].quantity).toBe(5)
      expect(result[0].is_ad_hoc).toBe(true)
    })
    it('keeps items with the same product_id separate when they belong to different categories (e.g. bakery vs other)', () => {
      const drafts: DraftItem[] = [
        {
          id: 'draft-bread-rolls',
          product_id: 'prod-rolls',
          name: 'Bułki do hamburgerów',
          unit_type: 'pcs',
          category_id: 2,
          category_name: 'bakery',
          sort_order: 20,
          quantity: 1,
          is_ad_hoc: false
        },
        {
          id: 'draft-garlic-baguette-bakery',
          product_id: 'prod-baguette',
          name: 'Bagietka czosnkowa',
          unit_type: 'pcs',
          category_id: 2,
          category_name: 'bakery',
          sort_order: 20,
          quantity: 3,
          is_ad_hoc: false
        },
        {
          id: 'draft-garlic-baguette-adhoc-other',
          product_id: 'prod-baguette',
          name: 'Bagietka czosnkowa',
          unit_type: 'pcs',
          category_id: 8,
          category_name: 'other',
          sort_order: 99,
          quantity: 1,
          is_ad_hoc: true
        }
      ]

      const result = aggregateDraftItems(drafts)
      // Must return all 3 items: 1 rolls, 1 baguette in bakery (3 pcs), 1 baguette in other (1 pc)
      expect(result).toHaveLength(3)

      const bakeryBaguette = result.find((r) => r.product_id === 'prod-baguette' && r.category_id === 2)
      expect(bakeryBaguette).toBeDefined()
      expect(bakeryBaguette?.quantity).toBe(3)
      expect(bakeryBaguette?.is_ad_hoc).toBe(false)

      const otherBaguette = result.find((r) => r.product_id === 'prod-baguette' && r.category_id === 8)
      expect(otherBaguette).toBeDefined()
      expect(otherBaguette?.quantity).toBe(1)
      expect(otherBaguette?.is_ad_hoc).toBe(true)
    })

    it('aggregates same product_id when both have the same category', () => {
      const drafts: DraftItem[] = [
        {
          id: 'draft-baguette-1',
          product_id: 'prod-baguette',
          name: 'Bagietka czosnkowa',
          unit_type: 'pcs',
          category_id: 2,
          category_name: 'bakery',
          sort_order: 20,
          quantity: 3,
          is_ad_hoc: false
        },
        {
          id: 'draft-baguette-2',
          product_id: 'prod-baguette',
          name: 'Bagietka czosnkowa',
          unit_type: 'pcs',
          category_id: 2,
          category_name: 'bakery',
          sort_order: 20,
          quantity: 1,
          is_ad_hoc: true
        }
      ]

      const result = aggregateDraftItems(drafts)
      expect(result).toHaveLength(1)
      expect(result[0].quantity).toBe(4)
      expect(result[0].category_id).toBe(2)
    })
  })

  describe('mergeDraftItemsIntoActiveList', () => {
    it('merges new items with existing active list items, summing quantities and resetting is_checked', () => {
      const existingItems: ActiveListItemWithProduct[] = [
        {
          id: 'item-1',
          shopping_list_id: 'list-1',
          product_id: 'prod-apple',
          total_quantity: 4,
          is_checked: true, // was previously checked
          added_ad_hoc: false,
          product: {
            id: 'prod-apple',
            name: 'Apple',
            unit_type: 'pcs',
            category_id: 1
          }
        }
      ]

      const draftItems: DraftItem[] = [
        {
          id: 'draft-1',
          product_id: 'prod-apple',
          name: 'Apple',
          unit_type: 'pcs',
          category_name: 'fruits',
          sort_order: 1,
          quantity: 2,
          is_ad_hoc: false
        },
        {
          id: 'draft-2',
          product_id: 'prod-banana',
          name: 'Banana',
          unit_type: 'pcs',
          category_name: 'fruits',
          sort_order: 1,
          quantity: 3,
          is_ad_hoc: false
        }
      ]

      const result = mergeDraftItemsIntoActiveList(existingItems, draftItems)

      expect(result.itemsToUpdate).toHaveLength(1)
      expect(result.itemsToUpdate[0]).toEqual({
        id: 'item-1',
        total_quantity: 6, // 4 + 2
        is_checked: false // reset to false
      })

      expect(result.itemsToInsert).toHaveLength(1)
      expect(result.itemsToInsert[0]).toEqual({
        product_id: 'prod-banana',
        total_quantity: 3,
        is_checked: false,
        added_ad_hoc: false,
        name: 'Banana',
        category_id: null
      })

      expect(result.mergedTotalCount).toBe(2)
    })

    it('correctly matches and merges ad-hoc items', () => {
      const existingItems: ActiveListItemWithProduct[] = [
        {
          id: 'item-sponge',
          shopping_list_id: 'list-1',
          product_id: null,
          total_quantity: 1,
          is_checked: false,
          added_ad_hoc: true,
          ad_hoc_name: 'Sponge'
        }
      ]

      const draftItems: DraftItem[] = [
        {
          id: 'draft-sponge',
          name: 'sponge',
          unit_type: 'pcs',
          category_name: 'other',
          sort_order: 99,
          quantity: 2,
          is_ad_hoc: true
        }
      ]

      const result = mergeDraftItemsIntoActiveList(existingItems, draftItems)

      expect(result.itemsToUpdate).toHaveLength(1)
      expect(result.itemsToUpdate[0]).toEqual({
        id: 'item-sponge',
        total_quantity: 3,
        is_checked: false
      })
      expect(result.itemsToInsert).toHaveLength(0)
    })

    it('preserves category_id on ad-hoc items when inserting new items', () => {
      const existingItems: ActiveListItemWithProduct[] = []
      const draftItems: DraftItem[] = [
        {
          id: 'draft-garlic-baguette',
          name: 'Bagietka czosnkowa',
          unit_type: 'pcs',
          category_id: 105,
          category_name: 'Test',
          sort_order: 10,
          quantity: 1,
          is_ad_hoc: true
        }
      ]

      const result = mergeDraftItemsIntoActiveList(existingItems, draftItems)
      expect(result.itemsToInsert).toHaveLength(1)
      expect(result.itemsToInsert[0]).toEqual({
        product_id: undefined,
        name: 'Bagietka czosnkowa',
        total_quantity: 1,
        is_checked: false,
        added_ad_hoc: true,
        category_id: 105
      })
    })

    it('keeps items with different temporary category_id separate instead of merging into wrong aisle', () => {
      const existingItems: ActiveListItemWithProduct[] = [
        {
          id: 'item-lemon-produce',
          shopping_list_id: 'list-1',
          product_id: 'prod-lemon',
          total_quantity: 2,
          is_checked: false,
          added_ad_hoc: false,
          category_id: 1, // Produce
          product: { id: 'prod-lemon', name: 'Lemon', unit_type: 'pcs', category_id: 1 }
        }
      ]

      const draftItems: DraftItem[] = [
        {
          id: 'draft-lemon-chemical',
          product_id: 'prod-lemon',
          name: 'Lemon',
          unit_type: 'pcs',
          category_id: 5, // User explicitly selected Household/Chemical category for this trip!
          category_name: 'household',
          sort_order: 50,
          quantity: 1,
          is_ad_hoc: true
        }
      ]

      const result = mergeDraftItemsIntoActiveList(existingItems, draftItems)
      // Because category_id differs (5 vs 1), it must NOT merge into Produce item, but insert new item in Chemical aisle
      expect(result.itemsToUpdate).toHaveLength(0)
      expect(result.itemsToInsert).toHaveLength(1)
      expect(result.itemsToInsert[0].category_id).toBe(5)
      expect(result.itemsToInsert[0].product_id).toBe('prod-lemon')
    })

    it('does not merge ad-hoc item from Other into existing item from Bakery, but inserts new item', () => {
      const existingItems: ActiveListItemWithProduct[] = [
        {
          id: 'item-rolls',
          shopping_list_id: 'list-1',
          product_id: 'prod-rolls',
          total_quantity: 1,
          is_checked: false,
          added_ad_hoc: false,
          category_id: 2,
          product: { id: 'prod-rolls', name: 'Bułki do hamburgerów', unit_type: 'pcs', category_id: 2 }
        },
        {
          id: 'item-baguette-bakery',
          shopping_list_id: 'list-1',
          product_id: 'prod-baguette',
          total_quantity: 3,
          is_checked: false,
          added_ad_hoc: false,
          category_id: 2,
          product: { id: 'prod-baguette', name: 'Bagietka czosnkowa', unit_type: 'pcs', category_id: 2 }
        }
      ]

      const draftItems: DraftItem[] = [
        {
          id: 'draft-baguette-other',
          product_id: 'prod-baguette',
          name: 'Bagietka czosnkowa',
          unit_type: 'pcs',
          category_id: 8, // Inne / Różne
          category_name: 'other',
          sort_order: 99,
          quantity: 1,
          is_ad_hoc: true
        }
      ]

      const result = mergeDraftItemsIntoActiveList(existingItems, draftItems)
      expect(result.itemsToUpdate).toHaveLength(0)
      expect(result.itemsToInsert).toHaveLength(1)
      expect(result.itemsToInsert[0].product_id).toBe('prod-baguette')
      expect(result.itemsToInsert[0].category_id).toBe(8)
      expect(result.itemsToInsert[0].total_quantity).toBe(1)
      expect(result.mergedTotalCount).toBe(3)
    })
  })
})
