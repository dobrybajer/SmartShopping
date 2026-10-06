import React from 'react'
import { useTranslation } from '@/i18n'
import { useMealPlanStore } from '@/store/useMealPlanStore'
import { usePantryStore } from '@/store/usePantryStore'
import { useShoppingStore } from '@/store/useShoppingStore'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import {
  calculateMealPlanStatus,
  calculateDayMacros
} from '@/lib/calculations/calendarStatus'
import { MealPlanStatusBadge } from './MealPlanStatusBadge'
import {
  ChevronLeft,
  ChevronRight,
  Briefcase,
  CalendarDays,
  Plus,
  Flame,
  ShoppingCart
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface WeekCalendarViewProps {
  selectedDate: string // YYYY-MM-DD
  onDateSelect: (date: string) => void
  onOpenDayView: (date: string) => void
  onAddMealClick: (date: string) => void
}

/**
 * Returns Monday of the week containing the given date.
 */
function getMonday(dateStr: string): Date {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  return new Date(d.setDate(diff))
}

function formatDateISO(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const WeekCalendarView: React.FC<WeekCalendarViewProps> = ({
  selectedDate,
  onDateSelect,
  onOpenDayView,
  onAddMealClick
}) => {
  const { t } = useTranslation()
  const { isDesktop } = useDeviceLayout()
  const {
    mealPlans,
    weekRangeMode,
    setWeekRangeMode,
    transferDayToDraft
  } = useMealPlanStore()
  const { pantryItems } = usePantryStore()
  const { draftItems } = useShoppingStore()

  const todayStr = new Date().toISOString().split('T')[0]
  const monday = getMonday(selectedDate)
  const numDays = weekRangeMode === 'workweek' ? 5 : 7

  // Generate days array for this week
  const weekDays = Array.from({ length: numDays }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const iso = formatDateISO(d)
    const isToday = iso === todayStr
    const isSelected = iso === selectedDate
    const isPast = iso < todayStr

    const plansForDay = mealPlans.filter((p) => p.date === iso)
    const macros = calculateDayMacros(plansForDay)

    return {
      dateObj: d,
      iso,
      isToday,
      isSelected,
      isPast,
      plans: plansForDay,
      macros
    }
  })

  const shiftWeek = (deltaWeeks: number) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + deltaWeeks * 7)
    onDateSelect(formatDateISO(d))
  }

  // Week range label (e.g. 13 - 19 paź)
  const firstDay = weekDays[0].dateObj
  const lastDay = weekDays[weekDays.length - 1].dateObj
  const rangeLabel = `${firstDay.getDate()} - ${lastDay.getDate()} ${lastDay.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`

  // Send entire week to cart
  const handleTransferEntireWeek = () => {
    let count = 0
    for (const day of weekDays) {
      if (!day.isPast && day.plans.length > 0) {
        count += transferDayToDraft(day.iso)
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* 1. Header: Week Switcher + Workweek Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border shadow-xs">
        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 text-foreground transition-all cursor-pointer"
            title="Poprzedni tydzień"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-sm font-bold text-foreground px-2">
            {rangeLabel}
          </span>

          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 text-foreground transition-all cursor-pointer"
            title="Następny tydzień"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDateSelect(todayStr)}
            className="text-xs text-primary font-semibold rounded-lg h-8"
          >
            {t('calendar.today')}
          </Button>
        </div>

        {/* Toggle Workweek vs Full week */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-muted/60 p-1 border border-border">
            <button
              type="button"
              onClick={() => setWeekRangeMode('workweek')}
              className={cn(
                "py-1 px-2.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                weekRangeMode === 'workweek'
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>{t('calendar.workweek')}</span>
            </button>
            <button
              type="button"
              onClick={() => setWeekRangeMode('full')}
              className={cn(
                "py-1 px-2.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                weekRangeMode === 'full'
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{t('calendar.fullWeek')}</span>
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleTransferEntireWeek}
            className="h-8 rounded-xl border-border text-xs gap-1.5 text-foreground hover:bg-muted font-medium"
            title="Wyślij tydzień do koszyka"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">Tydzień do koszyka</span>
          </Button>
        </div>
      </div>

      {/* 2. Layout: Desktop Multi-Column vs Mobile Vertical Stack */}
      {isDesktop ? (
        // Desktop Grid (5 or 7 columns)
        <div
          className={cn(
            "grid gap-3 items-start",
            numDays === 5 ? "grid-cols-5" : "grid-cols-7"
          )}
        >
          {weekDays.map((day) => {
            const dayName = day.dateObj.toLocaleDateString(undefined, { weekday: 'short' })
            const dayNum = day.dateObj.getDate()

            return (
              <div
                key={day.iso}
                onClick={() => onOpenDayView(day.iso)}
                className={cn(
                  "flex flex-col gap-2 p-3 rounded-2xl bg-card border transition-all cursor-pointer min-h-[360px] group shadow-xs",
                  day.isToday
                    ? "border-primary/50 bg-primary/5"
                    : day.isSelected
                    ? "border-border/80"
                    : "border-border hover:border-primary/30"
                )}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex flex-col">
                    <span className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground">
                      {dayName}
                    </span>
                    <span
                      className={cn(
                        "text-lg font-black",
                        day.isToday ? "text-primary" : "text-foreground"
                      )}
                    >
                      {dayNum}
                    </span>
                  </div>

                  {day.macros.kcal > 0 && (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-500">
                      <Flame className="w-3 h-3 fill-amber-500/20" />
                      <span>{day.macros.kcal}</span>
                    </div>
                  )}
                </div>

                {/* Planned Meals list */}
                <div className="flex flex-col gap-2 flex-1">
                  {day.plans.map((plan) => {
                    const statusDetails = calculateMealPlanStatus(plan, {
                      pantryItems,
                      draftItems,
                      isPastDate: day.isPast
                    })
                    const mealName = plan.meal?.name || plan.custom_name || 'Posiłek'

                    return (
                      <div
                        key={plan.id}
                        className="flex flex-col gap-1 p-2 rounded-xl bg-background/80 border border-border/60 hover:border-border text-xs transition-all shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-semibold text-foreground line-clamp-1">
                            {mealName}
                          </span>
                          <MealPlanStatusBadge details={statusDetails} compact />
                        </div>

                        <span className="text-[10px] text-muted-foreground">
                          {plan.servings} porcji
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Quick Add Button */}
                {!day.isPast && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddMealClick(day.iso)
                    }}
                    className="w-full py-1.5 rounded-xl border border-dashed border-border/80 hover:border-primary hover:text-primary text-muted-foreground text-xs flex items-center justify-center gap-1 transition-all mt-auto cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Dodaj</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        // Mobile Vertical Cards Stack
        <div className="flex flex-col gap-3">
          {weekDays.map((day) => {
            const dayFull = day.dateObj.toLocaleDateString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'short'
            })

            return (
              <div
                key={day.iso}
                onClick={() => onOpenDayView(day.iso)}
                className={cn(
                  "flex flex-col gap-2.5 p-3.5 rounded-2xl bg-card border transition-all cursor-pointer shadow-xs active:scale-[0.99]",
                  day.isToday
                    ? "border-primary/50 bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-bold capitalize",
                        day.isToday ? "text-primary" : "text-foreground"
                      )}
                    >
                      {dayFull}
                    </span>
                    {day.isToday && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/15 text-primary font-bold">
                        {t('calendar.today')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {day.macros.kcal > 0 && (
                      <div className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                        <Flame className="w-3.5 h-3.5 fill-amber-500/20" />
                        <span>{day.macros.kcal} kcal</span>
                      </div>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                  </div>
                </div>

                {/* Meals summary or empty hint */}
                {day.plans.length === 0 ? (
                  <span className="text-xs text-muted-foreground/60 italic">
                    {t('calendar.noMealsPlanned')}
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {day.plans.map((plan) => {
                      const statusDetails = calculateMealPlanStatus(plan, {
                        pantryItems,
                        draftItems,
                        isPastDate: day.isPast
                      })
                      const mealName = plan.meal?.name || plan.custom_name || 'Posiłek'

                      return (
                        <div
                          key={plan.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-background border border-border text-xs"
                        >
                          <span className="font-medium text-foreground">{mealName}</span>
                          <MealPlanStatusBadge details={statusDetails} compact />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
