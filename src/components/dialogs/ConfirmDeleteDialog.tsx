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

interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  itemName?: string
  targetName?: string // e.g. "z koszyka" lub "z listy zakupów"
  onConfirm: () => void | Promise<void>
  isDeleting?: boolean
}

export const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  open,
  onOpenChange,
  title = 'Czy na pewno chcesz usunąć produkt?',
  itemName,
  targetName = 'z listy',
  onConfirm,
  isDeleting = false
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-zinc-800 bg-zinc-950 text-zinc-100">
        <DialogHeader className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-1">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <DialogTitle className="text-base font-bold text-zinc-100">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400 text-center leading-relaxed">
            Zmniejszenie liczby do 0 wyzeruje tę pozycję. Czy na pewno chcesz usunąć{' '}
            {itemName ? <strong className="text-zinc-200">{itemName}</strong> : 'ten produkt'}{' '}
            {targetName}?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-row gap-2 mt-4 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="flex-1 border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl h-10"
          >
            Anuluj
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl h-10 flex items-center justify-center gap-1.5 shadow-md shadow-red-950/40"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Usuń</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
