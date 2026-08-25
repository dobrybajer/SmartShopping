import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/i18n'
import { shoppingListService } from '@/services/shoppingListService'
import type { ShoppingList } from '@/services/shoppingListService'
import { HistoryListDetailsSheet } from '@/components/dialogs/HistoryListDetailsSheet'
import { Badge } from '@/components/ui/badge'
import { Calendar, CheckCircle2, History, ChevronRight, Clock } from 'lucide-react'

export const HistoryView: React.FC = () => {
  const { household } = useAuth()
  const { t, formatDate, formatTime } = useTranslation()
  const [historyLists, setHistoryLists] = useState<ShoppingList[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const loadHistory = React.useCallback(async () => {
    if (!household) return
    setLoading(true)
    const lists = await shoppingListService.getHistoryLists(household.id)
    setHistoryLists(lists)
    setLoading(false)
  }, [household])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleOpenDetails = (list: ShoppingList) => {
    setSelectedList(list)
    setIsDetailsOpen(true)
  }

  const handleListUpdated = (updatedList: ShoppingList) => {
    setHistoryLists((prev) =>
      prev.map((item) => (item.id === updatedList.id ? updatedList : item))
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
            const displayDate = formatDate(list.created_at || list.target_date || new Date())
            const displayTime = list.created_at ? formatTime(list.created_at) : ''
            const listTitle = list.name || `${t('history.archivedList')} ${displayDate}`

            return (
              <div
                key={list.id}
                onClick={() => handleOpenDetails(list)}
                className="p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-all flex items-center justify-between shadow-sm cursor-pointer group active:scale-[0.99]"
              >
                <div className="flex flex-col gap-1 min-w-0 pr-2">
                  <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                    {listTitle}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{displayDate}</span>
                    </span>
                    {displayTime && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{displayTime}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <Badge
                    variant="default"
                    className="text-[10px] bg-primary/10 text-primary border border-primary/20"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {t('history.completedOn')}
                  </Badge>

                  <div className="w-7 h-7 rounded-lg bg-background flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            )
          })}
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
