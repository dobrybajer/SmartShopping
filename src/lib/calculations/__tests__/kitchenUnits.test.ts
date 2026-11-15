import { describe, expect, it } from 'vitest'
import {
  convertKitchenUnitToBaseQuantity,
  formatKitchenUnitConversionPreview,
  getAvailableKitchenUnitsForProduct,
  KITCHEN_UNIT_FACTORS
} from '../kitchenUnits'
import { areUnitsCompatible, convertQuantity } from '../pantryCalculations'
import { normalizeUnitAndQuantity } from '../../recipeJsonImport'

describe('LOW-11: Kitchen Units Conversion Engine', () => {
  it('Flow 01: defines standard kitchen conversion factors (cup=250, tbsp=15, tsp=5, pinch=1)', () => {
    expect(KITCHEN_UNIT_FACTORS.cup).toBe(250)
    expect(KITCHEN_UNIT_FACTORS.tbsp).toBe(15)
    expect(KITCHEN_UNIT_FACTORS.tsp).toBe(5)
    expect(KITCHEN_UNIT_FACTORS.pinch).toBe(1)
  })

  it('Flow 02: returns compatible kitchen units for weight (g), volume (ml), and pieces (pcs)', () => {
    const weightUnits = getAvailableKitchenUnitsForProduct('g').map((u) => u.unit)
    expect(weightUnits).toEqual(['g', 'tbsp', 'tsp', 'cup', 'pinch', 'dag', 'kg'])

    const volumeUnits = getAvailableKitchenUnitsForProduct('ml').map((u) => u.unit)
    expect(volumeUnits).toEqual(['ml', 'tbsp', 'tsp', 'cup', 'l'])

    const pieceUnits = getAvailableKitchenUnitsForProduct('pcs').map((u) => u.unit)
    expect(pieceUnits).toEqual(['pcs'])
  })

  it('Flow 03: converts kitchen measures into canonical g and ml quantities accurately', () => {
    expect(convertKitchenUnitToBaseQuantity(2, 'tbsp', 'g')).toBe(30)
    expect(convertKitchenUnitToBaseQuantity(3, 'tsp', 'g')).toBe(15)
    expect(convertKitchenUnitToBaseQuantity(1.5, 'cup', 'ml')).toBe(375)
    expect(convertKitchenUnitToBaseQuantity(2, 'pinch', 'g')).toBe(2)
    expect(convertKitchenUnitToBaseQuantity(0.5, 'kg', 'g')).toBe(500)
    expect(convertKitchenUnitToBaseQuantity(4, 'pcs', 'pcs')).toBe(4)
  })

  it('Flow 04: computes live conversion preview metadata for recipe ingredient form', () => {
    expect(formatKitchenUnitConversionPreview(2, 'tbsp', 'g')).toEqual({
      baseQuantity: 30,
      baseUnit: 'g',
      isConverted: true
    })

    expect(formatKitchenUnitConversionPreview(100, 'g', 'g')).toEqual({
      baseQuantity: 100,
      baseUnit: 'g',
      isConverted: false
    })
  })

  it('Flow 05: integrates with pantryCalculations (areUnitsCompatible & convertQuantity) and JSON import', () => {
    expect(areUnitsCompatible('tbsp', 'g')).toBe(true)
    expect(areUnitsCompatible('łyżka', 'ml')).toBe(true)
    expect(areUnitsCompatible('szklanka', 'ml')).toBe(true)
    expect(areUnitsCompatible('szczypta', 'g')).toBe(true)
    expect(areUnitsCompatible('tbsp', 'pcs')).toBe(false)

    expect(convertQuantity(2, 'tbsp', 'g')).toBe(30)
    expect(convertQuantity(1, 'szklanka', 'ml')).toBe(250)
    expect(convertQuantity(3, 'łyżeczka', 'g')).toBe(15)
    expect(convertQuantity(2, 'szczypta', 'g')).toBe(2)

    expect(normalizeUnitAndQuantity(2, 'szczypta')).toEqual({
      quantity: 2,
      unit: 'g',
      isValidUnit: true
    })
  })
})
