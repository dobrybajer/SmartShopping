import { translate, type SupportedLanguage } from '@/i18n'

export type AllowedUnit = 'g' | 'ml' | 'pcs'

export interface ParsedIngredientJson {
  name: string
  quantity: number
  unit: AllowedUnit
  is_pantry_item?: boolean
  kcal_per_100?: number
  protein_per_100?: number
  carbs_per_100?: number
  fat_per_100?: number
}

export interface ParsedRecipeJson {
  name: string
  description?: string
  preparation_steps?: string
  comments?: string
  tags?: string[]
  type?: 'Global' | 'Household'
  category_id?: number
  ingredients: ParsedIngredientJson[]
}

export interface RecipeValidationError {
  recipeIndex?: number
  recipeName?: string
  field?: string
  message: string
}

export interface RecipeJsonValidationResult {
  isValid: boolean
  isSyntaxValid: boolean
  syntaxError?: string
  validationErrors: RecipeValidationError[]
  recipes: ParsedRecipeJson[]
  totalIngredientsCount: number
}

/**
 * Normalizes user-entered unit strings into standard 'g' | 'ml' | 'pcs'
 * and scales quantity accordingly (e.g. 0.5 kg -> 500 g, 1.5 l -> 1500 ml).
 */
export function normalizeUnitAndQuantity(
  quantity: number,
  rawUnit?: string
): { quantity: number; unit: AllowedUnit; isValidUnit: boolean } {
  if (typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0) {
    return { quantity: 0, unit: 'g', isValidUnit: false }
  }

  if (!rawUnit || typeof rawUnit !== 'string' || !rawUnit.trim()) {
    return { quantity, unit: 'g', isValidUnit: true }
  }

  const u = rawUnit.trim().toLowerCase()

  // Weight (Grams)
  if (['g', 'gram', 'gramy', 'gramów', 'gramow', 'grams', 'gm'].includes(u)) {
    return { quantity, unit: 'g', isValidUnit: true }
  }
  if (['kg', 'kilogram', 'kilogramy', 'kilogramów', 'kilogramow', 'kilograms'].includes(u)) {
    return { quantity: Math.round(quantity * 1000 * 100) / 100, unit: 'g', isValidUnit: true }
  }
  if (['dag', 'dkg', 'dekagram', 'dekagramy', 'dekagramów', 'dekagramow'].includes(u)) {
    return { quantity: Math.round(quantity * 10 * 100) / 100, unit: 'g', isValidUnit: true }
  }
  if (['mg', 'miligram', 'miligramy'].includes(u)) {
    return { quantity: Math.max(1, Math.round((quantity / 1000) * 100) / 100), unit: 'g', isValidUnit: true }
  }

  // Volume (Milliliters)
  if (['ml', 'mililitr', 'mililitry', 'mililitrow', 'mililitrów', 'milliliters', 'millilitres'].includes(u)) {
    return { quantity, unit: 'ml', isValidUnit: true }
  }
  if (['l', 'litr', 'litry', 'litrow', 'litrów', 'liter', 'liters', 'litre', 'litres'].includes(u)) {
    return { quantity: Math.round(quantity * 1000 * 100) / 100, unit: 'ml', isValidUnit: true }
  }
  if (['cl', 'centylitr', 'centylitry'].includes(u)) {
    return { quantity: Math.round(quantity * 10 * 100) / 100, unit: 'ml', isValidUnit: true }
  }
  if (['dl', 'decylitr', 'decylitry'].includes(u)) {
    return { quantity: Math.round(quantity * 100 * 100) / 100, unit: 'ml', isValidUnit: true }
  }
  if (['szklanka', 'szklanki', 'szklanek', 'glass', 'cup', 'cups'].includes(u)) {
    return { quantity: Math.round(quantity * 250 * 100) / 100, unit: 'ml', isValidUnit: true }
  }
  if (['łyżka', 'lyzka', 'łyżki', 'lyzki', 'tbsp', 'tablespoon', 'tablespoons'].includes(u)) {
    return { quantity: Math.round(quantity * 15 * 100) / 100, unit: 'ml', isValidUnit: true }
  }
  if (['łyżeczka', 'lyzeczka', 'łyżeczki', 'lyzeczki', 'tsp', 'teaspoon', 'teaspoons'].includes(u)) {
    return { quantity: Math.round(quantity * 5 * 100) / 100, unit: 'ml', isValidUnit: true }
  }

  // Pieces
  if ([
    'pcs',
    'pc',
    'szt',
    'szt.',
    'sztuka',
    'sztuki',
    'sztuk',
    'piece',
    'pieces',
    'item',
    'items',
    'opakowanie',
    'opak',
    'op.',
    'op'
  ].includes(u)) {
    return { quantity, unit: 'pcs', isValidUnit: true }
  }

  return { quantity, unit: 'g', isValidUnit: false }
}

