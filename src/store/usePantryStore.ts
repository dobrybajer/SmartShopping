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
  pantryItemsByParentId: Record<string, PantryItemWithDetails[]>
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
  deductMealIngredients: (
    updates: Array<{ pantryItemId: string; newQuantity: number }>
  ) => Promise<boolean>
  updateExpirationDate: (itemId: string, expirationDate: string | null) => Promise<boolean>
  syncFromRealtime: () => Promise<void>
}

const DELETED_ECHO_TTL_MS = 5000
const recentlyDeletedPantryIds = new Map<string, number>()

function markPantryItemsDeleted(ids: string[]) {
  const expiresAt = Date.now() + DELETED_ECHO_TTL_MS
  for (const id of ids) {
    recentlyDeletedPantryIds.set(id, expiresAt)
  }
}

function unmarkPantryItemsDeleted(ids: string[]) {
  for (const id of ids) {
    recentlyDeletedPantryIds.delete(id)
  }
}

function filterOutRecentlyDeleted(items: PantryItemWithDetails[]): PantryItemWithDetails[] {
  if (recentlyDeletedPantryIds.size === 0) return items
  const now = Date.now()
  for (const [id, expiresAt] of recentlyDeletedPantryIds.entries()) {
    if (expiresAt <= now) {
      recentlyDeletedPantryIds.delete(id)
    }
  }
  if (recentlyDeletedPantryIds.size === 0) return items
  return items.filter((item) => !recentlyDeletedPantryIds.has(item.id))
}

function buildPantryMaps(items: PantryItemWithDetails[]) {
  const byProduct: Record<string, PantryItemWithDetails> = {}
  const byName: Record<string, PantryItemWithDetails> = {}
  const byParent: Record<string, PantryItemWithDetails[]> = {}

  for (const item of items) {
    if (item.product_id) {
      byProduct[item.product_id] = item
    }
    if (item.product?.parent_id) {
      if (!byParent[item.product.parent_id]) {
        byParent[item.product.parent_id] = []
      }
      byParent[item.product.parent_id].push(item)
    }
    if (item.ad_hoc_name) {
      byName[item.ad_hoc_name.trim().toLowerCase()] = item
    } else if (item.product?.name) {
      byName[item.product.name.trim().toLowerCase()] = item
    }
  }

  return { byProduct, byName, byParent }
}

