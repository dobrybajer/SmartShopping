import React, { useState, useEffect } from 'react'
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
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  ShoppingBag,
  Plus,
  Star,
  CheckCircle2,
  ListOrdered
} from 'lucide-react'
import { useTranslation } from '@/i18n'
import { useAuth } from '@/context/AuthContext'
import { useShoppingStore, type DraftItem } from '@/store/useShoppingStore'
import {
  shoppingListService,
  type ShoppingListSummary
} from '@/services/shoppingListService'
import { formatDate } from '@/lib/utils'
import {
  sortActiveLists,
  findTargetTransferListId
} from '@/lib/calculations/activeListCalculations'

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
  const { household } = useAuth()
  const { t, formatQuantity } = useTranslation()
  const { selectedActiveListId, setSelectedActiveListId } = useShoppingStore()

  const [activeLists, setActiveLists] = useState<ShoppingListSummary[]>([])
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [targetListId, setTargetListId] = useState<string>('')
  const [newListName, setNewListName] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const householdId = household?.id

  useEffect(() => {
    if (!open || !householdId) return

    let isMounted = true
    shoppingListService.getActiveListsSummary(householdId).then((lists) => {
      if (!isMounted) return
      const sorted = sortActiveLists(lists)
      setActiveLists(sorted)

      if (sorted.length === 0) {
        setMode('new')
        setNewListName(`${t('activeList.title')} ${formatDate(new Date())}`)
      } else {
        const targetId = findTargetTransferListId(sorted, selectedActiveListId)
        if (targetId) {
          setTargetListId(targetId)
        }
        setMode('existing')
        setNewListName(`${t('activeList.title')} ${formatDate(new Date())}`)
      }
    })

    return () => {
      isMounted = false
    }
  }, [open, householdId, selectedActiveListId, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!household || selectedItems.length === 0 || isSubmitting) return

    setIsSubmitting(true)

    try {
      if (mode === 'new') {
        const created = await shoppingListService.createActiveListFromDraft(
          household.id,
          newListName.trim() || `${t('activeList.title')} ${formatDate(new Date())}`,
          selectedItems,
          isDefault
        )

        if (created) {
          setSelectedActiveListId(created.id)
          onSuccess(created.id)
          onOpenChange(false)
        }
      } else {
        if (!targetListId) return
        const updated = await shoppingListService.addItemsToActiveList(
          targetListId,
          household.id,
          selectedItems
        )

        if (updated) {
          setSelectedActiveListId(updated.id)
          onSuccess(updated.id)
          onOpenChange(false)
        }
      }
    } catch (err) {
      console.error('Error transferring draft items:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedListObj = activeLists.find((l) => l.id === targetListId)

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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 min-w-0">
          {/* Mode Switcher Tabs */}
          {activeLists.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-xl border border-border min-w-0">
              <button
                type="button"
                onClick={() => setMode('existing')}
                className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-w-0 ${
                  mode === 'existing'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t('draft.addToExisting')}</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('new')}
                className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-w-0 ${
                  mode === 'new'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t('draft.createNewList')}</span>
              </button>
            </div>
          )}

          {/* Existing List Selection */}
          {mode === 'existing' && activeLists.length > 0 && (
            <div className="space-y-2 min-w-0">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('draft.selectTargetList')}
              </Label>
              <RadioGroup
                value={targetListId}
                onValueChange={setTargetListId}
                className="space-y-2 max-h-48 overflow-y-auto pr-1.5 custom-scrollbar"
              >
                {activeLists.map((list) => {
                  const isChecked = targetListId === list.id
                  return (
                    <label
                      key={list.id}
                      htmlFor={`list-option-${list.id}`}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer gap-3 min-w-0 ${
                        isChecked
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <RadioGroupItem
                          value={list.id}
                          id={`list-option-${list.id}`}
                          className="border-border text-primary shrink-0"
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-semibold text-foreground truncate">
                              {list.name}
                            </span>
                            {list.is_default && (
                              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground truncate">
                            {t('activeList.itemsLeft', { count: list.unchecked_items })}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant="secondary"
                        className="text-[10px] font-mono bg-card border border-border shrink-0"
                      >
                        {formatQuantity(list.total_items, 'pcs')}
                      </Badge>
                    </label>
                  )
                })}
              </RadioGroup>
            </div>
          )}

          {/* New List Form */}
          {mode === 'new' && (
            <div className="space-y-3 min-w-0">
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="new-list-name" className="text-xs font-semibold text-foreground">
                  {t('draft.newListName')}
                </Label>
                <Input
                  id="new-list-name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder={t('draft.newListNamePlaceholder')}
                  required
                  className="h-11 bg-background border-border text-foreground rounded-xl"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="set-as-default"
                  checked={isDefault}
                  onCheckedChange={(checked) => setIsDefault(!!checked)}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
                <Label
                  htmlFor="set-as-default"
                  className="text-xs text-muted-foreground font-normal cursor-pointer"
                >
                  {t('draft.setAsDefault')}
                </Label>
              </div>
            </div>
          )}

          {/* Items Summary Pill */}
          <div className="p-3 bg-muted/60 rounded-xl border border-border/80 flex items-center justify-between text-xs min-w-0">
            <span className="text-muted-foreground">{t('draft.selectedItems')}:</span>
            <span className="font-semibold text-foreground">
              {formatQuantity(selectedItems.length, 'pcs')}
            </span>
          </div>

          <SheetFooter className="mt-2 flex flex-col gap-2 sm:space-x-0 w-full min-w-0">
            <Button
              type="submit"
              disabled={isSubmitting || (mode === 'existing' && !targetListId) || (mode === 'new' && !newListName.trim())}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer min-w-0"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {mode === 'existing'
                      ? selectedListObj?.name
                        ? `${t('common.confirm')} (${selectedListObj.name})`
                        : t('common.confirm')
                      : `${t('activeList.createList')} (${selectedItems.length})`}
                  </span>
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full h-10 border-border bg-background hover:bg-muted text-foreground rounded-xl cursor-pointer"
            >
              {t('common.cancel')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
