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
