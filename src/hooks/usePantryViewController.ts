import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePantryStore } from '@/store/usePantryStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useShallow } from 'zustand/react/shallow'
import { useTranslation } from '@/i18n'
import type { PantryItemWithDetails } from '@/types/pantry'
import { groupItemsByAisle } from '@/lib/calculations/categorySorting'
import {
  calculateExpiryStatus,
  calculatePantryFreshness,
  sortPantryItemsByExpiry
} from '@/lib/calculations/pantryCalculations'
import { getNextQuantity } from '@/lib/utils'

export type PantrySortMode = 'aisle' | 'expiry'

export function usePantryViewController() {
  const { household } = useAuth()
  const {
    pantryItems,
    isLoading,
    loadPantryItems,
    updatePantryQuantity,
    updateExpirationDate,
    deletePantryItem
  } = usePantryStore(
    useShallow((state) => ({
      pantryItems: state.pantryItems,
      isLoading: state.isLoading,
      loadPantryItems: state.loadPantryItems,
      updatePantryQuantity: state.updatePantryQuantity,
      updateExpirationDate: state.updateExpirationDate,
      deletePantryItem: state.deletePantryItem
    }))
  )
  const { categoriesByHousehold, loadCategories } = useCategoryStore(
    useShallow((state) => ({
      categoriesByHousehold: state.categoriesByHousehold,
      loadCategories: state.loadCategories
    }))
  )
  const { t } = useTranslation()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | null>(null)
  const [sortMode, setSortMode] = useState<PantrySortMode>('aisle')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<PantryItemWithDetails | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  const householdId = household?.id

  useEffect(() => {
    if (householdId) {
      loadPantryItems(householdId)
      loadCategories(householdId)
    }
  }, [householdId, loadPantryItems, loadCategories])

  const householdKey = householdId || 'global'
  const resolvedCategories = useMemo(
    () => categoriesByHousehold[householdKey] || [],
    [categoriesByHousehold, householdKey]
  )

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return pantryItems.filter((item) => {
      const name = (item.product?.name || item.ad_hoc_name || '').toLowerCase()
      const matchesSearch = name.includes(q)
      const catId = item.category_id ?? item.product?.category_id
      const matchesCategory = selectedCategoryFilter === null || catId === selectedCategoryFilter
      return matchesSearch && matchesCategory
    })
  }, [pantryItems, searchQuery, selectedCategoryFilter])

  const groupedAisles = useMemo(
    () => groupItemsByAisle(filteredItems, resolvedCategories, 'other'),
    [filteredItems, resolvedCategories]
  )

  const expirySortedItems = useMemo(
    () => sortPantryItemsByExpiry(filteredItems),
    [filteredItems]
  )

  const stats = useMemo(() => {
    let fresh = 0
    let medium = 0
    let old = 0
    let expiringAlerts = 0

    pantryItems.forEach((item) => {
      const isNonFood = !!(
        item.category?.is_non_food || item.product?.category?.is_non_food
      )
      const res = calculatePantryFreshness(
        item.last_purchased_at,
        isNonFood,
        item.product?.name || item.ad_hoc_name || '',
        '1',
        item.last_verified_at
      )
      if (res.level === 'fresh') fresh++
      else if (res.level === 'medium') medium++
      else old++

      if (calculateExpiryStatus(item.expiration_date).isAlert) {
        expiringAlerts++
      }
    })

    return { fresh, medium, old, expiringAlerts, total: pantryItems.length }
  }, [pantryItems])

  const handleIncrease = useCallback(
    (item: PantryItemWithDetails) => {
      const newQty = getNextQuantity(item.quantity, item.unit_type, 'increase')
      updatePantryQuantity(item.id, newQty)
    },
    [updatePantryQuantity]
  )

  const handleDecrease = useCallback(
    (item: PantryItemWithDetails) => {
      const newQty = getNextQuantity(item.quantity, item.unit_type, 'decrease')
      if (newQty <= 0) {
        setItemToDelete(item)
        setIsDeleteModalOpen(true)
      } else {
        updatePantryQuantity(item.id, newQty)
      }
    },
    [updatePantryQuantity]
  )

  const handleCommitEdit = useCallback(
    (itemId: string) => {
      const parsed = parseFloat(editValue)
      if (!isNaN(parsed) && parsed > 0) {
        updatePantryQuantity(itemId, parsed)
      }
      setEditingId(null)
      setEditValue('')
    },
    [editValue, updatePantryQuantity]
  )

  const handleConfirmDelete = useCallback(async () => {
    if (itemToDelete) {
      await deletePantryItem(itemToDelete.id)
      setItemToDelete(null)
      setIsDeleteModalOpen(false)
    }
  }, [itemToDelete, deletePantryItem])

  const requestDelete = useCallback((item: PantryItemWithDetails) => {
    setItemToDelete(item)
    setIsDeleteModalOpen(true)
  }, [])

  const getCategoryLabel = useCallback(
    (catName: string) => {
      const key = `categories.${catName}` as never
      return t(key) !== key ? t(key) : catName
    },
    [t]
  )

  return {
    household,
    pantryItems,
    isLoading,
    resolvedCategories,
    filteredItems,
    groupedAisles,
    expirySortedItems,
    stats,
    searchQuery,
    setSearchQuery,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    sortMode,
    setSortMode,
    isAddOpen,
    setIsAddOpen,
    itemToDelete,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    editingId,
    setEditingId,
    editValue,
    setEditValue,
    handleIncrease,
    handleDecrease,
    handleCommitEdit,
    handleConfirmDelete,
    requestDelete,
    updateExpirationDate,
    getCategoryLabel
  }
}

