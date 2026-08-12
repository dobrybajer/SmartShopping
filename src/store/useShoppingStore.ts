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

interface ShoppingStoreState {
  draftItems: DraftItem[]
  
  // Actions
  addMealToDraft: (meal: MealWithIngredients, targetKcal?: number) => void
  addAdHocToDraft: (item: {
    name: string
    unit_type: UnitEnum
    category_id?: number
    category_name: string
    sort_order?: number
    quantity: number
  }) => void
  removeFromDraft: (id: string) => void
  updateDraftQuantity: (id: string, quantity: number) => void
  clearDraft: () => void
  setDraftItems: (items: DraftItem[]) => void
}

export const useShoppingStore = create<ShoppingStoreState>()(
  persist(
    (set, get) => ({
      draftItems: [],

      addMealToDraft: (meal, targetKcal) => {
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

        // 3. Przekształć składniki na elementy draftu (pomijając is_pantry_item, chyba że użytkownik wymusi)
        const currentDraft = get().draftItems
        const updatedDraft = [...currentDraft]

        meal.ingredients.forEach((ing) => {
          if (ing.is_pantry_item) return // pomijamy przyprawy z spiżarni (sól, pieprz itd.)
          if (!ing.product) return

          const scaledQuantity = Math.round((ing.base_quantity * multiplier) * 10) / 10

          // Sprawdź czy ten produkt już jest w drafcie
          const existingIndex = updatedDraft.findIndex(
            (d) => d.product_id === ing.product_id && !d.is_ad_hoc
          )

          if (existingIndex >= 0) {
            // Zsumuj ilość
            updatedDraft[existingIndex] = {
              ...updatedDraft[existingIndex],
              quantity: Math.round((updatedDraft[existingIndex].quantity + scaledQuantity) * 10) / 10
            }
          } else {
            // Dodaj nową pozycję
            updatedDraft.push({
              id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              product_id: ing.product.id,
              name: ing.product.name,
              unit_type: ing.product.unit_type,
              category_id: ing.product.category_id || undefined,
              category_name: 'Inne', // Zostanie uzupełnione po podpięciu słownika
              sort_order: 99,
              quantity: scaledQuantity,
              is_ad_hoc: false,
              meal_source: meal.name
            })
          }
        })

        set({ draftItems: updatedDraft })
      },

      addAdHocToDraft: (item) => {
        const currentDraft = get().draftItems
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

        set({ draftItems: [...currentDraft, newItem] })
      },

      removeFromDraft: (id) => {
        set({
          draftItems: get().draftItems.filter((i) => i.id !== id)
        })
      },

      updateDraftQuantity: (id, quantity) => {
        set({
          draftItems: get().draftItems.map((i) =>
            i.id === id ? { ...i, quantity } : i
          )
        })
      },

      clearDraft: () => {
        set({ draftItems: [] })
      },

      setDraftItems: (items) => {
        set({ draftItems: items })
      }
    }),
    {
      name: 'smartshopping_draft_store',
      storage: createJSONStorage(() => localStorage)
    }
  )
)
