import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/i18n'
import { HISTORY_PAGE_SIZE, shoppingListService } from '@/services/shoppingListService'
import type { ActiveListWithDetails, HistoryShoppingList } from '@/services/shoppingListService'
import { useHistoryDetailsController } from '@/hooks/useHistoryDetailsController'
import { HistoryListItemsBreakdown } from '@/components/history/HistoryListItemsBreakdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HistoryStatusBadge } from '@/components/ui/HistoryStatusBadge'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import {
  Calendar,
  History,
  ShoppingCart,
  Check,
  Trash2,
  Edit2,
  X,
  ChevronRight,
  PackageCheck,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const DesktopHistoryView: React.FC = () => {
  const { t, formatDate, formatTime } = useTranslation()

  const [historyLists, setHistoryLists] = useState<HistoryShoppingList[]>([])
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [listDetails, setListDetails] = useState<ActiveListWithDetails | null>(null)
  const [loadingLists, setLoadingLists] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)

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
    listHouseholdId: listDetails?.household_id,
    haptic: false,
    allAddedResetMs: 2000
  })

  const householdId = household?.id

  useEffect(() => {
    loadCategories(householdId)
  }, [householdId, loadCategories])

  const loadHistoryLists = useCallback(
    async (isInitial = false) => {
      if (!householdId) return
      if (isInitial) {
        setLoadingLists(true)
      }
      const lists = await shoppingListService.getHistoryLists(householdId, {
        limit: HISTORY_PAGE_SIZE + 1,
        offset: 0
      })
      setHasMore(lists.length > HISTORY_PAGE_SIZE)
      const visibleLists = lists.slice(0, HISTORY_PAGE_SIZE)
      setHistoryLists(visibleLists)
      setSelectedListId((prev) => {
        if (prev && visibleLists.some((l) => l.id === prev)) return prev
        return visibleLists[0]?.id || null
      })
      setLoadingLists(false)
    },
    [householdId]
  )

  const handleLoadMore = async () => {
    if (!householdId || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const more = await shoppingListService.getHistoryLists(householdId, {
        limit: HISTORY_PAGE_SIZE + 1,
        offset: historyLists.length
      })
      setHasMore(more.length > HISTORY_PAGE_SIZE)
      const nextSlice = more.slice(0, HISTORY_PAGE_SIZE)
      setHistoryLists((prev) => {
        const seen = new Set(prev.map((item) => item.id))
        return [...prev, ...nextSlice.filter((item) => !seen.has(item.id))]
      })
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadHistoryLists(true)
  }, [loadHistoryLists])

  const loadDetails = useCallback(
    async (listId: string) => {
      setLoadingDetails(true)
      const data = await shoppingListService.getListWithDetails(listId)
      setListDetails(data)
      setEditedName(data?.name || '')
      setIsEditingName(false)
      setIsDeleteModalOpen(false)
      resetFeedback()
      setLoadingDetails(false)
    },
    [resetFeedback]
  )

  useEffect(() => {
    if (selectedListId) {
      loadDetails(selectedListId)
    } else {
      setListDetails(null)
    }
  }, [selectedListId, loadDetails])

  const handleSaveName = async () => {
    if (!selectedListId || !editedName.trim()) return
    setIsSavingName(true)
    const success = await shoppingListService.updateListName(selectedListId, editedName.trim())
    setIsSavingName(false)
    if (success) {
      setIsEditingName(false)
      const currentList = historyLists.find((l) => l.id === selectedListId)
      const origName = currentList?.original_name || currentList?.name || null
      setListDetails((prev) =>
        prev ? { ...prev, name: editedName.trim(), original_name: prev.original_name || origName } : null
      )
      setHistoryLists((prev) =>
        prev.map((l) =>
          l.id === selectedListId
            ? { ...l, name: editedName.trim(), original_name: l.original_name || origName }
            : l
        )
      )
    }
  }

  const handleDeleteList = async () => {
    if (!selectedListId) return
    setIsDeleting(true)
    const success = await shoppingListService.deleteShoppingList(selectedListId)
    setIsDeleting(false)
    if (success) {
      const remaining = historyLists.filter((l) => l.id !== selectedListId)
      setHistoryLists(remaining)
      setSelectedListId(remaining.length > 0 ? remaining[0].id : null)
      setIsDeleteModalOpen(false)
    }
  }

  const completedDate =
    listDetails?.completed_at ||
    listDetails?.updated_at ||
    listDetails?.created_at ||
    listDetails?.target_date ||
    new Date()
  const completedFormattedDate = formatDate(completedDate)
  const completedFormattedTime = formatTime(completedDate)
  const createdFormattedDate = listDetails?.created_at ? formatDate(listDetails.created_at) : null
  const createdFormattedTime = listDetails?.created_at ? formatTime(listDetails.created_at) : null
  const hasOriginalName = Boolean(
    listDetails?.original_name &&
      listDetails?.name &&
      listDetails.original_name.trim() !== listDetails.name.trim()
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">
                {t('navigation.history')} ({historyLists.length})
              </h3>
              <p className="text-xs text-muted-foreground">{t('history.subtitle')}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
          {loadingLists ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : historyLists.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center bg-card/40 border border-border border-dashed rounded-3xl p-8">
              <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground mb-3 shadow-inner">
                <History className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-foreground">{t('history.emptyTitle')}</p>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {t('history.emptySubtitle')}
              </p>
            </div>
          ) : (
            historyLists.map((list) => {
              const isSelected = selectedListId === list.id
              const listDate =
                list.completed_at || list.updated_at || list.created_at || list.target_date || new Date()
              const displayDate = formatDate(listDate)
              const displayTime = formatTime(listDate)
              const listTitle = list.name || `${t('history.archivedList')} ${displayDate}`
              const listHasOrig = Boolean(
                list.original_name && list.name && list.original_name.trim() !== list.name.trim()
              )

              return (
                <div
                  key={list.id}
                  onClick={() => setSelectedListId(list.id)}
                  className={cn(
                    'p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 shadow-xs group',
                    isSelected
                      ? 'bg-primary/10 border-primary/40 text-foreground shadow-md'
                      : 'bg-card border-border hover:border-border/80 hover:bg-muted/60'
                  )}
                >
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <h4
                      className={cn(
                        'font-bold text-sm truncate',
                        isSelected ? 'text-primary' : 'text-foreground group-hover:text-foreground'
                      )}
                    >
                      {listTitle}
                    </h4>
                    {listHasOrig && (
                      <span className="text-xs text-muted-foreground font-mono truncate">
                        {list.original_name}
                      </span>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-0.5">
                      <span className="flex items-center gap-1.5" title={t('history.completedAt')}>
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{displayDate}</span>
                      </span>
                      {displayTime && (
                        <span className="flex items-center gap-1" title={t('history.completedAt')}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{displayTime}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <HistoryStatusBadge items={list.items} />
                    <ChevronRight
                      className={cn(
                        'w-4 h-4 transition-transform',
                        isSelected
                          ? 'text-primary translate-x-1'
                          : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    />
                  </div>
                </div>
              )
            })
          )}

          {hasMore && (
            <Button
              type="button"
              variant="outline"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full min-h-[44px] rounded-2xl font-bold text-xs sm:text-sm mt-1 cursor-pointer"
            >
              {loadingMore ? t('history.loadingMore') : t('history.loadMore')}
            </Button>
          )}
        </div>
      </div>

      <div className="lg:col-span-7 flex flex-col gap-6 sticky top-24">
        {loadingDetails ? (
          <div className="p-12 rounded-3xl bg-card border border-border flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
          </div>
        ) : !listDetails ? (
          <div className="p-12 rounded-3xl bg-card border border-border border-dashed flex flex-col items-center justify-center text-center">
            <PackageCheck className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm font-bold text-foreground">{t('history.viewDetails')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('history.emptySubtitle')}</p>
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-card border border-border shadow-2xl flex flex-col gap-6 backdrop-blur-xl">
            <div className="flex flex-col gap-3 pb-4 border-b border-border">
              <div className="flex items-center justify-between gap-3">
                {isEditingName ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveName()
                        if (e.key === 'Escape') setIsEditingName(false)
                      }}
                      autoFocus
                      disabled={isSavingName}
                      className="h-10 bg-background border-input text-sm font-bold text-foreground"
                    />
                    <Button
                      onClick={handleSaveName}
                      disabled={isSavingName}
                      size="sm"
                      className="h-10 px-3 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setIsEditingName(false)}
                      disabled={isSavingName}
                      variant="ghost"
                      size="sm"
                      className="h-10 px-3 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-extrabold text-lg text-foreground">
                        {listDetails.name || `${t('history.archivedList')} ${completedFormattedDate}`}
                      </h3>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="text-muted-foreground hover:text-primary p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                        title={t('common.edit')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {hasOriginalName && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {listDetails.original_name}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <HistoryStatusBadge items={listDetails.items} className="text-xs py-1" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground font-mono">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5" title={t('history.completedAt')}>
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>
                      {t('history.completedAt')}: {completedFormattedDate}
                    </span>
                    {completedFormattedTime && (
                      <span className="text-muted-foreground">({completedFormattedTime})</span>
                    )}
                  </span>
                  {createdFormattedDate && (
                    <span
                      className="flex items-center gap-1.5 text-muted-foreground/80"
                      title={t('history.createdAt')}
                    >
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>
                        {t('history.createdAt')}: {createdFormattedDate}
                      </span>
                      {createdFormattedTime && <span>({createdFormattedTime})</span>}
                    </span>
                  )}
                </div>
                <span className="shrink-0">
                  {t('history.itemsBoughtRatio', { bought: checkedCount, total: totalCount })}
                </span>
              </div>
            </div>

            <HistoryListItemsBreakdown
              sortedCategories={sortedCategories}
              addedItemIds={addedItemIds}
              getCategoryLabel={getCategoryLabel}
              onAddSingleItem={handleAddSingleItemToDraft}
              variant="desktop"
            />

            <div className="pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-3 w-full">
                <Button
                  onClick={handleAddAllToDraft}
                  disabled={items.length === 0 || allAdded}
                  className="h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-[0.98]"
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
                  className="h-12 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-extrabold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-[0.98]"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t('history.deleteList')}</span>
                </Button>
              </div>

              <ConfirmDeleteDialog
                open={isDeleteModalOpen}
                onOpenChange={setIsDeleteModalOpen}
                title={t('activeList.deleteListTitle')}
                itemName={listDetails.name || t('history.archivedList')}
                onConfirm={handleDeleteList}
                isDeleting={isDeleting}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
