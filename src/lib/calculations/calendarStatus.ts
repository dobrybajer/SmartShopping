import type { MealPlanItem, MealStatusDetails, DayMacroSummary, MissingIngredient, MealPlanStatus } from '@/types/calendar'
import type { DraftItem, AddToDraftPayload } from '@/store/useShoppingStore'
import type { Database } from '@/types/supabase'
import type { PantryItem, PantryItemWithDetails } from '@/types/pantry'
import { convertQuantity } from '@/lib/calculations/pantryCalculations'
import { calculateIngredientMacros, sumMacroNutrients, resolveEffectiveIngredientMacros } from '@/lib/calculations/macroCalculations'

type ShoppingListItemRow = Database['public']['Tables']['shopping_list_items']['Row']
type PantryEntry = PantryItem | PantryItemWithDetails

export type PantryProductMap = ReadonlyMap<string, PantryEntry> | Record<string, PantryEntry>
export type PantryParentMap = ReadonlyMap<string, PantryEntry[]> | Record<string, PantryEntry[]>

export interface CalculateStatusOptions {
  pantryItems?: PantryEntry[]
  pantryMapByProductId?: PantryProductMap
  pantryItemsByParentId?: PantryParentMap
  availablePantryStock?: Map<string, number>
  draftItems?: DraftItem[]
  activeListItems?: ShoppingListItemRow[]
  archivedListItems?: ShoppingListItemRow[]
  isPastDate?: boolean
  linkedDraft?: DraftItem[]
  linkedActive?: ShoppingListItemRow[]
  linkedArchived?: ShoppingListItemRow[]
}

function getPantryByProduct(
  map: PantryProductMap | undefined,
  productId: string
): PantryEntry | undefined {
  if (!map) return undefined
  if (map instanceof Map) return map.get(productId)
  return (map as Record<string, PantryEntry | undefined>)[productId]
}

function getPantryByParent(
  map: PantryParentMap | undefined,
  parentId: string
): PantryEntry[] {
  if (!map) return []
  if (map instanceof Map) return map.get(parentId) || []
  return (map as Record<string, PantryEntry[] | undefined>)[parentId] || []
}

function hasMapEntries(
  map: PantryProductMap | PantryParentMap | undefined
): boolean {
  if (!map) return false
  if (map instanceof Map) return map.size > 0
  return Object.keys(map).length > 0
}

function buildPantryIndices(
  pantryItems: PantryEntry[] = [],
  existingProductMap?: PantryProductMap,
  existingParentMap?: PantryParentMap
): { byProduct: PantryProductMap; byParent: PantryParentMap } {
  if (
    existingProductMap &&
    existingParentMap &&
    (hasMapEntries(existingProductMap) || pantryItems.length === 0)
  ) {
    return { byProduct: existingProductMap, byParent: existingParentMap }
  }

  const byProduct = new Map<string, PantryEntry>()
  const byParent = new Map<string, PantryEntry[]>()

  for (const item of pantryItems) {
    if (item.product_id && !byProduct.has(item.product_id)) {
      byProduct.set(item.product_id, item)
    }
    if ('product' in item && item.product?.parent_id) {
      const parentId = item.product.parent_id
      const list = byParent.get(parentId)
      if (list) list.push(item)
      else byParent.set(parentId, [item])
    }
  }

  return {
    byProduct: hasMapEntries(existingProductMap) ? existingProductMap! : byProduct,
    byParent: hasMapEntries(existingParentMap) ? existingParentMap! : byParent
  }
}

function getEntryStockKey(entry: PantryEntry): string {
  return entry.id || entry.product_id || ''
}

function getRemainingEntryQty(
  entry: PantryEntry,
  availablePantryStock?: Map<string, number>
): number {
  const baseQty = entry.quantity || 0
  if (!availablePantryStock) return baseQty
  const key = getEntryStockKey(entry)
  if (!key) return baseQty
  const cached = availablePantryStock.get(key)
  return cached !== undefined ? cached : baseQty
}

/**
 * Resolves total stocked quantity (supporting general/child pantry hierarchy) in `targetUnit`
 * and optionally reserves `requiredQty` from `availablePantryStock` when fully covered.
 */
