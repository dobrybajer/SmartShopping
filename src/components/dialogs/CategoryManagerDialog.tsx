import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { CategoryManagerContent } from '@/components/categories/CategoryManagerContent'
import { useTranslation } from '@/i18n'
import { Layers } from 'lucide-react'

interface CategoryManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  householdId: string
}

export const CategoryManagerDialog: React.FC<CategoryManagerDialogProps> = ({
  open,
  onOpenChange,
  householdId
}) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-card text-foreground p-6 rounded-2xl shadow-xl flex flex-col focus:outline-hidden">
        <DialogHeader className="text-left pb-3 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-foreground">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Layers className="w-5 h-5" />
            </div>
            {t('categoryManager.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 flex-1 overflow-hidden">
          <CategoryManagerContent
            householdId={householdId}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
