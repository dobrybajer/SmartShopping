import { useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useShoppingStore } from '@/store/useShoppingStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useShallow } from 'zustand/react/shallow'
import { useTranslation } from '@/i18n'
import { groupItemsByAisle } from '@/lib/calculations/categorySorting'
import type { AisleGroup } from '@/lib/calculations/categorySorting'
import type { ActiveListWithDetails, ActiveListItemWithProduct } from '@/services/shoppingListService'
import type { AddToDraftPayload } from '@/store/useShoppingStore'

interface UseHistoryDetailsControllerOptions {
  listHouseholdId?: string | null
  listNameFallback?: string | null
  haptic?: boolean
  allAddedResetMs?: number
  onAllAddedComplete?: () => void
}

const triggerVibration = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern)
    } catch {
      // Ignore vibration errors
    }
  }
}

export function useHistoryDetailsController(
  listDetails: ActiveListWithDetails | null,
  options: UseHistoryDetailsControllerOptions = {}
) {
  const {
    listHouseholdId,
    listNameFallback,
    haptic = false,
    allAddedResetMs = 2000,
    onAllAddedComplete
  } = options

  const { household } = useAuth()
  const { addItemToDraft, addMultipleToDraft } = useShoppingStore(
    useShallow((state) => ({
      addItemToDraft: state.addItemToDraft,
      addMultipleToDraft: state.addMultipleToDraft
    }))
  )
  const { categoriesByHousehold, loadCategories } = useCategoryStore(
    useShallow((state) => ({
      categoriesByHousehold: state.categoriesByHousehold,
      loadCategories: state.loadCategories
    }))
  )
  const { t } = useTranslation()

  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({})
  const [allAdded, setAllAdded] = useState(false)

  const householdKey = listHouseholdId || household?.id || 'global'
  const resolvedCategories = useMemo(
    () =>
      categoriesByHousehold[householdKey] ||
      (listHouseholdId ? categoriesByHousehold[listHouseholdId] : undefined) ||
      (household?.id ? categoriesByHousehold[household.id] : undefined) ||
      categoriesByHousehold['global'] ||
      [],
    [categoriesByHousehold, householdKey, listHouseholdId, household?.id]
  )

  const items = listDetails?.items || []
  const checkedCount = items.filter((i) => i.is_checked).length
  const totalCount = items.length
  const sortedCategories = groupItemsByAisle(items, resolvedCategories, 'other')

  const getCategoryLabel = useCallback(
    (catName: string) => {
      const key = `categories.${catName}` as Parameters<typeof t>[0]
      const translated = t(key)
      return translated !== key ? translated : catName
    },
    [t]
  )

  const mapItemToDraftPayload = useCallback(
    (
      item: ActiveListItemWithProduct,
      group?: AisleGroup<ActiveListItemWithProduct>
    ): AddToDraftPayload => {
      const selectedCatId =
        item.category_id ??
        group?.categoryId ??
        item.category?.id ??
        item.product?.category_id ??
        item.product?.category?.id ??
        undefined

      const resolvedCat = selectedCatId
        ? resolvedCategories.find((c) => c.id === selectedCatId)
        : undefined

      const resolvedCatName =
        resolvedCat?.custom_name ||
        resolvedCat?.name ||
        (group?.name && group.name !== 'other' ? group.name : undefined) ||
        item.category?.name ||
        item.product?.category?.name ||
        'other'

      const resolvedSortOrder =
        resolvedCat?.sort_order ??
        (group?.sort_order && group.sort_order !== 99999 ? group.sort_order : undefined) ??
        (item.category?.sort_order ? item.category.sort_order * 10 : undefined) ??
        (item.product?.category?.sort_order ? item.product.category.sort_order * 10 : undefined) ??
        99

      const prodId = item.product?.id || item.product_id || undefined

      return {
        product_id: prodId,
        name: item.product?.name || item.ad_hoc_name || 'Product',
        quantity: item.total_quantity,
        unit_type: item.product?.unit_type || 'pcs',
        category_id: selectedCatId,
        category_name: resolvedCatName,
        sort_order: resolvedSortOrder,
        meal_source: `${t('history.archivedList')}: ${listDetails?.name || listNameFallback || t('navigation.history')}`,
        is_ad_hoc: !prodId || !!item.added_ad_hoc
      }
    },
    [resolvedCategories, t, listDetails?.name, listNameFallback]
  )

  const handleAddSingleItemToDraft = (
    item: ActiveListItemWithProduct,
    group?: AisleGroup<ActiveListItemWithProduct>
  ) => {
    addItemToDraft(mapItemToDraftPayload(item, group))
    if (haptic) triggerVibration(25)

    setAddedItemIds((prev) => ({ ...prev, [item.id]: true }))
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [item.id]: false }))
    }, 1500)
  }

  const handleAddAllToDraft = () => {
    if (!listDetails || listDetails.items.length === 0) return

    const payloads: AddToDraftPayload[] = []
    if (sortedCategories.length > 0) {
      for (const group of sortedCategories) {
        for (const item of group.items) {
          payloads.push(mapItemToDraftPayload(item, group))
        }
      }
    } else {
      listDetails.items.forEach((item) => payloads.push(mapItemToDraftPayload(item)))
    }

    if (payloads.length === 0) return

    addMultipleToDraft(payloads)
    if (haptic) triggerVibration([40, 60, 40])

    setAllAdded(true)
    setTimeout(() => {
      setAllAdded(false)
      onAllAddedComplete?.()
    }, allAddedResetMs)
  }

  const resetFeedback = useCallback(() => {
    setAddedItemIds({})
    setAllAdded(false)
  }, [])

  return {
    household,
    loadCategories,
    items,
    checkedCount,
    totalCount,
    sortedCategories,
    addedItemIds,
    allAdded,
    getCategoryLabel,
    handleAddSingleItemToDraft,
    handleAddAllToDraft,
    resetFeedback
  }
}