function resolveAndMaybeConsumePantryStock(
  productId: string,
  isGeneral: boolean | undefined,
  targetUnit: PantryEntry['unit_type'],
  requiredQty: number,
  byProduct: PantryProductMap,
  byParent: PantryParentMap,
  availablePantryStock?: Map<string, number>,
  consumeIfCovered = false
): number {
  const directPantry = getPantryByProduct(byProduct, productId)
  const directConverted = directPantry
    ? (convertQuantity(getRemainingEntryQty(directPantry, availablePantryStock), directPantry.unit_type, targetUnit) ?? 0)
    : 0

  const childEntries = isGeneral ? getPantryByParent(byParent, productId) : []
  let childConverted = 0
  if (childEntries.length > 0) {
    for (const child of childEntries) {
      childConverted +=
        convertQuantity(getRemainingEntryQty(child, availablePantryStock), child.unit_type, targetUnit) ?? 0
    }
  }

  const useDirect = directConverted >= childConverted
  const maxStock = useDirect ? directConverted : childConverted

  if (consumeIfCovered && availablePantryStock && maxStock >= requiredQty && requiredQty > 0) {
    const entriesToConsume = useDirect ? (directPantry ? [directPantry] : []) : childEntries
    let remainingToReserve = requiredQty

    for (const entry of entriesToConsume) {
      if (remainingToReserve <= 0) break
      const key = getEntryStockKey(entry)
      if (!key) continue
      const currentNative = getRemainingEntryQty(entry, availablePantryStock)
      const currentTarget = convertQuantity(currentNative, entry.unit_type, targetUnit) ?? 0
      if (currentTarget <= 0) continue

      const takeTarget = Math.min(remainingToReserve, currentTarget)
      const ratio = currentTarget > 0 ? takeTarget / currentTarget : 0
      const nextNative = Math.max(0, currentNative - currentNative * ratio)
      availablePantryStock.set(key, nextNative)
      remainingToReserve = Math.max(0, remainingToReserve - takeTarget)
    }
  }

  return maxStock
}

/**
 * Computes the effective ingredient multiplier for a planned meal.
 * If `target_kcal` (> 0) is specified on a recipe meal whose base 1-serving kcal > 0,
 * scales proportionally (`target_kcal / baseKcal`); otherwise falls back to `servings` (default 1).
 */
export function getEffectiveMultiplier(planItem: MealPlanItem): number {
  const defaultServings = planItem.servings > 0 ? planItem.servings : 1
  if (planItem.is_ad_hoc || !planItem.meal || !planItem.meal.ingredients || planItem.meal.ingredients.length === 0) {
    return defaultServings
  }

  if (planItem.target_kcal && planItem.target_kcal > 0) {
    let baseKcal = 0
    for (const ing of planItem.meal.ingredients) {
      if (!ing.product) continue
      const effective = resolveEffectiveIngredientMacros(ing.product, ing.reference_product)
      const macros = calculateIngredientMacros(
        ing.base_quantity,
        effective.macros,
        ing.product.unit_type
      )
      baseKcal += macros.kcal
    }
    if (baseKcal > 0) {
      return planItem.target_kcal / baseKcal
    }
  }

  return defaultServings
}

/**
 * Calculates detailed shopping and pantry lifecycle status for a single planned meal item.
 * Evaluates whether ingredients are:
 * - In pantry (ADR-008 stock check or is_pantry_item flag)
 * - In draft shopping cart
 * - On active shopping list (unbought or bought)
 * - Missing / Uncertain (item was previously entered into shopping pipeline but deleted before buying)
 */
