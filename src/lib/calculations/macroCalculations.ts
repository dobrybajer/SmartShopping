import type { Database } from '@/types/supabase'

export interface MacroNutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface IngredientMacroInput {
  baseQuantity: number;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
}

export type ProductMacroSource = Pick<
  Database['public']['Tables']['products']['Row'],
  'kcal_per_100' | 'protein_per_100' | 'carbs_per_100' | 'fat_per_100' | 'is_general' | 'unit_type' | 'name'
>

export interface EffectiveIngredientMacrosResult {
  macros: MacroNutrients;
  isUncalculated: boolean;
  sourceProductName: string | null;
}

/**
 * Resolves effective macronutrients for an ingredient.
 * If product is general, extracts macros from referenceProduct.
 * If referenceProduct is missing, returns zero macros and flags uncalculated.
 */
export function resolveEffectiveIngredientMacros(
  product?: ProductMacroSource | null,
  referenceProduct?: ProductMacroSource | null
): EffectiveIngredientMacrosResult {
  if (!product) {
    return {
      macros: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      isUncalculated: true,
      sourceProductName: null,
    };
  }

  if (!product.is_general) {
    return {
      macros: {
        kcal: Number(product.kcal_per_100) || 0,
        protein: Number(product.protein_per_100) || 0,
        carbs: Number(product.carbs_per_100) || 0,
        fat: Number(product.fat_per_100) || 0,
      },
      isUncalculated: false,
      sourceProductName: product.name,
    };
  }

  if (referenceProduct) {
    return {
      macros: {
        kcal: Number(referenceProduct.kcal_per_100) || 0,
        protein: Number(referenceProduct.protein_per_100) || 0,
        carbs: Number(referenceProduct.carbs_per_100) || 0,
        fat: Number(referenceProduct.fat_per_100) || 0,
      },
      isUncalculated: false,
      sourceProductName: referenceProduct.name,
    };
  }

  return {
    macros: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    isUncalculated: true,
    sourceProductName: null,
  };
}

/**
 * Calculates the nutritional values for a given ingredient quantity.
 * For grams (g) and milliliters (ml), nutritional values are defined per 100 units.
 * For pieces (pcs), nutritional values are defined per 1 unit.
 */
export function calculateIngredientMacros(
  quantity: number,
  macrosPerUnitOr100: MacroNutrients,
  unitType: 'g' | 'ml' | 'pcs' = 'g'
): MacroNutrients {
  if (quantity <= 0) {
    return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  }

  const factor = unitType === 'pcs' ? quantity : quantity / 100;

  return {
    kcal: Math.round(macrosPerUnitOr100.kcal * factor * 10) / 10,
    protein: Math.round(macrosPerUnitOr100.protein * factor * 10) / 10,
    carbs: Math.round(macrosPerUnitOr100.carbs * factor * 10) / 10,
    fat: Math.round(macrosPerUnitOr100.fat * factor * 10) / 10,
  };
}

/**
 * Scales ingredient quantities proportionally based on target calories vs base recipe calories.
 */
export function scaleIngredientQuantity(
  baseQuantity: number,
  baseMealCalories: number,
  targetCalories: number
): number {
  if (baseMealCalories <= 0 || targetCalories <= 0) {
    return baseQuantity;
  }

  const multiplier = targetCalories / baseMealCalories;
  return Math.round(baseQuantity * multiplier * 10) / 10;
}

/**
 * Aggregates a list of macro nutrients into total sums.
 */
export function sumMacroNutrients(items: MacroNutrients[]): MacroNutrients {
  return items.reduce(
    (acc, curr) => ({
      kcal: Math.round((acc.kcal + curr.kcal) * 10) / 10,
      protein: Math.round((acc.protein + curr.protein) * 10) / 10,
      carbs: Math.round((acc.carbs + curr.carbs) * 10) / 10,
      fat: Math.round((acc.fat + curr.fat) * 10) / 10,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );
}
