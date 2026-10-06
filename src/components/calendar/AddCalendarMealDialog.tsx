import React, { useState, useEffect } from 'react'
import type { MealPlanItem, CreateCalendarMealInput } from '@/types/calendar'
import type { MealWithIngredients } from '@/store/useShoppingStore'
import { useTranslation } from '@/i18n'
import { useAuth } from '@/context/AuthContext'
import { useMealPlanStore } from '@/store/useMealPlanStore'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import { mealService, type MealCategory } from '@/services/mealService'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Minus, Utensils, Sparkles, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddCalendarMealDialogProps {
  isOpen: boolean
  onClose: () => void
  initialDate: string // YYYY-MM-DD
  editingItem?: MealPlanItem | null
}

export const AddCalendarMealDialog: React.FC<AddCalendarMealDialogProps> = ({
  isOpen,
  onClose,
  initialDate,
  editingItem
}) => {
  const { t } = useTranslation()
  const { household } = useAuth()
  const { isDesktop } = useDeviceLayout()
  const { addMealPlan, updateMealPlan } = useMealPlanStore()

  const [availableMeals, setAvailableMeals] = useState<MealWithIngredients[]>([])
  const [mealCategories, setMealCategories] = useState<MealCategory[]>([])
  const [isLoadingMeals, setIsLoadingMeals] = useState(false)

  // Form State
  const [date, setDate] = useState(initialDate)
  const [isAdHoc, setIsAdHoc] = useState(false)
  const [selectedMealId, setSelectedMealId] = useState<string>('')
  const [customName, setCustomName] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined)
  const [servings, setServings] = useState(1)
  const [targetKcal, setTargetKcal] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [mealSearchQuery, setMealSearchQuery] = useState('')

  useEffect(() => {
    if (isOpen && household?.id) {
      setIsLoadingMeals(true)
      Promise.all([
        mealService.getMeals(household.id),
        mealService.getMealCategories()
      ]).then(([meals, categories]) => {
        setAvailableMeals(meals)
        setMealCategories(categories)
        setIsLoadingMeals(false)
      })
    }
  }, [isOpen, household?.id])

  useEffect(() => {
    if (editingItem) {
      setDate(editingItem.date)
      setIsAdHoc(editingItem.is_ad_hoc)
      setSelectedMealId(editingItem.meal_id || '')
      setCustomName(editingItem.custom_name || '')
      setSelectedCategoryId(editingItem.meal_category_id || undefined)
      setServings(editingItem.servings || 1)
      setTargetKcal(editingItem.target_kcal ? String(editingItem.target_kcal) : '')
      setNotes(editingItem.notes || '')
    } else {
      setDate(initialDate)
      setIsAdHoc(false)
      setSelectedMealId('')
      setCustomName('')
      setSelectedCategoryId(undefined)
      setServings(1)
      setTargetKcal('')
      setNotes('')
      setMealSearchQuery('')
    }
  }, [isOpen, editingItem, initialDate])

  const filteredMeals = availableMeals.filter((m) =>
    m.name.toLowerCase().includes(mealSearchQuery.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!household?.id) return

    if (!isAdHoc && !selectedMealId) return
    if (isAdHoc && !customName.trim()) return

    const parsedKcal = targetKcal.trim() ? Number(targetKcal) : null

    if (editingItem) {
      await updateMealPlan(editingItem.id, {
        date,
        meal_id: isAdHoc ? null : selectedMealId,
        custom_name: isAdHoc ? customName.trim() : null,
        is_ad_hoc: isAdHoc,
        meal_category_id: selectedCategoryId || null,
        servings,
        target_kcal: parsedKcal,
        notes: notes.trim() || null
      })
    } else {
      const input: CreateCalendarMealInput = {
        household_id: household.id,
        date,
        meal_id: isAdHoc ? null : selectedMealId,
        custom_name: isAdHoc ? customName.trim() : null,
        is_ad_hoc: isAdHoc,
        meal_category_id: selectedCategoryId || null,
        servings,
        target_kcal: parsedKcal,
        notes: notes.trim() || null
      }
      await addMealPlan(input)
    }

    onClose()
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
      {/* Date */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t('calendar.dialog.date')}
        </label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-card border-border rounded-xl text-foreground"
          required
        />
      </div>

      {/* Mode Switcher: Cookbook Recipe vs Ad-Hoc */}
      <div className="flex rounded-xl bg-muted/60 p-1 border border-border">
        <button
          type="button"
          onClick={() => setIsAdHoc(false)}
          className={cn(
            "flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
            !isAdHoc
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>{t('calendar.dialog.selectMeal')}</span>
        </button>
        <button
          type="button"
          onClick={() => setIsAdHoc(true)}
          className={cn(
            "flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
            isAdHoc
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('calendar.addAdHocMeal')}</span>
        </button>
      </div>

      {/* Recipe Selection or Custom Name */}
      {!isAdHoc ? (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('calendar.dialog.selectMeal')}
          </label>
          <Input
            type="text"
            placeholder={t('cookbook.searchPlaceholder')}
            value={mealSearchQuery}
            onChange={(e) => setMealSearchQuery(e.target.value)}
            className="bg-card border-border rounded-xl text-xs text-foreground"
          />
          <div className="max-h-44 overflow-y-auto flex flex-col gap-1.5 border border-border rounded-xl p-1 bg-card/50">
            {isLoadingMeals ? (
              <span className="p-3 text-center text-xs text-muted-foreground">
                {t('common.loading')}
              </span>
            ) : filteredMeals.length === 0 ? (
              <span className="p-3 text-center text-xs text-muted-foreground">
                {t('common.noResults')}
              </span>
            ) : (
              filteredMeals.map((meal) => {
                const isSelected = selectedMealId === meal.id
                return (
                  <button
                    key={meal.id}
                    type="button"
                    onClick={() => {
                      setSelectedMealId(meal.id)
                      if (!selectedCategoryId && meal.category_id) {
                        setSelectedCategoryId(meal.category_id)
                      }
                    }}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors cursor-pointer",
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-muted/80 text-foreground"
                    )}
                  >
                    <span>{meal.name}</span>
                    <span className="text-[10px] opacity-70">
                      {meal.ingredients?.length || 0} składników
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Nazwa dania
          </label>
          <Input
            type="text"
            placeholder={t('calendar.dialog.customNamePlaceholder')}
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="bg-card border-border rounded-xl text-foreground"
            required
          />
        </div>
      )}

      {/* Meal Category (Breakfast, Lunch, etc.) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t('calendar.dialog.category')}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {mealCategories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer capitalize",
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground font-semibold"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {cat.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Servings Stepper & Target Kcal */}
      <div className="grid grid-cols-2 gap-3">
        {/* Servings Stepper */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('calendar.dialog.servingsCount')}
          </label>
          <div className="flex items-center justify-between p-1 rounded-xl bg-card border border-border">
            <button
              type="button"
              onClick={() => setServings((prev) => Math.max(1, prev - 1))}
              disabled={servings <= 1}
              className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 disabled:opacity-30 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-bold text-sm text-foreground">{servings}</span>
            <button
              type="button"
              onClick={() => setServings((prev) => prev + 1)}
              className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Target Kcal (optional) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('calendar.targetKcal')} ({t('common.optional')})
          </label>
          <Input
            type="number"
            placeholder="np. 650"
            value={targetKcal}
            onChange={(e) => setTargetKcal(e.target.value)}
            className="bg-card border-border rounded-xl text-foreground"
            min={0}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t('calendar.notes')} ({t('common.optional')})
        </label>
        <Input
          type="text"
          placeholder="np. Obiad dla gości, posiłek na 2 dni"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="bg-card border-border rounded-xl text-foreground"
        />
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          disabled={(!isAdHoc && !selectedMealId) || (isAdHoc && !customName.trim())}
        >
          {t('calendar.dialog.save')}
        </Button>
      </div>
    </form>
  )

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Utensils className="w-5 h-5 text-primary" />
              {editingItem ? t('calendar.dialog.editTitle') : t('calendar.dialog.addTitle')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              {date}
            </DialogDescription>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl bg-card border-t border-border px-5 pb-6 max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left pb-1">
          <SheetTitle className="flex items-center gap-2 text-foreground text-base">
            <Utensils className="w-5 h-5 text-primary" />
            {editingItem ? t('calendar.dialog.editTitle') : t('calendar.dialog.addTitle')}
          </SheetTitle>
          <SheetDescription className="text-muted-foreground text-xs">
            {date}
          </SheetDescription>
        </SheetHeader>
        {formContent}
      </SheetContent>
    </Sheet>
  )
}