export function calculateMealPlanStatus(
  planItem: MealPlanItem,
  options: CalculateStatusOptions = {}
): MealStatusDetails {
  const {
    pantryItems = [],
    pantryMapByProductId,
    pantryItemsByParentId,
    availablePantryStock,
    draftItems = [],
    activeListItems = [],
    archivedListItems = [],
    isPastDate = false,
    linkedDraft: preLinkedDraft,
    linkedActive: preLinkedActive,
    linkedArchived: preLinkedArchived
  } = options

  // 1. Ad-Hoc dishes or meals without recipe ingredients
  if (planItem.is_ad_hoc || !planItem.meal || !planItem.meal.ingredients || planItem.meal.ingredients.length === 0) {
    const status: MealPlanStatus = isPastDate ? 'bought' : 'planned'
    return {
      status,
      totalIngredients: 0,
      boughtCount: 0,
      inListCount: 0,
      inDraftCount: 0,
      pantryCoveredCount: 0,
      missingIngredients: []
    }
  }

  const validIngredients = planItem.meal.ingredients.filter((ing) => !!ing.product && !!ing.product_id)
  const totalIngredients = validIngredients.length

  if (totalIngredients === 0) {
    const status: MealPlanStatus = isPastDate ? 'bought' : 'planned'
    return {
      status,
      totalIngredients: 0,
      boughtCount: 0,
      inListCount: 0,
      inDraftCount: 0,
      pantryCoveredCount: 0,
      missingIngredients: []
    }
  }

  // Use pre-grouped pipeline lists when available, otherwise filter locally
  const linkedDraft = preLinkedDraft ?? draftItems.filter((d) => d.meal_plan_item_id === planItem.id)
  const linkedActive = preLinkedActive ?? activeListItems.filter((item) => item.meal_plan_item_id === planItem.id)
  const linkedArchived =
    preLinkedArchived ?? archivedListItems.filter((item) => item.meal_plan_item_id === planItem.id)

  const hasEnteredPipeline = linkedDraft.length > 0 || linkedActive.length > 0 || linkedArchived.length > 0

  const { byProduct, byParent } = buildPantryIndices(
    pantryItems,
    pantryMapByProductId,
    pantryItemsByParentId
  )

  let boughtCount = 0
  let inListCount = 0
  let inDraftCount = 0
  let pantryCoveredCount = 0
  const missingIngredients: MissingIngredient[] = []

  const multiplier = getEffectiveMultiplier(planItem)

  for (const ing of validIngredients) {
    const productId = ing.product_id!
    const product = ing.product!
    const requiredQty = ing.base_quantity * multiplier

    // Check if on archived list (completed / bought or covered by pantry)
    const archivedItem = linkedArchived.find(
      (item) => item.product_id === productId && (item.is_checked || item.in_pantry)
    )
    if (archivedItem) {
      if (archivedItem.is_checked) {
        boughtCount++
      } else {
        pantryCoveredCount++
      }
      continue
    }

    // Check if on active list
    const activeItem = linkedActive.find((item) => item.product_id === productId)
    if (activeItem) {
      if (activeItem.is_checked) {
        boughtCount++
      } else if (activeItem.in_pantry) {
        pantryCoveredCount++
      } else {
        inListCount++
      }
      continue
    }

    // Check if in draft cart
    const draftItem = linkedDraft.find((item) => item.product_id === productId)
    if (draftItem) {
      inDraftCount++
      continue
    }

    // Check if covered by pantry (unit-aware conversion + cumulative reservation when enabled)
    let isPantryStocked = ing.is_pantry_item === true
    if (!isPantryStocked) {
      const stockedQty = resolveAndMaybeConsumePantryStock(
        productId,
        product.is_general,
        product.unit_type,
        requiredQty,
        byProduct,
        byParent,
        availablePantryStock,
        !isPastDate && Boolean(availablePantryStock)
      )
      isPantryStocked = stockedQty >= requiredQty
    }

    if (isPantryStocked) {
      pantryCoveredCount++
      continue
    }

    // If the meal already entered the shopping pipeline but this ingredient is nowhere to be found,
    // it was deleted or lost -> mark as missing!
    if (hasEnteredPipeline) {
      missingIngredients.push({
        productId,
        productName: product.name,
        requiredQuantity: requiredQty,
        unitType: product.unit_type
      })
    }
  }

  // Determine overall status
  let status: MealPlanStatus = 'planned'

  if (isPastDate) {
    status = 'bought'
  } else if (missingIngredients.length > 0 && !planItem.is_uncertainty_dismissed) {
    // ⚠️ Uncertainty flag
    status = 'uncertain'
  } else if (!hasEnteredPipeline) {
    // If not sent to shopping yet, but 100% covered by pantry
    if (pantryCoveredCount === totalIngredients) {
      status = 'bought'
    } else {
      status = 'planned'
    }
  } else {
    // Pipeline is clean without missing items (or missing items were acknowledged)
    const satisfiedCount = boughtCount + pantryCoveredCount
    const effectiveTotal = planItem.is_uncertainty_dismissed
      ? Math.max(0, totalIngredients - missingIngredients.length)
      : totalIngredients

    if (effectiveTotal > 0 && satisfiedCount >= effectiveTotal) {
      status = 'bought'
    } else if (inListCount > 0) {
      status = 'in_list'
    } else if (inDraftCount > 0) {
      status = 'in_draft'
    } else {
      status = 'planned'
    }
  }

  return {
    status,
    totalIngredients,
    boughtCount,
    inListCount,
    inDraftCount,
    pantryCoveredCount,
    missingIngredients
  }
}

