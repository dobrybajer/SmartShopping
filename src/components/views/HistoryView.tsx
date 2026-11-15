import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/i18n'
import { HISTORY_PAGE_SIZE, shoppingListService } from '@/services/shoppingListService'
import type { HistoryShoppingList, ShoppingList } from '@/services/shoppingListService'
import { Button } from '@/components/ui/button'
import { HistoryListDetailsSheet } from '@/components/dialogs/HistoryListDetailsSheet'
import { HistoryStatusBadge } from '@/components/ui/HistoryStatusBadge'
import { Calendar, History, ChevronRight, Clock } from 'lucide-react'

export const HistoryView: React.FC = () => {
  const { household } = useAuth()
  const { t, formatDate, formatTime } = useTranslation()
  const [historyLists, setHistoryLists] = useState<HistoryShoppingList[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const householdId = household?.id

  const loadHistory = React.useCallback(async (isInitial = false) => {
    if (!householdId) return
    if (isInitial) {
      setLoading(true)
    }
    const lists = await shoppingListService.getHistoryLists(householdId, {
      limit: HISTORY_PAGE_SIZE + 1,
      offset: 0
    })
    setHasMore(lists.length > HISTORY_PAGE_SIZE)
    setHistoryLists(lists.slice(0, HISTORY_PAGE_SIZE))
    setLoading(false)
  }, [householdId])

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
    loadHistory(true)
  }, [loadHistory])

  const handleOpenDetails = (list: ShoppingList) => {
    setSelectedList(list)
    setIsDetailsOpen(true)
  }

  const handleListUpdated = (updatedList: ShoppingList) => {
    setHistoryLists((prev) =>
      prev.map((item) => (item.id === updatedList.id ? { ...item, ...updatedList } : item))
    )
    setSelectedList(updatedList)
  }

  const handleListDeleted = (deletedListId: string) => {
    setHistoryLists((prev) => prev.filter((item) => item.id !== deletedListId))
    setSelectedList(null)
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : historyLists.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground mb-3">
            <History className="w-7 h-7" />
          </div>
          <p className="text-sm font-bold text-foreground">{t('history.emptyTitle')}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
            {t('history.emptySubtitle')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {historyLists.map((list) => {
            const completedDate = list.completed_at || list.updated_at || list.created_at || list.target_date || new Date()
            const displayDate = formatDate(completedDate)
            const displayTime = formatTime(completedDate)
            const listTitle = list.name || `${t('history.archivedList')} ${displayDate}`
            const hasOriginalName = Boolean(list.original_name && list.name && list.original_name.trim() !== list.name.trim())

            return (
              <div
                key={list.id}
                onClick={() => handleOpenDetails(list)}
                className="p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-all flex items-center justify-between shadow-sm cursor-pointer group active:scale-[0.99]"
              >
                <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                  <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                    {listTitle}
                  </h4>
                  {hasOriginalName && (
                    <span className="text-xs text-muted-foreground font-mono truncate">
                      {list.original_name}
                    </span>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-0.5">
                    <span className="flex items-center gap-1.5" title={t('history.completedAt')}>
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{displayDate}</span>
                    </span>
                    {displayTime && (
                      <span className="flex items-center gap-1 text-muted-foreground" title={t('history.completedAt')}>
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{displayTime}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <HistoryStatusBadge items={list.items} />

                  <div className="w-7 h-7 rounded-lg bg-background flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            )
          })}

          {hasMore && (
            <Button
              type="button"
              variant="outline"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full min-h-[44px] rounded-xl font-bold text-xs sm:text-sm cursor-pointer"
            >
              {loadingMore ? t('history.loadingMore') : t('history.loadMore')}
            </Button>
          )}
        </div>
      )}

      {/* History Details Sheet */}
      <HistoryListDetailsSheet
        list={selectedList}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onListUpdated={handleListUpdated}
        onListDeleted={handleListDeleted}
      />
    </div>
  )
}
