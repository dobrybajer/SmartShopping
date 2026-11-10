import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '@/i18n'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import { usePantryStore } from '@/store/usePantryStore'
import { useShallow } from 'zustand/react/shallow'
import {
  calculateMealPantryDeductions,
  type CookableIngredientInput
} from '@/lib/calculations/pantryConsumption'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { UtensilsCrossed, Warehouse, ArrowRight, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CookMealDeductModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mealName: string
  ingredients: CookableIngredientInput[]
  onSuccess?: () => void
}

export const CookMealDeductModal: React.FC<CookMealDeductModalProps> = ({
  open,
  onOpenChange,
  mealName,
  ingredients,
  onSuccess
}) => {
  const { t, formatQuantity } = useTranslation()
  const { isDesktop } = useDeviceLayout()
  const { pantryMapByProductId, pantryItemsByParentId, deductMealIngredients } = usePantryStore(
    useShallow((state) => ({
      pantryMapByProductId: state.pantryMapByProductId,
      pantryItemsByParentId: state.pantryItemsByParentId,
      deductMealIngredients: state.deductMealIngredients
    }))
  )

  const deductions = useMemo(
    () => calculateMealPantryDeductions(ingredients, pantryMapByProductId, pantryItemsByParentId),
    [ingredients, pantryMapByProductId, pantryItemsByParentId]
  )

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && !isSubmitting) {
      setSelectedIds(new Set(deductions.map((d) => d.pantryItemId)))
    }
  }, [open, deductions, isSubmitting])

  const toggleItem = (pantryItemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(pantryItemId)) {
        next.delete(pantryItemId)
      } else {
        next.add(pantryItemId)
      }
      return next
    })
  }

  const selectedDeductions = deductions.filter((d) => selectedIds.has(d.pantryItemId))

  const handleConfirm = async () => {
    if (selectedDeductions.length === 0) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)
    const updates = selectedDeductions.map((d) => ({
      pantryItemId: d.pantryItemId,
      newQuantity: d.remainingStock
    }))

    const success = await deductMealIngredients(updates)
    setIsSubmitting(false)

    if (success) {
      toast.success(t('pantry.cookModal.successToast', { count: updates.length }))
      onSuccess?.()
      onOpenChange(false)
    }
  }

  const bodyContent = (
    <div className="flex flex-col gap-3 py-1">
      {deductions.length === 0 ? (
        <div className="p-4 rounded-xl bg-background border border-border flex items-center gap-3 text-xs text-muted-foreground">
          <Warehouse className="w-5 h-5 shrink-0 text-muted-foreground/70" />
          <span>{t('pantry.cookModal.noMatchingStock')}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[45vh] overflow-y-auto pr-1">
          {deductions.map((item) => {
            const isChecked = selectedIds.has(item.pantryItemId)
            return (
              <label
                key={item.pantryItemId}
                className={cn(
                  'flex items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none',
                  isChecked
                    ? 'bg-emerald-500/5 border-emerald-500/30'
                    : 'bg-background border-border opacity-70'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggleItem(item.pantryItemId)}
                    aria-label={item.productName}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {item.productName}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground flex-wrap">
                      <span>{formatQuantity(item.currentStock, item.unitType)}</span>
                      <ArrowRight className="w-3 h-3 text-emerald-400" />
                      <span
                        className={cn(
                          'font-bold',
                          item.willDeplete ? 'text-rose-400' : 'text-emerald-400'
                        )}
                      >
                        {formatQuantity(item.remainingStock, item.unitType)}
                      </span>
                      <span className="text-[11px] text-amber-400">
                        (-{formatQuantity(item.deductQuantity, item.unitType)})
                      </span>
                    </div>
                  </div>
                </div>

                {item.willDeplete && (
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[10px] border-rose-500/30 bg-rose-500/10 text-rose-400 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Badge>
                )}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )

  const footerContent = (
    <div className="flex items-center justify-end gap-2 w-full pt-2">
      <Button
        type="button"
        variant="ghost"
        onClick={() => onOpenChange(false)}
        className="rounded-xl"
      >
        {t('common.close')}
      </Button>
      {deductions.length > 0 && (
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting || selectedDeductions.length === 0}
          className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2 cursor-pointer"
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>{t('pantry.cookModal.confirm', { count: selectedDeductions.length })}</span>
        </Button>
      )}
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-card border-border text-foreground p-6 rounded-2xl shadow-2xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-emerald-400" />
              <span>{t('pantry.cookModal.title')}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t('pantry.cookModal.description', { mealName })}
            </DialogDescription>
          </DialogHeader>
          {bodyContent}
          <DialogFooter className="sm:justify-end">{footerContent}</DialogFooter>
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
            <UtensilsCrossed className="w-5 h-5 text-emerald-400" />
            <span>{t('pantry.cookModal.title')}</span>
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {t('pantry.cookModal.description', { mealName })}
          </SheetDescription>
        </SheetHeader>
        <div className="py-4">{bodyContent}</div>
        <SheetFooter>{footerContent}</SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

