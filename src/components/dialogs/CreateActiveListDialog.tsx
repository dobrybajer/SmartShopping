import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { PlusCircle } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { useAuth } from '@/context/AuthContext'
import { shoppingListService } from '@/services/shoppingListService'
import { formatDate } from '@/lib/utils'

interface CreateActiveListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (newListId: string) => void
}

export const CreateActiveListDialog: React.FC<CreateActiveListDialogProps> = ({
  open,
  onOpenChange,
  onCreated
}) => {
  const { household } = useAuth()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!household || isSubmitting) return

    const trimmedName = name.trim() || `${t('activeList.title')} ${formatDate(new Date())}`
    setIsSubmitting(true)

    try {
      const created = await shoppingListService.createEmptyActiveList(
        household.id,
        trimmedName,
        isDefault
      )

      if (created) {
        setName('')
        setIsDefault(false)
        onCreated(created.id)
        onOpenChange(false)
      }
    } catch (err) {
      console.error('Error creating empty active list:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-card border-border text-foreground rounded-2xl p-5">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
            <PlusCircle className="w-4 h-4" />
            <span>{t('activeList.newList')}</span>
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            {t('activeList.newListDialogTitle')}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t('activeList.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="create-list-name" className="text-xs font-semibold text-foreground">
              {t('activeList.listName')}
            </Label>
            <Input
              id="create-list-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('activeList.listNamePlaceholder')}
              required
              className="h-10 bg-background border-border text-foreground rounded-xl"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="create-set-as-default"
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(!!checked)}
              className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
            />
            <Label
              htmlFor="create-set-as-default"
              className="text-xs text-muted-foreground font-normal cursor-pointer"
            >
              {t('activeList.setAsDefault')}
            </Label>
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
              disabled={isSubmitting}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-md cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                t('activeList.createList')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
