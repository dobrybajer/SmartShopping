import React from 'react'
import { useTranslation } from '@/i18n'
import type { ShoppingListSummary } from '@/services/shoppingListService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Plus, ListOrdered, Star, CheckCircle2 } from 'lucide-react'

interface TransferToActiveListFormProps {
  variant: 'desktop' | 'mobile'
  activeLists: ShoppingListSummary[]
  mode: 'existing' | 'new'
  setMode: (m: 'existing' | 'new') => void
  targetListId: string
  setTargetListId: (id: string) => void
  newListName: string
  setNewListName: (name: string) => void
  isDefault: boolean
  setIsDefault: (def: boolean) => void
  isSubmitting: boolean
  selectedCount: number
  selectedListName?: string
  onCancel: () => void
  onSubmit: (e: React.FormEvent) => void
}

export const TransferToActiveListForm: React.FC<TransferToActiveListFormProps> = ({
  variant,
  activeLists,
  mode,
  setMode,
  targetListId,
  setTargetListId,
  newListName,
  setNewListName,
  isDefault,
  setIsDefault,
  isSubmitting,
  selectedCount,
  selectedListName,
  onCancel,
  onSubmit
}) => {
  const { t, formatQuantity } = useTranslation()
  const isDesktop = variant === 'desktop'
  const idPrefix = isDesktop ? 'desktop-' : ''

  const submitLabel =
    mode === 'existing'
      ? selectedListName
        ? `${t('common.confirm')} (${selectedListName})`
        : t('common.confirm')
      : `${t('activeList.createList')} (${selectedCount})`

  const isSubmitDisabled =
    isSubmitting ||
    (mode === 'existing' && !targetListId) ||
    (mode === 'new' && !newListName.trim())

  return (
    <form
      onSubmit={onSubmit}
      className={`flex flex-col gap-4 min-w-0 ${isDesktop ? 'mt-1' : ''}`}
    >
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

      {mode === 'existing' && activeLists.length > 0 && (
        <div className="space-y-2 min-w-0">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('draft.selectTargetList')}
          </Label>
          <RadioGroup
            value={targetListId}
            onValueChange={setTargetListId}
            className={`space-y-2 overflow-y-auto pr-1.5 custom-scrollbar ${
              isDesktop ? 'max-h-52' : 'max-h-48'
            }`}
          >
            {activeLists.map((list) => {
              const isChecked = targetListId === list.id
              const radioId = `${idPrefix}list-option-${list.id}`
              return (
                <label
                  key={list.id}
                  htmlFor={radioId}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer gap-3 min-w-0 ${
                    isChecked
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-background hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <RadioGroupItem
                      value={list.id}
                      id={radioId}
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

      {mode === 'new' && (
        <div className="space-y-3 min-w-0">
          <div className="space-y-1.5 min-w-0">
            <Label
              htmlFor={`${idPrefix}new-list-name`}
              className="text-xs font-semibold text-foreground"
            >
              {t('draft.newListName')}
            </Label>
            <Input
              id={`${idPrefix}new-list-name`}
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder={t('draft.newListNamePlaceholder')}
              required
              className={`${isDesktop ? 'h-10' : 'h-11'} bg-background border-border text-foreground rounded-xl`}
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id={`${idPrefix}set-as-default`}
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(!!checked)}
              className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
            />
            <Label
              htmlFor={`${idPrefix}set-as-default`}
              className="text-xs text-muted-foreground font-normal cursor-pointer"
            >
              {t('draft.setAsDefault')}
            </Label>
          </div>
        </div>
      )}

      <div className="p-3 bg-muted/60 rounded-xl border border-border/80 flex items-center justify-between text-xs min-w-0">
        <span className="text-muted-foreground">{t('draft.selectedItems')}:</span>
        <span className="font-semibold text-foreground">
          {formatQuantity(selectedCount, 'pcs')}
        </span>
      </div>

      {isDesktop ? (
        <div className="flex flex-row gap-2.5 mt-2 sm:space-x-0 w-full min-w-0">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-1/3 border-border bg-background hover:bg-muted text-foreground rounded-xl cursor-pointer shrink-0"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-2/3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer min-w-0"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="truncate">{submitLabel}</span>
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2 sm:space-x-0 w-full min-w-0">
          <Button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer min-w-0"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="truncate">{submitLabel}</span>
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full h-10 border-border bg-background hover:bg-muted text-foreground rounded-xl cursor-pointer"
          >
            {t('common.cancel')}
          </Button>
        </div>
      )}
    </form>
  )
}

