import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useShoppingStore, type DraftItem } from '@/store/useShoppingStore'
import { usePantryStore } from '@/store/usePantryStore'
import { useShallow } from 'zustand/react/shallow'
import { useTranslation } from '@/i18n'
import { getNextQuantity } from '@/lib/utils'
import { calculatePantryFreshness } from '@/lib/calculations/pantryCalculations'

export function useDraftViewController(onActiveListCreated?: () => void) {
  const { household } = useAuth()
  const {
    draftItems,
    removeFromDraft,
    removeMultipleFromDraft,
    updateDraftQuantity,
    clearDraft
  } = useShoppingStore(
    useShallow((state) => ({
      draftItems: state.draftItems,
      removeFromDraft: state.removeFromDraft,
      removeMultipleFromDraft: state.removeMultipleFromDraft,
      updateDraftQuantity: state.updateDraftQuantity,
      clearDraft: state.clearDraft
    }))
  )
  const { pantryMapByProductId, pantryMapByAdHocName, pantryItemsByParentId } = usePantryStore(
    useShallow((state) => ({
      pantryMapByProductId: state.pantryMapByProductId,
      pantryMapByAdHocName: state.pantryMapByAdHocName,
      pantryItemsByParentId: state.pantryItemsByParentId
    }))
  )
  const { t, formatQuantity } = useTranslation()

  const [unselectedIds, setUnselectedIds] = useState<Set<string>>(new Set())
  const [isAdHocOpen, setIsAdHocOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<DraftItem | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [selectedPantryModalItem, setSelectedPantryModalItem] = useState<DraftItem | null>(null)

  const selectedItems = draftItems.filter((i) => !unselectedIds.has(i.id))
  const allSelected = draftItems.length > 0 && selectedItems.length === draftItems.length
  const noneSelected = selectedItems.length === 0

  const toggleItemSelection = useCallback((id: string) => {
    setUnselectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleToggleSelectAll = useCallback(() => {
    if (allSelected) {
      setUnselectedIds(new Set(draftItems.map((i) => i.id)))
    } else {
      setUnselectedIds(new Set())
    }
  }, [allSelected, draftItems])

  const handleIncrease = useCallback(
    (item: DraftItem) => {
      const newQty = getNextQuantity(item.quantity, item.unit_type, 'increase')
      updateDraftQuantity(item.id, newQty)
    },
    [updateDraftQuantity]
  )

  const handleDecrease = useCallback(
    (item: DraftItem) => {
      const newQty = getNextQuantity(item.quantity, item.unit_type, 'decrease')
      if (newQty <= 0) {
        setItemToDelete(item)
        setIsDeleteModalOpen(true)
      } else {
        updateDraftQuantity(item.id, newQty)
      }
    },
    [updateDraftQuantity]
  )

  const startEditing = useCallback((itemId: string, currentQuantity: number) => {
    setEditingId(itemId)
    setEditValue(String(currentQuantity))
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingId(null)
    setEditValue('')
  }, [])

  const handleInputChange = useCallback((val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '')
    const normalized = cleaned.replace(/^0+/, '')
    setEditValue(normalized)
  }, [])

  const handleCommitEdit = useCallback(
    (itemId: string) => {
      const parsed = parseInt(editValue, 10)
      setEditingId(null)
      setEditValue('')

      if (!isNaN(parsed) && parsed > 0) {
        updateDraftQuantity(itemId, parsed)
      }
    },
    [editValue, updateDraftQuantity]
  )

  const requestDeleteItem = useCallback((item: DraftItem) => {
    setItemToDelete(item)
    setIsDeleteModalOpen(true)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (itemToDelete) {
      removeFromDraft(itemToDelete.id)
      setItemToDelete(null)
      setIsDeleteModalOpen(false)
    }
  }, [itemToDelete, removeFromDraft])

  const handleOpenTransfer = useCallback(() => {
    if (!household || selectedItems.length === 0) return
    setIsTransferOpen(true)
  }, [household, selectedItems.length])

  const handleTransferSuccess = useCallback(
    (_targetListId: string) => {
      if (selectedItems.length === draftItems.length) {
        clearDraft()
      } else {
        removeMultipleFromDraft(selectedItems.map((i) => i.id))
      }
      setUnselectedIds(new Set())
      onActiveListCreated?.()
    },
    [selectedItems, draftItems.length, clearDraft, removeMultipleFromDraft, onActiveListCreated]
  )

  const getCategoryLabel = useCallback(
    (catName: string) => {
      const key = `categories.${catName}` as Parameters<typeof t>[0]
      const translated = t(key)
      return translated !== key ? translated : catName
    },
    [t]
  )

  const getItemPantryStatus = useCallback(
    (item: DraftItem) => {
      const childItems = item.product_id ? pantryItemsByParentId[item.product_id] || [] : []
      const directPantryItem = item.product_id
        ? pantryMapByProductId[item.product_id]
        : pantryMapByAdHocName[item.name.toLowerCase().trim()]
      const pantryItem = directPantryItem || (childItems.length > 0 ? childItems[0] : null)
      const aggregatedStockQty =
        childItems.length > 0 && !directPantryItem
          ? childItems.reduce((sum, c) => sum + Number(c.quantity || 0), 0)
          : pantryItem?.quantity
      const isNonFood = !!(
        pantryItem?.category?.is_non_food || pantryItem?.product?.category?.is_non_food
      )
      const freshness = pantryItem
        ? calculatePantryFreshness(
            pantryItem.last_purchased_at,
            isNonFood,
            item.name,
            formatQuantity(aggregatedStockQty || 0, pantryItem.unit_type),
            pantryItem.last_verified_at
          )
        : null

      return { pantryItem, freshness }
    },
    [pantryItemsByParentId, pantryMapByProductId, pantryMapByAdHocName, formatQuantity]
  )

  return {
    household,
    draftItems,
    unselectedIds,
    selectedItems,
    allSelected,
    noneSelected,
    isAdHocOpen,
    setIsAdHocOpen,
    isTransferOpen,
    setIsTransferOpen,
    itemToDelete,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    editingId,
    editValue,
    selectedPantryModalItem,
    setSelectedPantryModalItem,
    removeFromDraft,
    clearDraft,
    toggleItemSelection,
    handleToggleSelectAll,
    handleIncrease,
    handleDecrease,
    startEditing,
    cancelEditing,
    handleInputChange,
    handleCommitEdit,
    requestDeleteItem,
    handleConfirmDelete,
    handleOpenTransfer,
    handleTransferSuccess,
    getCategoryLabel,
    getItemPantryStatus
  }
}

