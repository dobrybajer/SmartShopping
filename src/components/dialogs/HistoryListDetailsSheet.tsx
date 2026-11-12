import React, { useState, useEffect } from 'react'
import { shoppingListService } from '@/services/shoppingListService'
import type { ShoppingList, ActiveListWithDetails } from '@/services/shoppingListService'
import { useHistoryDetailsController } from '@/hooks/useHistoryDetailsController'
import { HistoryListItemsBreakdown } from '@/components/history/HistoryListItemsBreakdown'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import { useTranslation } from '@/i18n'
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
import { Badge } from '@/components/ui/badge'
import { HistoryStatusBadge } from '@/components/ui/HistoryStatusBadge'
import { Calendar, Edit2, Check, X, Trash2, ShoppingCart, PackageCheck, Clock } from 'lucide-react'

interface HistoryListDetailsSheetProps {
  list: ShoppingList | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onListUpdated?: (updatedList: ShoppingList) => void
  onListDeleted?: (deletedListId: string) => void
}

export const HistoryListDetailsSheet: React.FC<HistoryListDetailsSheetProps> = ({
  list,
  open,
  onOpenChange,
  onListUpdated,
  onListDeleted
}) => {
  const { t, formatDate, formatTime } = useTranslation()

  const [listDetails, setListDetails] = useState<ActiveListWithDetails | null>(null)
  const [loading, setLoading] = useState(false)

  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const {
    household,
    loadCategories,
    items,
    checkedCount,
    totalCount,
    sortedCategories,
    addedItemIds,
    allAdded,
    getCategoryLabel,
    handleAddSingleItemToDraft,
    handleAddAllToDraft,
    resetFeedback
  } = useHistoryDetailsController(listDetails, {
    listHouseholdId: list?.household_id,
    listNameFallback: list?.name,
    haptic: true,
    allAddedResetMs: 1000,
    onAllAddedComplete: () => onOpenChange(false)
  })

  useEffect(() => {
    if (open && list) {
      const targetHh = list.household_id || household?.id || null
      loadCategories(targetHh)
      const completedDate =
        list.completed_at || list.updated_at || list.created_at || list.target_date || new Date()
      setEditedName(list.name || `${t('history.archivedList')} ${formatDate(completedDate)}`)
      setIsEditingName(false)
      setIsDeleteModalOpen(false)
      resetFeedback()

      setLoading(true)
      let isMounted = true
      shoppingListService.getListWithDetails(list.id).then((details) => {
        if (!isMounted) return
        setListDetails(details)
        setLoading(false)
      })

      return () => {
        isMounted = false
      }
    } else {
      setListDetails(null)
    }
  }, [open, list, household?.id, t, formatDate, loadCategories, resetFeedback])

  if (!list) return null

  const handleSaveName = async () => {
    if (!editedName.trim() || editedName === list.name) {
      setIsEditingName(false)
      return
    }

    setIsSavingName(true)
    const success = await shoppingListService.updateListName(list.id, editedName.trim())
    setIsSavingName(false)

    if (success) {
      const origName = list.original_name || list.name
      const updated: ShoppingList = { ...list, name: editedName.trim(), original_name: origName }
      if (listDetails) {
        setListDetails({ ...listDetails, name: editedName.trim(), original_name: origName })
      }
      setIsEditingName(false)
      onListUpdated?.(updated)
    }
  }

  const handleDeleteList = async () => {
    setIsDeleting(true)
    const success = await shoppingListService.deleteShoppingList(list.id)
    setIsDeleting(false)

    if (success) {
      onListDeleted?.(list.id)
      setIsDeleteModalOpen(false)
      onOpenChange(false)
    }
  }

  const completedDate =
    list.completed_at || list.updated_at || list.created_at || list.target_date || new Date()
  const formattedCompletedDate = formatDate(completedDate)
  const formattedCompletedTime = formatTime(completedDate)
  const formattedCreatedDate = list.created_at ? formatDate(list.created_at) : null
  const formattedCreatedTime = list.created_at ? formatTime(list.created_at) : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] flex flex-col overflow-hidden p-0 gap-0 bg-card border-t border-border text-foreground"
      >
        <SheetHeader className="p-4 pb-3 border-b border-border shrink-0 text-left">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 pr-6">
              {isEditingName ? (
                <div className="flex items-center gap-1.5 flex-1 animate-in fade-in duration-150">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName()
                      if (e.key === 'Escape') setIsEditingName(false)
                    }}
                    autoFocus
                    disabled={isSavingName}
                    className="h-9 bg-background border-input text-sm font-bold text-foreground"
                    placeholder={t('draft.listNamePlaceholder')}
                  />
                  <Button
                    onClick={handleSaveName}
                    disabled={isSavingName}
                    size="sm"
                    className="h-9 w-9 p-0 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 cursor-pointer"
                    title={t('common.save')}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => setIsEditingName(false)}
                    disabled={isSavingName}
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                    title={t('common.cancel')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5 group flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <SheetTitle className="text-base font-bold text-foreground truncate">
                      {list.name || `${t('history.archivedList')} ${formattedCompletedDate}`}
                    </SheetTitle>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-muted-foreground hover:text-primary p-1 transition-colors rounded-md hover:bg-muted shrink-0 cursor-pointer"
                      title={t('common.edit')}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {list.original_name &&
                    list.name &&
                    list.original_name.trim() !== list.name.trim() && (
                      <span className="text-xs text-muted-foreground font-mono truncate">
                        {list.original_name}
                      </span>
                    )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              <div
                className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap"
                title={t('history.completedAt')}
              >
                <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>
                  {t('history.completedAt')}: {formattedCompletedDate}
                </span>
                {formattedCompletedTime && <span>({formattedCompletedTime})</span>}
              </div>

              {formattedCreatedDate && (
                <div
                  className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground/80 whitespace-nowrap"
                  title={t('history.createdAt')}
                >
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>
                    {t('history.createdAt')}: {formattedCreatedDate}
                  </span>
                  {formattedCreatedTime && <span>({formattedCreatedTime})</span>}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <HistoryStatusBadge items={items} />
                {totalCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-mono py-0.5 whitespace-nowrap"
                  >
                    {t('history.itemsBoughtRatio', { bought: checkedCount, total: totalCount })}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <SheetDescription className="sr-only">{t('history.viewDetails')}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center bg-muted/20 border border-dashed border-border rounded-2xl p-6">
              <PackageCheck className="w-10 h-10 text-muted-foreground mb-2" />
              <p className="text-xs font-bold text-foreground">{t('history.emptyTitle')}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t('history.emptySubtitle')}</p>
            </div>
          ) : (
            <HistoryListItemsBreakdown
              sortedCategories={sortedCategories}
              addedItemIds={addedItemIds}
              getCategoryLabel={getCategoryLabel}
              onAddSingleItem={handleAddSingleItemToDraft}
              variant="mobile"
            />
          )}
        </div>

        <SheetFooter className="p-4 pt-3 border-t border-border bg-card/90 shrink-0">
          <div className="grid grid-cols-2 gap-3 w-full">
            <Button
              onClick={handleAddAllToDraft}
              disabled={items.length === 0 || allAdded}
              className="h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all text-xs cursor-pointer"
            >
              {allAdded ? (
                <>
                  <Check className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t('history.restoredSuccess')}</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 fill-current shrink-0" />
                  <span className="truncate">
                    {t('history.restoreToDraft')} ({items.length})
                  </span>
                </>
              )}
            </Button>

            <Button
              variant="destructive"
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={isDeleting}
              className="h-11 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all text-xs cursor-pointer"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span className="truncate">{t('history.deleteList')}</span>
            </Button>
          </div>

          <ConfirmDeleteDialog
            open={isDeleteModalOpen}
            onOpenChange={setIsDeleteModalOpen}
            title={t('activeList.deleteListTitle')}
            itemName={list.name || t('history.archivedList')}
            onConfirm={handleDeleteList}
            isDeleting={isDeleting}
          />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
