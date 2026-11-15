import { useState, useMemo, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/i18n'
import { mealService } from '@/services/mealService'
import { productService } from '@/services/productService'
import {
  validateRecipeJson,
  EXAMPLE_RECIPE_JSON_TEMPLATE,
  type RecipeJsonValidationResult
} from '@/lib/recipeJsonImport'

interface UseJsonRecipeImportParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function useJsonRecipeImport({ open, onOpenChange, onSuccess }: UseJsonRecipeImportParams) {
  const { household } = useAuth()
  const { t, language } = useTranslation()

  const [jsonText, setJsonText] = useState('')
  const [copied, setCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const validation: RecipeJsonValidationResult = useMemo(() => {
    return validateRecipeJson(jsonText, language)
  }, [jsonText, language])

  useEffect(() => {
    if (!open) {
      setSubmitError(null)
      setCopied(false)
    }
  }, [open])

  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(EXAMPLE_RECIPE_JSON_TEMPLATE)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const handleInsertTemplate = () => {
    setJsonText(EXAMPLE_RECIPE_JSON_TEMPLATE)
    setSubmitError(null)
  }

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonText)
      setJsonText(JSON.stringify(parsed, null, 2))
    } catch {
      // Ignore format if invalid
    }
  }

  const handleClear = () => {
    setJsonText('')
    setSubmitError(null)
  }

  const handleDiscard = () => {
    setJsonText('')
    setSubmitError(null)
    onOpenChange(false)
  }

  const handleSave = async () => {
    if (!validation.isValid || validation.recipes.length === 0 || !household || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const currentProducts = await productService.getProducts(household.id)
      const productLookup = new Map<string, string>()
      currentProducts.forEach((p) => {
        productLookup.set(p.name.trim().toLowerCase(), p.id)
      })

      // 1. Collect all unique missing products across all recipes cleanly before writing
      const missingProductsByKey = new Map<
        string,
        {
          name: string
          unit_type: 'g' | 'ml' | 'pcs'
          household_id: string
          type: 'Household'
          kcal_per_100: number
          protein_per_100: number
          carbs_per_100: number
          fat_per_100: number
          is_ad_hoc: boolean
        }
      >()

      for (const recipe of validation.recipes) {
        for (const ing of recipe.ingredients) {
          const lowerName = ing.name.trim().toLowerCase()
          if (!productLookup.has(lowerName) && !missingProductsByKey.has(lowerName)) {
            missingProductsByKey.set(lowerName, {
              name: ing.name.trim(),
              unit_type: ing.unit,
              household_id: household.id,
              type: 'Household',
              kcal_per_100: ing.kcal_per_100 ?? 0,
              protein_per_100: ing.protein_per_100 ?? 0,
              carbs_per_100: ing.carbs_per_100 ?? 0,
              fat_per_100: ing.fat_per_100 ?? 0,
              is_ad_hoc: false
            })
          }
        }
      }

      const missingPayloads = Array.from(missingProductsByKey.values())
      if (missingPayloads.length === 1) {
        const created = await productService.createProduct(missingPayloads[0])
        if (created && created.id) {
          productLookup.set(missingPayloads[0].name.toLowerCase(), created.id)
        } else {
          throw new Error(`Failed to create product for ingredient "${missingPayloads[0].name}"`)
        }
      } else if (missingPayloads.length > 1) {
        const batchCreated =
          typeof productService.createProductsBatch === 'function'
            ? await productService.createProductsBatch(missingPayloads)
            : []

        const createdProducts =
          batchCreated && batchCreated.length === missingPayloads.length
            ? batchCreated
            : await Promise.all(missingPayloads.map((p) => productService.createProduct(p)))

        createdProducts.forEach((created, index) => {
          const fallbackName = missingPayloads[index]?.name || ''
          if (created && created.id) {
            productLookup.set((created.name || fallbackName).trim().toLowerCase(), created.id)
          } else {
            throw new Error(`Failed to create product for ingredient "${fallbackName}"`)
          }
        })
      }

      // 2. Build all meal creation payloads and persist in batch (or single)
      const mealPayloads = validation.recipes.map((recipe) => ({
        household_id: household.id,
        type: 'Household' as const,
        name: recipe.name,
        description: recipe.description,
        preparation_steps: recipe.preparation_steps,
        comments: recipe.comments,
        category_id: recipe.category_id,
        tags: recipe.tags,
        ingredients: recipe.ingredients.map((ing) => {
          const productId = productLookup.get(ing.name.trim().toLowerCase())
          if (!productId) {
            throw new Error(`Failed to resolve product for ingredient "${ing.name}"`)
          }
          return {
            product_id: productId,
            base_quantity: ing.quantity,
            is_pantry_item: ing.is_pantry_item
          }
        })
      }))

      if (mealPayloads.length === 1) {
        const createdMeal = await mealService.createMeal(mealPayloads[0])
        if (!createdMeal) {
          throw new Error(`Failed to create meal "${mealPayloads[0].name}"`)
        }
      } else if (mealPayloads.length > 1) {
        const batchMeals =
          typeof mealService.createMealsBatch === 'function'
            ? await mealService.createMealsBatch(mealPayloads)
            : []

        if (!batchMeals || batchMeals.length !== mealPayloads.length) {
          const createdMeals = await Promise.all(mealPayloads.map((m) => mealService.createMeal(m)))
          const failedIndex = createdMeals.findIndex((m) => !m)
          if (failedIndex !== -1) {
            throw new Error(`Failed to create meal "${mealPayloads[failedIndex].name}"`)
          }
        }
      }

      window.dispatchEvent(new CustomEvent('smartshopping_refresh_products'))
      window.dispatchEvent(new CustomEvent('smartshopping_refresh_meals'))

      setJsonText('')
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: unknown) {
      console.error('[JsonRecipeImportDialog] Save error:', err)
      const message = err instanceof Error ? err.message : undefined
      setSubmitError(message || t('dialogs.jsonRecipeImport.errorToast'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const lineCount = useMemo(() => {
    if (!jsonText) return 1
    return jsonText.split('\n').length
  }, [jsonText])

  return {
    household,
    jsonText,
    setJsonText,
    copied,
    isSubmitting,
    submitError,
    setSubmitError,
    validation,
    lineCount,
    isEmpty: !jsonText.trim(),
    handleCopyTemplate,
    handleInsertTemplate,
    handleFormatJson,
    handleClear,
    handleDiscard,
    handleSave
  }
}

