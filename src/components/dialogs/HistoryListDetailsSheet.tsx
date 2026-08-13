import React, { useState, useEffect } from 'react'
import { shoppingListService } from '@/services/shoppingListService'
import type { ShoppingList, ActiveListWithDetails, ActiveListItemWithProduct } from '@/services/shoppingListService'
import { useShoppingStore } from '@/store/useShoppingStore'
import type { AddToDraftPayload } from '@/store/useShoppingStore'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import {
  Calendar,
  CheckCircle2,
  Edit2,
  Check,
  X,
  Trash2,
  ShoppingCart,
  Plus,
  PackageCheck,
  CircleAlert
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface HistoryListDetailsSheetProps {
  list: ShoppingList | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onListUpdated?: (updatedList: ShoppingList) => void
  onListDeleted?: (deletedListId: string) => void
}

export const HistoryListDetailsSheet: React.FC<HistoryListDetailsSheetProps> = ({
  list,
  open,
  onOpenChange,
  onListUpdated,
  onListDeleted
}) => {
  const { addItemToDraft, addMultipleToDraft } = useShoppingStore()

  const [listDetails, setListDetails] = useState<ActiveListWithDetails | null>(null)
  const [loading, setLoading] = useState(false)

  // Edit name state
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)

  // Delete confirm state
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Added items visual feedback state
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({})
  const [allAdded, setAllAdded] = useState(false)

  useEffect(() => {
    if (open && list) {
      setEditedName(list.name || `Zakupy ${formatDate(list.target_date || list.created_at)}`)
      setIsEditingName(false)
      setIsConfirmingDelete(false)
      setAllAdded(false)
      setAddedItemIds({})

      // Load full items details
      setLoading(true)
      shoppingListService.getListWithDetails(list.id).then((details) => {
        setListDetails(details)
        setLoading(false)
      })
    } else {
      setListDetails(null)
    }
  }, [open, list])

  if (!list) return null

  const handleSaveName = async () => {
    if (!editedName.trim() || editedName === list.name) {
      setIsEditingName(false)
      return
    }

    setIsSavingName(true)
    const success = await shoppingListService.updateListName(list.id, editedName.trim())
    setIsSavingName(false)

    if (success) {
      const updated = { ...list, name: editedName.trim() }
      if (listDetails) {
        setListDetails({ ...listDetails, name: editedName.trim() })
      }
      setIsEditingName(false)
      if (onListUpdated) {
        onListUpdated(updated)
      }
    }
  }

  const handleDeleteList = async () => {
    setIsDeleting(true)
    const success = await shoppingListService.deleteShoppingList(list.id)
    setIsDeleting(false)

    if (success) {
      if (onListDeleted) {
        onListDeleted(list.id)
      }
      onOpenChange(false)
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

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(25)
      } catch {
        // Ignoruj
      }
    }

    setAddedItemIds((prev) => ({ ...prev, [item.id]: true }))
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [item.id]: false }))
    }, 1500)
  }

  const handleAddAllToDraft = () => {
    if (!listDetails || !listDetails.items || listDetails.items.length === 0) return

    const payloads = listDetails.items.map(mapItemToDraftPayload)
    addMultipleToDraft(payloads)

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([40, 60, 40])
      } catch {
        // Ignoruj
      }
    }

    setAllAdded(true)
    setTimeout(() => {
      setAllAdded(false)
      onOpenChange(false)
    }, 1000)
  }

  const items = listDetails?.items || []
  const checkedCount = items.filter((i) => i.is_checked).length
  const totalCount = items.length

  // Grupowanie według kategorii
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

  const formattedDate = formatDate(list.target_date || list.created_at)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] flex flex-col overflow-hidden p-0 gap-0">
        {/* Header */}
        <SheetHeader className="p-4 pb-3 border-b border-zinc-900 shrink-0">
          <div className="flex flex-col gap-2">
            {/* Tytuł i edycja */}
            <div className="flex items-center justify-between gap-2 pr-6">
              {isEditingName ? (
                <div className="flex items-center gap-1.5 flex-1 animate-in fade-in duration-150">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName()
                      if (e.key === 'Escape') setIsEditingName(false)
                    }}
                    autoFocus
                    disabled={isSavingName}
                    className="h-9 bg-zinc-900 border-zinc-700 text-sm font-bold text-zinc-100"
                    placeholder="Wpisz nazwę listy..."
                  />
                  <Button
                    onClick={handleSaveName}
                    disabled={isSavingName}
                    size="sm"
                    className="h-9 w-9 p-0 bg-emerald-500 hover:bg-emerald-400 text-black shrink-0"
                    title="Zapisz nazwę"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => setIsEditingName(false)}
                    disabled={isSavingName}
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-zinc-400 hover:text-white shrink-0"
                    title="Anuluj"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group flex-1 min-w-0">
                  <SheetTitle className="text-base font-bold text-zinc-100 truncate">
                    {list.name || `Zakupy ${formattedDate}`}
                  </SheetTitle>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-zinc-500 hover:text-emerald-400 p-1 transition-colors rounded-md hover:bg-zinc-900 shrink-0"
                    title="Edytuj nazwę listy"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Data i status */}
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>{formattedDate}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Badge variant="default" className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-0.5">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Zarchiwizowane
                </Badge>
                {totalCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-mono py-0.5">
                    {checkedCount}/{totalCount} kupiono
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <SheetDescription className="sr-only">Szczegóły zarchiwizowanej listy zakupów</SheetDescription>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs text-zinc-500">Wczytywanie pozycji z bazy...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-600 mb-2">
                <PackageCheck className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-zinc-300">Brak pozycji na tej liście</p>
              <p className="text-xs text-zinc-500 mt-0.5">Ta lista zakupowa nie zawierała żadnych produktów.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {sortedCategories.map((group) => (
                <div key={group.name} className="flex flex-col gap-2">
                  <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider px-1 flex items-center justify-between">
                    <span>{group.sort_order !== 99 ? `${group.sort_order}. ${group.name}` : group.name}</span>
                    <span className="text-[10px] text-zinc-600 font-mono">
                      {group.items.length} {group.items.length === 1 ? 'poz.' : 'poz.'}
                    </span>
                  </h4>

                  <div className="flex flex-col gap-1.5">
                    {group.items.map((item) => {
                      const name = item.product?.name || 'Produkt'
                      const unit = item.product?.unit_type || 'szt'
                      const isItemAdded = addedItemIds[item.id]

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "p-3 rounded-xl bg-zinc-950 border border-zinc-850 flex items-center justify-between transition-all",
                            item.is_checked ? "border-zinc-900 bg-zinc-950/70" : "border-zinc-800"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div
                              className={cn(
                                "w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px]",
                                item.is_checked
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-zinc-900 text-zinc-600 border border-zinc-800"
                              )}
                              title={item.is_checked ? "Kupiono podczas tych zakupów" : "Nieodhaczony"}
                            >
                              {item.is_checked ? <Check className="w-2.5 h-2.5" /> : null}
                            </div>

                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-xs text-zinc-200 truncate">
                                {name}
                              </span>
                              {item.added_ad_hoc && (
                                <span className="text-[9px] text-zinc-500 font-mono">Ad-hoc</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                              {item.total_quantity} {unit}
                            </span>

                            {/* Przycisk dodania pojedynczego elementu do koszyka */}
                            <Button
                              onClick={() => handleAddSingleItemToDraft(item)}
                              size="sm"
                              variant="outline"
                              className={cn(
                                "h-8 px-2.5 text-xs rounded-lg border transition-all cursor-pointer",
                                isItemAdded
                                  ? "bg-emerald-500 text-black border-emerald-400 font-bold"
                                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800 hover:border-emerald-500/40 hover:text-emerald-400"
                              )}
                              title="Dodaj ten produkt do koszyka roboczego"
                            >
                              {isItemAdded ? (
                                <span className="flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  <span className="text-[10px]">Dodano</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                                  <ShoppingCart className="w-3 h-3" />
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
          )}

          {/* Delete confirmation section */}
          {isConfirmingDelete ? (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150 mt-2">
              <div className="flex items-center gap-2 text-red-400 text-xs font-semibold">
                <CircleAlert className="w-4 h-4 shrink-0" />
                <span>Czy na pewno chcesz usunąć tę listę z historii?</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Operacja jest nieodwracalna i usunie całą historię tej listy.
              </p>
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
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setIsConfirmingDelete(true)}
                className="text-[11px] text-zinc-500 hover:text-red-400 flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Usuń tę listę z historii</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <SheetFooter className="p-4 pt-3 border-t border-zinc-900 bg-zinc-950/90 shrink-0">
          <Button
            onClick={handleAddAllToDraft}
            disabled={items.length === 0 || allAdded}
            className={cn(
              "w-full h-12 font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all text-sm",
              allAdded
                ? "bg-emerald-400 text-black"
                : "bg-emerald-500 hover:bg-emerald-400 text-black"
            )}
          >
            {allAdded ? (
              <>
                <Check className="w-5 h-5" />
                <span>Wszystkie pozycje dodane do koszyka!</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 fill-black" />
                <span>Dodaj całą listę do koszyka ({items.length})</span>
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
