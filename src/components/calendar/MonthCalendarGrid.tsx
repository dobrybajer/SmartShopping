import React, { useEffect, useRef, useState } from 'react'
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

function shiftISODate(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + deltaDays)
  return formatDateISO(dt.getFullYear(), dt.getMonth(), dt.getDate())
}

export const MonthCalendarGrid: React.FC<MonthCalendarGridProps> = ({
  selectedDate,
  onOpenDayView
}) => {
  const { t } = useTranslation()
  const mealPlans = useMealPlanStore((state) => state.mealPlans)
  const pantryItems = usePantryStore((state) => state.pantryItems)
  const draftItems = useShoppingStore((state) => state.draftItems)

  const initialDateObj = new Date(selectedDate + 'T00:00:00')
  const [viewYear, setViewYear] = useState(initialDateObj.getFullYear())
  const [viewMonth, setViewMonth] = useState(initialDateObj.getMonth())
  const [focusedDate, setFocusedDate] = useState(selectedDate)
  const shouldFocusRef = useRef(false)
  const cellRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const todayStr = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (shouldFocusRef.current) {
      cellRefs.current[focusedDate]?.focus()
      shouldFocusRef.current = false
    }
  }, [focusedDate, viewYear, viewMonth])

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

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1)
  const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0)
  const totalDays = lastDayOfMonth.getDate()

  let startingDayOfWeek = firstDayOfMonth.getDay() - 1
  if (startingDayOfWeek === -1) startingDayOfWeek = 6

  const monthTitle = firstDayOfMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric'
  })

  const weekDayHeaders = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2026, 9, 5 + i)
    return d.toLocaleDateString(undefined, { weekday: 'short' })
  })

  const totalCells = Math.ceil((startingDayOfWeek + totalDays) / 7) * 7
  const weeks: Array<Array<{ iso: string; dayNum: number } | null>> = []
  for (let idx = 0; idx < totalCells; idx += 7) {
    const row: Array<{ iso: string; dayNum: number } | null> = []
    for (let col = 0; col < 7; col++) {
      const dayNum = idx + col - startingDayOfWeek + 1
      if (dayNum < 1 || dayNum > totalDays) {
        row.push(null)
      } else {
        row.push({ dayNum, iso: formatDateISO(viewYear, viewMonth, dayNum) })
      }
    }
    weeks.push(row)
  }

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIso: string) => {
    let delta = 0
    if (e.key === 'ArrowLeft') delta = -1
    else if (e.key === 'ArrowRight') delta = 1
    else if (e.key === 'ArrowUp') delta = -7
    else if (e.key === 'ArrowDown') delta = 7
    else if (e.key === 'Home') {
      const dt = new Date(currentIso + 'T00:00:00')
      const mondayOffset = dt.getDay() === 0 ? -6 : 1 - dt.getDay()
      delta = mondayOffset
    } else if (e.key === 'End') {
      const dt = new Date(currentIso + 'T00:00:00')
      const sundayOffset = dt.getDay() === 0 ? 0 : 7 - dt.getDay()
      delta = sundayOffset
    } else {
      return
    }

    e.preventDefault()
    const nextIso = shiftISODate(currentIso, delta)
    const [ny, nm] = nextIso.split('-').map(Number)
    shouldFocusRef.current = true
    setFocusedDate(nextIso)
    if (ny !== viewYear || nm - 1 !== viewMonth) {
      setViewYear(ny)
      setViewMonth(nm - 1)
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* 1. Header with Month switcher */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border shadow-xs">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 text-foreground transition-all cursor-pointer"
          title={t('calendar.prevMonth')}
          aria-label={t('calendar.prevMonth')}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-sm font-bold capitalize text-foreground px-2">{monthTitle}</span>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const now = new Date()
              setViewYear(now.getFullYear())
              setViewMonth(now.getMonth())
              setFocusedDate(todayStr)
            }}
            className="text-xs text-primary font-semibold rounded-lg min-h-[44px] px-3"
          >
            {t('calendar.today')}
          </Button>

          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 text-foreground transition-all cursor-pointer"
            title={t('calendar.nextMonth')}
            aria-label={t('calendar.nextMonth')}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Accessible WAI-ARIA Month Grid */}
      <div
        role="grid"
        aria-label={monthTitle}
        className="p-3 rounded-2xl bg-card border border-border shadow-xs flex flex-col gap-2"
      >
        <div role="row" className="grid grid-cols-7 gap-1 text-center">
          {weekDayHeaders.map((dayName, idx) => (
            <span
              key={idx}
              role="columnheader"
              className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground py-1"
            >
              {dayName}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          {weeks.map((week, wIdx) => (
            <div key={`week-${wIdx}`} role="row" className="grid grid-cols-7 gap-1">
              {week.map((cell, cIdx) => {
                if (!cell) {
                  return (
                    <div
                      key={`blank-${wIdx}-${cIdx}`}
                      role="gridcell"
                      aria-disabled="true"
                      className="h-14 sm:h-20 rounded-xl bg-muted/10 opacity-30"
                    />
                  )
                }

                const { iso, dayNum } = cell
                const isToday = iso === todayStr
                const isSelected = iso === selectedDate
                const isPast = iso < todayStr
                const plansForDay = mealPlans.filter((p) => p.date === iso)
                const macros = calculateDayMacros(plansForDay)

                const statusList = plansForDay.map(
                  (p) =>
                    calculateMealPlanStatus(p, {
                      pantryItems,
                      draftItems,
                      isPastDate: isPast
                    }).status
                )

                const isTabStop =
                  focusedDate.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`)
                    ? focusedDate === iso
                    : dayNum === 1

                return (
                  <div key={iso} role="gridcell" aria-selected={isSelected}>
                    <button
                      ref={(el) => {
                        cellRefs.current[iso] = el
                      }}
                      type="button"
                      tabIndex={isTabStop ? 0 : -1}
                      aria-current={isToday ? 'date' : undefined}
                      aria-label={`${iso}${macros.kcal > 0 ? `, ${macros.kcal} kcal` : ''}`}
                      onKeyDown={(e) => handleCellKeyDown(e, iso)}
                      onFocus={() => setFocusedDate(iso)}
                      onClick={() => onOpenDayView(iso)}
                      className={cn(
                        'w-full h-14 sm:h-20 rounded-xl p-1 sm:p-2 border transition-all cursor-pointer flex flex-col justify-between items-start text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        isToday
                          ? 'border-primary bg-primary/10 shadow-xs'
                          : plansForDay.length > 0
                            ? 'border-border/80 bg-background/80 hover:border-primary/50'
                            : 'border-border/40 hover:border-border/80 hover:bg-muted/20'
                      )}
                    >
                      <div className="w-full flex items-center justify-between">
                        <span
                          className={cn(
                            'text-xs font-bold leading-none',
                            isToday ? 'text-primary' : 'text-foreground'
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

                      <div className="w-full flex items-center gap-1 overflow-hidden pt-1">
                        {statusList.map((st, dotIdx) => (
                          <span
                            key={dotIdx}
                            className={cn(
                              'w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0',
                              st === 'uncertain' && 'bg-rose-500 animate-pulse',
                              st === 'bought' && 'bg-emerald-500',
                              st === 'in_list' && 'bg-amber-500',
                              st === 'in_draft' && 'bg-sky-500',
                              st === 'planned' && 'bg-muted-foreground/60'
                            )}
                          />
                        ))}
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
