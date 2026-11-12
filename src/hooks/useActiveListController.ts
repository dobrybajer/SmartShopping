import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useShoppingStore } from '@/store/useShoppingStore'
import { useShallow } from 'zustand/react/shallow'
import { shoppingListService } from '@/services/shoppingListService'
import { notificationService } from '@/services/notificationService'
import type {
  ActiveListWithDetails,
  ActiveListItemWithProduct
} from '@/services/shoppingListService'
import { getNextQuantity } from '@/lib/utils'
import { useActiveListRealtime } from '@/hooks/useActiveListRealtime'
import { useCategoryStore } from '@/store/useCategoryStore'
import { usePantryStore } from '@/store/usePantryStore'
import { enqueueMutation } from '@/lib/offline/offlineMutationQueue'
import { createActiveListRealtimeHandlers } from '@/lib/realtime/activeListDiff'
import { trackLocalItemMutation } from '@/lib/realtime/localMutationTracker'
import {
  sortActiveLists,
  findDefaultOrFirstListId
} from '@/lib/calculations/activeListCalculations'
import { useTranslation } from '@/i18n'

export function useActiveListController() {
  const { household, userProfile, user } = useAuth()
  const { t } = useTranslation()
  const { categoriesByHousehold, loadCategories, subscribeRealtime } = useCategoryStore(
    useShallow((state) => ({
      categoriesByHousehold: state.categoriesByHousehold,
      loadCategories: state.loadCategories,
      subscribeRealtime: state.subscribeRealtime
    }))
  )
  const { pantryMapByProductId, pantryMapByAdHocName, pantryItemsByParentId } = usePantryStore(
    useShallow((state) => ({
      pantryMapByProductId: state.pantryMapByProductId,
      pantryMapByAdHocName: state.pantryMapByAdHocName,
      pantryItemsByParentId: state.pantryItemsByParentId
    }))
  )
  const {
    setDraftItems,
    draftItems,
    setSelectedActiveListId,
    activeListsSummary,
    setActiveListsSummary
  } = useShoppingStore(
    useShallow((state) => ({
      setDraftItems: state.setDraftItems,
      draftItems: state.draftItems,
      setSelectedActiveListId: state.setSelectedActiveListId,
      activeListsSummary: state.activeListsSummary,
      setActiveListsSummary: state.setActiveListsSummary
    }))
  )

  const [activeList, setActiveList] = useState<ActiveListWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ActiveListItemWithProduct | null>(null)
  const [isDeleteItemModalOpen, setIsDeleteItemModalOpen] = useState(false)
  const [isDeleteListModalOpen, setIsDeleteListModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isNewListOpen, setIsNewListOpen] = useState(false)
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [selectedPantryItem, setSelectedPantryItem] = useState<ActiveListItemWithProduct | null>(null)

  const householdId = household?.id

  const loadActiveLists = useCallback(
    async (listIdToSelect?: string) => {
      if (!householdId) return
      const summaries = await shoppingListService.getActiveListsSummary(householdId)
      const sorted = sortActiveLists(summaries)
      setActiveListsSummary(sorted)

      if (sorted.length === 0) {
        setActiveList(null)
        setSelectedActiveListId(null)
        setLoading(false)
        return
      }

      const currentSelectedId = listIdToSelect || useShoppingStore.getState().selectedActiveListId
      const targetId =
        sorted.find((l) => l.id === currentSelectedId)?.id || findDefaultOrFirstListId(sorted)

      if (targetId) {
        setSelectedActiveListId(targetId)
        const details = await shoppingListService.getListWithDetails(targetId)
        setActiveList(details)
      } else {
        setActiveList(null)
      }

      setLoading(false)
    },
    [householdId, setSelectedActiveListId, setActiveListsSummary]
  )

  useEffect(() => {
    loadActiveLists()
  }, [loadActiveLists])

  // Load & subscribe to real-time household category/aisle order updates (NORM-09)
  useEffect(() => {
    loadCategories(householdId)
    if (!householdId) return
    const unsubscribe = subscribeRealtime(householdId)
    return () => {
      unsubscribe()
    }
  }, [householdId, loadCategories, subscribeRealtime])

  const switchActiveList = useCallback(
    async (listId: string) => {
      if (listId === activeList?.id) return
      setSelectedActiveListId(listId)
      setLoadingDetails(true)
      const details = await shoppingListService.getListWithDetails(listId)
      setActiveList(details)
      setLoadingDetails(false)
    },
    [activeList?.id, setSelectedActiveListId]
  )

  const activeListRef = useRef<ActiveListWithDetails | null>(activeList)
  useEffect(() => {
    activeListRef.current = activeList
  }, [activeList])

  useActiveListRealtime(
    household?.id ?? null,
    activeList?.id ?? null,
    createActiveListRealtimeHandlers({
      householdId: household?.id,
      getActiveList: () => activeListRef.current,
      setActiveList,
      setActiveListsSummary
    })
  )

  const handleToggleCheck = useCallback(
    async (itemId: string, currentStatus: boolean) => {
      if (!activeList) return
      const targetItem = activeList.items.find((i) => i.id === itemId)
      const newChecked = !currentStatus

      trackLocalItemMutation(itemId, { is_checked: newChecked })

      const updatedItems = activeList.items.map((item) =>
        item.id === itemId
          ? { ...item, is_checked: newChecked, updated_at: new Date().toISOString() }
          : item
      )
      setActiveList({ ...activeList, items: updatedItems })

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueueMutation('TOGGLE_ITEM_CHECK', itemId, { isChecked: newChecked })
        return
      }

      try {
        const success = targetItem?.updated_at
          ? await shoppingListService.toggleItemChecked(itemId, newChecked, targetItem.updated_at)
          : await shoppingListService.toggleItemChecked(itemId, newChecked)
        if (!success) {
          enqueueMutation('TOGGLE_ITEM_CHECK', itemId, { isChecked: newChecked })
        } else if (household) {
          shoppingListService.getActiveListsSummary(household.id).then(setActiveListsSummary)
          const allDone = updatedItems.length > 0 && updatedItems.every((i) => i.is_checked)
          if (allDone && newChecked) {
            const completedByName = userProfile?.name || user?.email?.split('@')[0] || 'Domownik'
            notificationService
              .notify(
                'LIST_COMPLETED',
                {
                  listId: activeList.id,
                  listName: activeList.name || 'Lista zakupów',
                  completedByName
                },
                household.id
              )
              .catch(() => {})
          }
        }
      } catch {
        enqueueMutation('TOGGLE_ITEM_CHECK', itemId, { isChecked: newChecked })
      }
    },
    [activeList, household, userProfile?.name, user?.email, setActiveListsSummary]
  )

  const applyQuantityChange = useCallback(
    async (item: ActiveListItemWithProduct, newQty: number) => {
      if (!activeList) return
      trackLocalItemMutation(item.id, { total_quantity: newQty })
      const updatedItems = activeList.items.map((i) =>
        i.id === item.id ? { ...i, total_quantity: newQty } : i
      )
      setActiveList({ ...activeList, items: updatedItems })

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueueMutation('UPDATE_ITEM_QUANTITY', item.id, { quantity: newQty })
        return
      }

      try {
        const success = await shoppingListService.updateItemQuantity(item.id, newQty)
        if (!success) {
          enqueueMutation('UPDATE_ITEM_QUANTITY', item.id, { quantity: newQty })
        }
      } catch {
        enqueueMutation('UPDATE_ITEM_QUANTITY', item.id, { quantity: newQty })
      }
    },
    [activeList]
  )

  const handleIncrease = useCallback(
    async (item: ActiveListItemWithProduct) => {
      const newQty = getNextQuantity(item.total_quantity, item.product?.unit_type, 'increase')
      await applyQuantityChange(item, newQty)
    },
    [applyQuantityChange]
  )

  const handleDecrease = useCallback(
    async (item: ActiveListItemWithProduct) => {
      const newQty = getNextQuantity(item.total_quantity, item.product?.unit_type, 'decrease')
      if (newQty <= 0) {
        setItemToDelete(item)
        setIsDeleteItemModalOpen(true)
        return
      }
      await applyQuantityChange(item, newQty)
    },
    [applyQuantityChange]
  )

  const startEditing = useCallback((itemId: string, currentQuantity: number) => {
    setEditingId(itemId)
    setEditValue(String(currentQuantity))
  }, [])

  const handleInputChange = useCallback((val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '').replace(/^0+/, '')
    setEditValue(cleaned)
  }, [])

  const handleCommitEdit = useCallback(
    async (item: ActiveListItemWithProduct) => {
      const parsed = parseInt(editValue, 10)
      setEditingId(null)
      setEditValue('')

      if (!isNaN(parsed) && parsed > 0 && parsed !== item.total_quantity && activeList) {
        const previousItems = activeList.items
        setActiveList({
          ...activeList,
          items: activeList.items.map((i) => (i.id === item.id ? { ...i, total_quantity: parsed } : i))
        })

        const success = await shoppingListService.updateItemQuantity(item.id, parsed)
        if (!success) {
          setActiveList({ ...activeList, items: previousItems })
        }
      }
    },
    [editValue, activeList]
  )

  const handleConfirmDeleteItem = useCallback(async () => {
    if (!activeList || !itemToDelete) return
    setIsDeleting(true)
    const previousItems = activeList.items
    setActiveList({ ...activeList, items: activeList.items.filter((i) => i.id !== itemToDelete.id) })

    const success = await shoppingListService.deleteListItem(itemToDelete.id)
    setIsDeleting(false)

    if (!success) {
      setActiveList({ ...activeList, items: previousItems })
    } else {
      setItemToDelete(null)
      setIsDeleteItemModalOpen(false)
      if (household) {
        shoppingListService.getActiveListsSummary(household.id).then(setActiveListsSummary)
      }
    }
  }, [activeList, itemToDelete, household, setActiveListsSummary])

  const handleArchiveList = useCallback(async () => {
    if (!activeList || !household) return
    setIsArchiving(true)
    const uncheckedItemsToDraft = await shoppingListService.archiveActiveList(
      activeList.id,
      household.id
    )
    setIsArchiving(false)

    if (uncheckedItemsToDraft.length > 0) {
      setDraftItems([...draftItems, ...uncheckedItemsToDraft])
    }
    await loadActiveLists()
  }, [activeList, household, draftItems, setDraftItems, loadActiveLists])

  const handleDeleteList = useCallback(async () => {
    if (!activeList || !household) return false
    setIsDeleting(true)
    const success = await shoppingListService.deleteShoppingList(activeList.id)
    setIsDeleting(false)

    if (success) {
      setIsDeleteListModalOpen(false)
      await loadActiveLists()
    }
    return success
  }, [activeList, household, loadActiveLists])

  const handleSetDefault = useCallback(async () => {
    if (!activeList || !household) return false
    const success = await shoppingListService.setDefaultActiveList(activeList.id, household.id)
    if (success) {
      setActiveList({ ...activeList, is_default: true })
      shoppingListService.getActiveListsSummary(household.id).then(setActiveListsSummary)
    }
    return success
  }, [activeList, household, setActiveListsSummary])

  const handleListCreated = useCallback(
    async (newListId: string) => {
      setSelectedActiveListId(newListId)
      await loadActiveLists()
    },
    [setSelectedActiveListId, loadActiveLists]
  )

  const handleListRenamed = useCallback(
    (newName: string) => {
      if (activeList) {
        setActiveList({ ...activeList, name: newName })
        if (household) {
          shoppingListService.getActiveListsSummary(household.id).then(setActiveListsSummary)
        }
      }
    },
    [activeList, household, setActiveListsSummary]
  )

  const refreshSelectedListAfterPantryConfirm = useCallback(async () => {
    setSelectedPantryItem(null)
    if (activeList?.id) {
      const details = await shoppingListService.getListWithDetails(activeList.id)
      if (details) setActiveList(details)
      if (householdId) {
        shoppingListService.getActiveListsSummary(householdId).then(setActiveListsSummary)
      }
    }
  }, [activeList?.id, householdId, setActiveListsSummary])

  const getCategoryLabel = useCallback(
    (catName: string) => {
      const key = `categories.${catName}` as never
      return t(key) !== key ? t(key) : catName
    },
    [t]
  )

  const householdKey = household?.id || 'global'
  const resolvedCategories = categoriesByHousehold[householdKey] || []

  return {
    householdId,
    activeListsSummary,
    activeList,
    loading,
    loadingDetails,
    isArchiving,
    itemToDelete,
    isDeleteItemModalOpen,
    setIsDeleteItemModalOpen,
    isDeleteListModalOpen,
    setIsDeleteListModalOpen,
    isDeleting,
    isNewListOpen,
    setIsNewListOpen,
    isRenameOpen,
    setIsRenameOpen,
    editingId,
    setEditingId,
    editValue,
    setEditValue,
    selectedPantryItem,
    setSelectedPantryItem,
    resolvedCategories,
    pantryMapByProductId,
    pantryMapByAdHocName,
    pantryItemsByParentId,
    switchActiveList,
    handleToggleCheck,
    handleIncrease,
    handleDecrease,
    startEditing,
    handleInputChange,
    handleCommitEdit,
    handleConfirmDeleteItem,
    handleArchiveList,
    handleDeleteList,
    handleSetDefault,
    handleListCreated,
    handleListRenamed,
    refreshSelectedListAfterPantryConfirm,
    getCategoryLabel
  }
}

