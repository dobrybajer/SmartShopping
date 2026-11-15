import React from 'react'
import type { MealWithIngredients } from '@/store/useShoppingStore'
import type { PantryItemWithDetails } from '@/types/pantry'
import { computeMealCardMacros } from '@/hooks/useCookbookController'
import { matchHierarchicalPantry } from '@/lib/calculations/pantryCalculations'
import { useTranslation } from '@/i18n'
import { Badge } from '@/components/ui/badge'
import {
  Home,
  Globe,
  Flame,
  Utensils,
  ShoppingCart,
  Check,
  Trash2,
  Warehouse
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CookbookMealCardProps {
  meal: MealWithIngredients
  pantryMapByProductId: Record<string, PantryItemWithDetails>
  pantryItemsByParentId?: Record<string, PantryItemWithDetails[]>
  isJustAdded?: boolean
  variant?: 'desktop' | 'mobile'
  onSelect: (meal: MealWithIngredients) => void
  onQuickAdd?: (e: React.MouseEvent, meal: MealWithIngredients) => void
  onDelete: (e: React.MouseEvent, meal: MealWithIngredients) => void
}

export const CookbookMealCard: React.FC<CookbookMealCardProps> = ({
  meal,
  pantryMapByProductId,
  pantryItemsByParentId = {},
  isJustAdded = false,
  variant = 'desktop',
  onSelect,
  onQuickAdd,
  onDelete
}) => {
  const { t } = useTranslation()
  const isDesktop = variant === 'desktop'
  const isGlobal = meal.type === 'Global' || !meal.household_id
  const macros = computeMealCardMacros(meal)

  const pantryIngredientsCount = meal.ingredients.filter(
    (ing) =>
      ing.is_pantry_item === true ||
      matchHierarchicalPantry(ing.product, pantryMapByProductId, pantryItemsByParentId).isInPantry
  ).length
  const totalIngredients = meal.ingredients.length

  const scopeBadge = isGlobal ? (
    <Badge
      variant="secondary"
      className={cn(
        'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-medium flex items-center gap-1',
        isDesktop ? 'text-[10px] px-2 py-0' : 'text-[9px] px-1.5 py-0'
      )}
    >
      <Globe className="w-2.5 h-2.5" />
      <span>{t('common.global')}</span>
    </Badge>
  ) : (
    <Badge
      variant="secondary"
      className={cn(
        'bg-primary/10 text-primary border border-primary/20 font-medium flex items-center gap-1',
        isDesktop ? 'text-[10px] px-2 py-0' : 'text-[9px] px-1.5 py-0'
      )}
    >
      <Home className="w-2.5 h-2.5" />
      <span>{t('navigation.households')}</span>
    </Badge>
  )

  const pantryBadge =
    totalIngredients > 0 && pantryIngredientsCount > 0 ? (
      pantryIngredientsCount === totalIngredients ? (
        <Badge
          variant="secondary"
          className={cn(
            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 font-semibold flex items-center gap-1',
            isDesktop ? 'text-[10px] px-2 py-0 shrink-0' : 'text-[9px] px-1.5 py-0'
          )}
          title={t('pantry.allIngredientsInPantry')}
        >
          <Warehouse className={isDesktop ? 'w-3 h-3' : 'w-2.5 h-2.5'} />
          <span>{t('pantry.allIngredientsInPantry')}</span>
        </Badge>
      ) : (
        <Badge
          variant="secondary"
          className={cn(
            'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 font-semibold flex items-center gap-1',
            isDesktop ? 'text-[10px] px-2 py-0 shrink-0' : 'text-[9px] px-1.5 py-0'
          )}
          title={t('pantry.ingredientsInPantryCount', {
            count: pantryIngredientsCount,
            total: totalIngredients
          })}
        >
          <Warehouse className={isDesktop ? 'w-3 h-3' : 'w-2.5 h-2.5'} />
          <span>
            {t('pantry.ingredientsInPantryCount', {
              count: pantryIngredientsCount,
              total: totalIngredients
            })}
          </span>
        </Badge>
      )
    ) : null

  if (!isDesktop) {
    return (
      <div
        onClick={() => onSelect(meal)}
        className="p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all flex flex-col gap-3 cursor-pointer group shadow-sm active:scale-[0.99]"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {meal.name}
              </h4>
              {scopeBadge}
              {pantryBadge}
            </div>
            {meal.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{meal.description}</p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {macros.kcal > 0 && (
              <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg text-primary text-xs font-bold shrink-0">
                <Flame className="w-3.5 h-3.5" />
                <span>
                  {Math.round(macros.kcal)} {t('common.kcal')}
                </span>
              </div>
            )}
            <button
              onClick={(e) => onDelete(e, meal)}
              className="text-muted-foreground hover:text-destructive p-1.5 transition-colors cursor-pointer"
              title={t('common.delete')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3 font-mono">
            <span>
              {t('common.proteinShort')}:{' '}
              <strong className="text-blue-600 dark:text-blue-400">{Math.round(macros.protein)}g</strong>
            </span>
            <span>
              {t('common.carbsShort')}:{' '}
              <strong className="text-amber-600 dark:text-amber-400">{Math.round(macros.carbs)}g</strong>
            </span>
            <span>
              {t('common.fatShort')}:{' '}
              <strong className="text-rose-600 dark:text-rose-400">{Math.round(macros.fat)}g</strong>
            </span>
          </div>

          {meal.tags && meal.tags.length > 0 && (
            <div className="flex gap-1">
              {meal.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={() => onSelect(meal)}
      className={cn(
        'p-5 rounded-2xl bg-card border transition-all duration-200 flex flex-col justify-between gap-4 cursor-pointer group shadow-sm hover:shadow-xl relative overflow-hidden',
        isGlobal
          ? 'border-border hover:border-sky-500/40 hover:bg-muted/40'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      )}
    >
      <div className="flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-primary group-hover:scale-105 transition-transform shrink-0">
              <Utensils className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <h4 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {meal.name}
              </h4>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {scopeBadge}
                <span className="text-[11px] text-muted-foreground font-mono">
                  {meal.ingredients.length} {t('cookbook.ingredients').toLowerCase()}
                </span>
                {pantryBadge}
              </div>
            </div>
          </div>

          {macros.kcal > 0 && (
            <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-xl text-primary text-xs font-extrabold shrink-0 shadow-inner">
              <Flame className="w-4 h-4" />
              <span>
                {Math.round(macros.kcal)} {t('common.kcal')}
              </span>
            </div>
          )}
        </div>

        {meal.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {meal.description}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-mono">
            <span className="bg-background px-2 py-0.5 rounded-md border border-border text-foreground">
              {t('common.proteinShort')}:{' '}
              <strong className="text-blue-600 dark:text-blue-400">{Math.round(macros.protein)}g</strong>
            </span>
            <span className="bg-background px-2 py-0.5 rounded-md border border-border text-foreground">
              {t('common.carbsShort')}:{' '}
              <strong className="text-amber-600 dark:text-amber-400">{Math.round(macros.carbs)}g</strong>
            </span>
            <span className="bg-background px-2 py-0.5 rounded-md border border-border text-foreground">
              {t('common.fatShort')}:{' '}
              <strong className="text-rose-600 dark:text-rose-400">{Math.round(macros.fat)}g</strong>
            </span>
          </div>

          <div className="flex items-center gap-1">
            {onQuickAdd && (
              <button
                type="button"
                onClick={(e) => onQuickAdd(e, meal)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs',
                  isJustAdded
                    ? 'bg-primary text-primary-foreground font-extrabold'
                    : 'bg-card hover:bg-primary hover:text-primary-foreground text-primary border border-border hover:border-primary'
                )}
                title={t('cookbook.addToDraft')}
              >
                {isJustAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{t('toasts.saved')}</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>{t('navigation.draft')}</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={(e) => onDelete(e, meal)}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
              title={t('common.delete')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {meal.tags && meal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {meal.tags.map((tag: string) => (
              <span
                key={tag}
                className="text-[10px] text-muted-foreground bg-background border border-border px-2 py-0.5 rounded-md"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

