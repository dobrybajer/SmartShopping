import React, { useState, useEffect } from 'react'
import { useTranslation } from '@/i18n'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import { usePantryStore } from '@/store/usePantryStore'
import { useShoppingStore } from '@/store/useShoppingStore'
import { shoppingListService } from '@/services/shoppingListService'
import { calculatePantryFreshness, calculatePartialDelta } from '@/lib/calculations/pantryCalculations'
import { toast } from '@/store/useToastStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Warehouse,
  CheckCircle2,
  PieChart,
  Trash2,
  RotateCcw,
  Plus,
  Minus,
  Clock
} from 'lucide-react'
import { cn, getNextQuantity } from '@/lib/utils'

export interface PantryConfirmModalProps {
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

export const PantryConfirmModal: React.FC<PantryConfirmModalProps> = ({
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
}) => {
  const { isDesktop } = useDeviceLayout()
  const { t, formatQuantity } = useTranslation()
  const {
    pantryMapByProductId,
    pantryMapByAdHocName,
    verifyPantryItem,
    removeByProductOrName,
    addOrIncrementItem,
    activeHouseholdId
  } = usePantryStore()
  const { removeFromDraft, updateDraftQuantity } = useShoppingStore()

  // Find existing pantry record
  const existingPantryItem =
    (productId ? pantryMapByProductId[productId] : null) ||
    (adHocName ? pantryMapByAdHocName[adHocName.trim().toLowerCase()] : null) ||
    (productName ? pantryMapByAdHocName[productName.trim().toLowerCase()] : null)

  const [pantryQty, setPantryQty] = useState<number>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (existingPantryItem) {
        setPantryQty(Number(existingPantryItem.quantity) || 1)
      } else {
        setPantryQty(neededQuantity || 1)
      }
    }
  }, [open, existingPantryItem, neededQuantity])

  const isNonFood = !!(
    existingPantryItem?.category?.is_non_food ||
    existingPantryItem?.product?.category?.is_non_food
  )

  const freshness = calculatePantryFreshness(
    existingPantryItem?.last_purchased_at,
    isNonFood,
    productName,
    formatQuantity(pantryQty, unitType),
    existingPantryItem?.last_verified_at
  )

  const remainingDelta = calculatePartialDelta(neededQuantity, pantryQty)
  const isPartial = pantryQty > 0 && pantryQty < neededQuantity

  // 1. "Mam całość" (Full Coverage)
  const handleHaveAll = async () => {
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
            unit_type: (unitType as any) || 'pcs',
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

  // 2. "Mam częściowo" (Partial Coverage)
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
            unit_type: (unitType as any) || 'pcs',
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

  // 3. "Nie mam produktu"
  const handleDontHave = async () => {
    setIsSubmitting(true)
    try {
      if (existingPantryItem) {
        await removeByProductOrName(
          existingPantryItem.product_id,
          existingPantryItem.ad_hoc_name || existingPantryItem.product?.name
        )
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

  // 4. "Przywróć do kupienia" (Edge case 1)
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
    const next = getNextQuantity(pantryQty, unitType, direction)
    setPantryQty(Math.max(0, next))
  }

  const modalBody = (
    <div className="flex flex-col gap-4 text-xs">
      {/* Freshness Banner */}
      <div
        className={cn(
          "p-3.5 rounded-xl border flex flex-col gap-2 transition-all",
          freshness.badgeBgClass
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Warehouse className={cn("w-4 h-4", freshness.colorClass)} />
            <span className="font-bold text-xs text-foreground">{productName}</span>
          </div>
          {freshness.daysSincePurchase !== null && (
            <Badge variant="outline" className={cn("text-[10px] font-mono", freshness.colorClass)}>
              {freshness.daysSincePurchase}d
            </Badge>
          )}
        </div>

        <p className="text-xs text-foreground/90 leading-relaxed">
          {t(freshness.messageKey, freshness.translationParams)}
          {freshness.translationParams.verifiedDate && (
            <span className="text-muted-foreground font-mono text-[11px] block mt-0.5">
              <Clock className="w-3 h-3 inline mr-1" />
              {t('pantry.freshness.verifiedSuffix', {
                verifiedDate: freshness.translationParams.verifiedDate
              })}
            </span>
          )}
        </p>
      </div>

      {/* Target Quantity Info */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
        <span className="text-muted-foreground">{t('pantry.addDialog.quantity')}:</span>
        <span className="font-bold text-foreground font-mono">
          {formatQuantity(neededQuantity, unitType)}
        </span>
      </div>

      {/* Quantity Stepper in Pantry */}
      <div className="flex flex-col gap-1.5">
        <label className="font-semibold text-foreground">
          {t('pantry.modal.currentStock')}:
        </label>
        <div className="flex items-center bg-background border border-border rounded-xl p-1 shadow-inner justify-between">
          <button
            type="button"
            onClick={() => handleStepQuantity('decrease')}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer"
            aria-label={t('common.decrease')}
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="any"
              value={pantryQty}
              onChange={(e) => setPantryQty(Number(e.target.value) || 0)}
              className="w-20 h-9 text-center font-mono text-sm font-bold text-primary bg-transparent border-0 focus-visible:ring-0 p-0"
            />
            <span className="font-mono text-xs text-muted-foreground font-semibold pr-2">
              {unitType}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleStepQuantity('increase')}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer"
            aria-label={t('common.increase')}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Partial Remaining Info */}
      {isPartial && remainingDelta > 0 && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium flex items-center gap-2">
          <PieChart className="w-4 h-4 shrink-0" />
          <span>{t('pantry.modal.remainingToBuy', { quantity: formatQuantity(remainingDelta, unitType) })}</span>
        </div>
      )}
    </div>
  )

  const modalActions = (
    <div className="flex flex-col gap-2 w-full pt-2">
      {/* Primary: Mam całość */}
      <Button
        type="button"
        onClick={handleHaveAll}
        disabled={isSubmitting || pantryQty <= 0}
        className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md"
      >
        <CheckCircle2 className="w-4 h-4" />
        <span>{t('pantry.modal.haveAll')}</span>
      </Button>

      {/* Secondary: Mam częściowo */}
      {isPartial && (
        <Button
          type="button"
          onClick={handleHavePartial}
          disabled={isSubmitting}
          className="w-full h-10 bg-card hover:bg-muted text-foreground border border-amber-500/40 hover:border-amber-500/70 font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
        >
          <PieChart className="w-4 h-4 text-amber-400" />
          <span>
            {t('pantry.modal.havePartial')} (-{formatQuantity(pantryQty, unitType)})
          </span>
        </Button>
      )}

      {/* Tertiary: Przywróć do kupienia (if currently in_pantry on active list) */}
      {isAlreadyMarkedInPantry && (
        <Button
          type="button"
          onClick={handleRestoreToBuy}
          disabled={isSubmitting}
          className="w-full h-10 bg-card hover:bg-muted text-foreground border border-border font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-primary" />
          <span>{t('pantry.modal.restoreToBuy')}</span>
        </Button>
      )}

      {/* Destructive / Clear: Nie mam produktu */}
      <Button
        type="button"
        onClick={handleDontHave}
        disabled={isSubmitting}
        variant="ghost"
        className="w-full h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>{t('pantry.modal.dontHave')}</span>
      </Button>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-card border-border text-foreground p-6 rounded-2xl shadow-2xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-primary" />
              <span>{t('pantry.modal.title')}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {productName}
            </DialogDescription>
          </DialogHeader>

          {modalBody}
          <DialogFooter className="sm:justify-stretch">{modalActions}</DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="p-6 bg-card border-t border-border text-foreground rounded-t-3xl max-h-[90vh] overflow-y-auto"
      >
        <SheetHeader className="text-left pb-3 border-b border-border">
          <SheetTitle className="text-base font-bold flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-primary" />
            <span>{t('pantry.modal.title')}</span>
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {productName}
          </SheetDescription>
        </SheetHeader>

        <div className="py-4">{modalBody}</div>
        <SheetFooter>{modalActions}</SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
