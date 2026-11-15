import {
  calculateIngredientMacros,
  resolveEffectiveIngredientMacros
} from '@/lib/calculations/macroCalculations'
import type {
  AddToDraftPayload,
  DraftItem,
  MealWithIngredients
} from '@/store/useShoppingStore'

/**
 * Scales a meal's non-pantry ingredients by targetKcal (if provided) and merges them into the draft items array.
 */
export function appendMealToDraftItems(
  currentDraft: DraftItem[],
  meal: MealWithIngredients,
  targetKcal?: number
): DraftItem[] {
  let baseKcalTotal = 0
  meal.ingredients.forEach((ing) => {
    if (ing.product) {
      const effective = resolveEffectiveIngredientMacros(ing.product, ing.reference_product)
      const macros = calculateIngredientMacros(
        ing.base_quantity,
        effective.macros,
        ing.product.unit_type
      )
      baseKcalTotal += macros.kcal
    }
  })

  let multiplier = 1
  if (targetKcal && targetKcal > 0 && baseKcalTotal > 0) {
    multiplier = targetKcal / baseKcalTotal
  }

  const updatedDraft = [...currentDraft]

  meal.ingredients.forEach((ing) => {
    if (ing.is_pantry_item) return
    if (!ing.product) return

    const scaledQuantity = Math.round(ing.base_quantity * multiplier * 10) / 10

    const existingIndex = updatedDraft.findIndex(
      (d) => d.product_id === ing.product_id && !d.is_ad_hoc
    )

    if (existingIndex >= 0) {
      updatedDraft[existingIndex] = {
        ...updatedDraft[existingIndex],
        quantity: Math.round((updatedDraft[existingIndex].quantity + scaledQuantity) * 10) / 10
      }
    } else {
      updatedDraft.push({
        id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        product_id: ing.product.id,
        name: ing.product.name,
        unit_type: ing.product.unit_type,
        category_id: ing.product.category_id || undefined,
        category_name: 'other',
        sort_order: 99,
        quantity: scaledQuantity,
        is_ad_hoc: false,
        meal_source: meal.name
      })
    }
  })

  return updatedDraft
}

/**
 * Merges a single catalog or ad-hoc item into a mutable draft items array in-place.
 */
function mutateDraftWithSingleItem(draft: DraftItem[], item: AddToDraftPayload): void {
  const isAdHoc = !!item.is_ad_hoc || !item.product_id
  const targetPlanId = item.meal_plan_item_id || null

  if (!isAdHoc && item.product_id) {
    const existingIndex = draft.findIndex(
      (d) =>
        d.product_id === item.product_id &&
        !d.is_ad_hoc &&
        (d.meal_plan_item_id || null) === targetPlanId
    )

    if (existingIndex >= 0) {
      const existing = draft[existingIndex]
      const shouldAdoptCategory =
        (!existing.category_id || existing.category_name === 'other') && !!item.category_id
      draft[existingIndex] = {
        ...existing,
        quantity: Math.round((existing.quantity + item.quantity) * 10) / 10,
        category_id: shouldAdoptCategory ? item.category_id : existing.category_id,
        category_name:
          shouldAdoptCategory && item.category_name ? item.category_name : existing.category_name,
        sort_order:
          shouldAdoptCategory && item.sort_order !== undefined
            ? item.sort_order
            : existing.sort_order,
        meal_source: existing.meal_source || item.meal_source,
        meal_plan_item_id: existing.meal_plan_item_id || targetPlanId
      }
    } else {
      draft.push({
        id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        product_id: item.product_id,
        name: item.name,
        unit_type: item.unit_type,
        category_id: item.category_id,
        category_name: item.category_name || 'other',
        sort_order: item.sort_order ?? 99,
        quantity: item.quantity,
        is_ad_hoc: false,
        meal_source: item.meal_source,
        meal_plan_item_id: targetPlanId
      })
    }
  } else {
    const existingIndex = draft.findIndex(
      (d) =>
        d.is_ad_hoc &&
        d.name.toLowerCase() === item.name.toLowerCase() &&
        d.unit_type === item.unit_type &&
        (d.meal_plan_item_id || null) === targetPlanId
    )

    if (existingIndex >= 0) {
      const existing = draft[existingIndex]
      const shouldAdoptCategory =
        (!existing.category_id || existing.category_name === 'other') && !!item.category_id
      draft[existingIndex] = {
        ...existing,
        quantity: Math.round((existing.quantity + item.quantity) * 10) / 10,
        category_id: shouldAdoptCategory ? item.category_id : existing.category_id,
        category_name:
          shouldAdoptCategory && item.category_name ? item.category_name : existing.category_name,
        sort_order:
          shouldAdoptCategory && item.sort_order !== undefined
            ? item.sort_order
            : existing.sort_order,
        meal_source: existing.meal_source || item.meal_source,
        meal_plan_item_id: existing.meal_plan_item_id || targetPlanId
      }
    } else {
      draft.push({
        id: `adhoc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        product_id: item.product_id,
        name: item.name,
        unit_type: item.unit_type,
        category_id: item.category_id,
        category_name: item.category_name || 'other',
        sort_order: item.sort_order ?? 99,
        quantity: item.quantity,
        is_ad_hoc: true,
        meal_source: item.meal_source,
        meal_plan_item_id: targetPlanId
      })
    }
  }
}

export function appendSingleItemToDraftItems(
  currentDraft: DraftItem[],
  item: AddToDraftPayload
): DraftItem[] {
  const nextDraft = [...currentDraft]
  mutateDraftWithSingleItem(nextDraft, item)
  return nextDraft
}

export function appendMultipleItemsToDraftItems(
  currentDraft: DraftItem[],
  items: AddToDraftPayload[]
): DraftItem[] {
  const nextDraft = [...currentDraft]
  for (const item of items) {
    mutateDraftWithSingleItem(nextDraft, item)
  }
  return nextDraft
}
