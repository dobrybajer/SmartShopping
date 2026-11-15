import type { UnitEnum } from '@/types/supabase'

export type KitchenUnit =
  | 'g'
  | 'ml'
  | 'pcs'
  | 'tbsp'
  | 'tsp'
  | 'cup'
  | 'pinch'
  | 'dag'
  | 'kg'
  | 'l'

export interface KitchenUnitOption {
  unit: KitchenUnit
  factorToBase: number
  targetBaseUnit: UnitEnum
  labelKey: string
}

/**
 * Conversion factors from kitchen/household units to base product units ('g', 'ml', 'pcs').
 * - 1 cup (szklanka) = 250 ml / 250 g
 * - 1 tbsp (łyżka stołowa) = 15 ml / 15 g
 * - 1 tsp (łyżeczka) = 5 ml / 5 g
 * - 1 pinch (szczypta) = 1 g / 1 ml
 * - 1 dag = 10 g
 * - 1 kg = 1000 g
 * - 1 l = 1000 ml
 */
export const KITCHEN_UNIT_FACTORS: Record<KitchenUnit, number> = {
  g: 1,
  ml: 1,
  pcs: 1,
  pinch: 1,
  tsp: 5,
  tbsp: 15,
  cup: 250,
  dag: 10,
  kg: 1000,
  l: 1000
}

const WEIGHT_KITCHEN_UNITS: KitchenUnitOption[] = [
  { unit: 'g', factorToBase: 1, targetBaseUnit: 'g', labelKey: 'units.g' },
  { unit: 'tbsp', factorToBase: 15, targetBaseUnit: 'g', labelKey: 'units.kitchen.tbspWeight' },
  { unit: 'tsp', factorToBase: 5, targetBaseUnit: 'g', labelKey: 'units.kitchen.tspWeight' },
  { unit: 'cup', factorToBase: 250, targetBaseUnit: 'g', labelKey: 'units.kitchen.cupWeight' },
  { unit: 'pinch', factorToBase: 1, targetBaseUnit: 'g', labelKey: 'units.kitchen.pinchWeight' },
  { unit: 'dag', factorToBase: 10, targetBaseUnit: 'g', labelKey: 'units.kitchen.dag' },
  { unit: 'kg', factorToBase: 1000, targetBaseUnit: 'g', labelKey: 'units.kitchen.kg' }
]

const VOLUME_KITCHEN_UNITS: KitchenUnitOption[] = [
  { unit: 'ml', factorToBase: 1, targetBaseUnit: 'ml', labelKey: 'units.ml' },
  { unit: 'tbsp', factorToBase: 15, targetBaseUnit: 'ml', labelKey: 'units.kitchen.tbspVolume' },
  { unit: 'tsp', factorToBase: 5, targetBaseUnit: 'ml', labelKey: 'units.kitchen.tspVolume' },
  { unit: 'cup', factorToBase: 250, targetBaseUnit: 'ml', labelKey: 'units.kitchen.cupVolume' },
  { unit: 'l', factorToBase: 1000, targetBaseUnit: 'ml', labelKey: 'units.kitchen.l' }
]

const PIECE_KITCHEN_UNITS: KitchenUnitOption[] = [
  { unit: 'pcs', factorToBase: 1, targetBaseUnit: 'pcs', labelKey: 'units.pcs_other' }
]

/**
 * Returns the list of compatible kitchen measurement units for a product's base unit_type.
 */
export function getAvailableKitchenUnitsForProduct(productUnitType: UnitEnum): KitchenUnitOption[] {
  if (productUnitType === 'g') return WEIGHT_KITCHEN_UNITS
  if (productUnitType === 'ml') return VOLUME_KITCHEN_UNITS
  return PIECE_KITCHEN_UNITS
}

/**
 * Converts a quantity expressed in a kitchen unit (e.g. 2 tbsp, 1.5 cup, 1 pinch)
 * into the product's canonical base unit ('g', 'ml', or 'pcs').
 */
export function convertKitchenUnitToBaseQuantity(
  inputQuantity: number,
  inputUnit: KitchenUnit,
  productUnitType: UnitEnum
): number {
  const numericQty = Number(inputQuantity)
  if (!Number.isFinite(numericQty) || numericQty <= 0) return 0

  if (productUnitType === 'pcs' || inputUnit === productUnitType) {
    return Math.round(numericQty * 100) / 100
  }

  const factor = KITCHEN_UNIT_FACTORS[inputUnit] ?? 1
  return Math.round(numericQty * factor * 100) / 100
}

/**
 * Computes conversion metadata for live UI preview in recipe ingredient forms.
 */
export function formatKitchenUnitConversionPreview(
  inputQuantity: number | '',
  inputUnit: KitchenUnit,
  productUnitType: UnitEnum
): {
  baseQuantity: number
  baseUnit: UnitEnum
  isConverted: boolean
} {
  const numeric = typeof inputQuantity === 'number' ? inputQuantity : Number(inputQuantity) || 0
  const baseQuantity = convertKitchenUnitToBaseQuantity(numeric, inputUnit, productUnitType)
  return {
    baseQuantity,
    baseUnit: productUnitType,
    isConverted: inputUnit !== productUnitType && baseQuantity > 0
  }
}
