import React, { Suspense, lazy, useEffect, useState } from 'react'
import { useTranslation } from '@/i18n'
import { useAuth } from '@/hooks/useAuth'
import { useMealPlanStore } from '@/store/useMealPlanStore'
import { getCalendarFetchWindow } from '@/lib/calculations/weeklyTemplateCalculations'
import { useShallow } from 'zustand/react/shallow'

const DayCalendarView = lazy(() =>
  import('@/components/calendar/DayCalendarView').then((m) => ({ default: m.DayCalendarView }))
)
const WeekCalendarView = lazy(() =>
  import('@/components/calendar/WeekCalendarView').then((m) => ({ default: m.WeekCalendarView }))
)
const MonthCalendarGrid = lazy(() =>
  import('@/components/calendar/MonthCalendarGrid').then((m) => ({ default: m.MonthCalendarGrid }))
)
const AddCalendarMealDialog = lazy(() =>
  import('@/components/calendar/AddCalendarMealDialog').then((m) => ({
    default: m.AddCalendarMealDialog
  }))
)

const CalendarModeFallback: React.FC = () => (
  <div className="w-full h-40 flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
)
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
    loadedWindow,
    loadMealPlans,
    setupRealtimeSubscription
  } = useMealPlanStore(
    useShallow((state) => ({
      viewMode: state.viewMode,
      setViewMode: state.setViewMode,
      selectedDate: state.selectedDate,
      setSelectedDate: state.setSelectedDate,
      loadedWindow: state.loadedWindow,
      loadMealPlans: state.loadMealPlans,
      setupRealtimeSubscription: state.setupRealtimeSubscription
    }))
  )

  const [isAddMealOpen, setIsAddMealOpen] = useState(false)
  const [addMealDate, setAddMealDate] = useState(selectedDate)

  // Subscribe to Realtime changes once per household
  useEffect(() => {
    if (household?.id) {
      const unsubscribe = setupRealtimeSubscription(household.id)
      return () => {
        unsubscribe()
      }
    }
  }, [household?.id, setupRealtimeSubscription])

  // Load bounded ±7d month window whenever household changes or selectedDate leaves cached window
  useEffect(() => {
    if (!household?.id) return
    const isOutOfWindow =
      !loadedWindow ||
      loadedWindow.householdId !== household.id ||
      selectedDate < loadedWindow.startDate ||
      selectedDate > loadedWindow.endDate

    if (isOutOfWindow) {
      const { startDate, endDate } = getCalendarFetchWindow(selectedDate)
      loadMealPlans(household.id, startDate, endDate)
    }
  }, [household?.id, selectedDate, loadedWindow, loadMealPlans])

  const handleOpenDayView = (date: string) => {
    setSelectedDate(date)
    setViewMode('day')
  }

  const handleOpenAddMeal = (date: string) => {
    setAddMealDate(date)
    setIsAddMealOpen(true)
  }

  return (
    <div className="flex flex-col bg-background text-foreground w-full max-w-full overflow-x-hidden">
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
      <Suspense fallback={<CalendarModeFallback />}>
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
      </Suspense>

      {/* Add Meal Dialog */}
      {isAddMealOpen && (
        <Suspense fallback={null}>
          <AddCalendarMealDialog
            isOpen={isAddMealOpen}
            onClose={() => setIsAddMealOpen(false)}
            initialDate={addMealDate}
          />
        </Suspense>
      )}
    </div>
  )
}
