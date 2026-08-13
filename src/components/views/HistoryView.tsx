import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { shoppingListService } from '@/services/shoppingListService'
import type { ShoppingList } from '@/services/shoppingListService'
import { HistoryListDetailsSheet } from '@/components/dialogs/HistoryListDetailsSheet'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { Calendar, CheckCircle2, History, ChevronRight } from 'lucide-react'

export const HistoryView: React.FC = () => {
  const { household } = useAuth()
  const [historyLists, setHistoryLists] = useState<ShoppingList[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const loadHistory = async () => {
    if (!household) return
    setLoading(true)
    const lists = await shoppingListService.getHistoryLists(household.id)
    setHistoryLists(lists)
    setLoading(false)
  }

  useEffect(() => {
    loadHistory()
  }, [household])

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
          <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs text-zinc-500">Pobieranie historii z bazy...</p>
        </div>
      ) : historyLists.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-600 mb-3">
            <History className="w-7 h-7" />
          </div>
          <p className="text-sm font-bold text-zinc-300">Brak zarchiwizowanej historii</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
            Gdy zakończysz zakupy na aktywnej liście, jej podsumowanie pojawi się w tym miejscu.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {historyLists.map((list) => {
            const displayDate = formatDate(list.target_date || list.created_at)
            const listTitle = list.name || `Zakupy ${displayDate}`

            return (
              <div
                key={list.id}
                onClick={() => handleOpenDetails(list)}
                className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 hover:border-emerald-500/40 transition-all flex items-center justify-between shadow-sm cursor-pointer group active:scale-[0.99]"
              >
                <div className="flex flex-col gap-1 min-w-0 pr-2">
                  <h4 className="font-bold text-sm text-zinc-100 group-hover:text-emerald-400 transition-colors truncate">
                    {listTitle}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{displayDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <Badge
                    variant="default"
                    className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Zarchiwizowane
                  </Badge>

                  <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover:text-emerald-400 group-hover:bg-zinc-850 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Sheet ze szczegółami listy */}
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

