import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Database, UnitEnum } from '@/types/supabase'

export type Product = Database['public']['Tables']['products']['Row']
export type ProductCategory = Database['public']['Tables']['product_categories']['Row']
export type MealCategory = Database['public']['Tables']['meal_categories']['Row']

export interface MealIngredientWithProduct {
  id: string
  meal_id: string | null
  product_id: string | null
  base_quantity: number
  is_pantry_item: boolean | null
  product: Product | null
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
}

interface ShoppingStoreState {
  activeHouseholdId: string | null
  draftsByHousehold: Record<string, DraftItem[]>
  draftItems: DraftItem[]
  
  // Actions
  setActiveHousehold: (householdId: string | null) => void
  addMealToDraft: (meal: MealWithIngredients, targetKcal?: number) => void
  addAdHocToDraft: (item: {
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

      setActiveHousehold: (householdId) => {
        const drafts = get().draftsByHousehold || {}
        const key = householdId || 'default'
        const currentHouseholdItems = drafts[key] || []
        set({
          activeHouseholdId: householdId,
          draftItems: currentHouseholdItems
        })
      },

      addMealToDraft: (meal, targetKcal) => {
        const state = get()
        const key = state.activeHouseholdId || 'default'
        const currentDraft = [...(state.draftsByHousehold[key] || state.draftItems || [])]

        // 1. Oblicz całkowitą kaloryczność bazową potrawy
        let baseKcalTotal = 0
        meal.ingredients.forEach((ing) => {
          if (ing.product) {
            const kcalPer100 = ing.product.kcal_per_100 || 0
            baseKcalTotal += (ing.base_quantity / 100) * kcalPer100
          }
        })

        // 2. Wylicz mnożnik (multiplier)
        let multiplier = 1
        if (targetKcal && targetKcal > 0 && baseKcalTotal > 0) {
          multiplier = targetKcal / baseKcalTotal
        }

        // 3. Przekształć składniki na elementy draftu
        const updatedDraft = [...currentDraft]

        meal.ingredients.forEach((ing) => {
          if (ing.is_pantry_item) return
          if (!ing.product) return

          const scaledQuantity = Math.round((ing.base_quantity * multiplier) * 10) / 10

          const existingIndex = updatedDraft.findIndex(
            (d) => d.product_id === ing.product_id && !d.is_ad_hoc
          )

          if (existingIndex >= 0) {
            updatedDraft[existingIndex] = {
              ...updatedDraft[existingIndex],
              quantity: Math.round((updatedDraft[existingIndex].quantity + scaledQuantity) * 10) / 10
            }
          } else {
            updatedDraft.push({
              id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              product_id: ing.product.id,
              name: ing.product.name,
              unit_type: ing.product.unit_type,
              category_id: ing.product.category_id || undefined,
              category_name: 'Inne',
              sort_order: 99,
              quantity: scaledQuantity,
              is_ad_hoc: false,
              meal_source: meal.name
            })
          }
        })

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
        const currentDraft = [...(state.draftsByHousehold[key] || state.draftItems || [])]

        const newItem: DraftItem = {
          id: `adhoc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: item.name,
          unit_type: item.unit_type,
          category_id: item.category_id,
          category_name: item.category_name || 'Inne',
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
        const currentDraft = [...(state.draftsByHousehold[key] || state.draftItems || [])]
        const isAdHoc = !!item.is_ad_hoc || !item.product_id

        if (!isAdHoc && item.product_id) {
          const existingIndex = currentDraft.findIndex(
            (d) => d.product_id === item.product_id && !d.is_ad_hoc
          )

          if (existingIndex >= 0) {
            currentDraft[existingIndex] = {
              ...currentDraft[existingIndex],
              quantity: Math.round((currentDraft[existingIndex].quantity + item.quantity) * 10) / 10
            }
          } else {
            currentDraft.push({
              id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              product_id: item.product_id,
              name: item.name,
              unit_type: item.unit_type,
              category_id: item.category_id,
              category_name: item.category_name || 'Inne',
              sort_order: item.sort_order ?? 99,
              quantity: item.quantity,
              is_ad_hoc: false,
              meal_source: item.meal_source
            })
          }
        } else {
          const existingIndex = currentDraft.findIndex(
            (d) => d.is_ad_hoc && d.name.toLowerCase() === item.name.toLowerCase() && d.unit_type === item.unit_type
          )

          if (existingIndex >= 0) {
            currentDraft[existingIndex] = {
              ...currentDraft[existingIndex],
              quantity: Math.round((currentDraft[existingIndex].quantity + item.quantity) * 10) / 10
            }
          } else {
            currentDraft.push({
              id: `adhoc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              product_id: item.product_id,
              name: item.name,
              unit_type: item.unit_type,
              category_id: item.category_id,
              category_name: item.category_name || 'Inne',
              sort_order: item.sort_order ?? 99,
              quantity: item.quantity,
              is_ad_hoc: true,
              meal_source: item.meal_source
            })
          }
        }

        set({
          draftsByHousehold: {
            ...state.draftsByHousehold,
            [key]: currentDraft
          },
          draftItems: currentDraft
        })
      },

      addMultipleToDraft: (items) => {
        const state = get()
        const key = state.activeHouseholdId || 'default'
        const currentDraft = [...(state.draftsByHousehold[key] || state.draftItems || [])]

        for (const item of items) {
          const isAdHoc = !!item.is_ad_hoc || !item.product_id

          if (!isAdHoc && item.product_id) {
            const existingIndex = currentDraft.findIndex(
              (d) => d.product_id === item.product_id && !d.is_ad_hoc
            )

            if (existingIndex >= 0) {
              currentDraft[existingIndex] = {
                ...currentDraft[existingIndex],
                quantity: Math.round((currentDraft[existingIndex].quantity + item.quantity) * 10) / 10
              }
            } else {
              currentDraft.push({
                id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                product_id: item.product_id,
                name: item.name,
                unit_type: item.unit_type,
                category_id: item.category_id,
                category_name: item.category_name || 'Inne',
                sort_order: item.sort_order ?? 99,
                quantity: item.quantity,
                is_ad_hoc: false,
                meal_source: item.meal_source
              })
            }
          } else {
            const existingIndex = currentDraft.findIndex(
              (d) => d.is_ad_hoc && d.name.toLowerCase() === item.name.toLowerCase() && d.unit_type === item.unit_type
            )

            if (existingIndex >= 0) {
              currentDraft[existingIndex] = {
                ...currentDraft[existingIndex],
                quantity: Math.round((currentDraft[existingIndex].quantity + item.quantity) * 10) / 10
              }
            } else {
              currentDraft.push({
                id: `adhoc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                product_id: item.product_id,
                name: item.name,
                unit_type: item.unit_type,
                category_id: item.category_id,
                category_name: item.category_name || 'Inne',
                sort_order: item.sort_order ?? 99,
                quantity: item.quantity,
                is_ad_hoc: true,
                meal_source: item.meal_source
              })
            }
          }
        }

        set({
          draftsByHousehold: {
            ...state.draftsByHousehold,
            [key]: currentDraft
          },
          draftItems: currentDraft
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

      updateDraftQuantity: (id, quantity) => {
        const state = get()
        const key = state.activeHouseholdId || 'default'
        const currentDraft = state.draftsByHousehold[key] || state.draftItems || []
        const updatedDraft = currentDraft.map((i) =>
          i.id === id ? { ...i, quantity } : i
        )

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


