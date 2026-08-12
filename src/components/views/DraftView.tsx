import React, { useState } from 'react'
import { SwipeToDismiss } from '@/components/ui/SwipeToDismiss'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Play, ShoppingBag } from 'lucide-react'

interface DraftItem {
  id: string
  name: string
  category: string
  quantity: string
  isAdHoc?: boolean
}

export const DraftView: React.FC = () => {
  const [draftItems, setDraftItems] = useState<DraftItem[]>([
    { id: '1', name: 'Pierś z kurczaka', category: 'Mięso i Ryby', quantity: '500 g' },
    { id: '2', name: 'Szpinak świeży', category: 'Owoce i Warzywa', quantity: '250 g' },
    { id: '3', name: 'Ręcznik papierowy', category: 'Chemia i Dom', quantity: '2 szt', isAdHoc: true }
  ])

  const handleRemove = (id: string) => {
    setDraftItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleClearAll = () => {
    setDraftItems([])
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Header Info Banner */}
      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <ShoppingBag className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-emerald-200">
            W koszyku (Draft): <strong className="text-white">{draftItems.length} pozycji</strong>
          </span>
        </div>

        {draftItems.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-zinc-400 hover:text-red-400 text-xs font-medium flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Wyczyść</span>
          </button>
        )}
      </div>

      {/* Swipeable List */}
      {draftItems.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-600 mb-3">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-zinc-300">Koszyk roboczy jest pusty</p>
          <p className="text-xs text-zinc-500 mt-1">
            Dodaj potrawy z Książki Kucharskiej lub wpisz produkty ad-hoc.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold px-1">
            Przesuń w lewo, aby usunąć pozycję
          </p>

          {draftItems.map((item) => (
            <SwipeToDismiss
              key={item.id}
              onDismiss={() => handleRemove(item.id)}
            >
              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-zinc-100">{item.name}</span>
                    {item.isAdHoc && (
                      <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                        Ad-hoc
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{item.category}</p>
                </div>

                <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg font-bold">
                  {item.quantity}
                </span>
              </div>
            </SwipeToDismiss>
          ))}
        </div>
      )}

      {/* Generate Active List CTA */}
      {draftItems.length > 0 && (
        <Button className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl mt-4 flex items-center justify-center gap-2 shadow-lg">
          <Play className="w-4 h-4 fill-black" />
          <span>Generuj Aktywną Listę</span>
        </Button>
      )}
    </div>
  )
}
