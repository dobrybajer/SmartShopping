import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { ShoppingBag } from 'lucide-react'
import { useTranslation } from '@/i18n'
import type { DraftItem } from '@/store/useShoppingStore'
import { useTransferToActiveList } from '@/hooks/useTransferToActiveList'
import { TransferToActiveListForm } from '@/components/shopping/TransferToActiveListForm'

interface TransferToActiveListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItems: DraftItem[]
  onSuccess: (targetListId: string) => void
}

export const TransferToActiveListDialog: React.FC<TransferToActiveListDialogProps> = ({
  open,
  onOpenChange,
  selectedItems,
  onSuccess
}) => {
  const { t } = useTranslation()
  const ctrl = useTransferToActiveList({ open, onOpenChange, selectedItems, onSuccess })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full max-w-[95vw] bg-card border-border text-foreground rounded-2xl p-6 overflow-hidden">
        <DialogHeader className="text-left space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('draft.transferToActive')}</span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground truncate">
            {t('draft.transferAction', { count: selectedItems.length })}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t('draft.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <TransferToActiveListForm
          variant="desktop"
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
      </DialogContent>
    </Dialog>
  )
}
