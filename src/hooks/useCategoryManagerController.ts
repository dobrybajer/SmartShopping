import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from '@/i18n'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useShallow } from 'zustand/react/shallow'
import {
  validateCategoryName,
  resolveCategoriesWithSettings,
  DEFAULT_PRODUCT_CATEGORIES,
  type CategoryValidationError
} from '@/lib/calculations/categorySorting'
import type { ResolvedCategory } from '@/types/category'

const CATEGORY_VALIDATION_I18N_KEY: Record<
  CategoryValidationError,
  | 'categoryManager.validation.empty'
  | 'categoryManager.validation.tooShort'
  | 'categoryManager.validation.tooLong'
  | 'categoryManager.validation.duplicate'
> = {
  empty: 'categoryManager.validation.empty',
  too_short: 'categoryManager.validation.tooShort',
  too_long: 'categoryManager.validation.tooLong',
  duplicate: 'categoryManager.validation.duplicate'
}

const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(40)
    } catch {
      // Ignore vibration errors
    }
  }
}

export function useCategoryManagerController(householdId: string) {
  const { t } = useTranslation()
  const {
    categoriesByHousehold,
    loadCategories,
    subscribeRealtime,
    reorderCategories,
    toggleVisibility,
    createCustomCategory,
    updateCustomCategory,
    deleteCustomCategory
  } = useCategoryStore(
    useShallow((state) => ({
      categoriesByHousehold: state.categoriesByHousehold,
      loadCategories: state.loadCategories,
      subscribeRealtime: state.subscribeRealtime,
      reorderCategories: state.reorderCategories,
      toggleVisibility: state.toggleVisibility,
      createCustomCategory: state.createCustomCategory,
      updateCustomCategory: state.updateCustomCategory,
      deleteCustomCategory: state.deleteCustomCategory
    }))
  )

  useEffect(() => {
    if (householdId && loadCategories) {
      loadCategories(householdId)
    }
  }, [householdId, loadCategories])

  useEffect(() => {
    if (householdId && subscribeRealtime) {
      const unsubscribe = subscribeRealtime(householdId)
      return () => {
        unsubscribe()
      }
    }
  }, [householdId, subscribeRealtime])

  const categories =
    categoriesByHousehold[householdId] && categoriesByHousehold[householdId].length > 0
      ? categoriesByHousehold[householdId]
      : resolveCategoriesWithSettings(DEFAULT_PRODUCT_CATEGORIES, [])

  const [newCategoryName, setNewCategoryName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

  const [deletingCategory, setDeletingCategory] = useState<ResolvedCategory | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const draggedIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const getDisplayName = useCallback(
    (cat: ResolvedCategory) => {
      if (cat.custom_name) return cat.custom_name
      if (cat.is_global) {
        const key = `categories.${cat.name}` as Parameters<typeof t>[0]
        const translated = t(key)
        return translated !== key ? translated : cat.name
      }
      return cat.name
    },
    [t]
  )

  const handleMove = async (currentIndex: number, targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= categories.length) return
    triggerHaptic()

    const newOrder = [...categories]
    const [moved] = newOrder.splice(currentIndex, 1)
    newOrder.splice(targetIndex, 0, moved)
    await reorderCategories(householdId, newOrder.map((c) => c.id))
  }

  const handleDragStart = (index: number) => {
    draggedIndexRef.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndexRef.current !== null && draggedIndexRef.current !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const startIndex = draggedIndexRef.current
    setDragOverIndex(null)
    draggedIndexRef.current = null

    if (startIndex === null || startIndex === dropIndex) return
    triggerHaptic()

    const newOrder = [...categories]
    const [moved] = newOrder.splice(startIndex, 1)
    newOrder.splice(dropIndex, 0, moved)
    await reorderCategories(householdId, newOrder.map((c) => c.id))
  }

  const handleDragEnd = () => {
    draggedIndexRef.current = null
    setDragOverIndex(null)
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(null)

    const validation = validateCategoryName(newCategoryName, categories)
    if (!validation.valid && validation.error) {
      setAddError(t(CATEGORY_VALIDATION_I18N_KEY[validation.error]))
      return
    }

    setIsAdding(true)
    const result = await createCustomCategory(householdId, newCategoryName.trim())
    setIsAdding(false)

    if (result) {
      setNewCategoryName('')
      triggerHaptic()
    } else {
      setAddError(t('common.error'))
    }
  }

  const startEdit = (cat: ResolvedCategory) => {
    if (cat.is_global) return
    setEditingCategoryId(cat.id)
    setEditingName(cat.name)
    setEditError(null)
  }

  const cancelEdit = () => {
    setEditingCategoryId(null)
    setEditingName('')
    setEditError(null)
  }

  const saveEdit = async (categoryId: number) => {
    setEditError(null)
    const validation = validateCategoryName(editingName, categories, categoryId)
    if (!validation.valid && validation.error) {
      setEditError(t(CATEGORY_VALIDATION_I18N_KEY[validation.error]))
      return
    }

    const success = await updateCustomCategory(householdId, categoryId, editingName.trim())
    if (success) {
      cancelEdit()
      triggerHaptic()
    } else {
      setEditError(t('common.error'))
    }
  }

  const confirmDelete = async () => {
    if (!deletingCategory || deletingCategory.is_global) return
    setIsDeleting(true)
    const success = await deleteCustomCategory(householdId, deletingCategory.id)
    setIsDeleting(false)

    if (success) {
      setDeletingCategory(null)
      triggerHaptic()
    }
  }

  const handleToggleVisibility = (cat: ResolvedCategory) => {
    triggerHaptic()
    toggleVisibility(householdId, cat.id, !cat.is_hidden)
  }

  return {
    categories,
    newCategoryName,
    setNewCategoryName,
    addError,
    setAddError,
    isAdding,
    editingCategoryId,
    editingName,
    setEditingName,
    editError,
    deletingCategory,
    setDeletingCategory,
    isDeleting,
    dragOverIndex,
    getDisplayName,
    handleMove,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleAddCategory,
    startEdit,
    cancelEdit,
    saveEdit,
    confirmDelete,
    handleToggleVisibility
  }
}

