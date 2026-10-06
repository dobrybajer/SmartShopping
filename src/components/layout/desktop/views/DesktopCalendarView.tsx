import React, { useEffect, useState } from 'react'
import { useTranslation } from '@/i18n'
import { useAuth } from '@/context/AuthContext'
import { useMealPlanStore } from '@/store/useMealPlanStore'
import { DayCalendarView } from '@/components/calendar/DayCalendarView'
import { WeekCalendarView } from '@/components/calendar/WeekCalendarView'
import { MonthCalendarGrid } from '@/components/calendar/MonthCalendarGrid'
import { AddCalendarMealDialog } from '@/components/calendar/AddCalendarMealDialog'
import { Calendar as CalendarIcon, CalendarDays, Clock, Plus, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const DesktopCalendarView: React.FC = () => {
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
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full p-6 text-foreground">
      {/* 1. Desktop Header Bar */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-3xl bg-card border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Utensils className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {t('calendar.title')}
            </h1>
            <span className="text-xs text-muted-foreground">
              Planuj posiłki, kontroluj makro i wysyłaj składniki bezpośrednio do listy zakupów
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode segmented switcher */}
          <div className="flex rounded-2xl bg-muted/60 p-1 border border-border">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={cn(
                "py-1.5 px-3.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer",
                viewMode === 'month'
                  ? "bg-card text-foreground shadow-xs"
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
                "py-1.5 px-3.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer",
                viewMode === 'week'
                  ? "bg-card text-foreground shadow-xs"
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
                "py-1.5 px-3.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer",
                viewMode === 'day'
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{t('calendar.dayView')}</span>
            </button>
          </div>

          {/* Add meal button */}
          <Button
            onClick={() => handleOpenAddMeal(selectedDate)}
            className="rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t('calendar.addMeal')}</span>
          </Button>
        </div>
      </div>

      {/* 2. Main Calendar Content */}
      <div className="flex flex-col">
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
      </div>

      {/* Add / Edit Meal Dialog */}
      <AddCalendarMealDialog
        isOpen={isAddMealOpen}
        onClose={() => setIsAddMealOpen(false)}
        initialDate={addMealDate}
      />
    </div>
  )
}
