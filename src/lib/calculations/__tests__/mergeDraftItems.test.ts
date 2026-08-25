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
        is_ad_hoc: false
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
        name: 'Banana'
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
  })
})
