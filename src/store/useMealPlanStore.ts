import { create } from 'zustand'
import { mealPlanService } from '@/services/mealPlanService'
import { generateDraftItemsFromMealPlan } from '@/lib/calculations/calendarStatus'
import { useShoppingStore } from '@/store/useShoppingStore'
import { usePantryStore } from '@/store/usePantryStore'
import { toast } from '@/store/useToastStore'
import { translate } from '@/i18n'
import { supabase } from '@/lib/supabase'
import type {
  MealPlanItem,
  CalendarViewMode,
  WeekRangeMode,
  CreateCalendarMealInput,
  UpdateCalendarMealInput,
  MissingIngredient
} from '@/types/calendar'

export interface MealPlanStoreState {
  mealPlans: MealPlanItem[]
  isLoading: boolean
  activeHouseholdId: string | null
  viewMode: CalendarViewMode
  weekRangeMode: WeekRangeMode
  selectedDate: string // YYYY-MM-DD
  
  // Actions
  setActiveHouseholdId: (householdId: string | null) => void
  setViewMode: (mode: CalendarViewMode) => void
  setWeekRangeMode: (mode: WeekRangeMode) => void
  setSelectedDate: (date: string) => void
  loadMealPlans: (householdId: string, startDate?: string, endDate?: string) => Promise<void>
  addMealPlan: (input: CreateCalendarMealInput) => Promise<MealPlanItem | null>
  updateMealPlan: (id: string, updates: UpdateCalendarMealInput) => Promise<boolean>
  deleteMealPlan: (id: string) => Promise<boolean>
  duplicateMealPlan: (planItem: MealPlanItem, targetDate: string) => Promise<MealPlanItem | null>
  transferMealToDraft: (planItem: MealPlanItem, options?: { excludePantryItems?: boolean }) => number
  transferDayToDraft: (date: string, options?: { excludePantryItems?: boolean }) => number
  restoreMissingIngredient: (missing: MissingIngredient, planItem: MealPlanItem) => void
  syncFromRealtime: () => Promise<void>
  setupRealtimeSubscription: (householdId: string) => () => void
}

