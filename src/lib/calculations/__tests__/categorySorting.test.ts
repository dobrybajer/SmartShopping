import { describe, it, expect } from 'vitest'
import {
  resolveCategoriesWithSettings,
  filterVisibleCategoriesForShopping,
  calculateSparseIntervals,
  validateCategoryName,
  groupItemsByAisle
} from '../categorySorting'
import type { RawCategoryRow, HouseholdCategorySettingRow } from '@/types/category'

describe('categorySorting pure calculations', () => {
  const mockGlobalCategories: RawCategoryRow[] = [
    { id: 1, name: 'fruits_vegetables', sort_order: 1, household_id: null },
    { id: 2, name: 'bakery', sort_order: 2, household_id: null },
    { id: 3, name: 'dairy', sort_order: 3, household_id: null },
    { id: 4, name: 'meat_fish', sort_order: 4, household_id: null }
  ]

  const mockCustomCategories: RawCategoryRow[] = [
    { id: 101, name: 'Asian Market', sort_order: 99, household_id: 'hh-123' },
    { id: 102, name: 'Pet Supplies', sort_order: 99, household_id: 'hh-123' }
  ]

  describe('resolveCategoriesWithSettings', () => {
    it('uses default sort_order * 10 when no household settings exist', () => {
      const resolved = resolveCategoriesWithSettings(mockGlobalCategories, [])
      expect(resolved).toHaveLength(4)
      expect(resolved[0]).toEqual({
        id: 1,
        name: 'fruits_vegetables',
        is_global: true,
        household_id: null,
        sort_order: 10,
        is_hidden: false,
        custom_name: null,
        has_active_items: false
      })
      expect(resolved[1].sort_order).toBe(20)
      expect(resolved[2].sort_order).toBe(30)
      expect(resolved[3].sort_order).toBe(40)
    })

    it('applies custom sort order and visibility overrides correctly', () => {
      const settings: HouseholdCategorySettingRow[] = [
        {
          id: 'set-1',
          household_id: 'hh-123',
          category_id: 3, // dairy
          custom_sort_order: 5, // moved to very first position
          is_hidden: false,
          custom_name: 'Mleczarnia',
          store_profile_id: null,
          created_at: '2026-08-27T00:00:00Z',
          updated_at: '2026-08-27T00:00:00Z'
        },
        {
          id: 'set-2',
          household_id: 'hh-123',
          category_id: 2, // bakery
          custom_sort_order: 15,
          is_hidden: true,
          custom_name: null,
          store_profile_id: null,
          created_at: '2026-08-27T00:00:00Z',
          updated_at: '2026-08-27T00:00:00Z'
        }
      ]

      const resolved = resolveCategoriesWithSettings(
        [...mockGlobalCategories, ...mockCustomCategories],
        settings
      )

      // First should be dairy (sort_order 5)
      expect(resolved[0].id).toBe(3)
      expect(resolved[0].sort_order).toBe(5)
      expect(resolved[0].custom_name).toBe('Mleczarnia')

      // Second should be fruits_vegetables (default 10)
      expect(resolved[1].id).toBe(1)
      expect(resolved[1].sort_order).toBe(10)

      // Third should be bakery (custom 15, hidden)
      expect(resolved[2].id).toBe(2)
      expect(resolved[2].sort_order).toBe(15)
      expect(resolved[2].is_hidden).toBe(true)

      // Fourth should be meat_fish (default 40)
      expect(resolved[3].id).toBe(4)
      expect(resolved[3].sort_order).toBe(40)
    })

    it('identifies custom household categories and marks active items presence', () => {
      const activeIds = new Set<number>([101])
      const resolved = resolveCategoriesWithSettings(
        mockCustomCategories,
        [],
        activeIds
      )

      expect(resolved[0].is_global).toBe(false)
      expect(resolved[0].household_id).toBe('hh-123')
      expect(resolved[0].has_active_items).toBe(true)
      expect(resolved[1].has_active_items).toBe(false)
    })
  })

  describe('filterVisibleCategoriesForShopping & Safety Fallback', () => {
    it('filters out hidden categories when they have no active items', () => {
      const categories = [
        {
          id: 1,
          name: 'Cat 1',
          is_global: true,
          household_id: null,
          sort_order: 10,
          is_hidden: false,
          has_active_items: false
        },
        {
          id: 2,
          name: 'Cat 2',
          is_global: true,
          household_id: null,
          sort_order: 20,
          is_hidden: true,
          has_active_items: false
        }
      ]

      const visible = filterVisibleCategoriesForShopping(categories)
      expect(visible).toHaveLength(1)
      expect(visible[0].id).toBe(1)
    })

    it('preserves hidden categories when has_active_items is true (Supermarket Fallback)', () => {
      const categories = [
        {
          id: 1,
          name: 'Bakery',
          is_global: true,
          household_id: null,
          sort_order: 10,
          is_hidden: true, // hidden by user in settings
          has_active_items: true // BUT user has bread on the active shopping list!
        }
      ]

      const visible = filterVisibleCategoriesForShopping(categories)
      expect(visible).toHaveLength(1)
      expect(visible[0].id).toBe(1)
      expect(visible[0].is_hidden).toBe(true)
      expect(visible[0].has_active_items).toBe(true)
    })
  })

  describe('calculateSparseIntervals', () => {
    it('produces sequential 10-step intervals for ordered category IDs', () => {
      const ordered = [3, 1, 4, 2]
      const intervals = calculateSparseIntervals(ordered)

      expect(intervals).toEqual([
        { category_id: 3, custom_sort_order: 10 },
        { category_id: 1, custom_sort_order: 20 },
        { category_id: 4, custom_sort_order: 30 },
        { category_id: 2, custom_sort_order: 40 }
      ])
    })
  })

  describe('validateCategoryName', () => {
    const existing = [
      { id: 1, name: 'Fruits & Vegetables' },
      { id: 2, name: 'Bakery' },
      { id: 101, name: 'Asian Market' }
    ]

    it('rejects empty or whitespace names', () => {
      expect(validateCategoryName('', existing)).toEqual({ valid: false, error: 'empty' })
      expect(validateCategoryName('   ', existing)).toEqual({ valid: false, error: 'empty' })
    })

    it('rejects names shorter than 2 characters', () => {
      expect(validateCategoryName('A', existing)).toEqual({ valid: false, error: 'too_short' })
    })

    it('rejects names longer than 40 characters', () => {
      const longName = 'A'.repeat(41)
      expect(validateCategoryName(longName, existing)).toEqual({ valid: false, error: 'too_long' })
    })

    it('rejects case-insensitive duplicate names', () => {
      expect(validateCategoryName('bakery', existing)).toEqual({ valid: false, error: 'duplicate' })
      expect(validateCategoryName('  ASIAN MARKET  ', existing)).toEqual({ valid: false, error: 'duplicate' })
    })

    it('allows keeping current name when editing existing category', () => {
      expect(validateCategoryName('Asian Market', existing, 101)).toEqual({ valid: true })
    })

    it('accepts valid unique category names', () => {
      expect(validateCategoryName('Frozen Foods', existing)).toEqual({ valid: true })
    })
  })

  describe('groupItemsByAisle', () => {
    it('groups and orders shopping list items according to custom aisle sort order', () => {
      const resolvedCategories = [
        {
          id: 1,
          name: 'Produce',
          is_global: true,
          household_id: null,
          sort_order: 20,
          is_hidden: false
        },
        {
          id: 2,
          name: 'Bakery',
          is_global: true,
          household_id: null,
          sort_order: 10, // Bakery is aisle #1
          is_hidden: false
        }
      ]

      const items = [
        { id: 'item-1', product: { category_id: 1, name: 'Apples' } },
        { id: 'item-2', product: { category_id: 2, name: 'Croissant' } },
        { id: 'item-3', product: { category_id: 1, name: 'Bananas' } },
        { id: 'item-4', product: { category_id: null, name: 'Batteries' } }
      ]

      const aisles = groupItemsByAisle(items, resolvedCategories, 'Inne')

      expect(aisles).toHaveLength(3)
      // Aisle 1: Bakery (sort_order 10)
      expect(aisles[0].name).toBe('Bakery')
      expect(aisles[0].items).toHaveLength(1)
      expect(aisles[0].items[0].id).toBe('item-2')

      // Aisle 2: Produce (sort_order 20)
      expect(aisles[1].name).toBe('Produce')
      expect(aisles[1].items).toHaveLength(2)

      // Aisle 3: Uncategorized (sort_order 99999)
      expect(aisles[2].name).toBe('Inne')
      expect(aisles[2].items).toHaveLength(1)
    })

    it('prioritizes item.category_id override over item.product.category_id (temporary aisle override)', () => {
      const resolvedCategories = [
        { id: 1, name: 'Produce', is_global: true, household_id: null, sort_order: 10, is_hidden: false },
        { id: 5, name: 'Household / Chemicals', is_global: true, household_id: null, sort_order: 50, is_hidden: false }
      ]

      // Lemon has catalog category 1 (Produce), but temporary override category 5 (Household / Chemicals)
      const items = [
        {
          id: 'item-lemon',
          category_id: 5, // Temporary override from draft / ad-hoc!
          product: { category_id: 1, name: 'Lemon' }
        }
      ]

      const aisles = groupItemsByAisle(items, resolvedCategories, 'Inne')

      expect(aisles).toHaveLength(1)
      expect(aisles[0].name).toBe('Household / Chemicals')
      expect(aisles[0].categoryId).toBe(5)
      expect(aisles[0].items[0].id).toBe('item-lemon')
    })
  })
})
