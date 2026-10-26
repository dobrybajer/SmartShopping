import type { PantryItemWithDetails } from '@/types/pantry'
import type { UnitEnum } from '@/types/supabase'

export type FreshnessLevel = 'fresh' | 'medium' | 'old' | 'unknown'

export interface FreshnessCalculationResult {
  level: FreshnessLevel
  colorClass: string // 'text-emerald-500', 'text-amber-500', 'text-rose-500', 'text-muted-foreground'
  badgeBgClass: string
  daysSincePurchase: number | null
  messageKey: string
  translationParams: {
    productName: string
    quantity: string
    date: string
    verifiedDate?: string
  }
}

/**
 * Evaluates purchase recency against category threshold rules:
 * - Food: <3 days (Green/fresh), 3-7 days (Orange/medium), >7 days (Red/old)
 * - Non-Food / Household: <14 days (Green/fresh), 14-28 days (Orange/medium), >28 days (Red/old)
 *
 * Adheres strictly to ADR-003 English purity: pure calculations emit semantic keys
 * and raw interpolation parameters, delegating localized string formatting to the UI layer.
 */
export function calculatePantryFreshness(
  lastPurchasedAt: string | null | undefined,
  isNonFood: boolean,
  productName: string,
  quantityStr: string,
  lastVerifiedAt?: string | null,
  now: Date = new Date()
): FreshnessCalculationResult {
  if (!lastPurchasedAt) {
    const translationParams: FreshnessCalculationResult['translationParams'] = {
      productName,
      quantity: quantityStr,
      date: ''
    }

    if (lastVerifiedAt) {
      const verifiedDateObj = new Date(lastVerifiedAt)
      if (!isNaN(verifiedDateObj.getTime())) {
        translationParams.verifiedDate = verifiedDateObj.toISOString().split('T')[0]
      }
    }

    return {
      level: 'unknown',
      colorClass: 'text-muted-foreground',
      badgeBgClass: 'bg-muted border-border',
      daysSincePurchase: null,
      messageKey: 'pantry.freshness.unknown',
      translationParams
    }
  }

  const purchaseDate = new Date(lastPurchasedAt)
  if (isNaN(purchaseDate.getTime())) {
    return {
      level: 'unknown',
      colorClass: 'text-muted-foreground',
      badgeBgClass: 'bg-muted border-border',
      daysSincePurchase: null,
      messageKey: 'pantry.freshness.unknown',
      translationParams: {
        productName,
        quantity: quantityStr,
        date: ''
      }
    }
  }

  const diffMs = now.getTime() - purchaseDate.getTime()
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  const formattedDate = purchaseDate.toISOString().split('T')[0]

  let level: FreshnessLevel = 'fresh'

  if (isNonFood) {
    if (diffDays < 14) {
      level = 'fresh'
    } else if (diffDays <= 28) {
      level = 'medium'
    } else {
      level = 'old'
    }
  } else {
    if (diffDays < 3) {
      level = 'fresh'
    } else if (diffDays <= 7) {
      level = 'medium'
    } else {
      level = 'old'
    }
  }

  const colorClass =
    level === 'fresh'
      ? 'text-emerald-500'
      : level === 'medium'
      ? 'text-amber-500'
      : 'text-rose-500'

  const badgeBgClass =
    level === 'fresh'
      ? 'bg-emerald-500/10 border-emerald-500/30'
      : level === 'medium'
      ? 'bg-amber-500/10 border-amber-500/30'
      : 'bg-rose-500/10 border-rose-500/30'

  const translationParams: FreshnessCalculationResult['translationParams'] = {
    productName,
    quantity: quantityStr,
    date: formattedDate
  }

  if (lastVerifiedAt) {
    const verifiedDateObj = new Date(lastVerifiedAt)
    if (!isNaN(verifiedDateObj.getTime())) {
      translationParams.verifiedDate = verifiedDateObj.toISOString().split('T')[0]
    }
  }

  return {
    level,
    colorClass,
    badgeBgClass,
    daysSincePurchase: diffDays,
    messageKey: `pantry.freshness.${level}`,
    translationParams
  }
}

/**
 * Calculates remaining quantity to buy if pantry provides partial stock.
 */
export function calculatePartialDelta(neededQuantity: number, pantryQuantity: number): number {
  const delta = neededQuantity - pantryQuantity
  if (delta <= 0) return 0
  return Math.round(delta * 10) / 10
}

export interface HierarchicalPantryMatch {
  isInPantry: boolean
  totalQuantity: number
  unitType: UnitEnum
  isHierarchical: boolean
  matchingItems: Array<{
    item: PantryItemWithDetails
    freshness: FreshnessCalculationResult
  }>
}

/**
 * Checks domestic pantry availability with 2-level hierarchy support.
 * For general products, aggregates all child variants in stock with individual freshness status.
 */
export function matchHierarchicalPantry(
  product: { id: string; name: string; unit_type: UnitEnum; is_general?: boolean } | null | undefined,
  pantryMapByProductId: Record<string, PantryItemWithDetails>,
  pantryItemsByParentId: Record<string, PantryItemWithDetails[]> = {}
): HierarchicalPantryMatch {
  if (!product) {
    return {
      isInPantry: false,
      totalQuantity: 0,
      unitType: 'pcs',
      isHierarchical: false,
      matchingItems: []
    }
  }

  const allItems: PantryItemWithDetails[] = []
  const seenIds = new Set<string>()

  // 1. Direct match on product.id
  const directItem = pantryMapByProductId[product.id]
  if (directItem && !seenIds.has(directItem.id)) {
    allItems.push(directItem)
    seenIds.add(directItem.id)
  }

  // 2. If product is general, gather all specific children in pantry
  let isHierarchical = false
  if (product.is_general) {
    const childItems = pantryItemsByParentId[product.id] || []
    if (childItems.length > 0) {
      isHierarchical = true
      for (const child of childItems) {
        if (!seenIds.has(child.id)) {
          allItems.push(child)
          seenIds.add(child.id)
        }
      }
    }
  }

  const totalQuantity = allItems.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0)

  return {
    isInPantry: allItems.length > 0,
    totalQuantity: Math.round(totalQuantity * 10) / 10,
    unitType: product.unit_type,
    isHierarchical,
    matchingItems: allItems.map((item) => ({
      item,
      freshness: calculatePantryFreshness(
        item.last_purchased_at,
        !!(item.category?.is_non_food || item.product?.category?.is_non_food),
        item.product?.name || item.ad_hoc_name || product.name,
        `${item.quantity} ${item.unit_type}`,
        item.last_verified_at
      )
    }))
  }
}

