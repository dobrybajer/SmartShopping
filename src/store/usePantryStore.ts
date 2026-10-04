import { create } from 'zustand'
import { pantryService } from '@/services/pantryService'
import type { PantryItemWithDetails, CreatePantryItemPayload } from '@/types/pantry'
import { toast } from '@/store/useToastStore'
import { translate } from '@/i18n'

interface PantryStoreState {
  activeHouseholdId: string | null
  pantryItems: PantryItemWithDetails[]
  pantryMapByProductId: Record<string, PantryItemWithDetails>
  pantryMapByAdHocName: Record<string, PantryItemWithDetails>
  isLoading: boolean

  // Actions
  setActiveHousehold: (householdId: string | null) => void
  loadPantryItems: (householdId?: string | null) => Promise<void>
  updatePantryQuantity: (itemId: string, newQuantity: number) => Promise<boolean>
  verifyPantryItem: (itemId: string, newQuantity: number) => Promise<boolean>
  deletePantryItem: (itemId: string) => Promise<boolean>
  removeByProductOrName: (productId?: string | null, adHocName?: string | null) => Promise<boolean>
  addOrIncrementItem: (
    item: CreatePantryItemPayload,
    mode?: 'increment' | 'set'
  ) => Promise<boolean>
  syncFromRealtime: () => Promise<void>
}

function buildPantryMaps(items: PantryItemWithDetails[]) {
  const byProduct: Record<string, PantryItemWithDetails> = {}
  const byName: Record<string, PantryItemWithDetails> = {}

  for (const item of items) {
    if (item.product_id) {
      byProduct[item.product_id] = item
    }
    if (item.ad_hoc_name) {
      byName[item.ad_hoc_name.trim().toLowerCase()] = item
    } else if (item.product?.name) {
      byName[item.product.name.trim().toLowerCase()] = item
    }
  }

  return { byProduct, byName }
}

