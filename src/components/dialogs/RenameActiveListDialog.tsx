import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit2 } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { shoppingListService } from '@/services/shoppingListService'

interface RenameActiveListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  listId: string
  currentName: string
  onRenamed: (newName: string) => void
}

export const RenameActiveListDialog: React.FC<RenameActiveListDialogProps> = ({
  open,
  onOpenChange,
  listId,
  currentName,
  onRenamed
}) => {
  const { t } = useTranslation()
  const [name, setName] = useState(currentName)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setName(currentName)
  }, [currentName, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const success = await shoppingListService.updateListName(listId, name.trim())
      if (success) {
        onRenamed(name.trim())
        onOpenChange(false)
      }
    } catch (err) {
      console.error('Error renaming list:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-card border-border text-foreground rounded-2xl p-5">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
            <Edit2 className="w-4 h-4" />
            <span>{t('activeList.renameList')}</span>
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            {t('activeList.renameDialogTitle')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="rename-list-name" className="text-xs font-semibold text-foreground">
              {t('activeList.listName')}
            </Label>
            <Input
              id="rename-list-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('activeList.listNamePlaceholder')}
              required
              className="h-10 bg-background border-border text-foreground rounded-xl"
              autoFocus
            />
          </div>

          <DialogFooter className="flex flex-row gap-2 pt-2 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1 border-border bg-background hover:bg-muted text-foreground rounded-xl cursor-pointer"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-md cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                t('common.save')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
