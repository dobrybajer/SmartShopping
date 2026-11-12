import React from 'react'
import { useTranslation } from '@/i18n'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import { usePantryConfirmController } from '@/hooks/usePantryConfirmController'
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
import { cn } from '@/lib/utils'

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

export const PantryConfirmModal: React.FC<PantryConfirmModalProps> = (props) => {
  const { open, onOpenChange, productName, unitType = 'pcs', neededQuantity, isAlreadyMarkedInPantry = false } = props
  const { isDesktop } = useDeviceLayout()
  const { t, formatQuantity } = useTranslation()
  const ctrl = usePantryConfirmController(props)

  const modalBody = (
    <div className="flex flex-col gap-4 text-xs">
      <div
        className={cn(
          'p-3.5 rounded-xl border flex flex-col gap-2 transition-all',
          ctrl.freshness.badgeBgClass
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Warehouse className={cn('w-4 h-4', ctrl.freshness.colorClass)} />
            <span className="font-bold text-xs text-foreground">{productName}</span>
          </div>
          {ctrl.freshness.daysSincePurchase !== null && (
            <Badge
              variant="outline"
              className={cn('text-[10px] font-mono', ctrl.freshness.colorClass)}
            >
              {ctrl.freshness.daysSincePurchase}d
            </Badge>
          )}
        </div>

        <p className="text-xs text-foreground/90 leading-relaxed">
          {t(ctrl.freshness.messageKey, ctrl.freshness.translationParams)}
          {ctrl.freshness.translationParams.verifiedDate && (
            <span className="text-muted-foreground font-mono text-[11px] block mt-0.5">
              <Clock className="w-3 h-3 inline mr-1" />
              {t('pantry.freshness.verifiedSuffix', {
                verifiedDate: ctrl.freshness.translationParams.verifiedDate
              })}
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
        <span className="text-muted-foreground">{t('pantry.addDialog.quantity')}:</span>
        <span className="font-bold text-foreground font-mono">
          {formatQuantity(neededQuantity, unitType)}
        </span>
      </div>

      {ctrl.childPantryItems.length > 0 && (
        <div className="p-3 rounded-xl bg-card border border-border flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground text-xs">
              {t('products.childVariants')} ({ctrl.childPantryItems.length}):
            </span>
            <span className="text-[10px] text-muted-foreground">{t('products.general')}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {ctrl.childPantryItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-background border border-border"
              >
                <span className="text-foreground font-medium">
                  {item.product?.name || item.ad_hoc_name}
                </span>
                <span className="font-mono font-bold text-primary">
                  {formatQuantity(item.quantity, item.unit_type)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="font-semibold text-foreground">{t('pantry.modal.currentStock')}:</label>
        <div className="flex items-center bg-background border border-border rounded-xl p-1 shadow-inner justify-between">
          <button
            type="button"
            onClick={() => ctrl.handleStepQuantity('decrease')}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer"
            aria-label={t('common.decrease')}
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="any"
              value={ctrl.pantryQty}
              onChange={(e) => ctrl.setPantryQty(Number(e.target.value) || 0)}
              className="w-20 h-9 text-center font-mono text-sm font-bold text-primary bg-transparent border-0 focus-visible:ring-0 p-0"
            />
            <span className="font-mono text-xs text-muted-foreground font-semibold pr-2">
              {ctrl.pantryUnit}
            </span>
          </div>

          <button
            type="button"
            onClick={() => ctrl.handleStepQuantity('increase')}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer"
            aria-label={t('common.increase')}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {ctrl.isPartial && ctrl.remainingDelta > 0 && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium flex items-center gap-2">
          <PieChart className="w-4 h-4 shrink-0" />
          <span>
            {t('pantry.modal.remainingToBuy', {
              quantity: formatQuantity(ctrl.remainingDelta, unitType)
            })}
          </span>
        </div>
      )}
    </div>
  )

  const modalActions = (
    <div className="flex flex-col gap-2 w-full pt-2">
      <Button
        type="button"
        onClick={ctrl.handleHaveAll}
        disabled={ctrl.isSubmitting || ctrl.pantryQty <= 0}
        className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md"
      >
        <CheckCircle2 className="w-4 h-4" />
        <span>{t('pantry.modal.haveAll')}</span>
      </Button>

      {ctrl.isPartial && (
        <Button
          type="button"
          onClick={ctrl.handleHavePartial}
          disabled={ctrl.isSubmitting}
          className="w-full h-10 bg-card hover:bg-muted text-foreground border border-amber-500/40 hover:border-amber-500/70 font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
        >
          <PieChart className="w-4 h-4 text-amber-400" />
          <span>
            {t('pantry.modal.havePartial')} (-{formatQuantity(ctrl.pantryQty, ctrl.pantryUnit)})
          </span>
        </Button>
      )}

      {isAlreadyMarkedInPantry && (
        <Button
          type="button"
          onClick={ctrl.handleRestoreToBuy}
          disabled={ctrl.isSubmitting}
          className="w-full h-10 bg-card hover:bg-muted text-foreground border border-border font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-primary" />
          <span>{t('pantry.modal.restoreToBuy')}</span>
        </Button>
      )}

      <Button
        type="button"
        onClick={ctrl.handleDontHave}
        disabled={ctrl.isSubmitting}
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
