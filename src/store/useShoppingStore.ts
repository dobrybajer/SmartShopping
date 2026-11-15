import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Database, UnitEnum } from '@/types/supabase'
import type { ShoppingListSummary } from '@/services/shoppingListService'
import {
  appendMealToDraftItems,
  appendMultipleItemsToDraftItems,
  appendSingleItemToDraftItems
} from '@/lib/calculations/draftCalculations'

export type Product = Database['public']['Tables']['products']['Row']
export type ProductCategory = Database['public']['Tables']['product_categories']['Row']
export type MealCategory = Database['public']['Tables']['meal_categories']['Row']

export interface MealIngredientWithProduct {
  id: string
  meal_id: string | null
  product_id: string | null
  reference_product_id?: string | null
  base_quantity: number
  is_pantry_item: boolean | null
  product: Product | null
  reference_product?: Product | null
}

export interface MealWithIngredients {
  id: string
  household_id: string | null
  name: string
  description: string | null
  preparation_steps: string | null
  comments: string | null
  category_id: number | null
  tags: string[] | null
  type?: 'Global' | 'Household'
  ingredients: MealIngredientWithProduct[]
}

export interface DraftItem {
  id: string // unique local ID
  product_id?: string
  name: string
  unit_type: UnitEnum
  category_id?: number
  category_name: string
  sort_order: number
  quantity: number
  is_ad_hoc: boolean
  is_pantry_item?: boolean
  meal_source?: string
  meal_plan_item_id?: string | null
}

export interface AddToDraftPayload {
  product_id?: string
  name: string
  unit_type: UnitEnum
  category_id?: number
  category_name?: string
  sort_order?: number
  quantity: number
  is_ad_hoc?: boolean
  meal_source?: string
  meal_plan_item_id?: string | null
}

interface ShoppingStoreState {
  activeHouseholdId: string | null
  draftsByHousehold: Record<string, DraftItem[]>
  draftItems: DraftItem[]
  selectedActiveListId: string | null
  selectedActiveListIdByHousehold: Record<string, string | null>
  activeListsSummary: ShoppingListSummary[]

  // Actions
  setActiveHousehold: (householdId: string | null) => void
  setSelectedActiveListId: (id: string | null) => void
  setActiveListsSummary: (lists: ShoppingListSummary[]) => void
  addMealToDraft: (meal: MealWithIngredients, targetKcal?: number) => void
  addAdHocToDraft: (item: {
    product_id?: string
    name: string
    unit_type: UnitEnum
    category_id?: number
    category_name: string
    sort_order?: number
    quantity: number
  }) => void
  addItemToDraft: (item: AddToDraftPayload) => void
  addMultipleToDraft: (items: AddToDraftPayload[]) => void
  removeFromDraft: (id: string) => void
  removeMultipleFromDraft: (ids: string[]) => void
  updateDraftQuantity: (id: string, quantity: number) => void
  clearDraft: () => void
  setDraftItems: (items: DraftItem[]) => void
}