export const usePantryStore = create<PantryStoreState>()((set, get) => ({
  activeHouseholdId: null,
  pantryItems: [],
  pantryMapByProductId: {},
  pantryMapByAdHocName: {},
  pantryItemsByParentId: {},
  isLoading: false,

  setActiveHousehold: (householdId) => {
    if (!householdId || get().activeHouseholdId !== householdId) {
      recentlyDeletedPantryIds.clear()
    }
    set({ activeHouseholdId: householdId })
    if (householdId) {
      get().loadPantryItems(householdId)
    } else {
      set({
        pantryItems: [],
        pantryMapByProductId: {},
        pantryMapByAdHocName: {},
        pantryItemsByParentId: {}
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
        pantryItemsByParentId: {},
        isLoading: false
      })
      return
    }

    const startedHh = get().activeHouseholdId
    set({ isLoading: true })
    try {
      const items = await pantryService.getPantryItems(targetHh)
      const currentHh = get().activeHouseholdId
      if (currentHh !== startedHh || (currentHh !== null && currentHh !== targetHh)) return
      const visibleItems = filterOutRecentlyDeleted(items)
      const { byProduct, byName, byParent } = buildPantryMaps(visibleItems)
      set({
        pantryItems: visibleItems,
        pantryMapByProductId: byProduct,
        pantryMapByAdHocName: byName,
        pantryItemsByParentId: byParent,
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
      markPantryItemsDeleted([itemId])
      updated = previousItems.filter((i) => i.id !== itemId)
    } else {
      updated = previousItems.map((i) =>
        i.id === itemId ? { ...i, quantity: newQuantity, updated_at: now } : i
      )
    }
    const { byProduct, byName, byParent } = buildPantryMaps(updated)
    set({
      pantryItems: updated,
      pantryMapByProductId: byProduct,
      pantryMapByAdHocName: byName,
      pantryItemsByParentId: byParent
    })

    const success = await pantryService.updateQuantity(itemId, newQuantity)
    if (!success) {
      if (newQuantity <= 0) unmarkPantryItemsDeleted([itemId])
      // Rollback on network failure
      const { byProduct: rollProduct, byName: rollName, byParent: rollParent } = buildPantryMaps(previousItems)
      set({
        pantryItems: previousItems,
        pantryMapByProductId: rollProduct,
        pantryMapByAdHocName: rollName,
        pantryItemsByParentId: rollParent
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
      markPantryItemsDeleted([itemId])
      updated = previousItems.filter((i) => i.id !== itemId)
    } else {
      updated = previousItems.map((i) =>
        i.id === itemId
          ? { ...i, quantity: newQuantity, last_verified_at: now, updated_at: now }
          : i
      )
    }
    const { byProduct, byName, byParent } = buildPantryMaps(updated)
    set({
      pantryItems: updated,
      pantryMapByProductId: byProduct,
      pantryMapByAdHocName: byName,
      pantryItemsByParentId: byParent
    })

    const success = await pantryService.verifyItem(itemId, newQuantity)
    if (!success) {
      if (newQuantity <= 0) unmarkPantryItemsDeleted([itemId])
      const { byProduct: rollProduct, byName: rollName, byParent: rollParent } = buildPantryMaps(previousItems)
      set({
        pantryItems: previousItems,
        pantryMapByProductId: rollProduct,
        pantryMapByAdHocName: rollName,
        pantryItemsByParentId: rollParent
      })
      toast.error(translate('toasts.errorOccurred'))
      return false
    }

    return true
  },

  deletePantryItem: async (itemId) => {
    const previousItems = get().pantryItems
    markPantryItemsDeleted([itemId])
    const updated = previousItems.filter((i) => i.id !== itemId)
    const { byProduct, byName, byParent } = buildPantryMaps(updated)

    set({
      pantryItems: updated,
      pantryMapByProductId: byProduct,
      pantryMapByAdHocName: byName,
      pantryItemsByParentId: byParent
    })

    const success = await pantryService.deletePantryItem(itemId)
    if (!success) {
      unmarkPantryItemsDeleted([itemId])
      const { byProduct: rollProduct, byName: rollName, byParent: rollParent } = buildPantryMaps(previousItems)
      set({
        pantryItems: previousItems,
        pantryMapByProductId: rollProduct,
        pantryMapByAdHocName: rollName,
        pantryItemsByParentId: rollParent
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
    const removedIds: string[] = []
    const updated = previousItems.filter((i) => {
      if (productId && i.product_id === productId) {
        removedIds.push(i.id)
        return false
      }
      if (adHocName) {
        const itemAdHoc = (i.ad_hoc_name || i.product?.name || '').trim().toLowerCase()
        if (itemAdHoc === adHocName.trim().toLowerCase()) {
          removedIds.push(i.id)
          return false
        }
      }
      return true
    })
    markPantryItemsDeleted(removedIds)
    const { byProduct, byName, byParent } = buildPantryMaps(updated)

    set({
      pantryItems: updated,
      pantryMapByProductId: byProduct,
      pantryMapByAdHocName: byName,
      pantryItemsByParentId: byParent
    })

    const success = await pantryService.removeByProductOrName(hhId, productId, adHocName)
    if (!success) {
      unmarkPantryItemsDeleted(removedIds)
      const { byProduct: rollProduct, byName: rollName, byParent: rollParent } = buildPantryMaps(previousItems)
      set({
        pantryItems: previousItems,
        pantryMapByProductId: rollProduct,
        pantryMapByAdHocName: rollName,
        pantryItemsByParentId: rollParent
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
      unmarkPantryItemsDeleted([result.id])
      await get().loadPantryItems(hhId)
      return true
    }

    toast.error(translate('toasts.errorOccurred'))
    return false
  },

  deductMealIngredients: async (updates) => {
    if (updates.length === 0) return true

    const previousItems = get().pantryItems
    const updateMap = new Map(updates.map((u) => [u.pantryItemId, u.newQuantity]))
    const now = new Date().toISOString()

    const depletedIds: string[] = []
    const updated = previousItems
      .map((item) => {
        if (!updateMap.has(item.id)) return item
        const nextQty = Math.round((updateMap.get(item.id) ?? item.quantity) * 10) / 10
        if (nextQty <= 0) {
          depletedIds.push(item.id)
          return null
        }
        return { ...item, quantity: nextQty, updated_at: now }
      })
      .filter((item): item is PantryItemWithDetails => item !== null)
    markPantryItemsDeleted(depletedIds)

    const { byProduct, byName, byParent } = buildPantryMaps(updated)
    set({
      pantryItems: updated,
      pantryMapByProductId: byProduct,
      pantryMapByAdHocName: byName,
      pantryItemsByParentId: byParent
    })

    const success = await pantryService.deductMealIngredients(updates)
    if (!success) {
      unmarkPantryItemsDeleted(depletedIds)
      const {
        byProduct: rollProduct,
        byName: rollName,
        byParent: rollParent
      } = buildPantryMaps(previousItems)
      set({
        pantryItems: previousItems,
        pantryMapByProductId: rollProduct,
        pantryMapByAdHocName: rollName,
        pantryItemsByParentId: rollParent
      })
      toast.error(translate('toasts.errorOccurred'))
      return false
    }

    return true
  },

  updateExpirationDate: async (itemId, expirationDate) => {
    const previousItems = get().pantryItems
    const now = new Date().toISOString()
    const updated = previousItems.map((i) =>
      i.id === itemId ? { ...i, expiration_date: expirationDate, updated_at: now } : i
    )
    const { byProduct, byName, byParent } = buildPantryMaps(updated)
    set({
      pantryItems: updated,
      pantryMapByProductId: byProduct,
      pantryMapByAdHocName: byName,
      pantryItemsByParentId: byParent
    })

    const success = await pantryService.updateExpirationDate(itemId, expirationDate)
    if (!success) {
      const {
        byProduct: rollProduct,
        byName: rollName,
        byParent: rollParent
      } = buildPantryMaps(previousItems)
      set({
        pantryItems: previousItems,
        pantryMapByProductId: rollProduct,
        pantryMapByAdHocName: rollName,
        pantryItemsByParentId: rollParent
      })
      toast.error(translate('toasts.errorOccurred'))
      return false
    }
    return true
  },

  syncFromRealtime: async () => {
    const hhId = get().activeHouseholdId
    if (!hhId) return
    const items = await pantryService.getPantryItems(hhId)
    if (get().activeHouseholdId !== hhId) return
    const visibleItems = filterOutRecentlyDeleted(items)
    const { byProduct, byName, byParent } = buildPantryMaps(visibleItems)
    set({
      pantryItems: visibleItems,
      pantryMapByProductId: byProduct,
      pantryMapByAdHocName: byName,
      pantryItemsByParentId: byParent
    })
  }
}))
