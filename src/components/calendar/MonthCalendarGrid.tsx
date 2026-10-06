import React, { useState } from 'react'
import { useTranslation } from '@/i18n'
import { useMealPlanStore } from '@/store/useMealPlanStore'
import { usePantryStore } from '@/store/usePantryStore'
import { useShoppingStore } from '@/store/useShoppingStore'
import {
  calculateMealPlanStatus,
  calculateDayMacros
} from '@/lib/calculations/calendarStatus'
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MonthCalendarGridProps {
  selectedDate: string // YYYY-MM-DD
  onOpenDayView: (date: string) => void
}

function formatDateISO(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

export const MonthCalendarGrid: React.FC<MonthCalendarGridProps> = ({
  selectedDate,
  onOpenDayView
}) => {
  const { t } = useTranslation()
  const { mealPlans } = useMealPlanStore()
  const { pantryItems } = usePantryStore()
  const { draftItems } = useShoppingStore()

  // Track the currently viewed month & year
  const initialDateObj = new Date(selectedDate + 'T00:00:00')
  const [viewYear, setViewYear] = useState(initialDateObj.getFullYear())
  const [viewMonth, setViewMonth] = useState(initialDateObj.getMonth()) // 0-indexed

  const todayStr = new Date().toISOString().split('T')[0]

  const shiftMonth = (delta: number) => {
    let nextMonth = viewMonth + delta
    let nextYear = viewYear
    if (nextMonth < 0) {
      nextMonth = 11
      nextYear--
    } else if (nextMonth > 11) {
      nextMonth = 0
      nextYear++
    }
    setViewMonth(nextMonth)
    setViewYear(nextYear)
  }

  // Days in month calculation
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1)
  const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0)
  const totalDays = lastDayOfMonth.getDate()

  // Day of week for 1st day (0 = Sunday, 1 = Monday, etc.)
  // We want Monday = 0, Sunday = 6
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1
  if (startingDayOfWeek === -1) startingDayOfWeek = 6 // Sunday is last

  const monthTitle = firstDayOfMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric'
  })

  // Weekday abbreviations (Pn, Wt, Śr, Czw, Pt, So, Nd)
  const weekDayHeaders = Array.from({ length: 7 }, (_, i) => {
    // 2026-10-05 was a Monday
    const d = new Date(2026, 9, 5 + i)
    return d.toLocaleDateString(undefined, { weekday: 'short' })
  })

  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* 1. Header with Month switcher */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border shadow-xs">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 text-foreground transition-all cursor-pointer"
          title="Poprzedni miesiąc"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-sm font-bold capitalize text-foreground px-2">
          {monthTitle}
        </span>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const now = new Date()
              setViewYear(now.getFullYear())
              setViewMonth(now.getMonth())
            }}
            className="text-xs text-primary font-semibold rounded-lg h-8"
          >
            {t('calendar.today')}
          </Button>

          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 text-foreground transition-all cursor-pointer"
            title="Następny miesiąc"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Month Grid */}
      <div className="p-3 rounded-2xl bg-card border border-border shadow-xs flex flex-col gap-2">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekDayHeaders.map((dayName, idx) => (
            <span
              key={idx}
              className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground py-1"
            >
              {dayName}
            </span>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7 gap-1">
          {/* Blank placeholders before 1st of month */}
          {Array.from({ length: startingDayOfWeek }).map((_, idx) => (
            <div key={`blank-${idx}`} className="h-14 sm:h-20 rounded-xl bg-muted/10 opacity-30" />
          ))}

          {/* Month days */}
          {Array.from({ length: totalDays }, (_, i) => {
            const dayNum = i + 1
            const iso = formatDateISO(viewYear, viewMonth, dayNum)
            const isToday = iso === todayStr
            const isPast = iso < todayStr

            const plansForDay = mealPlans.filter((p) => p.date === iso)
            const macros = calculateDayMacros(plansForDay)

            // Gather status dots
            const statusList = plansForDay.map((p) => {
              return calculateMealPlanStatus(p, {
                pantryItems,
                draftItems,
                isPastDate: isPast
              }).status
            })

            return (
              <button
                key={iso}
                type="button"
                onClick={() => onOpenDayView(iso)}
                className={cn(
                  "h-14 sm:h-20 rounded-xl p-1 sm:p-2 border transition-all cursor-pointer flex flex-col justify-between items-start text-left group",
                  isToday
                    ? "border-primary bg-primary/10 shadow-xs"
                    : plansForDay.length > 0
                    ? "border-border/80 bg-background/80 hover:border-primary/50"
                    : "border-border/40 hover:border-border/80 hover:bg-muted/20"
                )}
              >
                {/* Top row: day number + kcal */}
                <div className="w-full flex items-center justify-between">
                  <span
                    className={cn(
                      "text-xs font-bold leading-none",
                      isToday ? "text-primary" : "text-foreground"
                    )}
                  >
                    {dayNum}
                  </span>

                  {macros.kcal > 0 && (
                    <span className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-semibold text-amber-500">
                      <Flame className="w-2.5 h-2.5 fill-amber-500/20" />
                      {macros.kcal}
                    </span>
                  )}
                </div>

                {/* Bottom: Meal status dots */}
                <div className="w-full flex items-center gap-1 overflow-hidden pt-1">
                  {statusList.map((st, dotIdx) => (
                    <span
                      key={dotIdx}
                      className={cn(
                        "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0",
                        st === 'uncertain' && "bg-rose-500 animate-pulse",
                        st === 'bought' && "bg-emerald-500",
                        st === 'in_list' && "bg-amber-500",
                        st === 'in_draft' && "bg-sky-500",
                        st === 'planned' && "bg-muted-foreground/60"
                      )}
                    />
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