export const useShoppingStore = create<ShoppingStoreState>()(
  persist(
    (set, get) => ({
      activeHouseholdId: null,
      draftsByHousehold: {},
      draftItems: [],
      selectedActiveListId: null,
      selectedActiveListIdByHousehold: {},
      activeListsSummary: [],

      setActiveHousehold: (householdId) => {
        const drafts = get().draftsByHousehold || {}
        const listIds = get().selectedActiveListIdByHousehold || {}
        const key = householdId || 'default'
        const currentHouseholdItems = drafts[key] || []
        const currentSelectedListId = listIds[key] || null
        set({
          activeHouseholdId: householdId,
          draftItems: currentHouseholdItems,
          selectedActiveListId: currentSelectedListId
        })
      },

      setSelectedActiveListId: (id) => {
        const state = get()
        const key = state.activeHouseholdId || 'default'
        set({
          selectedActiveListId: id,
          selectedActiveListIdByHousehold: {
            ...state.selectedActiveListIdByHousehold,
            [key]: id
          }
        })
      },

      setActiveListsSummary: (lists) => {
        set({ activeListsSummary: lists })
      },

      addMealToDraft: (meal, targetKcal) => {
        const state = get()
        const key = state.activeHouseholdId || 'default'
        const currentDraft = state.draftsByHousehold[key] || state.draftItems || []
        const updatedDraft = appendMealToDraftItems(currentDraft, meal, targetKcal)

        set({
          draftsByHousehold: {
            ...state.draftsByHousehold,
            [key]: updatedDraft
          },
          draftItems: updatedDraft
        })
      },

      addAdHocToDraft: (item) => {
        const state = get()
        const key = state.activeHouseholdId || 'default'
        const currentDraft = state.draftsByHousehold[key] || state.draftItems || []

        const newItem: DraftItem = {
          id: `adhoc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          product_id: item.product_id,
          name: item.name,
          unit_type: item.unit_type,
          category_id: item.category_id,
          category_name: item.category_name || 'other',
          sort_order: item.sort_order ?? 99,
          quantity: item.quantity,
          is_ad_hoc: true
        }

        const updatedDraft = [...currentDraft, newItem]
        set({
          draftsByHousehold: {
            ...state.draftsByHousehold,
            [key]: updatedDraft
          },
          draftItems: updatedDraft
        })
      },

      addItemToDraft: (item) => {
        const state = get()
        const key = state.activeHouseholdId || 'default'
        const currentDraft = state.draftsByHousehold[key] || state.draftItems || []
        const updatedDraft = appendSingleItemToDraftItems(currentDraft, item)

        set({
          draftsByHousehold: {
            ...state.draftsByHousehold,
            [key]: updatedDraft
          },
          draftItems: updatedDraft
        })
      },

      addMultipleToDraft: (items) => {
        const state = get()
        const key = state.activeHouseholdId || 'default'
        const currentDraft = state.draftsByHousehold[key] || state.draftItems || []
        const updatedDraft = appendMultipleItemsToDraftItems(currentDraft, items)

        set({
          draftsByHousehold: {
            ...state.draftsByHousehold,
            [key]: updatedDraft
          },
          draftItems: updatedDraft
        })
      },

      removeFromDraft: (id) => {
        const state = get()
        const key = state.activeHouseholdId || 'default'
        const currentDraft = state.draftsByHousehold[key] || state.draftItems || []
        const updatedDraft = currentDraft.filter((i) => i.id !== id)

        set({
          draftsByHousehold: {
            ...state.draftsByHousehold,
            [key]: updatedDraft
          },
          draftItems: updatedDraft
        })
      },

      removeMultipleFromDraft: (ids) => {
        const state = get()
        const key = state.activeHouseholdId || 'default'
        const currentDraft = state.draftsByHousehold[key] || state.draftItems || []
        const idSet = new Set(ids)
        const updatedDraft = currentDraft.filter((i) => !idSet.has(i.id))

        set({
          draftsByHousehold: {
            ...state.draftsByHousehold,
            [key]: updatedDraft
          },
          draftItems: updatedDraft
        })
      },

      updateDraftQuantity: (id, quantity) => {
        const state = get()
        const key = state.activeHouseholdId || 'default'
        const currentDraft = state.draftsByHousehold[key] || state.draftItems || []
        const updatedDraft = currentDraft.map((i) => (i.id === id ? { ...i, quantity } : i))

        set({
          draftsByHousehold: {
            ...state.draftsByHousehold,
            [key]: updatedDraft
          },
          draftItems: updatedDraft
        })
      },

      clearDraft: () => {
        const state = get()
        const key = state.activeHouseholdId || 'default'

        set({
          draftsByHousehold: {
            ...state.draftsByHousehold,
            [key]: []
          },
          draftItems: []
        })
      },

      setDraftItems: (items) => {
        const state = get()
        const key = state.activeHouseholdId || 'default'

        set({
          draftsByHousehold: {
            ...state.draftsByHousehold,
            [key]: items
          },
          draftItems: items
        })
      }
    }),
    {
      name: 'smartshopping_draft_store',
      storage: createJSONStorage(() => localStorage)
    }
  )
)