/**
 * Validates raw JSON string representing a recipe or list of recipes.
 */
export function validateRecipeJson(rawJson: string, lang?: SupportedLanguage): RecipeJsonValidationResult {
  const result: RecipeJsonValidationResult = {
    isValid: false,
    isSyntaxValid: false,
    validationErrors: [],
    recipes: [],
    totalIngredientsCount: 0
  }

  const trimmed = rawJson ? rawJson.trim() : ''
  if (!trimmed) {
    return result
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
    result.isSyntaxValid = true
  } catch (err: any) {
    result.syntaxError = err?.message || translate('dialogs.jsonRecipeImport.validation.invalidSyntax', {}, lang)
    return result
  }

  // Support either single recipe object or array of recipes
  const items = Array.isArray(parsed) ? parsed : [parsed]

  if (items.length === 0) {
    result.validationErrors.push({
      message: translate('dialogs.jsonRecipeImport.validation.emptyArray', {}, lang)
    })
    return result
  }

  const validatedRecipes: ParsedRecipeJson[] = []
  let totalIngredients = 0

  items.forEach((item, index) => {
    const recipeIndex = items.length > 1 ? index + 1 : undefined

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      result.validationErrors.push({
        recipeIndex,
        message: translate('dialogs.jsonRecipeImport.validation.invalidRecipeObject', { index: index + 1 }, lang)
      })
      return
    }

    const obj = item as Record<string, any>

    // 1. Name validation
    const name = typeof obj.name === 'string' ? obj.name.trim() : ''
    if (!name) {
      result.validationErrors.push({
        recipeIndex,
        field: 'name',
        message: translate('dialogs.jsonRecipeImport.validation.missingName', {}, lang)
      })
    }

    // 2. Ingredients validation
    const rawIngredients = obj.ingredients
    if (!Array.isArray(rawIngredients) || rawIngredients.length === 0) {
      result.validationErrors.push({
        recipeIndex,
        recipeName: name || undefined,
        field: 'ingredients',
        message: translate(
          'dialogs.jsonRecipeImport.validation.missingIngredients',
          { name: name ? `"${name}"` : `#${index + 1}` },
          lang
        )
      })
    }

    const validatedIngredients: ParsedIngredientJson[] = []

    if (Array.isArray(rawIngredients)) {
      rawIngredients.forEach((ing, ingIdx) => {
        if (!ing || typeof ing !== 'object') {
          result.validationErrors.push({
            recipeIndex,
            recipeName: name || undefined,
            field: `ingredients[${ingIdx}]`,
            message: translate('dialogs.jsonRecipeImport.validation.ingredientNotObject', { index: ingIdx + 1 }, lang)
          })
          return
        }

        const ingName = typeof ing.name === 'string' ? ing.name.trim() : ''
        if (!ingName) {
          result.validationErrors.push({
            recipeIndex,
            recipeName: name || undefined,
            field: `ingredients[${ingIdx}].name`,
            message: translate('dialogs.jsonRecipeImport.validation.ingredientMissingName', { index: ingIdx + 1 }, lang)
          })
        }

        const rawQuantity = typeof ing.quantity === 'number'
          ? ing.quantity
          : typeof ing.base_quantity === 'number'
          ? ing.base_quantity
          : Number(ing.quantity || ing.base_quantity)

        if (isNaN(rawQuantity) || rawQuantity <= 0) {
          result.validationErrors.push({
            recipeIndex,
            recipeName: name || undefined,
            field: `ingredients[${ingIdx}].quantity`,
            message: translate(
              'dialogs.jsonRecipeImport.validation.ingredientInvalidQuantity',
              { name: ingName || ingIdx + 1 },
              lang
            )
          })
        }

        const rawUnit = ing.unit || ing.unit_type
        const { quantity, unit, isValidUnit } = normalizeUnitAndQuantity(rawQuantity, rawUnit)

        if (!isValidUnit && rawUnit !== undefined && String(rawUnit).trim() !== '') {
          result.validationErrors.push({
            recipeIndex,
            recipeName: name || undefined,
            field: `ingredients[${ingIdx}].unit`,
            message: translate(
              'dialogs.jsonRecipeImport.validation.ingredientInvalidUnit',
              { name: ingName || ingIdx + 1, unit: rawUnit },
              lang
            )
          })
        }

        const parseNutritionNum = (val: any): number | undefined => {
          if (typeof val === 'number' && !isNaN(val) && val >= 0) return val
          if (typeof val === 'string' && val.trim() !== '') {
            const parsedVal = Number(val)
            if (!isNaN(parsedVal) && parsedVal >= 0) return parsedVal
          }
          return undefined
        }

        validatedIngredients.push({
          name: ingName,
          quantity,
          unit,
          is_pantry_item: Boolean(ing.is_pantry_item),
          kcal_per_100: parseNutritionNum(ing.kcal_per_100 ?? ing.kcal),
          protein_per_100: parseNutritionNum(ing.protein_per_100 ?? ing.protein),
          carbs_per_100: parseNutritionNum(ing.carbs_per_100 ?? ing.carbs),
          fat_per_100: parseNutritionNum(ing.fat_per_100 ?? ing.fat)
        })
      })
    }

    // 3. Preparation steps normalization (string or array of strings)
    let preparationSteps: string | undefined
    if (typeof obj.preparation_steps === 'string') {
      preparationSteps = obj.preparation_steps.trim() || undefined
    } else if (Array.isArray(obj.preparation_steps)) {
      preparationSteps = obj.preparation_steps.map((s) => String(s).trim()).filter(Boolean).join('\n')
      if (!preparationSteps) preparationSteps = undefined
    }

    // 4. Tags normalization
    let tags: string[] | undefined
    if (Array.isArray(obj.tags)) {
      tags = obj.tags.map((t) => String(t).trim()).filter(Boolean)
      if (tags.length === 0) tags = undefined
    } else if (typeof obj.tags === 'string' && obj.tags.trim()) {
      tags = obj.tags.split(',').map((t) => t.trim()).filter(Boolean)
    }

    // 5. Type (Global or Household)
    let mealType: 'Global' | 'Household' | undefined = undefined
    if (obj.type === 'Global' || obj.type === 'global') mealType = 'Global'
    if (obj.type === 'Household' || obj.type === 'household') mealType = 'Household'

    validatedRecipes.push({
      name,
      description: typeof obj.description === 'string' ? obj.description.trim() || undefined : undefined,
      preparation_steps: preparationSteps,
      comments: typeof obj.comments === 'string' ? obj.comments.trim() || undefined : undefined,
      category_id: typeof obj.category_id === 'number' ? obj.category_id : undefined,
      tags,
      type: mealType,
      ingredients: validatedIngredients
    })

    totalIngredients += validatedIngredients.length
  })

  result.recipes = validatedRecipes
  result.totalIngredientsCount = totalIngredients
  result.isValid = result.isSyntaxValid && result.validationErrors.length === 0 && validatedRecipes.length > 0

  return result
}

