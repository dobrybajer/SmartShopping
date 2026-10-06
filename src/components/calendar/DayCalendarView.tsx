import React, { useState } from 'react'
import type { MealPlanItem } from '@/types/calendar'
import { useTranslation } from '@/i18n'
import { useMealPlanStore } from '@/store/useMealPlanStore'
import { usePantryStore } from '@/store/usePantryStore'
import { useShoppingStore } from '@/store/useShoppingStore'
import {
  calculateMealPlanStatus,
  calculateDayMacros
} from '@/lib/calculations/calendarStatus'
import { CalendarMacroBar } from './CalendarMacroBar'
import { MealPlanStatusBadge } from './MealPlanStatusBadge'
import { UncertaintyWarningModal } from './UncertaintyWarningModal'
import { AddCalendarMealDialog } from './AddCalendarMealDialog'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ShoppingCart,
  Copy,
  Edit2,
  Trash2,
  Lock,
  Warehouse,
  Utensils
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DayCalendarViewProps {
  selectedDate: string // YYYY-MM-DD
  onDateChange: (date: string) => void
  onAddMealClick?: () => void
}

export const DayCalendarView: React.FC<DayCalendarViewProps> = ({
  selectedDate,
  onDateChange
}) => {
  const { t } = useTranslation()
  const {
    mealPlans,
    deleteMealPlan,
    duplicateMealPlan,
    transferMealToDraft,
    transferDayToDraft
  } = useMealPlanStore()
  const { pantryItems } = usePantryStore()
  const { draftItems } = useShoppingStore()

  // Modals state
  const [isAddMealOpen, setIsAddMealOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MealPlanItem | null>(null)
  const [uncertaintyItem, setUncertaintyItem] = useState<MealPlanItem | null>(null)

  // Date Math
  const todayStr = new Date().toISOString().split('T')[0]
  const isPastDate = selectedDate < todayStr
  const isToday = selectedDate === todayStr

  const shiftDay = (delta: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    onDateChange(d.toISOString().split('T')[0])
  }

  // Filter plans for this day
  const dayPlans = mealPlans.filter((p) => p.date === selectedDate)
  const dayMacros = calculateDayMacros(dayPlans)

  // Format date display
  const dateObj = new Date(selectedDate + 'T00:00:00')
  const formattedDate = dateObj.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* 1. Day Navigation Bar */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border shadow-xs">
        <button
          type="button"
          onClick={() => shiftDay(-1)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 text-foreground transition-all cursor-pointer"
          title="Poprzedni dzień"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-sm font-bold capitalize text-foreground">
            {formattedDate}
          </span>
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
          onClick={() => shiftDay(1)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 text-foreground transition-all cursor-pointer"
          title="Następny dzień"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Past Archive Notice */}
      {isPastDate && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
          <Lock className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span>{t('calendar.archiveNotice')}</span>
        </div>
      )}

      {/* 3. Daily Macro Bar */}
      <CalendarMacroBar macros={dayMacros} />

      {/* 4. Action Bar (Transfer Day to Draft + Add Meal) */}
      {!isPastDate && (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAddMealOpen(true)}
            className="flex-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t('calendar.addMeal')}</span>
          </Button>

          {dayPlans.length > 0 && (
            <Button
              variant="outline"
              onClick={() => transferDayToDraft(selectedDate)}
              className="rounded-xl border-border gap-2 text-foreground hover:bg-muted font-medium"
              title={t('calendar.transferDayToDraft')}
            >
              <ShoppingCart className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">{t('calendar.transferDayToDraft')}</span>
            </Button>
          )}
        </div>
      )}

      {/* 5. Planned Meals List */}
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
        <div className="flex flex-col gap-3">
          {dayPlans.map((plan) => {
            const statusDetails = calculateMealPlanStatus(plan, {
              pantryItems,
              draftItems,
              isPastDate
            })

            const mealName = plan.meal?.name || plan.custom_name || 'Posiłek'
            const ingredients = plan.meal?.ingredients || []

            return (
              <div
                key={plan.id}
                className="flex flex-col gap-3 p-4 rounded-2xl bg-card border border-border shadow-xs transition-all hover:border-border/80"
              >
                {/* Header: Title + Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-foreground">{mealName}</span>
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
                    onClickUncertainty={() => setUncertaintyItem(plan)}
                  />
                </div>

                {/* Notes if present */}
                {plan.notes && (
                  <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded-lg border border-border/50">
                    "{plan.notes}"
                  </p>
                )}

                {/* Ingredients preview */}
                {ingredients.length > 0 && (
                  <div className="flex flex-col gap-1 pt-1 border-t border-border/40">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Składniki ({ingredients.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {ingredients.map((ing) => {
                        const requiredQty = ing.base_quantity * (plan.servings || 1)
                        const inPantry = ing.is_pantry_item || (pantryItems.find((p) => p.product_id === ing.product_id)?.quantity ?? 0) >= requiredQty

                        return (
                          <span
                            key={ing.id}
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs border",
                              inPantry
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : "bg-muted/40 border-border text-foreground"
                            )}
                          >
                            {inPantry && <Warehouse className="w-3 h-3 text-emerald-400" />}
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
                  <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* Send to Draft */}
                      {ingredients.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => transferMealToDraft(plan)}
                          className="h-8 gap-1.5 text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg px-2"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>{t('calendar.transferToDraft')}</span>
                        </Button>
                      )}

                      {/* Duplicate to next day */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const nextDateObj = new Date(selectedDate)
                          nextDateObj.setDate(nextDateObj.getDate() + 1)
                          duplicateMealPlan(plan, nextDateObj.toISOString().split('T')[0])
                        }}
                        className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg px-2"
                        title={t('calendar.duplicateNextDay')}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t('calendar.duplicateNextDay')}</span>
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Edit */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingItem(plan)
                          setIsAddMealOpen(true)
                        }}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg"
                        title={t('common.edit')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>

                      {/* Delete */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMealPlan(plan.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Meal Dialog */}
      <AddCalendarMealDialog
        isOpen={isAddMealOpen}
        onClose={() => {
          setIsAddMealOpen(false)
          setEditingItem(null)
        }}
        initialDate={selectedDate}
        editingItem={editingItem}
      />

      {/* Uncertainty Details Sheet */}
      {uncertaintyItem && (
        <UncertaintyWarningModal
          isOpen={!!uncertaintyItem}
          onClose={() => setUncertaintyItem(null)}
          planItem={uncertaintyItem}
          missingIngredients={
            calculateMealPlanStatus(uncertaintyItem, {
              pantryItems,
              draftItems,
              isPastDate
            }).missingIngredients
          }
        />
      )}
    </div>
  )
}
