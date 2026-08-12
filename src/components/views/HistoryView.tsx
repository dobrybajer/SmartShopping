import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { shoppingListService } from '@/services/shoppingListService'
import type { ShoppingList } from '@/services/shoppingListService'
import { Badge } from '@/components/ui/badge'
import { Calendar, CheckCircle2, History } from 'lucide-react'

export const HistoryView: React.FC = () => {
  const { household } = useAuth()
  const [historyLists, setHistoryLists] = useState<ShoppingList[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-300 font-semibold">Historia Zakończonych List</span>
        </div>
        <Badge variant="secondary" className="text-[10px] font-mono">
          {historyLists.length} List
        </Badge>
      </div>

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
          <p className="text-sm font-bold text-zinc-300">Brak zarchiwizowanych list</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
            Gdy zakończysz zakupy na aktywnej liście, jej podsumowanie pojawi się w tym miejscu.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {historyLists.map((list) => (
            <div
              key={list.id}
              className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col gap-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-zinc-100">{list.name || 'Zakupy'}</h4>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1 font-mono">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{list.target_date || new Date(list.created_at || '').toLocaleDateString('pl-PL')}</span>
                  </div>
                </div>

                <Badge variant="default" className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Zarchiwizowane
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