export const EXAMPLE_RECIPE_JSON_TEMPLATE = `{
  "name": "Jajecznica na maśle ze szczypiorkiem",
  "description": "Kremowa jajecznica smażona na maśle z dodatkiem świeżego szczypiorku i pomidorków.",
  "preparation_steps": "1. Rozgrzej masło na małej patelni na średnim ogniu.\\n2. Wbij jajka i smaż delikatnie mieszając do ścięcia.\\n3. Posyp szczypiorkiem i podawaj z pomidorkami.",
  "comments": "Idealne śniadanie białkowo-tłuszczowe",
  "tags": ["Śniadanie", "Keto", "Szybkie"],
  "ingredients": [
    {
      "name": "Jajka",
      "quantity": 3,
      "unit": "pcs",
      "kcal_per_100": 143,
      "protein_per_100": 12.6,
      "carbs_per_100": 0.7,
      "fat_per_100": 9.5
    },
    {
      "name": "Masło",
      "quantity": 15,
      "unit": "g",
      "is_pantry_item": true,
      "kcal_per_100": 717,
      "fat_per_100": 81
    },
    {
      "name": "Pomidorki koktajlowe",
      "quantity": 100,
      "unit": "g",
      "kcal_per_100": 18,
      "carbs_per_100": 3.9
    }
  ]
}`
