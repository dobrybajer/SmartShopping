import React, { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useShoppingStore } from '@/store/useShoppingStore'
import { shoppingListService } from '@/services/shoppingListService'
import { SwipeToDismiss } from '@/components/ui/SwipeToDismiss'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AddAdHocSheet } from '@/components/dialogs/AddAdHocSheet'
import { Trash2, Play, Plus, ShoppingBag } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface DraftViewProps {
  onActiveListCreated?: () => void
}

export const DraftView: React.FC<DraftViewProps> = ({ onActiveListCreated }) => {
  const { household } = useAuth()
  const { draftItems, removeFromDraft, clearDraft } = useShoppingStore()
  const [isAdHocOpen, setIsAdHocOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateActiveList = async () => {
    if (!household || draftItems.length === 0) return
    setIsGenerating(true)

    const newList = await shoppingListService.createActiveListFromDraft(
      household.id,
      `Zakupy ${formatDate(new Date())}`,
      draftItems
    )

    setIsGenerating(false)

    if (newList) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([40, 60, 40])
        } catch {
          // Ignoruj
        }
      }

      clearDraft()
      if (onActiveListCreated) {
        onActiveListCreated()
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Top Banner & AdHoc Button */}
      <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShoppingBag className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs text-zinc-300">
            W koszyku (Draft): <strong className="text-white font-mono">{draftItems.length} pozycji</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAdHocOpen(true)}
            size="sm"
            className="h-8 bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-zinc-700/80 rounded-lg text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ad-hoc</span>
          </Button>

          {draftItems.length > 0 && (
            <button
              onClick={() => clearDraft()}
              className="text-zinc-500 hover:text-red-400 p-1.5 transition-colors"
              title="Wyczyść koszyk"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Draft Items List */}
      {draftItems.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-3">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <p className="text-sm font-bold text-zinc-300">Koszyk roboczy jest pusty</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
            Dodaj posiłki z Książki Kucharskiej lub naciśnij przycisk <strong className="text-emerald-400">+ Ad-hoc</strong>, aby wrzucić chemię domową lub inne produkty.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold px-1">
            Przesuń w lewo, aby usunąć pozycję z koszyka
          </p>

          {draftItems.map((item) => (
            <SwipeToDismiss key={item.id} onDismiss={() => removeFromDraft(item.id)}>
              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-zinc-100">{item.name}</span>
                    {item.is_ad_hoc ? (
                      <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                        Ad-hoc
                      </Badge>
                    ) : item.meal_source ? (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 text-zinc-400">
                        {item.meal_source}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{item.category_name}</p>
                </div>

                <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-bold">
                  {item.quantity} {item.unit_type}
                </span>
              </div>
            </SwipeToDismiss>
          ))}
        </div>
      )}

      {/* Generate Active List CTA */}
      {draftItems.length > 0 && (
        <Button
          onClick={handleGenerateActiveList}
          disabled={isGenerating}
          className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl mt-4 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
        >
          {isGenerating ? (
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Play className="w-4 h-4 fill-black" />
              <span>Utwórz Aktywną Listę Zakupów</span>
            </>
          )}
        </Button>
      )}

      {/* Add Ad-hoc Sheet */}
      <AddAdHocSheet open={isAdHocOpen} onOpenChange={setIsAdHocOpen} />
    </div>
  )
}