function getTodayString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const useMealPlanStore = create<MealPlanStoreState>((set, get) => ({
  mealPlans: [],
  isLoading: false,
  activeHouseholdId: null,
  viewMode: 'week',
  weekRangeMode: 'workweek',
  selectedDate: getTodayString(),

  setActiveHouseholdId: (householdId) => {
    set({ activeHouseholdId: householdId })
  },

  setViewMode: (mode) => {
    set({ viewMode: mode })
  },

  setWeekRangeMode: (mode) => {
    set({ weekRangeMode: mode })
  },

  setSelectedDate: (date) => {
    set({ selectedDate: date })
  },

  loadMealPlans: async (householdId, startDate, endDate) => {
    if (!householdId) return
    set({ isLoading: true, activeHouseholdId: householdId })

    try {
      const items = await mealPlanService.getMealPlans(householdId, startDate, endDate)
      set({ mealPlans: items, isLoading: false })
    } catch (err) {
      console.error('[useMealPlanStore] Error loading meal plans:', err)
      set({ isLoading: false })
      toast.error(translate('toasts.errorOccurred'))
    }
  },

  addMealPlan: async (input) => {
    const hhId = input.household_id || get().activeHouseholdId
    if (!hhId) return null

    // Optimistic placeholder
    const tempId = `temp_${Date.now()}`
    const optimisticItem: MealPlanItem = {
      id: tempId,
      household_id: hhId,
      date: input.date,
      meal_id: input.meal_id || null,
      meal_category_id: input.meal_category_id || null,
      custom_name: input.custom_name || null,
      is_ad_hoc: input.is_ad_hoc ?? false,
      servings: input.servings ?? 1,
      target_kcal: input.target_kcal ?? null,
      notes: input.notes || null,
      sort_order: input.sort_order ?? 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      meal: null
    }

    const previousPlans = get().mealPlans
    set({ mealPlans: [...previousPlans, optimisticItem] })

    const created = await mealPlanService.createMealPlan({ ...input, household_id: hhId })
    if (!created) {
      // Rollback
      set({ mealPlans: previousPlans })
      toast.error(translate('toasts.errorOccurred'))
      return null
    }

    // Replace optimistic item with server item
    set({
      mealPlans: get().mealPlans.map((item) => (item.id === tempId ? created : item))
    })

    toast.success(translate('calendar.mealAddedToast') || 'Posiłek dodany do planu')
    return created
  },

  updateMealPlan: async (id, updates) => {
    const previousPlans = get().mealPlans
    const existing = previousPlans.find((p) => p.id === id)
    if (!existing) return false

    // Optimistic update
    set({
      mealPlans: previousPlans.map((p) =>
        p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
      )
    })

    const success = await mealPlanService.updateMealPlan(id, updates)
    if (!success) {
      // Rollback
      set({ mealPlans: previousPlans })
      toast.error(translate('toasts.errorOccurred'))
      return false
    }

    return true
  },

  deleteMealPlan: async (id) => {
    const previousPlans = get().mealPlans
    set({
      mealPlans: previousPlans.filter((p) => p.id !== id)
    })

    const success = await mealPlanService.deleteMealPlan(id)
    if (!success) {
      set({ mealPlans: previousPlans })
      toast.error(translate('toasts.errorOccurred'))
      return false
    }

    toast.success(translate('calendar.mealDeletedToast') || 'Posiłek usunięty z planu')
    return true
  },

  duplicateMealPlan: async (planItem, targetDate) => {
    const duplicated = await mealPlanService.duplicateMealPlanToDate(planItem, targetDate)
    if (!duplicated) {
      toast.error(translate('toasts.errorOccurred'))
      return null
    }

    set({ mealPlans: [...get().mealPlans, duplicated] })
    toast.success(translate('calendar.mealDuplicatedToast') || 'Posiłek skopiowany')
    return duplicated
  },

  transferMealToDraft: (planItem, options = {}) => {
    const pantryItems = usePantryStore.getState().pantryItems
    const payloads = generateDraftItemsFromMealPlan(planItem, {
      excludePantryItems: options.excludePantryItems ?? true,
      pantryItems,
      dayLabel: planItem.date
    })

    if (payloads.length === 0) {
      toast.info(translate('calendar.noIngredientsToTransfer') || 'Wszystkie składniki masz w spiżarni lub brak składników')
      return 0
    }

    useShoppingStore.getState().addMultipleToDraft(payloads)
    toast.success(
      translate('calendar.transferredToDraftSuccess', { count: payloads.length }) ||
      `Dodano ${payloads.length} składników do koszyka`
    )
    return payloads.length
  },

  transferDayToDraft: (date, options = {}) => {
    const plansForDay = get().mealPlans.filter((p) => p.date === date)
    if (plansForDay.length === 0) return 0

    const pantryItems = usePantryStore.getState().pantryItems
    const allPayloads = []

    for (const plan of plansForDay) {
      const payloads = generateDraftItemsFromMealPlan(plan, {
        excludePantryItems: options.excludePantryItems ?? true,
        pantryItems,
        dayLabel: plan.date
      })
      allPayloads.push(...payloads)
    }

    if (allPayloads.length === 0) {
      toast.info(translate('calendar.noIngredientsToTransfer') || 'Wszystkie składniki masz w spiżarni lub brak składników')
      return 0
    }

    useShoppingStore.getState().addMultipleToDraft(allPayloads)
    toast.success(
      translate('calendar.dayTransferredToDraftSuccess', { count: allPayloads.length }) ||
      `Dodano ${allPayloads.length} składników z tego dnia do koszyka`
    )
    return allPayloads.length
  },

  restoreMissingIngredient: (missing, planItem) => {
    const payload = mealPlanService.createRestoreDraftPayload(missing, planItem, planItem.date)
    useShoppingStore.getState().addItemToDraft(payload)
    toast.success(
      translate('calendar.ingredientRestoredToast', { name: missing.productName }) ||
      `Przywrócono ${missing.productName} do koszyka`
    )
  },

  syncFromRealtime: async () => {
    const hhId = get().activeHouseholdId
    if (!hhId) return
    const items = await mealPlanService.getMealPlans(hhId)
    set({ mealPlans: items })
  },

  setupRealtimeSubscription: (householdId) => {
    if (!householdId) return () => {}

    const channel = supabase
      .channel(`realtime:meal_plans:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meal_plans',
          filter: `household_id=eq.${householdId}`
        },
        async () => {
          // Re-fetch meal plans when any household member makes changes
          await get().syncFromRealtime()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }
}))
