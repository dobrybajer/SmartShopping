import React from 'react'
import type { MealWithIngredients } from '@/store/useShoppingStore'
import type { PantryItemWithDetails } from '@/types/pantry'
import { matchHierarchicalPantry } from '@/lib/calculations/pantryCalculations'
import { useTranslation } from '@/i18n'
import { Warehouse } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MealDetailsIngredientsSectionProps {
  meal: MealWithIngredients
  multiplier: number
  pantryMapByProductId: Record<string, PantryItemWithDetails>
  pantryItemsByParentId: Record<string, PantryItemWithDetails[]>
}

export const MealDetailsIngredientsSection: React.FC<MealDetailsIngredientsSectionProps> = ({
  meal,
  multiplier,
  pantryMapByProductId,
  pantryItemsByParentId
}) => {
  const { t, formatQuantity } = useTranslation()

  return (
    <>
      <div>
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
          {t('cookbook.ingredients')} ({meal.ingredients.length})
        </h4>
        <div className="flex flex-col gap-2">
          {meal.ingredients.map((ing) => {
            const scaledQty = Math.round(ing.base_quantity * multiplier * 10) / 10
            const pantryMatch = ing.product
              ? matchHierarchicalPantry(ing.product, pantryMapByProductId, pantryItemsByParentId)
              : null
            const hasStock = !!pantryMatch?.isInPantry
            const isFullyCovered = hasStock && (pantryMatch?.totalQuantity ?? 0) >= scaledQty

            return (
              <div
                key={ing.id}
                className="p-3 rounded-xl bg-background border border-border flex items-center justify-between text-xs gap-2"
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {ing.product?.name || 'Product'}
                    </span>
                    {ing.product?.is_general && (
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                        {t('products.generalBadge')}
                      </span>
                    )}
                    {ing.is_pantry_item && (
                      <span className="text-[10px] text-muted-foreground">({t('cookbook.pantryItem')})</span>
                    )}
                  </div>

                  {ing.product?.is_general && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-muted-foreground">{t('cookbook.macroVia')}</span>
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                        {ing.reference_product?.name || t('cookbook.noReferenceWarning')}
                      </span>
                    </div>
                  )}

                  {hasStock && pantryMatch && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border',
                          isFullyCovered
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        )}
                        title={
                          pantryMatch.isHierarchical
                            ? pantryMatch.matchingItems
                                .map(
                                  (m) =>
                                    `${m.item.product?.name || m.item.ad_hoc_name}: ${formatQuantity(m.item.quantity, m.item.unit_type)}`
                                )
                                .join(', ')
                            : undefined
                        }
                      >
                        <Warehouse className="w-3 h-3 shrink-0" />
                        <span>
                          {isFullyCovered
                            ? t('pantry.availableInPantry', {
                                quantity: formatQuantity(
                                  pantryMatch.totalQuantity,
                                  ing.product?.unit_type || 'pcs'
                                )
                              })
                            : t('pantry.partiallyInPantry', {
                                quantity: formatQuantity(
                                  pantryMatch.totalQuantity,
                                  ing.product?.unit_type || 'pcs'
                                )
                              })}
                          {pantryMatch.isHierarchical && ` (${pantryMatch.matchingItems.length})`}
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                <span className="font-mono text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
                  {formatQuantity(scaledQty, ing.product?.unit_type || 'g')}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {meal.preparation_steps && (
        <div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
            {t('cookbook.steps')}
          </h4>
          <p className="text-xs text-foreground whitespace-pre-line leading-relaxed bg-background p-3 rounded-xl border border-border">
            {meal.preparation_steps}
          </p>
        </div>
      )}

      {meal.comments && (
        <div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
            {t('cookbook.notes')}
          </h4>
          <p className="text-xs text-muted-foreground italic bg-background p-3 rounded-xl border border-border">
            "{meal.comments}"
          </p>
        </div>
      )}
    </>
  )
}
