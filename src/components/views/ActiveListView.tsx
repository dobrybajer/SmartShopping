import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useShoppingStore } from '@/store/useShoppingStore'
import { shoppingListService } from '@/services/shoppingListService'
import type { ActiveListWithDetails } from '@/services/shoppingListService'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Calendar, Radio, Archive, ShoppingCart } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

import { useActiveListRealtime } from '@/hooks/useActiveListRealtime'

export const ActiveListView: React.FC = () => {
  const { household } = useAuth()
  const { setDraftItems, draftItems } = useShoppingStore()
  const [activeList, setActiveList] = useState<ActiveListWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [isArchiving, setIsArchiving] = useState(false)

  const loadActiveList = async () => {
    if (!household) return
    setLoading(true)
    const list = await shoppingListService.getActiveList(household.id)
    setActiveList(list)
    setLoading(false)
  }

  useEffect(() => {
    loadActiveList()
  }, [household])

  // Subskrypcja zmian Realtime w czasie rzeczywistym z Supabase
  useActiveListRealtime(activeList?.id || null, () => {
    // Ciche pobranie zaktualizowanego stanu bazy
    if (household && activeList?.id) {
      shoppingListService.getActiveList(household.id).then((freshList) => {
        if (freshList) setActiveList(freshList)
      })
    }
  })

  const handleToggleCheck = async (itemId: string, currentStatus: boolean) => {
    if (!activeList) return

    // 1. Optimistic UI update
    const previousItems = activeList.items
    const updatedItems = activeList.items.map((item) =>
      item.id === itemId ? { ...item, is_checked: !currentStatus } : item
    )
    setActiveList({ ...activeList, items: updatedItems })

    // 2. Supabase async update w tle
    const success = await shoppingListService.toggleItemChecked(itemId, !currentStatus)

    // 3. Rollback w przypadku niepowodzenia połączenia
    if (!success) {
      setActiveList({ ...activeList, items: previousItems })
    }
  }

  const handleArchiveList = async () => {
    if (!activeList || !household) return
    setIsArchiving(true)

    const uncheckedItemsToDraft = await shoppingListService.archiveActiveList(
      activeList.id,
      household.id
    )

    setIsArchiving(false)

    if (uncheckedItemsToDraft.length > 0) {
      // Dołącz niekupione pozycje z powrotem do draftu
      setDraftItems([...draftItems, ...uncheckedItemsToDraft])
    }

    setActiveList(null)
  }

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center">
        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs text-zinc-500">Pobieranie aktywnej listy zakupów...</p>
      </div>
    )
  }

  if (!activeList || activeList.items.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-600 mb-3">
          <ShoppingCart className="w-7 h-7" />
        </div>
        <p className="text-sm font-bold text-zinc-300">Brak aktywnej listy zakupów</p>
        <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
          Skomponuj koszyk w zakładce <strong className="text-emerald-400">Koszyk</strong> i naciśnij <strong className="text-emerald-400">Utwórz Aktywną Listę Zakupów</strong>.
        </p>
      </div>
    )
  }

  const checkedCount = activeList.items.filter((i) => i.is_checked).length
  const totalCount = activeList.items.length

  // Grupowanie według kategorii (sort_order)
  const categoryMap = new Map<string, { name: string; sort_order: number; items: typeof activeList.items }>()

  activeList.items.forEach((item) => {
    const catName = item.product?.category?.name || 'Inne / Ad-hoc'
    const sortOrder = item.product?.category?.sort_order ?? 99

    const existing = categoryMap.get(catName)
    if (existing) {
      existing.items.push(item)
    } else {
      categoryMap.set(catName, { name: catName, sort_order: sortOrder, items: [item] })
    }
  })

  const sortedCategories = Array.from(categoryMap.values()).sort(
    (a, b) => a.sort_order - b.sort_order
  )

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Realtime Status Banner */}
      <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs text-zinc-300 font-semibold flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Aktywna Lista (Realtime)</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDate(activeList.target_date || activeList.created_at) || 'Dziś'}</span>
          <Badge variant="default" className="text-[10px] ml-1">
            {checkedCount} / {totalCount}
          </Badge>
        </div>

      </div>

      {/* Sorted Category Groups */}
      <div className="flex flex-col gap-5 mt-1">
        {sortedCategories.map((group) => (
          <div key={group.name} className="flex flex-col gap-2">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider px-1 flex items-center justify-between">
              <span>{group.sort_order !== 99 ? `${group.sort_order}. ${group.name}` : group.name}</span>
              <span className="text-[10px] text-zinc-600 font-mono">
                {group.items.filter((i) => i.is_checked).length}/{group.items.length}
              </span>
            </h4>

            <div className="flex flex-col gap-2">
              {group.items.map((item) => {
                const isChecked = !!item.is_checked
                const name = item.product?.name || 'Produkt'
                const unit = item.product?.unit_type || 'szt'

                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleCheck(item.id, isChecked)}
                    className={cn(
                      "p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]",
                      isChecked && "bg-zinc-950/40 border-zinc-900 opacity-55"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleToggleCheck(item.id, isChecked)}
                        enableHaptics
                      />

                      <div className="flex flex-col">
                        <span
                          className={cn(
                            "font-semibold text-sm transition-all",
                            isChecked ? "line-through text-zinc-500" : "text-zinc-100"
                          )}
                        >
                          {name}
                        </span>
                        {item.added_ad_hoc && (
                          <span className="text-[10px] text-zinc-500 font-mono">Ad-hoc</span>
                        )}
                      </div>
                    </div>

                    <span
                      className={cn(
                        "font-mono text-xs px-2.5 py-1 rounded-lg font-bold transition-all",
                        isChecked
                          ? "bg-zinc-900 text-zinc-600 line-through"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      )}
                    >
                      {item.total_quantity} {unit}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Complete & Archive CTA */}
      <div className="mt-4 flex flex-col gap-2">
        {checkedCount === totalCount && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center flex items-center justify-center gap-2 text-emerald-300 text-xs font-bold animate-bounce">
            <CheckCircle2 className="w-4 h-4" />
            <span>Wszystkie zakupy zrobione! Bravo!</span>
          </div>
        )}

        <Button
          onClick={handleArchiveList}
          disabled={isArchiving}
          className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-700/80 font-bold rounded-xl flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
        >
          {isArchiving ? (
            <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Archive className="w-4 h-4 text-emerald-400" />
              <span>Zakończ i Zarchiwizuj Zakupy</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
