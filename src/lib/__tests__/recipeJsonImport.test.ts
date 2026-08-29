import { describe, it, expect } from 'vitest'
import {
  validateRecipeJson,
  normalizeUnitAndQuantity,
  EXAMPLE_RECIPE_JSON_TEMPLATE
} from '../recipeJsonImport'

describe('Recipe JSON Import - Validation & Normalization Engine', () => {
  describe('normalizeUnitAndQuantity', () => {
    it('Flow 01: preserves standard units g, ml, pcs as-is', () => {
      expect(normalizeUnitAndQuantity(250, 'g')).toEqual({
        quantity: 250,
        unit: 'g',
        isValidUnit: true
      })
      expect(normalizeUnitAndQuantity(500, 'ml')).toEqual({
        quantity: 500,
        unit: 'ml',
        isValidUnit: true
      })
      expect(normalizeUnitAndQuantity(4, 'pcs')).toEqual({
        quantity: 4,
        unit: 'pcs',
        isValidUnit: true
      })
    })

    it('Flow 02: normalizes kilograms to grams', () => {
      expect(normalizeUnitAndQuantity(0.5, 'kg')).toEqual({
        quantity: 500,
        unit: 'g',
        isValidUnit: true
      })
      expect(normalizeUnitAndQuantity(1.25, 'kilogramy')).toEqual({
        quantity: 1250,
        unit: 'g',
        isValidUnit: true
      })
    })

    it('Flow 03: normalizes dekagrams to grams', () => {
      expect(normalizeUnitAndQuantity(15, 'dag')).toEqual({
        quantity: 150,
        unit: 'g',
        isValidUnit: true
      })
      expect(normalizeUnitAndQuantity(20, 'dkg')).toEqual({
        quantity: 200,
        unit: 'g',
        isValidUnit: true
      })
    })

    it('Flow 04: normalizes liters to milliliters', () => {
      expect(normalizeUnitAndQuantity(1.5, 'l')).toEqual({
        quantity: 1500,
        unit: 'ml',
        isValidUnit: true
      })
      expect(normalizeUnitAndQuantity(0.25, 'litr')).toEqual({
        quantity: 250,
        unit: 'ml',
        isValidUnit: true
      })
    })

    it('Flow 05: normalizes kitchen spoons, cups, and Polish pieces aliases', () => {
      expect(normalizeUnitAndQuantity(1, 'szklanka')).toEqual({
        quantity: 250,
        unit: 'ml',
        isValidUnit: true
      })
      expect(normalizeUnitAndQuantity(2, 'łyżka')).toEqual({
        quantity: 30,
        unit: 'ml',
        isValidUnit: true
      })
      expect(normalizeUnitAndQuantity(1, 'łyżeczka')).toEqual({
        quantity: 5,
        unit: 'ml',
        isValidUnit: true
      })
      expect(normalizeUnitAndQuantity(3, 'szt.')).toEqual({
        quantity: 3,
        unit: 'pcs',
        isValidUnit: true
      })
      expect(normalizeUnitAndQuantity(1, 'opakowanie')).toEqual({
        quantity: 1,
        unit: 'pcs',
        isValidUnit: true
      })
    })

    it('Flow 06: defaults missing unit to g', () => {
      expect(normalizeUnitAndQuantity(100)).toEqual({
        quantity: 100,
        unit: 'g',
        isValidUnit: true
      })
      expect(normalizeUnitAndQuantity(100, '')).toEqual({
        quantity: 100,
        unit: 'g',
        isValidUnit: true
      })
    })

    it('Flow 07: flags unrecognized unit as invalid', () => {
      const result = normalizeUnitAndQuantity(10, 'wiadro')
      expect(result.isValidUnit).toBe(false)
    })
  })

  describe('validateRecipeJson', () => {
    it('Flow 08: validates and parses the built-in EXAMPLE_RECIPE_JSON_TEMPLATE successfully', () => {
      const result = validateRecipeJson(EXAMPLE_RECIPE_JSON_TEMPLATE)
      expect(result.isValid).toBe(true)
      expect(result.isSyntaxValid).toBe(true)
      expect(result.validationErrors).toHaveLength(0)
      expect(result.recipes).toHaveLength(1)
      expect(result.recipes[0].name).toBe('Jajecznica na maśle ze szczypiorkiem')
      expect(result.recipes[0].ingredients).toHaveLength(3)
      expect(result.totalIngredientsCount).toBe(3)
    })

    it('Flow 09: correctly catches syntax errors in malformed JSON', () => {
      const brokenJson = '{ "name": "Brakujący cudzysłów i klamra, "ingredients": [] '
      const result = validateRecipeJson(brokenJson)
      expect(result.isValid).toBe(false)
      expect(result.isSyntaxValid).toBe(false)
      expect(result.syntaxError).toBeDefined()
    })

    it('Flow 10: detects missing recipe name and empty ingredients', () => {
      const invalidJson = JSON.stringify({
        description: 'Tylko opis bez nazwy',
        ingredients: []
      })
      const result = validateRecipeJson(invalidJson)
      expect(result.isValid).toBe(false)
      expect(result.isSyntaxValid).toBe(true)
      expect(result.validationErrors.some((e) => e.field === 'name')).toBe(true)
      expect(result.validationErrors.some((e) => e.field === 'ingredients')).toBe(true)
    })

    it('Flow 11: detects ingredient errors (missing name, negative quantity, invalid unit)', () => {
      const invalidIngredients = JSON.stringify({
        name: 'Naleśniki',
        ingredients: [
          { name: '', quantity: 100, unit: 'g' },
          { name: 'Mleko', quantity: -50, unit: 'ml' },
          { name: 'Mąka', quantity: 200, unit: 'nieznana_jednostka' }
        ]
      })
      const result = validateRecipeJson(invalidIngredients)
      expect(result.isValid).toBe(false)
      expect(result.validationErrors.length).toBeGreaterThanOrEqual(3)
    })

    it('Flow 12: handles batch import of multiple recipes in an array', () => {
      const batchJson = JSON.stringify([
        {
          name: 'Owsianka bananowa',
          ingredients: [
            { name: 'Płatki owsiane', quantity: 50, unit: 'g' },
            { name: 'Mleko', quantity: 200, unit: 'ml' }
          ]
        },
        {
          name: 'Omlet ze szpinakiem',
          ingredients: [
            { name: 'Jajka', quantity: 3, unit: 'pcs' },
            { name: 'Szpinak baby', quantity: 50, unit: 'g' }
          ]
        }
      ])
      const result = validateRecipeJson(batchJson)
      expect(result.isValid).toBe(true)
      expect(result.recipes).toHaveLength(2)
      expect(result.totalIngredientsCount).toBe(4)
      expect(result.recipes[0].name).toBe('Owsianka bananowa')
      expect(result.recipes[1].name).toBe('Omlet ze szpinakiem')
    })

    it('Flow 13: joins string array of preparation steps with newlines', () => {
      const json = JSON.stringify({
        name: 'Tosty z serem',
        preparation_steps: [
          'Rozgrzej opiekacz.',
          'Włóż chleb z serem.',
          'Piecz przez 3 minuty.'
        ],
        ingredients: [{ name: 'Chleb', quantity: 2, unit: 'pcs' }]
      })
      const result = validateRecipeJson(json)
      expect(result.isValid).toBe(true)
      expect(result.recipes[0].preparation_steps).toBe(
        'Rozgrzej opiekacz.\nWłóż chleb z serem.\nPiecz przez 3 minuty.'
      )
    })

    it('Flow 14: parses comma-separated string tags and trims them', () => {
      const json = JSON.stringify({
        name: 'Sałatka Cezar',
        tags: 'Obiad, Kurczak,  Fit ',
        ingredients: [{ name: 'Sałata', quantity: 100, unit: 'g' }]
      })
      const result = validateRecipeJson(json)
      expect(result.isValid).toBe(true)
      expect(result.recipes[0].tags).toEqual(['Obiad', 'Kurczak', 'Fit'])
    })
  })
})
