import type { MealPlanItem, MealStatusDetails, DayMacroSummary, MissingIngredient, MealPlanStatus } from '@/types/calendar'
import type { DraftItem, AddToDraftPayload } from '@/store/useShoppingStore'
import type { Database } from '@/types/supabase'
import type { PantryItem } from '@/types/pantry'
import { calculateIngredientMacros, sumMacroNutrients } from '@/lib/calculations/macroCalculations'

type ShoppingListItemRow = Database['public']['Tables']['shopping_list_items']['Row']

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
  options: {
    pantryItems?: PantryItem[]
    draftItems?: DraftItem[]
    activeListItems?: ShoppingListItemRow[]
    archivedListItems?: ShoppingListItemRow[]
    isPastDate?: boolean
  } = {}
): MealStatusDetails {
  const {
    pantryItems = [],
    draftItems = [],
    activeListItems = [],
    archivedListItems = [],
    isPastDate = false
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

  // Pre-index items by product_id linked to this specific meal plan item
  const linkedDraft = draftItems.filter((d) => d.meal_plan_item_id === planItem.id)
  const linkedActive = activeListItems.filter((item) => item.meal_plan_item_id === planItem.id)
  const linkedArchived = archivedListItems.filter((item) => item.meal_plan_item_id === planItem.id)

  const hasEnteredPipeline = linkedDraft.length > 0 || linkedActive.length > 0 || linkedArchived.length > 0

  // Index pantry items by product_id
  const pantryMap = new Map<string, PantryItem>()
  for (const p of pantryItems) {
    if (p.product_id) {
      pantryMap.set(p.product_id, p)
    }
  }

  let boughtCount = 0
  let inListCount = 0
  let inDraftCount = 0
  let pantryCoveredCount = 0
  const missingIngredients: MissingIngredient[] = []

  for (const ing of validIngredients) {
    const productId = ing.product_id!
    const product = ing.product!
    const requiredQty = ing.base_quantity * (planItem.servings > 0 ? planItem.servings : 1)

    // Check if covered by pantry
    const isPantryStocked = ing.is_pantry_item === true || (pantryMap.get(productId)?.quantity ?? 0) >= requiredQty

    // Check if on archived list (completed / bought)
    const archivedItem = linkedArchived.find((item) => item.product_id === productId)
    if (archivedItem) {
      boughtCount++
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

    // If pantry covers it
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
  } else if (missingIngredients.length > 0) {
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
    // Pipeline is clean without missing items
    const satisfiedCount = boughtCount + pantryCoveredCount

    if (satisfiedCount === totalIngredients) {
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

    const multiplier = item.servings > 0 ? item.servings : 1

    for (const ing of item.meal.ingredients) {
      if (!ing.product) continue

      const product = ing.product
      const scaledQuantity = ing.base_quantity * multiplier

      const macros = calculateIngredientMacros(
        scaledQuantity,
        {
          kcal: Number(product.kcal_per_100) || 0,
          protein: Number(product.protein_per_100) || 0,
          carbs: Number(product.carbs_per_100) || 0,
          fat: Number(product.fat_per_100) || 0
        },
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
 * Generates AddToDraftPayload items from a MealPlanItem to send to the shopping cart.
 * Optionally filters out ingredients that are already secured in the domestic pantry.
 */
export function generateDraftItemsFromMealPlan(
  planItem: MealPlanItem,
  options: {
    excludePantryItems?: boolean
    pantryItems?: PantryItem[]
    dayLabel?: string
  } = {}
): AddToDraftPayload[] {
  const { excludePantryItems = true, pantryItems = [], dayLabel = '' } = options

  if (planItem.is_ad_hoc || !planItem.meal || !planItem.meal.ingredients) {
    return []
  }

  const pantryMap = new Map<string, PantryItem>()
  if (excludePantryItems) {
    for (const p of pantryItems) {
      if (p.product_id) {
        pantryMap.set(p.product_id, p)
      }
    }
  }

  const multiplier = planItem.servings > 0 ? planItem.servings : 1
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
      const stocked = pantryMap.get(ing.product_id)?.quantity ?? 0
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
