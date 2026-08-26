import { create } from 'zustand'
import { categoryService } from '@/services/categoryService'
import {
  resolveCategoriesWithSettings,
  calculateSparseIntervals
} from '@/lib/calculations/categorySorting'
import type {
  RawCategoryRow,
  HouseholdCategorySettingRow,
  ResolvedCategory
} from '@/types/category'
import { supabase } from '@/lib/supabase'

interface CategoryStoreState {
  activeHouseholdId: string | null
  categoriesByHousehold: Record<string, ResolvedCategory[]>
  rawCategoriesByHousehold: Record<string, RawCategoryRow[]>
  settingsByHousehold: Record<string, HouseholdCategorySettingRow[]>
  isLoading: boolean
  error: string | null

  // Actions
  setActiveHousehold: (householdId: string | null) => void
  loadCategories: (householdId?: string | null, activeCategoryIds?: Set<number>) => Promise<void>
  reorderCategories: (householdId: string, orderedCategoryIds: number[]) => Promise<boolean>
  toggleVisibility: (householdId: string, categoryId: number, isHidden: boolean) => Promise<boolean>
  createCustomCategory: (householdId: string, name: string) => Promise<RawCategoryRow | null>
  updateCustomCategory: (
    householdId: string,
    categoryId: number,
    name: string
  ) => Promise<boolean>
  deleteCustomCategory: (householdId: string, categoryId: number) => Promise<boolean>
  subscribeRealtime: (householdId: string) => () => void
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

export const useCategoryStore = create<CategoryStoreState>()((set, get) => ({
  activeHouseholdId: null,
  categoriesByHousehold: {},
  rawCategoriesByHousehold: {},
  settingsByHousehold: {},
  isLoading: false,
  error: null,

  setActiveHousehold: (householdId) => {
    set({ activeHouseholdId: householdId })
  },

  loadCategories: async (householdId, activeCategoryIds) => {
    const targetHh = householdId !== undefined ? householdId : get().activeHouseholdId
    const key = targetHh || 'global'

    set({ isLoading: true, error: null })

    try {
      const { categories, settings } = await categoryService.getCategoriesWithSettings(targetHh)
      const resolved = resolveCategoriesWithSettings(categories, settings, activeCategoryIds)

      set((state) => ({
        isLoading: false,
        rawCategoriesByHousehold: {
          ...state.rawCategoriesByHousehold,
          [key]: categories
        },
        settingsByHousehold: {
          ...state.settingsByHousehold,
          [key]: settings
        },
        categoriesByHousehold: {
          ...state.categoriesByHousehold,
          [key]: resolved
        }
      }))
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Failed to load categories' })
    }
  },

  reorderCategories: async (householdId, orderedCategoryIds) => {
    const key = householdId || 'global'
    const previousCategories = get().categoriesByHousehold[key] || []
    const previousSettings = get().settingsByHousehold[key] || []

    // 1. Calculate new sparse intervals
    const sparseUpdates = calculateSparseIntervals(orderedCategoryIds)
    const orderMap = new Map(sparseUpdates.map((u) => [u.category_id, u.custom_sort_order]))

    // 2. Optimistic UI update
    const updatedCategories: ResolvedCategory[] = previousCategories
      .map((cat) => {
        const newOrder = orderMap.get(cat.id)
        return newOrder !== undefined ? { ...cat, sort_order: newOrder } : cat
      })
      .sort((a, b) => a.sort_order - b.sort_order)

    set((state) => ({
      categoriesByHousehold: {
        ...state.categoriesByHousehold,
        [key]: updatedCategories
      }
    }))

    // 3. Debounced batch upsert (400ms)
    return new Promise<boolean>((resolve) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      debounceTimer = setTimeout(async () => {
        const success = await categoryService.batchUpsertCategorySettings(
          householdId,
          sparseUpdates
        )

        if (!success) {
          // Rollback on failure
          set((state) => ({
            categoriesByHousehold: {
              ...state.categoriesByHousehold,
              [key]: previousCategories
            },
            settingsByHousehold: {
              ...state.settingsByHousehold,
              [key]: previousSettings
            },
            error: 'Failed to save aisle order'
          }))
          resolve(false)
        } else {
          resolve(true)
        }
      }, 400)
    })
  },

  toggleVisibility: async (householdId, categoryId, isHidden) => {
    const key = householdId || 'global'
    const previousCategories = get().categoriesByHousehold[key] || []
    const previousSettings = get().settingsByHousehold[key] || []

    const targetCat = previousCategories.find((c) => c.id === categoryId)
    const currentSortOrder = targetCat ? targetCat.sort_order : 990

    // 1. Optimistic UI update
    const updatedCategories = previousCategories.map((c) =>
      c.id === categoryId ? { ...c, is_hidden: isHidden } : c
    )

    set((state) => ({
      categoriesByHousehold: {
        ...state.categoriesByHousehold,
        [key]: updatedCategories
      }
    }))

    // 2. Persist to Supabase
    const success = await categoryService.toggleCategoryVisibility(
      householdId,
      categoryId,
      isHidden,
      currentSortOrder
    )

    if (!success) {
      // Rollback
      set((state) => ({
        categoriesByHousehold: {
          ...state.categoriesByHousehold,
          [key]: previousCategories
        },
        settingsByHousehold: {
          ...state.settingsByHousehold,
          [key]: previousSettings
        },
        error: 'Failed to update category visibility'
      }))
      return false
    }

    return true
  },

  createCustomCategory: async (householdId, name) => {
    const created = await categoryService.createCustomCategory(householdId, name)
    if (created) {
      await get().loadCategories(householdId)
    }
    return created
  },

  updateCustomCategory: async (householdId, categoryId, name) => {
    const key = householdId || 'global'
    const previousCategories = get().categoriesByHousehold[key] || []

    // Optimistic UI update
    set((state) => ({
      categoriesByHousehold: {
        ...state.categoriesByHousehold,
        [key]: previousCategories.map((c) =>
          c.id === categoryId ? { ...c, name: name.trim() } : c
        )
      }
    }))

    const updated = await categoryService.updateCustomCategory(categoryId, householdId, name)
    if (!updated) {
      // Rollback
      set((state) => ({
        categoriesByHousehold: {
          ...state.categoriesByHousehold,
          [key]: previousCategories
        },
        error: 'Failed to update custom category'
      }))
      return false
    }

    return true
  },

  deleteCustomCategory: async (householdId, categoryId) => {
    const key = householdId || 'global'
    const previousCategories = get().categoriesByHousehold[key] || []

    // Optimistic UI update
    set((state) => ({
      categoriesByHousehold: {
        ...state.categoriesByHousehold,
        [key]: previousCategories.filter((c) => c.id !== categoryId)
      }
    }))

    const success = await categoryService.deleteCustomCategory(categoryId, householdId)
    if (!success) {
      // Rollback
      set((state) => ({
        categoriesByHousehold: {
          ...state.categoriesByHousehold,
          [key]: previousCategories
        },
        error: 'Failed to delete custom category'
      }))
      return false
    }

    return true
  },

  subscribeRealtime: (householdId) => {
    if (!householdId) return () => {}

    const channel = supabase
      .channel(`category_settings_realtime_${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'household_category_settings',
          filter: `household_id=eq.${householdId}`
        },
        () => {
          get().loadCategories(householdId)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_categories',
          filter: `household_id=eq.${householdId}`
        },
        () => {
          get().loadCategories(householdId)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }
}))
