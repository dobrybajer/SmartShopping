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

      for (const recipe of validation.recipes) {
        const ingredientsPayload: Array<{
          product_id: string
          base_quantity: number
          is_pantry_item?: boolean
        }> = []

        for (const ing of recipe.ingredients) {
          const lowerName = ing.name.trim().toLowerCase()
          let productId = productLookup.get(lowerName)

          if (!productId) {
            const isGlobalRecipe = recipe.type === 'Global'
            const created = await productService.createProduct({
              name: ing.name.trim(),
              unit_type: ing.unit,
              household_id: isGlobalRecipe ? null : household.id,
              type: isGlobalRecipe ? 'Global' : 'Household',
              kcal_per_100: ing.kcal_per_100 ?? 0,
              protein_per_100: ing.protein_per_100 ?? 0,
              carbs_per_100: ing.carbs_per_100 ?? 0,
              fat_per_100: ing.fat_per_100 ?? 0,
              is_ad_hoc: false
            })

            if (created && created.id) {
              productId = created.id
              productLookup.set(lowerName, created.id)
            } else {
              throw new Error(`Failed to create product for ingredient "${ing.name}"`)
            }
          }

          ingredientsPayload.push({
            product_id: productId,
            base_quantity: ing.quantity,
            is_pantry_item: ing.is_pantry_item
          })
        }

        const createdMeal = await mealService.createMeal({
          household_id: recipe.type === 'Global' ? null : household.id,
          type: recipe.type || 'Household',
          name: recipe.name,
          description: recipe.description,
          preparation_steps: recipe.preparation_steps,
          comments: recipe.comments,
          category_id: recipe.category_id,
          tags: recipe.tags,
          ingredients: ingredientsPayload
        })

        if (!createdMeal) {
          throw new Error(`Failed to create meal "${recipe.name}"`)
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