/**
 * Calculates sum of nutritional values (kcal, protein, carbs, fat) for all planned dishes in a day.
 */
export function calculateDayMacros(planItems: MealPlanItem[]): DayMacroSummary {
  const allIngredientMacros = []

  for (const item of planItems) {
    if (item.is_ad_hoc || !item.meal || !item.meal.ingredients) {
      if (item.target_kcal && item.target_kcal > 0) {
        allIngredientMacros.push({
          kcal: item.target_kcal,
          protein: 0,
          carbs: 0,
          fat: 0
        })
      }
      continue
    }

    const multiplier = getEffectiveMultiplier(item)

    for (const ing of item.meal.ingredients) {
      if (!ing.product) continue

      const product = ing.product
      const scaledQuantity = ing.base_quantity * multiplier
      const effective = resolveEffectiveIngredientMacros(product, ing.reference_product)

      const macros = calculateIngredientMacros(
        scaledQuantity,
        effective.macros,
        product.unit_type
      )

      allIngredientMacros.push(macros)
    }
  }

  const totals = sumMacroNutrients(allIngredientMacros)

  return {
    kcal: Math.round(totals.kcal),
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10
  }
}

/**
 * Precomputes statuses for an array of MealPlanItems in a single O(N) pass:
 * groups pipeline links once and reserves pantry stock cumulatively across non-past dates.
 */
export function calculateMealPlanStatusesMap(
  plans: MealPlanItem[],
  options: Omit<CalculateStatusOptions, 'plan' | 'isPastDate' | 'linkedDraft' | 'linkedActive' | 'linkedArchived'>,
  todayISO: string
): Map<string, MealStatusDetails> {
  const result = new Map<string, MealStatusDetails>()
  if (plans.length === 0) return result

  const draftByPlanId = new Map<string, DraftItem[]>()
  for (const d of options.draftItems || []) {
    if (!d.meal_plan_item_id) continue
    const list = draftByPlanId.get(d.meal_plan_item_id)
    if (list) list.push(d)
    else draftByPlanId.set(d.meal_plan_item_id, [d])
  }

  const activeByPlanId = new Map<string, ShoppingListItemRow[]>()
  for (const a of options.activeListItems || []) {
    if (!a.meal_plan_item_id) continue
    const list = activeByPlanId.get(a.meal_plan_item_id)
    if (list) list.push(a)
    else activeByPlanId.set(a.meal_plan_item_id, [a])
  }

  const archivedByPlanId = new Map<string, ShoppingListItemRow[]>()
  for (const ar of options.archivedListItems || []) {
    if (!ar.meal_plan_item_id) continue
    const list = archivedByPlanId.get(ar.meal_plan_item_id)
    if (list) list.push(ar)
    else archivedByPlanId.set(ar.meal_plan_item_id, [ar])
  }

  const { byProduct, byParent } = buildPantryIndices(
    options.pantryItems,
    options.pantryMapByProductId,
    options.pantryItemsByParentId
  )
  const availablePantryStock = options.availablePantryStock ?? new Map<string, number>()

  const sortedPlans = [...plans].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  })

  for (const plan of sortedPlans) {
    const isPastDate = plan.date < todayISO
    const statusDetails = calculateMealPlanStatus(plan, {
      pantryItems: options.pantryItems,
      pantryMapByProductId: byProduct,
      pantryItemsByParentId: byParent,
      availablePantryStock,
      isPastDate,
      linkedDraft: draftByPlanId.get(plan.id) || [],
      linkedActive: activeByPlanId.get(plan.id) || [],
      linkedArchived: archivedByPlanId.get(plan.id) || []
    })
    result.set(plan.id, statusDetails)
  }

  return result
}