export const usePantryStore = create<PantryStoreState>()((set, get) => ({
  activeHouseholdId: null,
  pantryItems: [],
  pantryMapByProductId: {},
  pantryMapByAdHocName: {},
  isLoading: false,

  setActiveHousehold: (householdId) => {
    set({ activeHouseholdId: householdId })
    if (householdId) {
      get().loadPantryItems(householdId)
    } else {
      set({
        pantryItems: [],
        pantryMapByProductId: {},
        pantryMapByAdHocName: {}
      })
    }
  },

  loadPantryItems: async (householdId) => {
    const targetHh = householdId !== undefined ? householdId : get().activeHouseholdId
    if (!targetHh) {
      set({
        pantryItems: [],
        pantryMapByProductId: {},
        pantryMapByAdHocName: {},
        isLoading: false
      })
      return
    }

    set({ isLoading: true })
    try {
      const items = await pantryService.getPantryItems(targetHh)
      const { byProduct, byName } = buildPantryMaps(items)
      set({
        pantryItems: items,
        pantryMapByProductId: byProduct,
        pantryMapByAdHocName: byName,
        isLoading: false
      })
    } catch (err) {
      console.error('[usePantryStore.loadPantryItems] Error:', err)
      set({ isLoading: false })
    }
  },

  updatePantryQuantity: async (itemId, newQuantity) => {
    const previousItems = get().pantryItems
    const now = new Date().toISOString()

    // Optimistic UI update
    let updated: PantryItemWithDetails[]
    if (newQuantity <= 0) {
      updated = previousItems.filter((i) => i.id !== itemId)
    } else {
      updated = previousItems.map((i) =>
        i.id === itemId ? { ...i, quantity: newQuantity, updated_at: now } : i
      )
    }
    const { byProduct, byName } = buildPantryMaps(updated)
    set({
      pantryItems: updated,
      pantryMapByProductId: byProduct,
      pantryMapByAdHocName: byName
    })

    const success = await pantryService.updateQuantity(itemId, newQuantity)
    if (!success) {
      // Rollback on network failure
      const { byProduct: rollProduct, byName: rollName } = buildPantryMaps(previousItems)
      set({
        pantryItems: previousItems,
        pantryMapByProductId: rollProduct,
        pantryMapByAdHocName: rollName
      })
      toast.error(translate('toasts.errorOccurred'))
      return false
    }

    return true
  },

  verifyPantryItem: async (itemId, newQuantity) => {
    const previousItems = get().pantryItems
    const now = new Date().toISOString()

    // Optimistic UI update
    let updated: PantryItemWithDetails[]
    if (newQuantity <= 0) {
      updated = previousItems.filter((i) => i.id !== itemId)
    } else {
      updated = previousItems.map((i) =>
        i.id === itemId
          ? { ...i, quantity: newQuantity, last_verified_at: now, updated_at: now }
          : i
      )
    }
    const { byProduct, byName } = buildPantryMaps(updated)
    set({
      pantryItems: updated,
      pantryMapByProductId: byProduct,
      pantryMapByAdHocName: byName
    })

    const success = await pantryService.verifyItem(itemId, newQuantity)
    if (!success) {
      const { byProduct: rollProduct, byName: rollName } = buildPantryMaps(previousItems)
      set({
        pantryItems: previousItems,
        pantryMapByProductId: rollProduct,
        pantryMapByAdHocName: rollName
      })
      toast.error(translate('toasts.errorOccurred'))
      return false
    }

    return true
  },

  deletePantryItem: async (itemId) => {
    const previousItems = get().pantryItems
    const updated = previousItems.filter((i) => i.id !== itemId)
    const { byProduct, byName } = buildPantryMaps(updated)

    set({
      pantryItems: updated,
      pantryMapByProductId: byProduct,
      pantryMapByAdHocName: byName
    })

    const success = await pantryService.deletePantryItem(itemId)
    if (!success) {
      const { byProduct: rollProduct, byName: rollName } = buildPantryMaps(previousItems)
      set({
        pantryItems: previousItems,
        pantryMapByProductId: rollProduct,
        pantryMapByAdHocName: rollName
      })
      toast.error(translate('toasts.errorOccurred'))
      return false
    }

    return true
  },

  removeByProductOrName: async (productId, adHocName) => {
    const hhId = get().activeHouseholdId
    if (!hhId) return false

    const previousItems = get().pantryItems
    const updated = previousItems.filter((i) => {
      if (productId && i.product_id === productId) return false
      if (adHocName) {
        const itemAdHoc = (i.ad_hoc_name || i.product?.name || '').trim().toLowerCase()
        if (itemAdHoc === adHocName.trim().toLowerCase()) return false
      }
      return true
    })
    const { byProduct, byName } = buildPantryMaps(updated)

    set({
      pantryItems: updated,
      pantryMapByProductId: byProduct,
      pantryMapByAdHocName: byName
    })

    const success = await pantryService.removeByProductOrName(hhId, productId, adHocName)
    if (!success) {
      const { byProduct: rollProduct, byName: rollName } = buildPantryMaps(previousItems)
      set({
        pantryItems: previousItems,
        pantryMapByProductId: rollProduct,
        pantryMapByAdHocName: rollName
      })
      toast.error(translate('toasts.errorOccurred'))
      return false
    }

    return true
  },

  addOrIncrementItem: async (payload, mode = 'increment') => {
    const hhId = get().activeHouseholdId || payload.household_id
    if (!hhId) return false

    const result = await pantryService.addOrIncrementItem(
      { ...payload, household_id: hhId },
      mode
    )

    if (result) {
      await get().loadPantryItems(hhId)
      return true
    }

    toast.error(translate('toasts.errorOccurred'))
    return false
  },

  syncFromRealtime: async () => {
    const hhId = get().activeHouseholdId
    if (!hhId) return
    const items = await pantryService.getPantryItems(hhId)
    const { byProduct, byName } = buildPantryMaps(items)
    set({
      pantryItems: items,
      pantryMapByProductId: byProduct,
      pantryMapByAdHocName: byName
    })
  }
}))
