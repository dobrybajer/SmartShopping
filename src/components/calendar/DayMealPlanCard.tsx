import React from 'react'
import type { MealPlanItem, MealStatusDetails } from '@/types/calendar'
import type { PantryItemWithDetails } from '@/types/pantry'
import { useTranslation } from '@/i18n'
import { getEffectiveMultiplier } from '@/lib/calculations/calendarStatus'
import { convertQuantity } from '@/lib/calculations/pantryCalculations'
import { MealPlanStatusBadge } from './MealPlanStatusBadge'
import {
  ShoppingCart,
  Copy,
  Edit2,
  Trash2,
  Warehouse,
  UtensilsCrossed
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DayMealPlanCardProps {
  plan: MealPlanItem
  statusDetails: MealStatusDetails
  pantryMapByProductId: Record<string, PantryItemWithDetails>
  pantryItemsByParentId: Record<string, PantryItemWithDetails[]>
  isPastDate: boolean
  categoryLabel?: string
  onTransferToDraft: (plan: MealPlanItem) => void
  onCook: (plan: MealPlanItem) => void
  onDuplicateNextDay: (plan: MealPlanItem) => void
  onEdit: (plan: MealPlanItem) => void
  onDelete: (plan: MealPlanItem) => void
  onOpenUncertainty: (plan: MealPlanItem) => void
}

export const DayMealPlanCard: React.FC<DayMealPlanCardProps> = ({
  plan,
  statusDetails,
  pantryMapByProductId,
  pantryItemsByParentId,
  isPastDate,
  categoryLabel,
  onTransferToDraft,
  onCook,
  onDuplicateNextDay,
  onEdit,
  onDelete,
  onOpenUncertainty
}) => {
  const { t } = useTranslation()
  const mealName = plan.meal?.name || plan.custom_name || t('calendar.defaultMealName')
  const ingredients = plan.meal?.ingredients || []
  const multiplier = getEffectiveMultiplier(plan)

  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-card border border-border shadow-xs transition-all hover:border-border/80">
      {/* Header: Title + Status Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold text-foreground">{mealName}</span>
            {categoryLabel && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary font-semibold">
                {categoryLabel}
              </span>
            )}
            {plan.is_ad_hoc && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                Ad-Hoc
              </span>
            )}
          </div>

          <span className="text-xs text-muted-foreground">
            {plan.servings} {t('calendar.servings')}
            {plan.target_kcal ? ` · ${plan.target_kcal} kcal` : ''}
          </span>
        </div>

        <MealPlanStatusBadge
          details={statusDetails}
          onClickUncertainty={() => onOpenUncertainty(plan)}
        />
      </div>

      {/* Notes if present */}
      {plan.notes && (
        <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded-lg border border-border/50">
          "{plan.notes}"
        </p>
      )}

      {/* Ingredients preview with O(1) pantry map lookups */}
      {ingredients.length > 0 && (
        <div className="flex flex-col gap-1 pt-1 border-t border-border/40">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            {t('cookbook.ingredients')} ({ingredients.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {ingredients.map((ing) => {
              const requiredQty = Math.round(ing.base_quantity * multiplier * 10) / 10
              const unitType = ing.product?.unit_type || 'pcs'
              const directItem = ing.product_id ? pantryMapByProductId[ing.product_id] : undefined
              const directStock = directItem
                ? (convertQuantity(directItem.quantity || 0, directItem.unit_type, unitType) ?? 0)
                : 0
              const childItems =
                ing.product?.is_general && ing.product_id
                  ? pantryItemsByParentId[ing.product_id] || []
                  : []
              const childStock = childItems.reduce(
                (sum, p) => sum + (convertQuantity(p.quantity || 0, p.unit_type, unitType) ?? 0),
                0
              )
              const inPantry =
                ing.is_pantry_item === true || Math.max(directStock, childStock) >= requiredQty

              return (
                <span
                  key={ing.id}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs border',
                    inPantry
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-muted/40 border-border text-foreground'
                  )}
                >
                  {inPantry && (
                    <Warehouse className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <span>{ing.product?.name}</span>
                  <span className="text-[10px] opacity-70">
                    ({requiredQty} {ing.product?.unit_type})
                  </span>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Action buttons (Disabled if past) */}
      {!isPastDate && (
        <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {ingredients.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onTransferToDraft(plan)}
                className="min-h-[44px] gap-1.5 text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:bg-sky-500/10 rounded-lg px-2.5"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{t('calendar.transferToDraft')}</span>
              </Button>
            )}

            {ingredients.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onCook(plan)}
                className="min-h-[44px] gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg px-2.5"
                title={t('pantry.cookModal.buttonLabel')}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>{t('pantry.cookModal.buttonShort')}</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDuplicateNextDay(plan)}
              className="min-h-[44px] gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg px-2.5"
              title={t('calendar.duplicateNextDay')}
              aria-label={t('calendar.duplicateNextDay')}
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('calendar.duplicateNextDay')}</span>
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(plan)}
              className="min-w-[44px] min-h-[44px] w-11 h-11 p-0 text-muted-foreground hover:text-foreground rounded-lg"
              title={t('common.edit')}
              aria-label={t('common.edit')}
            >
              <Edit2 className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(plan)}
              className="min-w-[44px] min-h-[44px] w-11 h-11 p-0 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
              title={t('common.delete')}
              aria-label={t('common.delete')}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
