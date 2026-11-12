import React from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet'
import { ShoppingBag } from 'lucide-react'
import { useTranslation } from '@/i18n'
import type { DraftItem } from '@/store/useShoppingStore'
import { useTransferToActiveList } from '@/hooks/useTransferToActiveList'
import { TransferToActiveListForm } from '@/components/shopping/TransferToActiveListForm'

interface TransferToActiveListSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItems: DraftItem[]
  onSuccess: (targetListId: string) => void
}

export const TransferToActiveListSheet: React.FC<TransferToActiveListSheetProps> = ({
  open,
  onOpenChange,
  selectedItems,
  onSuccess
}) => {
  const { t } = useTranslation()
  const ctrl = useTransferToActiveList({ open, onOpenChange, selectedItems, onSuccess })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bg-card border-t border-border text-foreground rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto custom-scrollbar max-w-lg mx-auto"
      >
        <SheetHeader className="text-left space-y-1.5 pb-2 min-w-0">
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('draft.transferToActive')}</span>
          </div>
          <SheetTitle className="text-lg font-bold text-foreground truncate">
            {t('draft.transferAction', { count: selectedItems.length })}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {t('draft.subtitle')}
          </SheetDescription>
        </SheetHeader>

        <TransferToActiveListForm
          variant="mobile"
          activeLists={ctrl.activeLists}
          mode={ctrl.mode}
          setMode={ctrl.setMode}
          targetListId={ctrl.targetListId}
          setTargetListId={ctrl.setTargetListId}
          newListName={ctrl.newListName}
          setNewListName={ctrl.setNewListName}
          isDefault={ctrl.isDefault}
          setIsDefault={ctrl.setIsDefault}
          isSubmitting={ctrl.isSubmitting}
          selectedCount={selectedItems.length}
          selectedListName={ctrl.selectedListObj?.name}
          onCancel={() => onOpenChange(false)}
          onSubmit={ctrl.handleSubmit}
        />
      </SheetContent>
    </Sheet>
  )
}
