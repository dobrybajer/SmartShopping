import { describe, it, expect } from 'vitest'
import {
  calculatePantryFreshness,
  calculatePartialDelta,
  matchHierarchicalPantry
} from '../pantryCalculations'

describe('pantryCalculations - Pure Freshness & Age Heuristics (ADR-008)', () => {
  const baseNow = new Date('2026-10-05T12:00:00Z')

  describe('Food Category (<3d fresh, 3-7d medium, >7d old)', () => {
    it('returns "fresh" (emerald) for items purchased less than 3 days ago', () => {
      // 1 day ago
      const purchasedAt = '2026-10-04T12:00:00Z'
      const result = calculatePantryFreshness(purchasedAt, false, 'Mleko 3.2%', '1 szt.', null, baseNow)

      expect(result.level).toBe('fresh')
      expect(result.colorClass).toBe('text-emerald-500')
      expect(result.badgeBgClass).toContain('bg-emerald-500/10')
      expect(result.daysSincePurchase).toBe(1)
      expect(result.messageKey).toBe('pantry.freshness.fresh')
      expect(result.translationParams.date).toBe('2026-10-04')
      expect(result.translationParams.productName).toBe('Mleko 3.2%')
    })

    it('returns "medium" (amber) for items purchased between 3 and 7 days ago', () => {
      // Exactly 3 days ago
      const purchasedAt3d = '2026-10-02T12:00:00Z'
      const res3d = calculatePantryFreshness(purchasedAt3d, false, 'Jajka L', '10 szt.', null, baseNow)
      expect(res3d.level).toBe('medium')
      expect(res3d.colorClass).toBe('text-amber-500')
      expect(res3d.daysSincePurchase).toBe(3)
      expect(res3d.messageKey).toBe('pantry.freshness.medium')

      // 7 days ago
      const purchasedAt7d = '2026-09-28T12:00:00Z'
      const res7d = calculatePantryFreshness(purchasedAt7d, false, 'Jajka L', '10 szt.', null, baseNow)
      expect(res7d.level).toBe('medium')
      expect(res7d.daysSincePurchase).toBe(7)
    })

    it('returns "old" (rose) for items purchased more than 7 days ago', () => {
      // 8 days ago
      const purchasedAt8d = '2026-09-27T12:00:00Z'
      const res8d = calculatePantryFreshness(purchasedAt8d, false, 'Szynka', '200 g', null, baseNow)
      expect(res8d.level).toBe('old')
      expect(res8d.colorClass).toBe('text-rose-500')
      expect(res8d.badgeBgClass).toContain('bg-rose-500/10')
      expect(res8d.daysSincePurchase).toBe(8)
      expect(res8d.messageKey).toBe('pantry.freshness.old')
    })
  })

  describe('Non-Food Category (<14d fresh, 14-28d medium, >28d old)', () => {
    it('returns "fresh" for household/cleaning items purchased less than 14 days ago', () => {
      // 10 days ago
      const purchasedAt = '2026-09-25T12:00:00Z'
      const result = calculatePantryFreshness(purchasedAt, true, 'Tabletki do zmywarki', '50 szt.', null, baseNow)
      expect(result.level).toBe('fresh')
      expect(result.colorClass).toBe('text-emerald-500')
      expect(result.daysSincePurchase).toBe(10)
    })

    it('returns "medium" for non-food items purchased between 14 and 28 days ago', () => {
      // 20 days ago
      const purchasedAt = '2026-09-15T12:00:00Z'
      const result = calculatePantryFreshness(purchasedAt, true, 'Płyn do naczyń', '1 szt.', null, baseNow)
      expect(result.level).toBe('medium')
      expect(result.colorClass).toBe('text-amber-500')
      expect(result.daysSincePurchase).toBe(20)
      expect(result.messageKey).toBe('pantry.freshness.medium')
    })

    it('returns "old" for non-food items purchased more than 28 days ago', () => {
      // 35 days ago
      const purchasedAt = '2026-08-31T12:00:00Z'
      const result = calculatePantryFreshness(purchasedAt, true, 'Papier toaletowy', '8 szt.', null, baseNow)
      expect(result.level).toBe('old')
      expect(result.colorClass).toBe('text-rose-500')
      expect(result.daysSincePurchase).toBe(35)
      expect(result.messageKey).toBe('pantry.freshness.old')
    })
  })

  describe('Edge cases: null, invalid dates, and verification timestamps', () => {
    it('handles null or undefined purchase date gracefully with level "unknown"', () => {
      const resNull = calculatePantryFreshness(null, false, 'Cukier', '1 kg', null, baseNow)
      expect(resNull.level).toBe('unknown')
      expect(resNull.colorClass).toBe('text-muted-foreground')
      expect(resNull.daysSincePurchase).toBeNull()
      expect(resNull.messageKey).toBe('pantry.freshness.unknown')

      const resUndef = calculatePantryFreshness(undefined, false, 'Mąka', '1 kg', null, baseNow)
      expect(resUndef.level).toBe('unknown')
    })

    it('handles malformed date string gracefully', () => {
      const resInvalid = calculatePantryFreshness('not-a-date', false, 'Sól', '1 kg', null, baseNow)
      expect(resInvalid.level).toBe('unknown')
      expect(resInvalid.daysSincePurchase).toBeNull()
    })

    it('includes verifiedDate in translationParams when lastVerifiedAt is present', () => {
      const purchasedAt = '2026-09-20T12:00:00Z'
      const verifiedAt = '2026-10-04T10:00:00Z'
      const result = calculatePantryFreshness(purchasedAt, false, 'Kawa', '500 g', verifiedAt, baseNow)

      expect(result.translationParams.verifiedDate).toBe('2026-10-04')
      expect(result.translationParams.date).toBe('2026-09-20')
    })
  })

  describe('calculatePartialDelta', () => {
    it('returns remaining difference when needed is greater than in pantry', () => {
      expect(calculatePartialDelta(500, 200)).toBe(300)
      expect(calculatePartialDelta(2, 1)).toBe(1)
      expect(calculatePartialDelta(1.5, 0.5)).toBe(1)
    })

    it('returns 0 when pantry covers full or greater amount', () => {
      expect(calculatePartialDelta(500, 500)).toBe(0)
      expect(calculatePartialDelta(200, 500)).toBe(0)
    })
  })

  describe('matchHierarchicalPantry (ADR-010)', () => {
    it('Flow 01: returns exact match when product is directly in pantry', () => {
      const specificProduct = { id: 'prod-hass', name: 'Awokado Hass', unit_type: 'pcs' as const, is_general: false }
      const mockItem = {
        id: 'pantry-1',
        household_id: 'hh-1',
        product_id: 'prod-hass',
        quantity: 2,
        unit_type: 'pcs' as const,
        last_purchased_at: '2026-10-04T12:00:00Z',
        created_at: '2026-10-04T12:00:00Z',
        updated_at: '2026-10-04T12:00:00Z',
        category: null,
        product: null
      }

      const match = matchHierarchicalPantry(specificProduct, { 'prod-hass': mockItem as any }, {})
      expect(match.isInPantry).toBe(true)
      expect(match.totalQuantity).toBe(2)
      expect(match.isHierarchical).toBe(false)
      expect(match.matchingItems).toHaveLength(1)
    })

    it('Flow 02: aggregates all child items in pantry when product is general', () => {
      const generalProduct = { id: 'prod-general-avo', name: 'Awokado', unit_type: 'pcs' as const, is_general: true }
      const childItem1 = {
        id: 'pantry-1',
        household_id: 'hh-1',
        product_id: 'prod-hass',
        quantity: 2,
        unit_type: 'pcs' as const,
        last_purchased_at: '2026-10-04T12:00:00Z',
        created_at: '2026-10-04T12:00:00Z',
        updated_at: '2026-10-04T12:00:00Z',
        product: { id: 'prod-hass', name: 'Awokado Hass', unit_type: 'pcs' as const, category_id: 1, parent_id: 'prod-general-avo' }
      }
      const childItem2 = {
        id: 'pantry-2',
        household_id: 'hh-1',
        product_id: 'prod-green',
        quantity: 1,
        unit_type: 'pcs' as const,
        last_purchased_at: '2026-10-02T12:00:00Z',
        created_at: '2026-10-02T12:00:00Z',
        updated_at: '2026-10-02T12:00:00Z',
        product: { id: 'prod-green', name: 'Awokado Zielone', unit_type: 'pcs' as const, category_id: 1, parent_id: 'prod-general-avo' }
      }

      const byParent = {
        'prod-general-avo': [childItem1 as any, childItem2 as any]
      }

      const match = matchHierarchicalPantry(generalProduct, {}, byParent)
      expect(match.isInPantry).toBe(true)
      expect(match.totalQuantity).toBe(3)
      expect(match.isHierarchical).toBe(true)
      expect(match.matchingItems).toHaveLength(2)
      expect(match.matchingItems[0].item.product?.name).toBe('Awokado Hass')
      expect(match.matchingItems[1].item.product?.name).toBe('Awokado Zielone')
    })

    it('Flow 03: handles general product with no children in pantry gracefully', () => {
      const generalProduct = { id: 'prod-general-avo', name: 'Awokado', unit_type: 'pcs' as const, is_general: true }
      const match = matchHierarchicalPantry(generalProduct, {}, {})
      expect(match.isInPantry).toBe(false)
      expect(match.totalQuantity).toBe(0)
      expect(match.matchingItems).toHaveLength(0)
    })
  })
})
