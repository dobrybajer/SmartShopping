import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Calendar, CheckCircle2, History, RotateCcw } from 'lucide-react'

export const HistoryView: React.FC = () => {
  const historyLists = [
    {
      id: '1',
      name: 'Zakupy Tygodniowe',
      date: '2026-08-10',
      itemCount: 14,
      status: 'archived'
    },
    {
      id: '2',
      name: 'Szybkie zakupy na weekend',
      date: '2026-08-04',
      itemCount: 6,
      status: 'archived'
    }
  ]

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-300 font-semibold">Historia Zakończonych List</span>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {historyLists.length} Listy
        </Badge>
      </div>

      <div className="flex flex-col gap-3">
        {historyLists.map((list) => (
          <div
            key={list.id}
            className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-zinc-100">{list.name}</h4>
                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{list.date}</span>
                </div>
              </div>

              <Badge variant="default" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Zarchiwizowane
              </Badge>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-900 text-xs text-zinc-400">
              <span>{list.itemCount} kupionych produktów</span>
              <button className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Przenieś niekupione</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
