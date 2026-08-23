import React, { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useShoppingStore, type DraftItem } from '@/store/useShoppingStore'
import { shoppingListService } from '@/services/shoppingListService'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AddAdHocSheet } from '@/components/dialogs/AddAdHocSheet'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import {
  Trash2,
  Play,
  Plus,
  Minus,
  ShoppingBag,
  CheckCircle2,
  Utensils,
  Layers
} from 'lucide-react'
import { formatDate, getNextQuantity } from '@/lib/utils'

interface DesktopDraftViewProps {
  onActiveListCreated?: () => void
}

export const DesktopDraftView: React.FC<DesktopDraftViewProps> = ({ onActiveListCreated }) => {
  const { household } = useAuth()
  const { draftItems, removeFromDraft, updateDraftQuantity, clearDraft } = useShoppingStore()
  const [isAdHocOpen, setIsAdHocOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<DraftItem | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  const handleIncrease = (item: DraftItem) => {
    const newQty = getNextQuantity(item.quantity, item.unit_type, 'increase')
    updateDraftQuantity(item.id, newQty)
  }

  const handleDecrease = (item: DraftItem) => {
    const newQty = getNextQuantity(item.quantity, item.unit_type, 'decrease')
    if (newQty <= 0) {
      setItemToDelete(item)
      setIsDeleteModalOpen(true)
    } else {
      updateDraftQuantity(item.id, newQty)
    }
  }

  const startEditing = (itemId: string, currentQuantity: number) => {
    setEditingId(itemId)
    setEditValue(String(currentQuantity))
  }

  const handleInputChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '')
    const normalized = cleaned.replace(/^0+/, '')
    setEditValue(normalized)
  }

  const handleCommitEdit = (itemId: string) => {
    const parsed = parseInt(editValue, 10)
    if (!isNaN(parsed) && parsed > 0) {
      updateDraftQuantity(itemId, parsed)
    }
    setEditingId(null)
    setEditValue('')
  }

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      removeFromDraft(itemToDelete.id)
      setItemToDelete(null)
      setIsDeleteModalOpen(false)
    }
  }

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
      clearDraft()
      if (onActiveListCreated) {
        onActiveListCreated()
      }
    }
  }

  // Count ad-hoc vs recipe items
  const adHocCount = draftItems.filter((i) => i.is_ad_hoc).length
  const recipeItemsCount = draftItems.length - adHocCount

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {draftItems.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center bg-zinc-950/40 border border-zinc-900 border-dashed rounded-3xl p-12 max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-5 shadow-2xl">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-extrabold text-zinc-100">Koszyk roboczy jest pusty</h3>
          <p className="text-sm text-zinc-400 mt-2 max-w-md leading-relaxed">
            Dodaj posiłki z <strong className="text-emerald-400">Książki Kucharskiej</strong> lub skorzystaj z przycisku <strong className="text-emerald-400">+ Ad-hoc</strong>, aby wrzucić chemię domową lub pojedyncze artykuły.
          </p>

          <Button
            onClick={() => setIsAdHocOpen(true)}
            className="mt-6 h-11 px-6 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl shadow-lg shadow-emerald-950/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Dodaj pozycję Ad-hoc</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: 2/3 Width Item List */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-900 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-100">
                    Skomponowane Pozycje ({draftItems.length})
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Dostosuj ilości przed utworzeniem listy zakupów
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsAdHocOpen(true)}
                  size="sm"
                  className="h-9 px-3 bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-zinc-700/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Ad-hoc</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearDraft()}
                  className="h-9 px-3 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border-zinc-800 rounded-xl text-xs font-medium cursor-pointer"
                  title="Wyczyść cały koszyk"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span>Wyczyść</span>
                </Button>
              </div>
            </div>

            {/* List of Items */}
            <div className="flex flex-col gap-2.5">
              {draftItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-900 hover:border-zinc-800 transition-all flex items-center justify-between gap-4 shadow-sm group"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-colors shrink-0">
                      {item.is_ad_hoc ? <ShoppingBag className="w-4 h-4 text-amber-400" /> : <Utensils className="w-4 h-4 text-emerald-400" />}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-zinc-100 group-hover:text-white transition-colors truncate">
                          {item.name}
                        </span>
                        {item.is_ad_hoc ? (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                            Ad-hoc
                          </Badge>
                        ) : item.meal_source ? (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 text-zinc-400 bg-zinc-900 border-zinc-800">
                            {item.meal_source}
                          </Badge>
                        ) : null}
                      </div>
                      <span className="text-xs text-zinc-500 mt-0.5">
                        {item.category_name || 'Inne'}
                      </span>
                    </div>
                  </div>

                  {/* Stepper +/- & Numeric Editor */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 shadow-inner">
                      <button
                        type="button"
                        onClick={() => handleDecrease(item)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-90 transition-all cursor-pointer"
                        title="Zmniejsz ilość"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      {editingId === item.id ? (
                        <div className="flex items-center gap-1 px-1.5">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            autoFocus
                            value={editValue}
                            onChange={(e) => handleInputChange(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCommitEdit(item.id)
                              } else if (e.key === 'Escape') {
                                setEditingId(null)
                                setEditValue('')
                              }
                            }}
                            onBlur={() => handleCommitEdit(item.id)}
                            className="w-16 h-8 bg-zinc-950 text-center font-mono text-xs font-bold text-emerald-400 border border-emerald-500/60 rounded px-1 outline-none ring-1 ring-emerald-500/40 shadow-inner"
                          />
                          <span className="font-mono text-xs text-emerald-400 font-bold pr-1 select-none">
                            {item.unit_type}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditing(item.id, item.quantity)}
                          className="font-mono text-xs px-3 py-1 font-bold min-w-[4.5rem] text-center text-emerald-400 hover:bg-zinc-800/80 rounded-lg transition-colors cursor-text select-none"
                          title="Kliknij, aby wpisać dokładną ilość"
                        >
                          {item.quantity} {item.unit_type}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleIncrease(item)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-90 transition-all cursor-pointer"
                        title="Zwiększ ilość"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Delete Item Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setItemToDelete(item)
                        setIsDeleteModalOpen(true)
                      }}
                      className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                      title="Usuń z koszyka"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: 1/3 Summary & Launch Deck */}
          <div className="flex flex-col gap-5 sticky top-24">
            <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-2xl flex flex-col gap-6 backdrop-blur-xl">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
                <h3 className="font-extrabold text-base text-zinc-100 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  <span>Podsumowanie</span>
                </h3>
                <Badge variant="default" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Gotowy do zakupu
                </Badge>
              </div>

              {/* Statistics Breakdown */}
              <div className="flex flex-col gap-3 font-mono text-xs">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Wszystkie pozycje:</span>
                  <strong className="text-zinc-100 text-sm">{draftItems.length}</strong>
                </div>

                <div className="flex items-center justify-between text-zinc-400">
                  <span>Składniki z przepisów:</span>
                  <strong className="text-emerald-400">{recipeItemsCount}</strong>
                </div>

                <div className="flex items-center justify-between text-zinc-400">
                  <span>Artykuły ad-hoc:</span>
                  <strong className="text-amber-400">{adHocCount}</strong>
                </div>

                <div className="pt-3 border-t border-zinc-900 flex items-center justify-between text-xs text-zinc-500">
                  <span>Gospodarstwo docelowe:</span>
                  <span className="text-zinc-300 font-sans font-semibold truncate max-w-[150px]">
                    {household?.name}
                  </span>
                </div>
              </div>

              {/* Action Banner */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 leading-relaxed flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Po kliknięciu lista zostanie automatycznie posortowana według kategorii i udostępniona wszystkim domownikom w czasie rzeczywistym.
                </span>
              </div>

              {/* Big Launch Button */}
              <Button
                onClick={handleGenerateActiveList}
                disabled={isGenerating}
                className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-950/40 disabled:opacity-50 cursor-pointer transition-all active:scale-[0.98]"
              >
                {isGenerating ? (
                  <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-black" />
                    <span>Utwórz Aktywną Listę Zakupów</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Ad-hoc Sheet */}
      <AddAdHocSheet open={isAdHocOpen} onOpenChange={setIsAdHocOpen} />

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        itemName={itemToDelete?.name}
        targetName="z koszyka"
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
