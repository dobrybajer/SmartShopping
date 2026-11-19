import { create } from 'zustand'
import { mealPlanService } from '@/services/mealPlanService'
import { weeklyTemplateService } from '@/services/weeklyTemplateService'
import { shoppingListService } from '@/services/shoppingListService'
import { generateDraftItemsFromMealPlans } from '@/lib/calculations/calendarStatus'
import {
  buildMealPlanInputsFromTemplate,
  buildWeeklyTemplateFromPlans,
  getCalendarFetchWindow,
  loadStoredWeeklyTemplates,
  saveStoredWeeklyTemplates
} from '@/lib/calculations/weeklyTemplateCalculations'
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
  MissingIngredient,
  WeeklyMealTemplate
} from '@/types/calendar'

export interface CalendarLoadedWindow {
  householdId: string
  startDate: string
  endDate: string
}

export interface MealPlanStoreState {
  mealPlans: MealPlanItem[]
  weeklyTemplates: WeeklyMealTemplate[]
  isLoading: boolean
  activeHouseholdId: string | null
  loadedWindow: CalendarLoadedWindow | null
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
  transferWeekToDraft: (
    dates: string[],
    options?: { excludePantryItems?: boolean; silentEmpty?: boolean }
  ) => number
  restoreMissingIngredient: (missing: MissingIngredient, planItem: MealPlanItem) => void
  dismissUncertainty: (planId: string) => Promise<boolean>
  saveWeekAsTemplate: (
    name: string,
    weekStartMondayIso: string,
    numDays?: 5 | 7
  ) => WeeklyMealTemplate | null
  applyWeeklyTemplate: (
    templateId: string,
    targetMondayIso: string,
    options?: { servingsMultiplier?: number; skipDuplicates?: boolean }
  ) => Promise<number>
  deleteWeeklyTemplate: (templateId: string) => void
  syncFromRealtime: () => Promise<void>
  setupRealtimeSubscription: (householdId: string) => () => void
}

const DELETED_ECHO_TTL_MS = 5000
const recentlyDeletedMealPlanIds = new Map<string, number>()
const recentlyDeletedTemplateIds = new Map<string, number>()

function markMealPlansDeleted(ids: string[]) {
  const expiresAt = Date.now() + DELETED_ECHO_TTL_MS
  for (const id of ids) {
    recentlyDeletedMealPlanIds.set(id, expiresAt)
  }
}

function unmarkMealPlansDeleted(ids: string[]) {
  for (const id of ids) {
    recentlyDeletedMealPlanIds.delete(id)
  }
}

function filterOutRecentlyDeletedMealPlans(items: MealPlanItem[]): MealPlanItem[] {
  if (recentlyDeletedMealPlanIds.size === 0) return items
  const now = Date.now()
  for (const [id, expiresAt] of recentlyDeletedMealPlanIds.entries()) {
    if (expiresAt <= now) {
      recentlyDeletedMealPlanIds.delete(id)
    }
  }
  if (recentlyDeletedMealPlanIds.size === 0) return items
  return items.filter((item) => !recentlyDeletedMealPlanIds.has(item.id))
}

function markTemplatesDeleted(ids: string[]) {
  const expiresAt = Date.now() + DELETED_ECHO_TTL_MS
  for (const id of ids) {
    recentlyDeletedTemplateIds.set(id, expiresAt)
  }
}

function unmarkTemplatesDeleted(ids: string[]) {
  for (const id of ids) {
    recentlyDeletedTemplateIds.delete(id)
  }
}

function filterOutRecentlyDeletedTemplates(templates: WeeklyMealTemplate[]): WeeklyMealTemplate[] {
  if (recentlyDeletedTemplateIds.size === 0) return templates
  const now = Date.now()
  for (const [id, expiresAt] of recentlyDeletedTemplateIds.entries()) {
    if (expiresAt <= now) {
      recentlyDeletedTemplateIds.delete(id)
    }
  }
  if (recentlyDeletedTemplateIds.size === 0) return templates
  return templates.filter((tpl) => !recentlyDeletedTemplateIds.has(tpl.id))
}

