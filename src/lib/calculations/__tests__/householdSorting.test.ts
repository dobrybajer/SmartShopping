import { describe, it, expect } from 'vitest'
import {
  sortHouseholdsWithDefault,
  reorderHouseholdsList
} from '../householdSorting'
import type { Household } from '@/services/householdService'

describe('householdSorting Calculations', () => {
  const households: Household[] = [
    { id: 'hh-1', name: 'Dom Główny', created_at: '2026-08-01' },
    { id: 'hh-2', name: 'Domek Letniskowy', created_at: '2026-08-05' },
    { id: 'hh-3', name: 'Biuro', created_at: '2026-08-10' },
    { id: 'hh-4', name: 'Garaż', created_at: '2026-08-15' }
  ]

  describe('sortHouseholdsWithDefault', () => {
    it('returns empty array if input is empty or undefined', () => {
      expect(sortHouseholdsWithDefault([])).toEqual([])
    })

    it('returns single household as is', () => {
      expect(sortHouseholdsWithDefault([households[0]], 'hh-1')).toEqual([households[0]])
    })

    it('always places default household at index 0', () => {
      // hh-3 is default
      const sorted = sortHouseholdsWithDefault(households, 'hh-3')
      expect(sorted[0].id).toBe('hh-3')
      expect(sorted.map((h) => h.id)).toEqual(['hh-3', 'hh-1', 'hh-2', 'hh-4'])
    })

    it('respects custom order for non-default households while keeping default at top', () => {
      // hh-2 is default, custom order requested: hh-4, hh-3, hh-1
      const customOrder = ['hh-4', 'hh-3', 'hh-1', 'hh-2']
      const sorted = sortHouseholdsWithDefault(households, 'hh-2', customOrder)

      expect(sorted[0].id).toBe('hh-2')
      expect(sorted[1].id).toBe('hh-4')
      expect(sorted[2].id).toBe('hh-3')
      expect(sorted[3].id).toBe('hh-1')
    })

    it('handles when defaultHouseholdId is null or not found in list', () => {
      const customOrder = ['hh-3', 'hh-1', 'hh-4', 'hh-2']
      const sorted = sortHouseholdsWithDefault(households, null, customOrder)

      expect(sorted.map((h) => h.id)).toEqual(['hh-3', 'hh-1', 'hh-4', 'hh-2'])
    })
  })

  describe('reorderHouseholdsList', () => {
    it('returns original list if startIndex is equal to dropIndex or out of bounds', () => {
      expect(reorderHouseholdsList(households, 1, 1, 'hh-1')).toBe(households)
      expect(reorderHouseholdsList(households, -1, 2, 'hh-1')).toBe(households)
      expect(reorderHouseholdsList(households, 1, 99, 'hh-1')).toBe(households)
    })

    it('prevents dragging the default household away from index 0', () => {
      // hh-1 is default at index 0. User tries to drag it to index 2
      const result = reorderHouseholdsList(households, 0, 2, 'hh-1')
      expect(result).toBe(households)
    })

    it('clamps drop to index 1 if user drops onto index 0, keeping default at index 0', () => {
      // List: [hh-1 (def), hh-2, hh-3, hh-4]
      // Drag hh-4 (index 3) to index 0
      const result = reorderHouseholdsList(households, 3, 0, 'hh-1')

      expect(result[0].id).toBe('hh-1') // default stays at top
      expect(result[1].id).toBe('hh-4') // hh-4 inserted right below default
      expect(result[2].id).toBe('hh-2')
      expect(result[3].id).toBe('hh-3')
    })

    it('reorders non-default items freely between each other', () => {
      // List: [hh-1 (def), hh-2, hh-3, hh-4]
      // Drag hh-3 (index 2) to index 1 (above hh-2)
      const result = reorderHouseholdsList(households, 2, 1, 'hh-1')

      expect(result.map((h) => h.id)).toEqual(['hh-1', 'hh-3', 'hh-2', 'hh-4'])
    })
  })
})
