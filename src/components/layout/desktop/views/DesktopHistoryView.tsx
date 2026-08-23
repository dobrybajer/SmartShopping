import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { shoppingListService } from '@/services/shoppingListService'
import type { ShoppingList, ActiveListWithDetails, ActiveListItemWithProduct } from '@/services/shoppingListService'
import { useShoppingStore, type AddToDraftPayload } from '@/store/useShoppingStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import {
  Calendar,
  CheckCircle2,
  History,
  ChevronRight,
  ShoppingCart,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  PackageCheck,
  CircleAlert,
  Search
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const DesktopHistoryView: React.FC = () => {
  const { household } = useAuth()
  const { addItemToDraft, addMultipleToDraft } = useShoppingStore()

  const [historyLists, setHistoryLists] = useState<ShoppingList[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Selected List Details
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [listDetails, setListDetails] = useState<ActiveListWithDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Edit list name state
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)

  // Delete confirm state
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Visual feedback for added items
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({})
  const [allAdded, setAllAdded] = useState(false)

  const loadHistory = useCallback(async () => {
    if (!household) return
    setLoading(true)
    const lists = await shoppingListService.getHistoryLists(household.id)
    setHistoryLists(lists)
    if (lists.length > 0 && !selectedListId) {
      setSelectedListId(lists[0].id)
    }
    setLoading(false)
  }, [household, selectedListId])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Load details when selectedListId changes
  useEffect(() => {
    if (!selectedListId) {
      setListDetails(null)
      return
    }

    setLoadingDetails(true)
    setIsEditingName(false)
    setIsConfirmingDelete(false)
    setAllAdded(false)
    setAddedItemIds({})

    shoppingListService.getListWithDetails(selectedListId).then((details) => {
      setListDetails(details)
      if (details) {
        setEditedName(details.name || `Zakupy ${formatDate(details.target_date || details.created_at)}`)
      }
      setLoadingDetails(false)
    })
  }, [selectedListId])

  const filteredLists = historyLists.filter((list) => {
    const name = list.name || `Zakupy ${formatDate(list.target_date || list.created_at)}`
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const handleSaveName = async () => {
    if (!listDetails || !editedName.trim() || editedName === listDetails.name) {
      setIsEditingName(false)
      return
    }

    setIsSavingName(true)
    const success = await shoppingListService.updateListName(listDetails.id, editedName.trim())
    setIsSavingName(false)

    if (success) {
      setListDetails({ ...listDetails, name: editedName.trim() })
      setHistoryLists((prev) =>
        prev.map((l) => (l.id === listDetails.id ? { ...l, name: editedName.trim() } : l))
      )
      setIsEditingName(false)
    }
  }

  const handleDeleteList = async () => {
    if (!listDetails) return
    setIsDeleting(true)
    const success = await shoppingListService.deleteShoppingList(listDetails.id)
    setIsDeleting(false)

    if (success) {
      const remaining = historyLists.filter((l) => l.id !== listDetails.id)
      setHistoryLists(remaining)
      setSelectedListId(remaining.length > 0 ? remaining[0].id : null)
      setListDetails(null)
    }
  }

  const mapItemToDraftPayload = (item: ActiveListItemWithProduct): AddToDraftPayload => {
    return {
      product_id: item.product?.id,
      name: item.product?.name || 'Produkt',
      unit_type: (item.product?.unit_type as any) || 'szt',
      category_id: item.product?.category_id || undefined,
      category_name: item.product?.category?.name || 'Inne',
      sort_order: item.product?.category?.sort_order ?? 99,
      quantity: item.total_quantity,
      is_ad_hoc: !!item.added_ad_hoc
    }
  }

  const handleAddSingleItemToDraft = (item: ActiveListItemWithProduct) => {
    const payload = mapItemToDraftPayload(item)
    addItemToDraft(payload)

    setAddedItemIds((prev) => ({ ...prev, [item.id]: true }))
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [item.id]: false }))
    }, 1500)
  }

  const handleAddAllToDraft = () => {
    if (!listDetails || !listDetails.items || listDetails.items.length === 0) return

    const payloads = listDetails.items.map(mapItemToDraftPayload)
    addMultipleToDraft(payloads)

    setAllAdded(true)
    setTimeout(() => {
      setAllAdded(false)
    }, 1500)
  }

  const items = listDetails?.items || []
  const checkedCount = items.filter((i) => i.is_checked).length
  const totalCount = items.length

  // Category grouping
  const categoryMap = new Map<string, { name: string; sort_order: number; items: typeof items }>()

  items.forEach((item) => {
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

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-zinc-500">Pobieranie historii z bazy...</p>
      </div>
    )
  }

  if (historyLists.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center bg-zinc-950/40 border border-zinc-900 border-dashed rounded-3xl p-12 max-w-2xl mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-5 shadow-2xl">
          <History className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-extrabold text-zinc-100">Brak zarchiwizowanej historii</h3>
        <p className="text-sm text-zinc-400 mt-2 max-w-md leading-relaxed">
          Gdy zakończysz zakupy na aktywnej liście, jej pełne podsumowanie i rozliczenie pojawi się w tym miejscu.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
      {/* Left Master Column: 5 Cols (Trip list) */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Search list history */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Szukaj w historii list..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-zinc-950/80 border-zinc-800 rounded-2xl text-sm"
          />
        </div>

        {/* History items */}
        <div className="flex flex-col gap-2.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
          {filteredLists.map((list) => {
            const isSelected = selectedListId === list.id
            const displayDate = formatDate(list.target_date || list.created_at)
            const listTitle = list.name || `Zakupy ${displayDate}`

            return (
              <div
                key={list.id}
                onClick={() => setSelectedListId(list.id)}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 shadow-xs group",
                  isSelected
                    ? "bg-emerald-500/10 border-emerald-500/40 text-white shadow-md shadow-emerald-950/20"
                    : "bg-zinc-950/80 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/60"
                )}
              >
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <h4 className={cn("font-bold text-sm truncate", isSelected ? "text-emerald-400" : "text-zinc-200 group-hover:text-white")}>
                    {listTitle}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{displayDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="default"
                    className={cn(
                      "text-[10px]",
                      isSelected
                        ? "bg-emerald-500 text-black font-extrabold"
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                    )}
                  >
                    Zarchiwizowane
                  </Badge>

                  <ChevronRight className={cn("w-4 h-4 transition-transform", isSelected ? "text-emerald-400 translate-x-1" : "text-zinc-600 group-hover:text-zinc-400")} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right Detail Column: 7 Cols (Selected list breakdown) */}
      <div className="lg:col-span-7 flex flex-col gap-6 sticky top-24">
        {loadingDetails ? (
          <div className="p-12 rounded-3xl bg-zinc-950/80 border border-zinc-900 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-zinc-500">Wczytywanie szczegółów listy...</p>
          </div>
        ) : !listDetails ? (
          <div className="p-12 rounded-3xl bg-zinc-950/80 border border-zinc-900 border-dashed flex flex-col items-center justify-center text-center">
            <PackageCheck className="w-10 h-10 text-zinc-600 mb-3" />
            <p className="text-sm font-bold text-zinc-300">Wybierz listę z lewej kolumny</p>
            <p className="text-xs text-zinc-500 mt-1">Kliknij dowolny wpis, aby zobaczyć pełne zestawienie zakupów.</p>
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-2xl flex flex-col gap-6 backdrop-blur-xl">
            {/* Header: Title, Edit, Date & Meta */}
            <div className="flex flex-col gap-3 pb-4 border-b border-zinc-900">
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
                      className="h-10 bg-zinc-900 border-zinc-700 text-sm font-bold text-zinc-100"
                    />
                    <Button
                      onClick={handleSaveName}
                      disabled={isSavingName}
                      size="sm"
                      className="h-10 px-3 bg-emerald-500 hover:bg-emerald-400 text-black shrink-0"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setIsEditingName(false)}
                      disabled={isSavingName}
                      variant="ghost"
                      size="sm"
                      className="h-10 px-3 text-zinc-400 hover:text-white shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-extrabold text-lg text-zinc-100">
                      {listDetails.name || `Zakupy ${formatDate(listDetails.target_date || listDetails.created_at)}`}
                    </h3>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-zinc-500 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
                      title="Zmień nazwę"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs py-1">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Zrealizowano
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Data: {formatDate(listDetails.target_date || listDetails.created_at)}</span>
                </span>
                <span>
                  Pozycje: <strong className="text-emerald-400 font-bold">{checkedCount}/{totalCount}</strong> kupionych
                </span>
              </div>
            </div>

            {/* Categorized items container */}
            <div className="flex flex-col gap-5 max-h-[480px] overflow-y-auto pr-1">
              {sortedCategories.map((group) => (
                <div key={group.name} className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider px-1 flex items-center justify-between">
                    <span>{group.sort_order !== 99 ? `${group.sort_order}. ${group.name}` : group.name}</span>
                    <span className="text-[10px] text-zinc-600 font-mono">
                      {group.items.length} pozycji
                    </span>
                  </h4>

                  <div className="flex flex-col gap-2">
                    {group.items.map((item) => {
                      const name = item.product?.name || 'Produkt'
                      const unit = item.product?.unit_type || 'szt'
                      const isItemAdded = addedItemIds[item.id]

                      return (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between gap-3 shadow-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs",
                                item.is_checked
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-zinc-800 text-zinc-600"
                              )}
                            >
                              {item.is_checked ? <Check className="w-3 h-3" /> : null}
                            </div>

                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-sm text-zinc-200 truncate">
                                {name}
                              </span>
                              {item.added_ad_hoc && (
                                <span className="text-[10px] text-zinc-500 font-mono">Ad-hoc</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="font-mono text-xs text-emerald-400 font-bold bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-xl">
                              {item.total_quantity} {unit}
                            </span>

                            <Button
                              onClick={() => handleAddSingleItemToDraft(item)}
                              size="sm"
                              variant="outline"
                              className={cn(
                                "h-8 px-2.5 text-xs rounded-xl border transition-all cursor-pointer",
                                isItemAdded
                                  ? "bg-emerald-500 text-black border-emerald-400 font-bold"
                                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700/80 hover:border-emerald-500/40 hover:text-emerald-400"
                              )}
                              title="Dodaj ten artykuł do koszyka roboczego"
                            >
                              {isItemAdded ? (
                                <span className="flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Dodano</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                                  <ShoppingCart className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-4 border-t border-zinc-900 flex flex-col gap-3">
              <Button
                onClick={handleAddAllToDraft}
                disabled={items.length === 0 || allAdded}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer transition-all active:scale-[0.98]"
              >
                {allAdded ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Wszystkie pozycje dodane do koszyka!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 fill-black" />
                    <span>Dodaj całą listę do koszyka ({items.length} pozycji)</span>
                  </>
                )}
              </Button>

              {isConfirmingDelete ? (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-2 text-red-400 text-xs font-semibold">
                    <CircleAlert className="w-4 h-4 shrink-0" />
                    <span>Czy na pewno chcesz usunąć tę listę z historii?</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      onClick={handleDeleteList}
                      disabled={isDeleting}
                      size="sm"
                      className="flex-1 h-9 bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
                    >
                      {isDeleting ? 'Usuwanie...' : 'Tak, usuń bezpowrotnie'}
                    </Button>
                    <Button
                      onClick={() => setIsConfirmingDelete(false)}
                      disabled={isDeleting}
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 text-xs"
                    >
                      Anuluj
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsConfirmingDelete(true)}
                  className="text-xs text-zinc-500 hover:text-red-400 flex items-center justify-center gap-1.5 py-1 transition-colors cursor-pointer self-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Usuń tę listę z historii</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
