import type { Household } from '@/services/householdService'

/**
 * Pure calculation function to sort households.
 * Requirement: The default household MUST always be at the very top (index 0).
 * Remaining households follow the custom order (if provided) or their natural order.
 */
export function sortHouseholdsWithDefault(
  households: Household[],
  defaultHouseholdId?: string | null,
  customOrderIds?: string[]
): Household[] {
  if (!households || households.length <= 1) {
    return households || []
  }

  const defaultH = households.find((h) => h.id === defaultHouseholdId)
  const otherH = households.filter((h) => h.id !== defaultHouseholdId)

  if (customOrderIds && customOrderIds.length > 0) {
    const orderMap = new Map<string, number>()
    customOrderIds.forEach((id, index) => orderMap.set(id, index))

    otherH.sort((a, b) => {
      const orderA = orderMap.has(a.id) ? orderMap.get(a.id)! : 99999
      const orderB = orderMap.has(b.id) ? orderMap.get(b.id)! : 99999
      return orderA - orderB
    })
  }

  return defaultH ? [defaultH, ...otherH] : otherH
}

/**
 * Calculates a new list of households after dragging from startIndex to dropIndex.
 * Enforces rule: Default household is locked at index 0 and cannot be moved or displaced from top.
 */
export function reorderHouseholdsList(
  currentHouseholds: Household[],
  startIndex: number,
  dropIndex: number,
  defaultHouseholdId?: string | null
): Household[] {
  if (
    !currentHouseholds ||
    currentHouseholds.length <= 1 ||
    startIndex === dropIndex ||
    startIndex < 0 ||
    dropIndex < 0 ||
    startIndex >= currentHouseholds.length ||
    dropIndex >= currentHouseholds.length
  ) {
    return currentHouseholds || []
  }

  // If attempting to drag the default household away from index 0, reject
  const isStartDefault = currentHouseholds[startIndex]?.id === defaultHouseholdId
  if (isStartDefault) {
    return currentHouseholds
  }

  // If dropping onto index 0, clamp to index 1 to keep default at top
  const effectiveDropIndex = dropIndex === 0 ? 1 : dropIndex

  const updated = [...currentHouseholds]
  const [moved] = updated.splice(startIndex, 1)
  updated.splice(effectiveDropIndex, 0, moved)

  // Re-sort with default guaranteed at index 0
  return sortHouseholdsWithDefault(
    updated,
    defaultHouseholdId,
    updated.map((h) => h.id)
  )
}
