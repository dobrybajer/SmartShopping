import React from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { CategoryManagerContent } from '@/components/categories/CategoryManagerContent'
import { useTranslation } from '@/i18n'
import { Layers } from 'lucide-react'

interface CategoryManagerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  householdId: string
}

export const CategoryManagerSheet: React.FC<CategoryManagerSheetProps> = ({
  open,
  onOpenChange,
  householdId
}) => {
  const { t } = useTranslation()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-border bg-card p-4 pb-8 max-h-[85vh] flex flex-col focus:outline-hidden"
      >
        <SheetHeader className="text-left pb-2 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Layers className="w-4 h-4" />
            </div>
            {t('categoryManager.title')}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-3 flex-1 overflow-hidden">
          <CategoryManagerContent
            householdId={householdId}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