function getTodayString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function refreshCalendarPipelineItems(householdId: string): Promise<void> {
  if (typeof shoppingListService.getCalendarPipelineItems !== 'function') return
  try {
    const { activeListItems, archivedListItems } =
      await shoppingListService.getCalendarPipelineItems(householdId)
    const shoppingState = useShoppingStore.getState()
    shoppingState.setActiveListItems(activeListItems)
    shoppingState.setArchivedListItems(archivedListItems)
  } catch {
    // Preserve existing cached pipeline state when network/query is unavailable
  }
}

async function fetchTemplatesWithCache(
  householdId: string,
  cachedLocal: WeeklyMealTemplate[]
): Promise<WeeklyMealTemplate[]> {
  if (typeof weeklyTemplateService.syncRemoteTemplates === 'function') {
    const synced = await weeklyTemplateService.syncRemoteTemplates(householdId, cachedLocal)
    const filtered = filterOutRecentlyDeletedTemplates(synced)
    if (filtered.length !== synced.length) {
      saveStoredWeeklyTemplates(householdId, filtered)
    }
    return filtered
  }
  return filterOutRecentlyDeletedTemplates(cachedLocal)
}

export const useMealPlanStore = create<MealPlanStoreState>((set, get) => ({
  mealPlans: [],
  weeklyTemplates: [],
  isLoading: false,
  activeHouseholdId: null,
  loadedWindow: null,
  viewMode: 'week',
  weekRangeMode: 'workweek',
  selectedDate: getTodayString(),

  setActiveHouseholdId: (householdId) => {
    if (!householdId || get().activeHouseholdId !== householdId) {
      recentlyDeletedMealPlanIds.clear()
      recentlyDeletedTemplateIds.clear()
    }
    set({
      activeHouseholdId: householdId,
      weeklyTemplates: loadStoredWeeklyTemplates(householdId)
    })
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
    const windowBounds =
      startDate && endDate
        ? { startDate, endDate }
        : getCalendarFetchWindow(get().selectedDate)
    const cachedTemplates = loadStoredWeeklyTemplates(householdId)

    set({
      isLoading: true,
      activeHouseholdId: householdId,
      weeklyTemplates: cachedTemplates
    })

    try {
      const [items, syncedTemplates] = await Promise.all([
        mealPlanService.getMealPlans(householdId, windowBounds.startDate, windowBounds.endDate),
        fetchTemplatesWithCache(householdId, cachedTemplates),
        refreshCalendarPipelineItems(householdId)
      ])
      if (get().activeHouseholdId !== householdId) return
      const safeTemplates = filterOutRecentlyDeletedTemplates(syncedTemplates)
      if (safeTemplates.length !== syncedTemplates.length) {
        saveStoredWeeklyTemplates(householdId, safeTemplates)
      }
      set({
        mealPlans: filterOutRecentlyDeletedMealPlans(items),
        weeklyTemplates: safeTemplates,
        loadedWindow: {
          householdId,
          startDate: windowBounds.startDate,
          endDate: windowBounds.endDate
        },
        isLoading: false
      })
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
      is_uncertainty_dismissed: input.is_uncertainty_dismissed ?? false,
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

    toast.success(translate('calendar.mealAddedToast'))
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
    markMealPlansDeleted([id])
    set({
      mealPlans: previousPlans.filter((p) => p.id !== id)
    })

    const success = await mealPlanService.deleteMealPlan(id)
    if (!success) {
      unmarkMealPlansDeleted([id])
      set({ mealPlans: previousPlans })
      toast.error(translate('toasts.errorOccurred'))
      return false
    }

    toast.success(translate('calendar.mealDeletedToast'))
    return true
  },

  duplicateMealPlan: async (planItem, targetDate) => {
    const duplicated = await mealPlanService.duplicateMealPlanToDate(planItem, targetDate)
    if (!duplicated) {
      toast.error(translate('toasts.errorOccurred'))
      return null
    }

    const currentPlans = get().mealPlans
    if (!currentPlans.some((p) => p.id === duplicated.id)) {
      set({ mealPlans: [...currentPlans, duplicated] })
    }
    toast.success(translate('calendar.mealDuplicatedToast'))
    return duplicated
  },

  transferMealToDraft: (planItem, options = {}) => {
    const { pantryItems, pantryMapByProductId, pantryItemsByParentId } = usePantryStore.getState()
    const payloads = generateDraftItemsFromMealPlans([planItem], {
      excludePantryItems: options.excludePantryItems ?? true,
      pantryItems,
      pantryMapByProductId,
      pantryItemsByParentId
    })

    if (payloads.length === 0) {
      toast.info(translate('calendar.noIngredientsToTransfer'))
      return 0
    }

    useShoppingStore.getState().addMultipleToDraft(payloads)
    toast.success(translate('calendar.transferredToDraftSuccess', { count: payloads.length }))
    return payloads.length
  },

  transferDayToDraft: (date, options = {}) => {
    const plansForDay = get().mealPlans.filter((p) => p.date === date)
    if (plansForDay.length === 0) return 0

    const { pantryItems, pantryMapByProductId, pantryItemsByParentId } = usePantryStore.getState()
    const allPayloads = generateDraftItemsFromMealPlans(plansForDay, {
      excludePantryItems: options.excludePantryItems ?? true,
      pantryItems,
      pantryMapByProductId,
      pantryItemsByParentId
    })

    if (allPayloads.length === 0) {
      toast.info(translate('calendar.noIngredientsToTransfer'))
      return 0
    }

    useShoppingStore.getState().addMultipleToDraft(allPayloads)
    toast.success(translate('calendar.dayTransferredToDraftSuccess', { count: allPayloads.length }))
    return allPayloads.length
  },

  transferWeekToDraft: (dates, options = {}) => {
    const dateSet = new Set(dates)
    const plansForWeek = get().mealPlans.filter((p) => dateSet.has(p.date))
    if (plansForWeek.length === 0) {
      if (!options.silentEmpty) {
        toast.info(translate('calendar.noIngredientsToTransfer'))
      }
      return 0
    }

    const { pantryItems, pantryMapByProductId, pantryItemsByParentId } = usePantryStore.getState()
    const allPayloads = generateDraftItemsFromMealPlans(plansForWeek, {
      excludePantryItems: options.excludePantryItems ?? true,
      pantryItems,
      pantryMapByProductId,
      pantryItemsByParentId
    })

    if (allPayloads.length === 0) {
      if (!options.silentEmpty) {
        toast.info(translate('calendar.noIngredientsToTransfer'))
      }
      return 0
    }

    useShoppingStore.getState().addMultipleToDraft(allPayloads)
    toast.success(translate('calendar.weekTransferredToDraftSuccess', { count: allPayloads.length }))
    return allPayloads.length
  },

  restoreMissingIngredient: (missing, planItem) => {
    const payload = mealPlanService.createRestoreDraftPayload(missing, planItem, planItem.date)
    useShoppingStore.getState().addItemToDraft(payload)
    toast.success(translate('calendar.ingredientRestoredToast', { name: missing.productName }))
  },

  dismissUncertainty: async (planId) => {
    const success = await get().updateMealPlan(planId, { is_uncertainty_dismissed: true })
    if (success) {
      toast.success(translate('calendar.uncertainty.dismissedToast'))
    }
    return success
  },

  saveWeekAsTemplate: (name, weekStartMondayIso, numDays = 7) => {
    const hhId = get().activeHouseholdId
    if (!hhId) return null

    const template = buildWeeklyTemplateFromPlans({
      name,
      householdId: hhId,
      weekStartMondayIso,
      plans: get().mealPlans,
      numDays
    })

    if (!template) {
      toast.info(translate('calendar.templates.emptyWeekNotice'))
      return null
    }

    const updated = [template, ...get().weeklyTemplates]
    saveStoredWeeklyTemplates(hhId, updated)
    set({ weeklyTemplates: updated })
    toast.success(translate('calendar.templates.savedToast', { name: template.name }))

    if (typeof weeklyTemplateService.saveWeeklyTemplate === 'function') {
      void weeklyTemplateService
        .saveWeeklyTemplate(template)
        .then((saved) => {
          if (!saved || get().activeHouseholdId !== hhId) return
          if (recentlyDeletedTemplateIds.has(template.id)) {
            if (typeof weeklyTemplateService.deleteWeeklyTemplate === 'function') {
              void weeklyTemplateService.deleteWeeklyTemplate(saved.id, hhId).catch(() => {})
            }
            return
          }
          const current = get().weeklyTemplates.map((t) => (t.id === template.id ? saved : t))
          saveStoredWeeklyTemplates(hhId, current)
          set({ weeklyTemplates: current })
        })
        .catch(() => {})
    }

    return template
  },

  applyWeeklyTemplate: async (templateId, targetMondayIso, options = {}) => {
    const hhId = get().activeHouseholdId
    if (!hhId) return 0

    const template = get().weeklyTemplates.find((tpl) => tpl.id === templateId)
    if (!template) return 0

    const inputs = buildMealPlanInputsFromTemplate({
      template,
      targetMondayIso,
      householdId: hhId,
      servingsMultiplier: options.servingsMultiplier ?? 1,
      existingPlansForWeek: get().mealPlans,
      skipDuplicates: options.skipDuplicates ?? true
    })

    if (inputs.length === 0) {
      toast.info(translate('calendar.templates.nothingToApplyNotice'))
      return 0
    }

    let createdItems: MealPlanItem[] = []
    if (typeof mealPlanService.createMealPlansBatch === 'function') {
      createdItems = await mealPlanService.createMealPlansBatch(inputs)
    }
    if (createdItems.length === 0 && typeof mealPlanService.createMealPlan === 'function') {
      const results = await Promise.all(inputs.map((input) => mealPlanService.createMealPlan(input)))
      createdItems = results.filter((item): item is MealPlanItem => item !== null)
    }

    if (createdItems.length > 0) {
      set({ mealPlans: [...get().mealPlans, ...createdItems] })
      toast.success(
        translate('calendar.templates.appliedToast', {
          name: template.name,
          count: createdItems.length
        })
      )
    } else {
      toast.error(translate('toasts.errorOccurred'))
    }

    return createdItems.length
  },

  deleteWeeklyTemplate: (templateId) => {
    const hhId = get().activeHouseholdId
    const previousTemplates = get().weeklyTemplates
    markTemplatesDeleted([templateId])
    const updated = previousTemplates.filter((tpl) => tpl.id !== templateId)
    if (hhId) {
      saveStoredWeeklyTemplates(hhId, updated)
      if (typeof weeklyTemplateService.deleteWeeklyTemplate === 'function') {
        void weeklyTemplateService
          .deleteWeeklyTemplate(templateId, hhId)
          .then((ok) => {
            if (!ok) {
              unmarkTemplatesDeleted([templateId])
              saveStoredWeeklyTemplates(hhId, previousTemplates)
              set({ weeklyTemplates: previousTemplates })
              toast.error(translate('toasts.errorOccurred'))
            }
          })
          .catch(() => {
            unmarkTemplatesDeleted([templateId])
            saveStoredWeeklyTemplates(hhId, previousTemplates)
            set({ weeklyTemplates: previousTemplates })
            toast.error(translate('toasts.errorOccurred'))
          })
      }
    }
    set({ weeklyTemplates: updated })
    toast.success(translate('calendar.templates.deletedToast'))
  },

  syncFromRealtime: async () => {
    const hhId = get().activeHouseholdId
    if (!hhId) return
    const currentWindow = get().loadedWindow
    const windowBounds =
      currentWindow && currentWindow.householdId === hhId
        ? { startDate: currentWindow.startDate, endDate: currentWindow.endDate }
        : getCalendarFetchWindow(get().selectedDate)
    const cachedTemplates = get().weeklyTemplates

    const [items, syncedTemplates] = await Promise.all([
      mealPlanService.getMealPlans(hhId, windowBounds.startDate, windowBounds.endDate),
      fetchTemplatesWithCache(hhId, cachedTemplates),
      refreshCalendarPipelineItems(hhId)
    ])
    if (get().activeHouseholdId !== hhId) return
    const safeTemplates = filterOutRecentlyDeletedTemplates(syncedTemplates)
    if (safeTemplates.length !== syncedTemplates.length) {
      saveStoredWeeklyTemplates(hhId, safeTemplates)
    }
    set({
      mealPlans: filterOutRecentlyDeletedMealPlans(items),
      weeklyTemplates: safeTemplates
    })
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weekly_meal_templates',
          filter: `household_id=eq.${householdId}`
        },
        async () => {
          const synced = await fetchTemplatesWithCache(householdId, get().weeklyTemplates)
          if (get().activeHouseholdId === householdId) {
            const safeTemplates = filterOutRecentlyDeletedTemplates(synced)
            if (safeTemplates.length !== synced.length) {
              saveStoredWeeklyTemplates(householdId, safeTemplates)
            }
            set({ weeklyTemplates: safeTemplates })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }
}))
