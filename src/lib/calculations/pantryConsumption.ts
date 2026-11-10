import type { PantryItemWithDetails } from '@/types/pantry'
import type { UnitEnum } from '@/types/supabase'
import { convertQuantity } from '@/lib/calculations/pantryCalculations'

export interface CookableIngredientInput {
  productId: string
  productName: string
  requiredQuantity: number
  unitType: UnitEnum
  isGeneral?: boolean
}

export interface PantryDeductionPlanItem {
  pantryItemId: string
  productId: string | null
  productName: string
  unitType: UnitEnum
  currentStock: number
  deductQuantity: number
  remainingStock: number
  willDeplete: boolean
}

export interface PantryDeductionUpdate {
  pantryItemId: string
  newQuantity: number
}

export interface MealIngredientLike {
  product_id?: string | null
  base_quantity: number
  product?: {
    name: string
    unit_type: UnitEnum
    is_general?: boolean
  } | null
}

/**
 * Normalizes a recipe or calendar meal's ingredient rows into cookable inputs
 * scaled by the active multiplier (servings or calorie scaling factor).
 */
export function buildCookableIngredientsFromMeal(
  ingredients?: MealIngredientLike[] | null,
  multiplier: number = 1
): CookableIngredientInput[] {
  if (!ingredients || ingredients.length === 0) return []
  const safeMultiplier = multiplier > 0 ? multiplier : 1
  return ingredients
    .filter(
      (
        ing
      ): ing is MealIngredientLike & {
        product_id: string
        product: NonNullable<MealIngredientLike['product']>
      } => Boolean(ing.product_id && ing.product)
    )
    .map((ing) => ({
      productId: ing.product_id,
      productName: ing.product.name,
      requiredQuantity: ing.base_quantity * safeMultiplier,
      unitType: ing.product.unit_type,
      isGeneral: ing.product.is_general
    }))
}

function roundToOneDecimal(val: number): number {
  return Math.round(val * 10) / 10
}

/**
 * Calculates how much stock to deduct from existing pantry items when a meal is cooked.
 * Supports unit conversions (e.g., g <-> kg, ml <-> l) and FIFO consumption across child variants
 * of hierarchical general products.
 */
export function calculateMealPantryDeductions(
  ingredients: CookableIngredientInput[],
  pantryMapByProductId: Record<string, PantryItemWithDetails>,
  pantryItemsByParentId: Record<string, PantryItemWithDetails[]> = {}
): PantryDeductionPlanItem[] {
  const remainingByPantryId = new Map<string, number>()
  const deductionByPantryId = new Map<string, PantryDeductionPlanItem>()

  const getAvailableStock = (item: PantryItemWithDetails): number => {
    if (!remainingByPantryId.has(item.id)) {
      remainingByPantryId.set(item.id, Math.max(0, Number(item.quantity || 0)))
    }
    return remainingByPantryId.get(item.id) ?? 0
  }

  const consumeFromPantryItem = (
    item: PantryItemWithDetails,
    neededInIngredientUnit: number,
    ingredientUnit: UnitEnum,
    fallbackName: string
  ): number => {
    const availableInPantryUnit = getAvailableStock(item)
    if (availableInPantryUnit <= 0 || neededInIngredientUnit <= 0) return 0

    const neededInPantryUnit = convertQuantity(
      neededInIngredientUnit,
      ingredientUnit,
      item.unit_type
    )
    if (neededInPantryUnit === null || neededInPantryUnit <= 0) return 0

    const takenInPantryUnit = Math.min(availableInPantryUnit, neededInPantryUnit)
    const nextStock = Math.max(0, roundToOneDecimal(availableInPantryUnit - takenInPantryUnit))
    remainingByPantryId.set(item.id, nextStock)

    const existingPlan = deductionByPantryId.get(item.id)
    const baseInitialStock = existingPlan
      ? existingPlan.currentStock
      : roundToOneDecimal(Number(item.quantity || 0))
    const totalDeducted = roundToOneDecimal(
      (existingPlan ? existingPlan.deductQuantity : 0) + takenInPantryUnit
    )

    deductionByPantryId.set(item.id, {
      pantryItemId: item.id,
      productId: item.product_id,
      productName: item.product?.name || item.ad_hoc_name || fallbackName,
      unitType: item.unit_type,
      currentStock: baseInitialStock,
      deductQuantity: Math.min(baseInitialStock, totalDeducted),
      remainingStock: nextStock,
      willDeplete: nextStock <= 0
    })

    const consumedInIngredientUnit = convertQuantity(
      takenInPantryUnit,
      item.unit_type,
      ingredientUnit
    )
    return consumedInIngredientUnit ?? 0
  }

  for (const ing of ingredients) {
    let remainingNeed = Math.max(0, Number(ing.requiredQuantity || 0))
    if (!ing.productId || remainingNeed <= 0) continue

    const directItem = pantryMapByProductId[ing.productId]
    if (directItem) {
      const consumed = consumeFromPantryItem(
        directItem,
        remainingNeed,
        ing.unitType,
        ing.productName
      )
      remainingNeed = Math.max(0, remainingNeed - consumed)
    }

    if (remainingNeed > 0 && ing.isGeneral) {
      const children = [...(pantryItemsByParentId[ing.productId] || [])].sort((a, b) => {
        const timeA = a.last_purchased_at ? new Date(a.last_purchased_at).getTime() : 0
        const timeB = b.last_purchased_at ? new Date(b.last_purchased_at).getTime() : 0
        return timeA - timeB
      })

      for (const child of children) {
        if (remainingNeed <= 0) break
        if (directItem && child.id === directItem.id) continue
        const consumed = consumeFromPantryItem(
          child,
          remainingNeed,
          ing.unitType,
          ing.productName
        )
        remainingNeed = Math.max(0, remainingNeed - consumed)
      }
    }
  }

  return Array.from(deductionByPantryId.values())
}
