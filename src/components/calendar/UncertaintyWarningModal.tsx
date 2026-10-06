import React from 'react'
import type { MealPlanItem, MissingIngredient } from '@/types/calendar'
import { AlertTriangle, Plus, Check } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { useMealPlanStore } from '@/store/useMealPlanStore'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

interface UncertaintyWarningModalProps {
  isOpen: boolean
  onClose: () => void
  planItem: MealPlanItem
  missingIngredients: MissingIngredient[]
}

export const UncertaintyWarningModal: React.FC<UncertaintyWarningModalProps> = ({
  isOpen,
  onClose,
  planItem,
  missingIngredients
}) => {
  const { t } = useTranslation()
  const { isDesktop } = useDeviceLayout()
  const { restoreMissingIngredient } = useMealPlanStore()

  const [restoredIds, setRestoredIds] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    if (isOpen) {
      setRestoredIds(new Set())
    }
  }, [isOpen])

  const handleRestoreOne = (item: MissingIngredient) => {
    restoreMissingIngredient(item, planItem)
    setRestoredIds((prev) => new Set(prev).add(item.productId))
  }

  const handleRestoreAll = () => {
    for (const item of missingIngredients) {
      if (!restoredIds.has(item.productId)) {
        restoreMissingIngredient(item, planItem)
      }
    }
    onClose()
  }

  const mealName = planItem.meal?.name || planItem.custom_name || 'Posiłek'

  const contentBody = (
    <div className="flex flex-col gap-4 py-2">
      <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1 text-xs">
          <span className="font-semibold text-rose-400">
            {mealName} ({planItem.date})
          </span>
          <span className="text-muted-foreground leading-relaxed">
            {t('calendar.uncertainty.description')}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
          {t('calendar.uncertainty.missingList')}
        </span>

        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {missingIngredients.map((ing) => {
            const isRestored = restoredIds.has(ing.productId)

            return (
              <div
                key={ing.productId}
                className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border shadow-xs"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{ing.productName}</span>
                  <span className="text-xs text-muted-foreground">
                    {ing.requiredQuantity} {ing.unitType}
                  </span>
                </div>

                <Button
                  size="sm"
                  variant={isRestored ? 'outline' : 'default'}
                  onClick={() => handleRestoreOne(ing)}
                  disabled={isRestored}
                  className="h-8 gap-1.5 text-xs rounded-lg"
                >
                  {isRestored ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Przywrócono</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('calendar.uncertainty.restoreOne')}</span>
                    </>
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button variant="ghost" onClick={onClose} className="rounded-xl">
          {t('common.close')}
        </Button>
        <Button
          onClick={handleRestoreAll}
          className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
        >
          {t('calendar.uncertainty.restoreAll')}
        </Button>
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              {t('calendar.uncertainty.title')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              {mealName}
            </DialogDescription>
          </DialogHeader>
          {contentBody}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl bg-card border-t border-border px-5 pb-6">
        <SheetHeader className="text-left pb-1">
          <SheetTitle className="flex items-center gap-2 text-foreground text-base">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            {t('calendar.uncertainty.title')}
          </SheetTitle>
          <SheetDescription className="text-muted-foreground text-xs">
            {mealName}
          </SheetDescription>
        </SheetHeader>
        {contentBody}
      </SheetContent>
    </Sheet>
  )
}
