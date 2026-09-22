import React, { useState, useMemo, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/i18n'
import { mealService } from '@/services/mealService'
import { productService } from '@/services/productService'
import {
  validateRecipeJson,
  EXAMPLE_RECIPE_JSON_TEMPLATE,
  type RecipeJsonValidationResult
} from '@/lib/recipeJsonImport'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileCode2,
  Copy,
  Check,
  Trash2,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Save,
  Loader2,
  Wand2,
  Terminal
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface JsonRecipeImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export const JsonRecipeImportDialog: React.FC<JsonRecipeImportDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const { household } = useAuth()
  const { t, language } = useTranslation()

  const [jsonText, setJsonText] = useState('')
  const [copied, setCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Real-time validation computation
  const validation: RecipeJsonValidationResult = useMemo(() => {
    return validateRecipeJson(jsonText, language)
  }, [jsonText, language])

  // Reset state when closed
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
      // Fallback
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
      // 1. Fetch current catalog products for matching
      const currentProducts = await productService.getProducts(household.id)
      const productLookup = new Map<string, string>() // lowerName -> productId
      currentProducts.forEach((p) => {
        productLookup.set(p.name.trim().toLowerCase(), p.id)
      })

      // 2. Process each recipe in batch
      for (const recipe of validation.recipes) {
        const ingredientsPayload: Array<{
          product_id: string
          base_quantity: number
          is_pantry_item?: boolean
        }> = []

        for (const ing of recipe.ingredients) {
          const lowerName = ing.name.trim().toLowerCase()
          let productId = productLookup.get(lowerName)

          // Auto-create product if missing
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

        // Create the meal record
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

      // 3. Broadcast updates across the app
      window.dispatchEvent(new CustomEvent('smartshopping_refresh_products'))
      window.dispatchEvent(new CustomEvent('smartshopping_refresh_meals'))

      // 4. Reset & Close
      setJsonText('')
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      console.error('[JsonRecipeImportDialog] Save error:', err)
      setSubmitError(err?.message || t('dialogs.jsonRecipeImport.errorToast'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate lines count in editor
  const lineCount = useMemo(() => {
    if (!jsonText) return 1
    return jsonText.split('\n').length
  }, [jsonText])

  const isEmpty = !jsonText.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-w-4xl w-full bg-card border-border text-foreground p-0 rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden select-text"
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0 text-left">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-inner">
                <FileCode2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold text-foreground leading-tight">
                    {t('dialogs.jsonRecipeImport.title')}
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] bg-background border-border text-muted-foreground hidden sm:inline-flex items-center gap-1"
                  >
                    <Terminal className="w-3 h-3 text-primary" />
                    <span>CTRL + ALT + P</span>
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {t('dialogs.jsonRecipeImport.subtitle')}
                </DialogDescription>
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyTemplate}
                className="h-8 text-xs font-semibold border-border bg-background hover:bg-muted text-foreground cursor-pointer gap-1.5"
                title={t('dialogs.jsonRecipeImport.copyTemplate')}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                    <span className="text-emerald-400 font-bold">{t('dialogs.jsonRecipeImport.copiedTemplate')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('dialogs.jsonRecipeImport.copyTemplate')}</span>
                  </>
                )}
              </Button>

              {validation.isSyntaxValid && !isEmpty && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFormatJson}
                  className="h-8 text-xs border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer gap-1"
                  title="Format JSON"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Prettify</span>
                </Button>
              )}

              {!isEmpty && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                  title={t('dialogs.jsonRecipeImport.clear')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Body Area */}
        <div className="flex-1 min-h-0 flex flex-col p-6 gap-4 overflow-y-auto scrollbar-thin">
          {/* Editor Container */}
          <div className="relative rounded-xl border border-border bg-background flex flex-col overflow-hidden shadow-inner focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <div className="flex items-center justify-between px-3 py-1.5 bg-card/80 border-b border-border text-[11px] text-muted-foreground font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary/70 inline-block" />
                <span>recipe.json</span>
              </div>
              <div className="flex items-center gap-3">
                <span>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
                <span>{jsonText.length} chars</span>
              </div>
            </div>

            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value)
                setSubmitError(null)
              }}
              placeholder={t('dialogs.jsonRecipeImport.placeholder')}
              className="w-full h-64 sm:h-80 p-3.5 bg-transparent font-mono text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none leading-relaxed selection:bg-primary/30"
              spellCheck={false}
              autoFocus
            />
          </div>

          {/* Real-time Diagnostics & Status Panel */}
          <div className="flex flex-col gap-2">
            {/* Empty State / Hint */}
            {isEmpty && (
              <div className="p-3.5 rounded-xl bg-card border border-border flex items-start justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Terminal className="w-4 h-4 text-primary shrink-0" />
                  <p>{t('dialogs.jsonRecipeImport.emptyHint')}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleInsertTemplate}
                  className="h-7 text-xs border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 font-semibold shrink-0 cursor-pointer gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Wstaw przykład</span>
                </Button>
              </div>
            )}

            {/* Syntax Error Alert */}
            {!isEmpty && !validation.isSyntaxValid && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-3 text-xs animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-destructive" />
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="font-bold">{t('dialogs.jsonRecipeImport.syntaxErrorTitle')}</span>
                  <p className="font-mono text-[11px] opacity-90 break-words">{validation.syntaxError}</p>
                </div>
              </div>
            )}

            {/* Schema Validation Errors */}
            {!isEmpty && validation.isSyntaxValid && validation.validationErrors.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3 text-xs animate-in fade-in duration-150">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="font-bold text-amber-300">
                    {t('dialogs.jsonRecipeImport.schemaErrorsTitle').replace(
                      '{count}',
                      String(validation.validationErrors.length)
                    )}
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-200/90 font-mono">
                    {validation.validationErrors.map((err, i) => (
                      <li key={i} className="leading-snug">
                        {err.recipeIndex ? `[Przepis #${err.recipeIndex}] ` : ''}
                        {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Success Banner */}
            {validation.isValid && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <div className="flex flex-col">
                    <span className="font-bold text-emerald-300">
                      {t('dialogs.jsonRecipeImport.validStatus')
                        .replace('{recipeCount}', String(validation.recipes.length))
                        .replace('{ingredientCount}', String(validation.totalIngredientsCount))}
                    </span>
                    <span className="text-[10px] text-emerald-400/80">
                      {validation.recipes.map((r) => r.name).join(', ')}
                    </span>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-bold shrink-0"
                >
                  Gotowy do zapisu
                </Badge>
              </div>
            )}

            {/* Submission Error */}
            {submitError && (
              <div className="p-3.5 rounded-xl bg-destructive/15 border border-destructive/40 text-destructive flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-card/90 shrink-0 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleDiscard}
            disabled={isSubmitting}
            className="h-11 px-5 rounded-xl border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted font-bold cursor-pointer transition-all"
          >
            <X className="w-4 h-4 mr-1.5" />
            <span>{t('dialogs.jsonRecipeImport.discard')}</span>
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={!validation.isValid || isSubmitting || !household}
            className={cn(
              "h-11 px-6 rounded-xl font-extrabold flex items-center gap-2 shadow-lg transition-all cursor-pointer",
              validation.isValid && !isSubmitting
                ? "bg-primary hover:bg-primary/90 text-primary-foreground active:scale-95"
                : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('dialogs.jsonRecipeImport.saving')}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {validation.recipes.length > 1
                    ? t('dialogs.jsonRecipeImport.saveRecipes').replace(
                        '{count}',
                        String(validation.recipes.length)
                      )
                    : t('dialogs.jsonRecipeImport.saveRecipe')}
                </span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
