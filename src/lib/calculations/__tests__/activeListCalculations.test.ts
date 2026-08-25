import { describe, it, expect } from 'vitest'
import {
  sortActiveLists,
  calculateActiveListMetrics,
  findDefaultOrFirstListId,
  findTargetTransferListId
} from '../activeListCalculations'
import type { ShoppingListSummary } from '@/services/shoppingListService'

describe('activeListCalculations', () => {
  describe('sortActiveLists', () => {
    it('places default list first, then orders by updated_at descending', () => {
      const lists: ShoppingListSummary[] = [
        {
          id: 'list-1',
          household_id: 'h1',
          name: 'Old List',
          status: 'active',
          is_default: false,
          target_date: null,
          created_at: '2026-08-20T10:00:00Z',
          updated_at: '2026-08-20T10:00:00Z',
          total_items: 2,
          unchecked_items: 1
        },
        {
          id: 'list-2',
          household_id: 'h1',
          name: 'Recent List',
          status: 'active',
          is_default: false,
          target_date: null,
          created_at: '2026-08-25T10:00:00Z',
          updated_at: '2026-08-25T12:00:00Z',
          total_items: 5,
          unchecked_items: 3
        },
        {
          id: 'list-default',
          household_id: 'h1',
          name: 'Default Groceries',
          status: 'active',
          is_default: true,
          target_date: null,
          created_at: '2026-08-15T10:00:00Z',
          updated_at: '2026-08-15T10:00:00Z',
          total_items: 10,
          unchecked_items: 4
        }
      ]

      const sorted = sortActiveLists(lists)
      expect(sorted[0].id).toBe('list-default')
      expect(sorted[1].id).toBe('list-2')
      expect(sorted[2].id).toBe('list-1')
    })
  })

  describe('calculateActiveListMetrics', () => {
    it('computes correct total, checked, unchecked, and percentage', () => {
      const items = [
        { is_checked: true },
        { is_checked: true },
        { is_checked: false },
        { is_checked: false }
      ]

      const metrics = calculateActiveListMetrics(items)
      expect(metrics).toEqual({
        totalItems: 4,
        checkedItems: 2,
        uncheckedItems: 2,
        progressPercentage: 50
      })
    })

    it('handles empty list gracefully', () => {
      const metrics = calculateActiveListMetrics([])
      expect(metrics).toEqual({
        totalItems: 0,
        checkedItems: 0,
        uncheckedItems: 0,
        progressPercentage: 0
      })
    })
  })

  describe('findDefaultOrFirstListId', () => {
    it('returns default list id if present', () => {
      const lists: ShoppingListSummary[] = [
        {
          id: '1',
          household_id: 'h1',
          name: 'List 1',
          status: 'active',
          is_default: false,
          target_date: null,
          created_at: '2026-08-20T10:00:00Z',
          updated_at: '2026-08-20T10:00:00Z',
          total_items: 0,
          unchecked_items: 0
        },
        {
          id: 'def',
          household_id: 'h1',
          name: 'Default',
          status: 'active',
          is_default: true,
          target_date: null,
          created_at: '2026-08-10T10:00:00Z',
          updated_at: '2026-08-10T10:00:00Z',
          total_items: 0,
          unchecked_items: 0
        }
      ]

      expect(findDefaultOrFirstListId(lists)).toBe('def')
    })

    it('returns first list id if no default list exists', () => {
      const lists: ShoppingListSummary[] = [
        {
          id: 'list-a',
          household_id: 'h1',
          name: 'List A',
          status: 'active',
          is_default: false,
          target_date: null,
          created_at: '2026-08-20T10:00:00Z',
          updated_at: '2026-08-20T10:00:00Z',
          total_items: 0,
          unchecked_items: 0
        }
      ]

      expect(findDefaultOrFirstListId(lists)).toBe('list-a')
    })

    it('returns null for empty lists', () => {
      expect(findDefaultOrFirstListId([])).toBeNull()
    })
  })

  describe('findTargetTransferListId - Transfer Priority (Default > Last Selected > First)', () => {
    it('priority 1: selects default list even if another list was actively selected', () => {
      const lists: ShoppingListSummary[] = [
        {
          id: 'list-selected',
          household_id: 'h1',
          name: 'Last Viewed List',
          status: 'active',
          is_default: false,
          target_date: null,
          created_at: '2026-08-20T10:00:00Z',
          updated_at: '2026-08-25T10:00:00Z',
          total_items: 2,
          unchecked_items: 2
        },
        {
          id: 'list-default',
          household_id: 'h1',
          name: 'Default Groceries',
          status: 'active',
          is_default: true,
          target_date: null,
          created_at: '2026-08-10T10:00:00Z',
          updated_at: '2026-08-10T10:00:00Z',
          total_items: 5,
          unchecked_items: 3
        }
      ]

      // Even though 'list-selected' is passed as selectedActiveListId, default list must win
      expect(findTargetTransferListId(lists, 'list-selected')).toBe('list-default')
    })

    it('priority 2: selects last selected list if no default list exists', () => {
      const lists: ShoppingListSummary[] = [
        {
          id: 'list-1',
          household_id: 'h1',
          name: 'List 1',
          status: 'active',
          is_default: false,
          target_date: null,
          created_at: '2026-08-20T10:00:00Z',
          updated_at: '2026-08-20T10:00:00Z',
          total_items: 0,
          unchecked_items: 0
        },
        {
          id: 'list-selected',
          household_id: 'h1',
          name: 'List Selected',
          status: 'active',
          is_default: false,
          target_date: null,
          created_at: '2026-08-22T10:00:00Z',
          updated_at: '2026-08-22T10:00:00Z',
          total_items: 0,
          unchecked_items: 0
        }
      ]

      expect(findTargetTransferListId(lists, 'list-selected')).toBe('list-selected')
    })

    it('priority 3: selects first list if no default exists and selected id is null or not found', () => {
      const lists: ShoppingListSummary[] = [
        {
          id: 'list-recent',
          household_id: 'h1',
          name: 'Recent List',
          status: 'active',
          is_default: false,
          target_date: null,
          created_at: '2026-08-20T10:00:00Z',
          updated_at: '2026-08-26T10:00:00Z',
          total_items: 0,
          unchecked_items: 0
        },
        {
          id: 'list-old',
          household_id: 'h1',
          name: 'Old List',
          status: 'active',
          is_default: false,
          target_date: null,
          created_at: '2026-08-10T10:00:00Z',
          updated_at: '2026-08-10T10:00:00Z',
          total_items: 0,
          unchecked_items: 0
        }
      ]

      expect(findTargetTransferListId(lists, null)).toBe('list-recent')
      expect(findTargetTransferListId(lists, 'non-existing-id')).toBe('list-recent')
    })

    it('returns null for empty lists', () => {
      expect(findTargetTransferListId([], 'list-1')).toBeNull()
    })
  })
})
