import React, { useMemo, useState } from 'react'
import type { MealPlanItem } from '@/types/calendar'
import type { PantryItemWithDetails } from '@/types/pantry'
import { useTranslation, type TranslationKey } from '@/i18n'
import { useMealPlanStore } from '@/store/useMealPlanStore'
import { usePantryStore } from '@/store/usePantryStore'
import { useShoppingStore } from '@/store/useShoppingStore'
import { useShallow } from 'zustand/react/shallow'
import {
  calculateMealPlanStatus,
  calculateMealPlanStatusesMap,
  calculateDayMacros,
  getEffectiveMultiplier
} from '@/lib/calculations/calendarStatus'
import { CalendarMacroBar } from './CalendarMacroBar'
import { DayMealPlanCard } from './DayMealPlanCard'
import { UncertaintyWarningModal } from './UncertaintyWarningModal'
import { AddCalendarMealDialog } from './AddCalendarMealDialog'
import { CookMealDeductModal } from '@/components/dialogs/CookMealDeductModal'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import { buildCookableIngredientsFromMeal } from '@/lib/calculations/pantryConsumption'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ShoppingCart,
  Lock,
  Utensils
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatLocalDateISO, addDaysISO } from '@/lib/utils'

interface DayCalendarViewProps {
  selectedDate: string // YYYY-MM-DD
  onDateChange: (date: string) => void
  onAddMealClick?: () => void
}

const STANDARD_MEAL_CATEGORY_SLUGS: Record<number, string> = {
  1: 'breakfast',
  2: 'lunch',
  3: 'dinner',
  4: 'snack',
  5: 'dessert'
}

function getCategoryLabel(slug: string, t: (key: TranslationKey) => string): string {
  const key = `categories.${slug}` as TranslationKey
  const translated = t(key)
  return translated !== key ? translated : slug
}

function resolveMealCategoryGroup(plan: MealPlanItem): { slug: string; order: number } {
  const catId = plan.meal_category?.id ?? plan.meal_category_id ?? plan.meal?.category_id ?? null
  const slug =
    plan.meal_category?.name ||
    (catId !== null ? STANDARD_MEAL_CATEGORY_SLUGS[catId] : undefined) ||
    'other'
  return { slug, order: catId ?? 99 }
}

