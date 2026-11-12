import { useState, useEffect } from 'react'
import { useTranslation } from '@/i18n'
import { usePantryStore } from '@/store/usePantryStore'
import { useShoppingStore } from '@/store/useShoppingStore'
import { useShallow } from 'zustand/react/shallow'
import { shoppingListService } from '@/services/shoppingListService'
import {
  areUnitsCompatible,
  calculatePantryFreshness,
  calculatePartialDelta,
  convertQuantity
} from '@/lib/calculations/pantryCalculations'
import { toast } from '@/store/useToastStore'
import { getNextQuantity } from '@/lib/utils'
import type { UnitEnum } from '@/types/supabase'

export interface UsePantryConfirmControllerParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  context: 'cart' | 'active'
  productId?: string | null
  adHocName?: string | null
  productName: string
  unitType?: string
  neededQuantity: number
  draftItemId?: string
  activeItemId?: string
  isAlreadyMarkedInPantry?: boolean
  onSuccess?: () => void
}

export function usePantryConfirmController({
  open,
  onOpenChange,
  context,
  productId,
  adHocName,
  productName,
  unitType = 'pcs',
  neededQuantity,
  draftItemId,
  activeItemId,
  isAlreadyMarkedInPantry = false,
  onSuccess
}: UsePantryConfirmControllerParams) {
  const { t, formatQuantity } = useTranslation()
  const {
    pantryMapByProductId,
    pantryMapByAdHocName,
    pantryItemsByParentId,
    verifyPantryItem,
    removeByProductOrName,
    addOrIncrementItem,
    activeHouseholdId
  } = usePantryStore(
    useShallow((state) => ({
      pantryMapByProductId: state.pantryMapByProductId,
      pantryMapByAdHocName: state.pantryMapByAdHocName,
      pantryItemsByParentId: state.pantryItemsByParentId,
      verifyPantryItem: state.verifyPantryItem,
      removeByProductOrName: state.removeByProductOrName,
      addOrIncrementItem: state.addOrIncrementItem,
      activeHouseholdId: state.activeHouseholdId
    }))
  )
  const { removeFromDraft, updateDraftQuantity } = useShoppingStore(
    useShallow((state) => ({
      removeFromDraft: state.removeFromDraft,
      updateDraftQuantity: state.updateDraftQuantity
    }))
  )

  const childPantryItems = productId ? pantryItemsByParentId[productId] || [] : []
  const existingPantryItem =
    (productId ? pantryMapByProductId[productId] : null) ||
    (adHocName ? pantryMapByAdHocName[adHocName.trim().toLowerCase()] : null) ||
    (productName ? pantryMapByAdHocName[productName.trim().toLowerCase()] : null)

  const isAggregated = !existingPantryItem && childPantryItems.length > 0
  const aggregatedQty = childPantryItems.reduce(
    (acc, c) => acc + (convertQuantity(Number(c.quantity || 0), c.unit_type, unitType) ?? 0),
    0
  )
  const effectivePantryItem =
    existingPantryItem || (childPantryItems.length > 0 ? childPantryItems[0] : null)
  const pantryUnit = isAggregated ? unitType : effectivePantryItem?.unit_type || unitType

  const [pantryQty, setPantryQty] = useState<number>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (existingPantryItem) {
      setPantryQty(Number(existingPantryItem.quantity) || 1)
    } else if (isAggregated) {
      setPantryQty(aggregatedQty || 1)
    } else {
      setPantryQty(neededQuantity || 1)
    }
  }, [open, existingPantryItem, isAggregated, aggregatedQty, neededQuantity])

  const isNonFood = !!(
    effectivePantryItem?.category?.is_non_food ||
    effectivePantryItem?.product?.category?.is_non_food
  )

  const freshness = calculatePantryFreshness(
    effectivePantryItem?.last_purchased_at,
    isNonFood,
    productName,
    formatQuantity(pantryQty, pantryUnit),
    effectivePantryItem?.last_verified_at
  )

  const unitsCompatible = areUnitsCompatible(unitType, pantryUnit)
  const convertedPantryQty = convertQuantity(pantryQty, pantryUnit, unitType)
  const remainingDelta = calculatePartialDelta(neededQuantity, pantryQty, unitType, pantryUnit)
  const isPartial =
    unitsCompatible &&
    convertedPantryQty !== null &&
    convertedPantryQty > 0 &&
    convertedPantryQty < neededQuantity

  const resolvedUnit = (unitType as UnitEnum) || 'pcs'

  const handleHaveAll = async () => {
    setIsSubmitting(true)
    try {
      if (existingPantryItem) {
        await verifyPantryItem(existingPantryItem.id, pantryQty)
      } else if (childPantryItems.length > 0) {
        for (const child of childPantryItems) {
          await verifyPantryItem(child.id, child.quantity)
        }
      } else if (activeHouseholdId) {
        await addOrIncrementItem(
          {
            household_id: activeHouseholdId,
            product_id: productId || null,
            ad_hoc_name: adHocName || null,
            quantity: pantryQty,
            unit_type: resolvedUnit,
            last_purchased_at: new Date().toISOString(),
            last_verified_at: new Date().toISOString()
          },
          'set'
        )
      }

      if (context === 'cart' && draftItemId) {
        removeFromDraft(draftItemId)
        toast.info(t('pantry.modal.removedFromCart', { productName }))
      } else if (context === 'active' && activeItemId) {
        await shoppingListService.toggleItemInPantry(activeItemId, true)
        toast.success(t('pantry.modal.markedInPantry', { productName }))
      }

      onSuccess?.()
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleHavePartial = async () => {
    if (!isPartial || remainingDelta <= 0) return
    setIsSubmitting(true)
    try {
      if (existingPantryItem) {
        await verifyPantryItem(existingPantryItem.id, pantryQty)
      } else if (activeHouseholdId) {
        await addOrIncrementItem(
          {
            household_id: activeHouseholdId,
            product_id: productId || null,
            ad_hoc_name: adHocName || null,
            quantity: pantryQty,
            unit_type: resolvedUnit,
            last_purchased_at: new Date().toISOString(),
            last_verified_at: new Date().toISOString()
          },
          'set'
        )
      }

      if (context === 'cart' && draftItemId) {
        updateDraftQuantity(draftItemId, remainingDelta)
      } else if (context === 'active' && activeItemId) {
        await shoppingListService.updateItemQuantity(activeItemId, remainingDelta)
      }

      onSuccess?.()
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDontHave = async () => {
    setIsSubmitting(true)
    try {
      if (existingPantryItem) {
        await removeByProductOrName(
          existingPantryItem.product_id,
          existingPantryItem.ad_hoc_name || existingPantryItem.product?.name
        )
      } else if (childPantryItems.length > 0) {
        for (const child of childPantryItems) {
          await removeByProductOrName(
            child.product_id,
            child.ad_hoc_name || child.product?.name
          )
        }
      } else {
        await removeByProductOrName(productId, adHocName || productName)
      }

      if (context === 'active' && activeItemId && isAlreadyMarkedInPantry) {
        await shoppingListService.toggleItemInPantry(activeItemId, false)
      }

      toast.info(t('pantry.modal.removedFromPantry'))
      onSuccess?.()
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRestoreToBuy = async () => {
    if (context === 'active' && activeItemId) {
      setIsSubmitting(true)
      try {
        await shoppingListService.toggleItemInPantry(activeItemId, false)
        toast.success(t('pantry.modal.restoredToList', { productName }))
        onSuccess?.()
        onOpenChange(false)
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleStepQuantity = (direction: 'increase' | 'decrease') => {
    const next = getNextQuantity(pantryQty, pantryUnit, direction)
    setPantryQty(Math.max(0, next))
  }

  return {
    childPantryItems,
    pantryUnit,
    pantryQty,
    setPantryQty,
    isSubmitting,
    freshness,
    remainingDelta,
    isPartial,
    handleHaveAll,
    handleHavePartial,
    handleDontHave,
    handleRestoreToBuy,
    handleStepQuantity
  }
}

