import { describe, it, expect } from 'vitest';
import {
  calculateIngredientMacros,
  scaleIngredientQuantity,
  sumMacroNutrients,
  type MacroNutrients,
} from '../macroCalculations';

describe('Macro Calculations - Pure Business Logic & Scaling Flows', () => {
  describe('calculateIngredientMacros', () => {
    it('Flow 01: calculates accurate macros for weight-based ingredients in grams (per 100g)', () => {
      const per100g: MacroNutrients = {
        kcal: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
      };

      // 200g of chicken breast
      const result = calculateIngredientMacros(200, per100g, 'g');

      expect(result).toEqual({
        kcal: 330,
        protein: 62,
        carbs: 0,
        fat: 7.2,
      });
    });

    it('Flow 02: calculates accurate macros for liquid ingredients in milliliters (per 100ml)', () => {
      const per100ml: MacroNutrients = {
        kcal: 60,
        protein: 3.2,
        carbs: 4.8,
        fat: 3.2,
      };

      // 250ml of milk
      const result = calculateIngredientMacros(250, per100ml, 'ml');

      expect(result).toEqual({
        kcal: 150,
        protein: 8,
        carbs: 12,
        fat: 8,
      });
    });

    it('Flow 03: calculates accurate macros for piece-based ingredients (per 1 piece)', () => {
      const per1Piece: MacroNutrients = {
        kcal: 75,
        protein: 6.3,
        carbs: 0.6,
        fat: 5.3,
      };

      // 3 eggs
      const result = calculateIngredientMacros(3, per1Piece, 'pcs');

      expect(result).toEqual({
        kcal: 225,
        protein: 18.9,
        carbs: 1.8,
        fat: 15.9,
      });
    });

    it('Flow 04: returns zeroed macros when ingredient quantity is zero or negative', () => {
      const per100g: MacroNutrients = {
        kcal: 200,
        protein: 10,
        carbs: 20,
        fat: 5,
      };

      expect(calculateIngredientMacros(0, per100g, 'g')).toEqual({
        kcal: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });

      expect(calculateIngredientMacros(-50, per100g, 'g')).toEqual({
        kcal: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });
    });
  });

  describe('scaleIngredientQuantity', () => {
    it('Flow 05: scales ingredient quantity up proportionally when target calories exceed base calories', () => {
      // Base: 100g in 500 kcal meal -> Target: 750 kcal meal (factor 1.5)
      const scaled = scaleIngredientQuantity(100, 500, 750);
      expect(scaled).toBe(150);
    });

    it('Flow 06: scales ingredient quantity down proportionally when target calories are lower than base calories', () => {
      // Base: 200g in 800 kcal meal -> Target: 400 kcal meal (factor 0.5)
      const scaled = scaleIngredientQuantity(200, 800, 400);
      expect(scaled).toBe(100);
    });

    it('Flow 07: safely returns base quantity when base or target calories are invalid or zero', () => {
      expect(scaleIngredientQuantity(150, 0, 500)).toBe(150);
      expect(scaleIngredientQuantity(150, 500, 0)).toBe(150);
    });
  });

  describe('sumMacroNutrients', () => {
    it('Flow 08: sums multiple ingredient macros into a combined meal total', () => {
      const items: MacroNutrients[] = [
        { kcal: 330, protein: 62, carbs: 0, fat: 7.2 },
        { kcal: 150, protein: 8, carbs: 12, fat: 8 },
        { kcal: 225, protein: 18.9, carbs: 1.8, fat: 15.9 },
      ];

      const total = sumMacroNutrients(items);

      expect(total).toEqual({
        kcal: 705,
        protein: 88.9,
        carbs: 13.8,
        fat: 31.1,
      });
    });

    it('Flow 09: returns zero totals when summing an empty list of ingredients', () => {
      expect(sumMacroNutrients([])).toEqual({
        kcal: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });
    });
  });
});
