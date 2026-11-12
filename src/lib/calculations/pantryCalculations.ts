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

export type ExpiryStatusLevel = 'expired' | 'expiring_soon' | 'upcoming' | 'ok' | 'none'

export interface ExpiryStatusResult {
  level: ExpiryStatusLevel
  daysRemaining: number | null
  isAlert: boolean
  badgeClass: string
  messageKey: string
}

/**
 * Evaluates optional expiration_date against today's calendar date.
 * - diffDays < 0: expired (red alert)
 * - 0 <= diffDays <= 1 (< 48h): expiring_soon ("Kończy się termin" red alert)
 * - 2 <= diffDays <= 7: upcoming (amber badge)
 * - diffDays > 7: ok (emerald/subtle badge)
 */
export function calculateExpiryStatus(
  expirationDate?: string | null,
  now: Date = new Date()
): ExpiryStatusResult {
  if (!expirationDate) {
    return { level: 'none', daysRemaining: null, isAlert: false, badgeClass: '', messageKey: '' }
  }

  const datePart = expirationDate.trim().slice(0, 10)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart)
  if (!match) {
    return { level: 'none', daysRemaining: null, isAlert: false, badgeClass: '', messageKey: '' }
  }

  const expiryUtcMidnight = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  const todayUtcMidnight = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((expiryUtcMidnight - todayUtcMidnight) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return {
      level: 'expired',
      daysRemaining: diffDays,
      isAlert: true,
      badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/35',
      messageKey: 'pantry.expiry.expired'
    }
  }

  if (diffDays <= 1) {
    return {
      level: 'expiring_soon',
      daysRemaining: diffDays,
      isAlert: true,
      badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/35',
      messageKey: 'pantry.expiry.expiringSoon'
    }
  }

  if (diffDays <= 7) {
    return {
      level: 'upcoming',
      daysRemaining: diffDays,
      isAlert: false,
      badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      messageKey: 'pantry.expiry.upcoming'
    }
  }

  return {
    level: 'ok',
    daysRemaining: diffDays,
    isAlert: false,
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    messageKey: 'pantry.expiry.validUntil'
  }
}

/**
 * Sorts pantry items by soonest expiration date ascending; items without an
 * expiration date appear at the end sorted alphabetically by product name.
 */
export function sortPantryItemsByExpiry(items: PantryItemWithDetails[]): PantryItemWithDetails[] {
  return [...items].sort((a, b) => {
    const expA = a.expiration_date ? a.expiration_date.slice(0, 10) : null
    const expB = b.expiration_date ? b.expiration_date.slice(0, 10) : null

    if (expA && expB) {
      const cmp = expA.localeCompare(expB)
      if (cmp !== 0) return cmp
    } else if (expA) {
      return -1
    } else if (expB) {
      return 1
    }

    const nameA = (a.product?.name || a.ad_hoc_name || '').toLowerCase()
    const nameB = (b.product?.name || b.ad_hoc_name || '').toLowerCase()
    return nameA.localeCompare(nameB)
  })
}

type UnitFamily = 'weight' | 'volume' | 'pieces'

interface UnitSpec {
  family: UnitFamily
  factorToBase: number // g (weight), ml (volume), pcs (pieces)
}

const UNIT_SPECS: Record<string, UnitSpec> = {
  g: { family: 'weight', factorToBase: 1 },
  dag: { family: 'weight', factorToBase: 10 },
  kg: { family: 'weight', factorToBase: 1000 },
  ml: { family: 'volume', factorToBase: 1 },
  l: { family: 'volume', factorToBase: 1000 },
  pcs: { family: 'pieces', factorToBase: 1 },
  szt: { family: 'pieces', factorToBase: 1 }
}

function normalizeUnit(unit?: string | null): string {
  return (unit || 'pcs').trim().toLowerCase()
}

/**
 * Checks whether two units belong to the same physical measurement family
 * (weight: g/dag/kg, volume: ml/l, pieces: pcs/szt).
 */
export function areUnitsCompatible(unitA?: string | null, unitB?: string | null): boolean {
  const a = normalizeUnit(unitA)
  const b = normalizeUnit(unitB)
  if (a === b) return true
  const specA = UNIT_SPECS[a]
  const specB = UNIT_SPECS[b]
  if (!specA || !specB) return false
  return specA.family === specB.family
}

/**
 * Converts a quantity from `fromUnit` into `toUnit` within compatible unit families.
 * Returns `null` when units are incompatible (e.g., pcs -> g).
 */
export function convertQuantity(
  quantity: number,
  fromUnit?: string | null,
  toUnit?: string | null
): number | null {
  const numericQty = Number(quantity) || 0
  const from = normalizeUnit(fromUnit)
  const to = normalizeUnit(toUnit)
  if (from === to) return numericQty

  const specFrom = UNIT_SPECS[from]
  const specTo = UNIT_SPECS[to]
  if (!specFrom || !specTo || specFrom.family !== specTo.family) {
    return null
  }

  const converted = (numericQty * specFrom.factorToBase) / specTo.factorToBase
  return Math.round(converted * 10000) / 10000
}

/**
 * Calculates remaining quantity to buy if pantry provides partial stock,
 * automatically converting between compatible units (e.g., 0.5 l vs 250 ml, 1 kg vs 500 g).
 */
export function calculatePartialDelta(
  neededQuantity: number,
  pantryQuantity: number,
  neededUnit?: string | null,
  pantryUnit?: string | null
): number {
  const safeNeeded = Number(neededQuantity) || 0
  const safePantry = Number(pantryQuantity) || 0

  let effectivePantry = safePantry
  if (neededUnit && pantryUnit) {
    const converted = convertQuantity(safePantry, pantryUnit, neededUnit)
    if (converted === null) {
      // Incompatible units cannot subtract against each other
      return Math.round(Math.max(0, safeNeeded) * 10) / 10
    }
    effectivePantry = converted
  }

  const delta = safeNeeded - effectivePantry
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

  const totalQuantity = allItems.reduce((acc, curr) => {
    const converted = convertQuantity(Number(curr.quantity || 0), curr.unit_type || product.unit_type, product.unit_type)
    return acc + (converted ?? 0)
  }, 0)

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

