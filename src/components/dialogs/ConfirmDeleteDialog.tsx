import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { useTranslation } from '@/i18n'

interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  itemName?: string
  targetName?: string
  onConfirm: () => void | Promise<void>
  isDeleting?: boolean
}

export const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  open,
  onOpenChange,
  title,
  itemName,
  targetName,
  onConfirm,
  isDeleting = false
}) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-border bg-card text-foreground">
        <DialogHeader className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mb-1">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            {title || t('dialogs.confirmDelete.title')}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground text-center leading-relaxed">
            {itemName ? (
              <>
                {t('dialogs.confirmDelete.description')}: <strong className="text-foreground font-semibold">{itemName}</strong>
                {targetName ? ` (${targetName})` : ''}?
              </>
            ) : (
              t('dialogs.confirmDelete.description')
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-row gap-2 mt-4 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="flex-1 border-border bg-background hover:bg-muted text-foreground rounded-xl h-10 cursor-pointer"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold rounded-xl h-10 flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>{t('dialogs.confirmDelete.confirmButton')}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