/**
 * Generates AddToDraftPayload items from a MealPlanItem to send to the shopping cart.
 * Optionally filters out ingredients that are already secured in the domestic pantry.
 */
export function generateDraftItemsFromMealPlan(
  planItem: MealPlanItem,
  options: {
    excludePantryItems?: boolean
    pantryItems?: PantryEntry[]
    pantryMapByProductId?: PantryProductMap
    pantryItemsByParentId?: PantryParentMap
    availablePantryStock?: Map<string, number>
    dayLabel?: string
  } = {}
): AddToDraftPayload[] {
  const {
    excludePantryItems = true,
    pantryItems = [],
    pantryMapByProductId,
    pantryItemsByParentId,
    availablePantryStock,
    dayLabel = ''
  } = options

  if (planItem.is_ad_hoc || !planItem.meal || !planItem.meal.ingredients) {
    return []
  }

  const { byProduct, byParent } = excludePantryItems
    ? buildPantryIndices(pantryItems, pantryMapByProductId, pantryItemsByParentId)
    : { byProduct: new Map<string, PantryEntry>(), byParent: new Map<string, PantryEntry[]>() }

  const multiplier = getEffectiveMultiplier(planItem)
  const mealName = planItem.meal.name || planItem.custom_name || 'Posiłek'
  const sourceLabel = dayLabel ? `${dayLabel} · ${mealName}` : mealName

  const draftPayloads: AddToDraftPayload[] = []

  for (const ing of planItem.meal.ingredients) {
    if (!ing.product || !ing.product_id) continue

    const product = ing.product
    const requiredQty = ing.base_quantity * multiplier

    // Skip if pantry item flag is set or stocked in domestic pantry
    if (excludePantryItems) {
      if (ing.is_pantry_item === true) continue
      const stocked = resolveAndMaybeConsumePantryStock(
        ing.product_id,
        product.is_general,
        product.unit_type,
        requiredQty,
        byProduct,
        byParent,
        availablePantryStock,
        Boolean(availablePantryStock)
      )
      if (stocked >= requiredQty) continue
    }

    draftPayloads.push({
      product_id: ing.product_id,
      name: product.name,
      unit_type: product.unit_type,
      category_id: product.category_id ?? undefined,
      category_name: undefined,
      quantity: Math.round(requiredQty * 10) / 10,
      is_ad_hoc: false,
      meal_source: sourceLabel,
      meal_plan_item_id: planItem.id
    })
  }

  return draftPayloads
}

/**
 * Generates batched AddToDraftPayload items across multiple MealPlanItems (e.g., whole day or week),
 * sharing cumulative pantry stock reservations so two meals needing the same pantry ingredient do not double-count stock.
 */
export function generateDraftItemsFromMealPlans(
  plans: MealPlanItem[],
  options: {
    excludePantryItems?: boolean
    pantryItems?: PantryEntry[]
    pantryMapByProductId?: PantryProductMap
    pantryItemsByParentId?: PantryParentMap
  } = {}
): AddToDraftPayload[] {
  if (plans.length === 0) return []

  const excludePantryItems = options.excludePantryItems ?? true
  const { byProduct, byParent } = excludePantryItems
    ? buildPantryIndices(
        options.pantryItems,
        options.pantryMapByProductId,
        options.pantryItemsByParentId
      )
    : { byProduct: new Map<string, PantryEntry>(), byParent: new Map<string, PantryEntry[]>() }

  const availablePantryStock = new Map<string, number>()
  const sortedPlans = [...plans].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  })

  const allPayloads: AddToDraftPayload[] = []
  for (const plan of sortedPlans) {
    const items = generateDraftItemsFromMealPlan(plan, {
      excludePantryItems,
      pantryItems: options.pantryItems,
      pantryMapByProductId: byProduct,
      pantryItemsByParentId: byParent,
      availablePantryStock,
      dayLabel: plan.date
    })
    allPayloads.push(...items)
  }

  return allPayloads
}