export const DayCalendarView: React.FC<DayCalendarViewProps> = ({
  selectedDate,
  onDateChange
}) => {
  const { t, language } = useTranslation()
  const locale = language === 'pl' ? 'pl-PL' : 'en-US'
  const {
    mealPlans,
    deleteMealPlan,
    duplicateMealPlan,
    transferMealToDraft,
    transferDayToDraft
  } = useMealPlanStore(
    useShallow((state) => ({
      mealPlans: state.mealPlans,
      deleteMealPlan: state.deleteMealPlan,
      duplicateMealPlan: state.duplicateMealPlan,
      transferMealToDraft: state.transferMealToDraft,
      transferDayToDraft: state.transferDayToDraft
    }))
  )
  const { pantryItems, pantryMapByProductId, pantryItemsByParentId } = usePantryStore(
    useShallow((state) => ({
      pantryItems: state.pantryItems,
      pantryMapByProductId: state.pantryMapByProductId,
      pantryItemsByParentId: state.pantryItemsByParentId
    }))
  )
  const { draftItems, activeListItems, archivedListItems } = useShoppingStore(
    useShallow((state) => ({
      draftItems: state.draftItems,
      activeListItems: state.activeListItems,
      archivedListItems: state.archivedListItems
    }))
  )

  const [isAddMealOpen, setIsAddMealOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MealPlanItem | null>(null)
  const [uncertaintyItem, setUncertaintyItem] = useState<MealPlanItem | null>(null)
  const [cookPlanItem, setCookPlanItem] = useState<MealPlanItem | null>(null)
  const [planToDelete, setPlanToDelete] = useState<MealPlanItem | null>(null)

  const { resolvedPantryMap, resolvedParentMap } = useMemo(() => {
    if (Object.keys(pantryMapByProductId).length > 0 || pantryItems.length === 0) {
      return {
        resolvedPantryMap: pantryMapByProductId,
        resolvedParentMap: pantryItemsByParentId
      }
    }
    const byProduct: Record<string, PantryItemWithDetails> = {}
    const byParent: Record<string, PantryItemWithDetails[]> = {}
    for (const item of pantryItems) {
      if (item.product_id) byProduct[item.product_id] = item
      if (item.product?.parent_id) {
        if (!byParent[item.product.parent_id]) byParent[item.product.parent_id] = []
        byParent[item.product.parent_id].push(item)
      }
    }
    return { resolvedPantryMap: byProduct, resolvedParentMap: byParent }
  }, [pantryItems, pantryMapByProductId, pantryItemsByParentId])

  const cookIngredients = cookPlanItem
    ? buildCookableIngredientsFromMeal(
        cookPlanItem.meal?.ingredients,
        getEffectiveMultiplier(cookPlanItem)
      )
    : []

  const todayStr = formatLocalDateISO()
  const isPastDate = selectedDate < todayStr
  const isToday = selectedDate === todayStr

  const dayPlans = useMemo(
    () => mealPlans.filter((p) => p.date === selectedDate),
    [mealPlans, selectedDate]
  )
  const dayMacros = useMemo(() => calculateDayMacros(dayPlans), [dayPlans])

  const statusByPlanId = useMemo(
    () =>
      calculateMealPlanStatusesMap(
        dayPlans,
        {
          pantryItems,
          pantryMapByProductId: resolvedPantryMap,
          pantryItemsByParentId: resolvedParentMap,
          draftItems,
          activeListItems,
          archivedListItems
        },
        todayStr
      ),
    [
      dayPlans,
      pantryItems,
      resolvedPantryMap,
      resolvedParentMap,
      draftItems,
      activeListItems,
      archivedListItems,
      todayStr
    ]
  )

  const groupedDayPlans = useMemo(() => {
    const groups = new Map<string, { slug: string; order: number; plans: MealPlanItem[] }>()
    for (const plan of dayPlans) {
      const { slug, order } = resolveMealCategoryGroup(plan)
      const existing = groups.get(slug)
      if (existing) {
        existing.plans.push(plan)
      } else {
        groups.set(slug, { slug, order, plans: [plan] })
      }
    }
    return Array.from(groups.values()).sort((a, b) => a.order - b.order)
  }, [dayPlans])

  const formattedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="flex flex-col gap-4 pb-12">
      <div className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border shadow-xs">
        <button
          type="button"
          onClick={() => onDateChange(addDaysISO(selectedDate, -1))}
          className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 text-foreground transition-all cursor-pointer"
          title={t('calendar.prevDay')}
          aria-label={t('calendar.prevDay')}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-sm font-bold capitalize text-foreground">{formattedDate}</span>
          {isToday ? (
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
              {t('calendar.today')}
            </span>
          ) : isPastDate ? (
            <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              {t('calendar.pastArchive')}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onDateChange(addDaysISO(selectedDate, 1))}
          className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 text-foreground transition-all cursor-pointer"
          title={t('calendar.nextDay')}
          aria-label={t('calendar.nextDay')}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {isPastDate && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
          <Lock className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span>{t('calendar.archiveNotice')}</span>
        </div>
      )}

      <CalendarMacroBar macros={dayMacros} />

      {!isPastDate && (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAddMealOpen(true)}
            className="flex-1 min-h-[44px] rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t('calendar.addMeal')}</span>
          </Button>

          {dayPlans.length > 0 && (
            <Button
              variant="outline"
              onClick={() => transferDayToDraft(selectedDate)}
              className="min-h-[44px] rounded-xl border-border gap-2 text-foreground hover:bg-muted font-medium"
              title={t('calendar.transferDayToDraft')}
            >
              <ShoppingCart className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span className="hidden sm:inline">{t('calendar.transferDayToDraft')}</span>
            </Button>
          )}
        </div>
      )}

      {dayPlans.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-card/40 border border-dashed border-border text-center gap-2">
          <Utensils className="w-8 h-8 text-muted-foreground/40" />
          <span className="text-sm text-muted-foreground font-medium">
            {t('calendar.noMealsPlanned')}
          </span>
          {!isPastDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAddMealOpen(true)}
              className="mt-1 text-xs text-primary gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('calendar.addMeal')}</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groupedDayPlans.map((group) => {
            const categoryLabel = getCategoryLabel(group.slug, t)
            return (
              <section key={group.slug} className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    {categoryLabel}
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {group.plans.length}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {group.plans.map((plan) => (
                    <DayMealPlanCard
                      key={plan.id}
                      plan={plan}
                      statusDetails={
                        statusByPlanId.get(plan.id) ??
                        calculateMealPlanStatus(plan, {
                          pantryItems,
                          pantryMapByProductId: resolvedPantryMap,
                          pantryItemsByParentId: resolvedParentMap,
                          draftItems,
                          activeListItems,
                          archivedListItems,
                          isPastDate
                        })
                      }
                      pantryMapByProductId={resolvedPantryMap}
                      pantryItemsByParentId={resolvedParentMap}
                      isPastDate={isPastDate}
                      categoryLabel={categoryLabel}
                      onTransferToDraft={(target) => transferMealToDraft(target)}
                      onCook={setCookPlanItem}
                      onDuplicateNextDay={(target) =>
                        duplicateMealPlan(target, addDaysISO(selectedDate, 1))
                      }
                      onEdit={(target) => {
                        setEditingItem(target)
                        setIsAddMealOpen(true)
                      }}
                      onDelete={setPlanToDelete}
                      onOpenUncertainty={setUncertaintyItem}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <AddCalendarMealDialog
        isOpen={isAddMealOpen}
        onClose={() => {
          setIsAddMealOpen(false)
          setEditingItem(null)
        }}
        initialDate={selectedDate}
        editingItem={editingItem}
      />

      {uncertaintyItem && (
        <UncertaintyWarningModal
          isOpen={!!uncertaintyItem}
          onClose={() => setUncertaintyItem(null)}
          planItem={uncertaintyItem}
          missingIngredients={
            (
              statusByPlanId.get(uncertaintyItem.id) ??
              calculateMealPlanStatus(uncertaintyItem, {
                pantryItems,
                pantryMapByProductId: resolvedPantryMap,
                pantryItemsByParentId: resolvedParentMap,
                draftItems,
                activeListItems,
                archivedListItems,
                isPastDate
              })
            ).missingIngredients
          }
        />
      )}

      {cookPlanItem && (
        <CookMealDeductModal
          open={!!cookPlanItem}
          onOpenChange={(open) => !open && setCookPlanItem(null)}
          mealName={cookPlanItem.meal?.name || cookPlanItem.custom_name || t('calendar.defaultMealName')}
          ingredients={cookIngredients}
        />
      )}

      <ConfirmDeleteDialog
        open={!!planToDelete}
        onOpenChange={(open) => !open && setPlanToDelete(null)}
        itemName={
          planToDelete?.meal?.name || planToDelete?.custom_name || t('calendar.defaultMealName')
        }
        onConfirm={async () => {
          if (planToDelete) {
            await deleteMealPlan(planToDelete.id)
            setPlanToDelete(null)
          }
        }}
      />
    </div>
  )
}
