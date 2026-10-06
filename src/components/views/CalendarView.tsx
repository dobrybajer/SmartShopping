import React, { useEffect, useState } from 'react'
import { useTranslation } from '@/i18n'
import { useAuth } from '@/context/AuthContext'
import { useMealPlanStore } from '@/store/useMealPlanStore'
import { DayCalendarView } from '@/components/calendar/DayCalendarView'
import { WeekCalendarView } from '@/components/calendar/WeekCalendarView'
import { MonthCalendarGrid } from '@/components/calendar/MonthCalendarGrid'
import { AddCalendarMealDialog } from '@/components/calendar/AddCalendarMealDialog'
import { Calendar as CalendarIcon, CalendarDays, Clock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const CalendarView: React.FC = () => {
  const { t } = useTranslation()
  const { household } = useAuth()
  const {
    viewMode,
    setViewMode,
    selectedDate,
    setSelectedDate,
    loadMealPlans,
    setupRealtimeSubscription
  } = useMealPlanStore()

  const [isAddMealOpen, setIsAddMealOpen] = useState(false)
  const [addMealDate, setAddMealDate] = useState(selectedDate)

  // Load plans & subscribe to Realtime
  useEffect(() => {
    if (household?.id) {
      loadMealPlans(household.id)
      const unsubscribe = setupRealtimeSubscription(household.id)
      return () => {
        unsubscribe()
      }
    }
  }, [household?.id, loadMealPlans, setupRealtimeSubscription])

  const handleOpenDayView = (date: string) => {
    setSelectedDate(date)
    setViewMode('day')
  }

  const handleOpenAddMeal = (date: string) => {
    setAddMealDate(date)
    setIsAddMealOpen(true)
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground px-3.5 pt-3">
      {/* 1. View Mode Segmented Controls */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex rounded-2xl bg-card border border-border p-1 shadow-xs flex-1">
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={cn(
              "flex-1 py-1.5 px-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              viewMode === 'month'
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>{t('calendar.monthView')}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={cn(
              "flex-1 py-1.5 px-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              viewMode === 'week'
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>{t('calendar.weekView')}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={cn(
              "flex-1 py-1.5 px-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              viewMode === 'day'
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t('calendar.dayView')}</span>
          </button>
        </div>

        {/* Quick Add Button */}
        <Button
          size="sm"
          onClick={() => handleOpenAddMeal(selectedDate)}
          className="rounded-2xl h-10 w-10 p-0 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 shadow-xs"
          title={t('calendar.addMeal')}
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* 2. Active Mode View */}
      {viewMode === 'month' && (
        <MonthCalendarGrid
          selectedDate={selectedDate}
          onOpenDayView={handleOpenDayView}
        />
      )}

      {viewMode === 'week' && (
        <WeekCalendarView
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onOpenDayView={handleOpenDayView}
          onAddMealClick={handleOpenAddMeal}
        />
      )}

      {viewMode === 'day' && (
        <DayCalendarView
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onAddMealClick={() => handleOpenAddMeal(selectedDate)}
        />
      )}

      {/* Add Meal Dialog */}
      <AddCalendarMealDialog
        isOpen={isAddMealOpen}
        onClose={() => setIsAddMealOpen(false)}
        initialDate={addMealDate}
      />
    </div>
  )
}
