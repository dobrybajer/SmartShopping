import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useShoppingStore } from '@/store/useShoppingStore'
import { useTranslation } from '@/i18n'
import { shoppingListService } from '@/services/shoppingListService'
import type { ShoppingList, ActiveListWithDetails, ActiveListItemWithProduct } from '@/services/shoppingListService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  CheckCircle2,
  History,
  ShoppingCart,
  Check,
  Plus,
  Trash2,
  Edit2,
  X,
  CircleAlert,
  ChevronRight,
  PackageCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const DesktopHistoryView: React.FC = () => {
  const { household } = useAuth()
  const { addItemToDraft, addMultipleToDraft } = useShoppingStore()
  const { t, formatQuantity, formatDate } = useTranslation()

  const [historyLists, setHistoryLists] = useState<ShoppingList[]>([])
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [listDetails, setListDetails] = useState<ActiveListWithDetails | null>(null)
  const [loadingLists, setLoadingLists] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)

  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({})
  const [allAdded, setAllAdded] = useState(false)

  const loadHistoryLists = useCallback(async () => {
    if (!household) return
    setLoadingLists(true)
    const lists = await shoppingListService.getHistoryLists(household.id)
    setHistoryLists(lists)
    if (lists.length > 0 && !selectedListId) {
      setSelectedListId(lists[0].id)
    }
    setLoadingLists(false)
  }, [household, selectedListId])

  useEffect(() => {
    loadHistoryLists()
  }, [loadHistoryLists])

  const loadDetails = useCallback(async (listId: string) => {
    setLoadingDetails(true)
    const data = await shoppingListService.getListWithDetails(listId)
    setListDetails(data)
    setEditedName(data?.name || '')
    setIsEditingName(false)
    setIsConfirmingDelete(false)
    setAddedItemIds({})
    setAllAdded(false)
    setLoadingDetails(false)
  }, [])

  useEffect(() => {
    if (selectedListId) {
      loadDetails(selectedListId)
    } else {
      setListDetails(null)
    }
  }, [selectedListId, loadDetails])

  const handleSaveName = async () => {
    if (!selectedListId || !editedName.trim()) return
    setIsSavingName(true)
    const success = await shoppingListService.updateListName(selectedListId, editedName.trim())
    setIsSavingName(false)
    if (success) {
      setIsEditingName(false)
      setListDetails((prev) => (prev ? { ...prev, name: editedName.trim() } : null))
      setHistoryLists((prev) =>
        prev.map((l) => (l.id === selectedListId ? { ...l, name: editedName.trim() } : l))
      )
    }
  }

  const handleDeleteList = async () => {
    if (!selectedListId) return
    setIsDeleting(true)
    const success = await shoppingListService.deleteShoppingList(selectedListId)
    setIsDeleting(false)
    if (success) {
      const remaining = historyLists.filter((l) => l.id !== selectedListId)
      setHistoryLists(remaining)
      setSelectedListId(remaining.length > 0 ? remaining[0].id : null)
      setIsConfirmingDelete(false)
    }
  }

  const handleAddSingleItemToDraft = (item: ActiveListItemWithProduct) => {
    addItemToDraft({
      product_id: item.product_id || undefined,
      name: item.product?.name || item.ad_hoc_name || 'Product',
      quantity: item.total_quantity,
      unit_type: (item.product?.unit_type as any) || 'pcs',
      category_id: item.product?.category_id || undefined,
      category_name: item.product?.category?.name || 'other',
      meal_source: `${t('history.archivedList')}: ${listDetails?.name || t('navigation.history')}`,
      is_ad_hoc: !item.product_id
    })

    setAddedItemIds((prev) => ({ ...prev, [item.id]: true }))
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [item.id]: false }))
    }, 1500)
  }

  const handleAddAllToDraft = () => {
    if (!listDetails || listDetails.items.length === 0) return

    const draftItems = listDetails.items.map((item) => ({
      product_id: item.product_id || undefined,
      name: item.product?.name || item.ad_hoc_name || 'Product',
      quantity: item.total_quantity,
      unit_type: (item.product?.unit_type as any) || 'pcs',
      category_id: item.product?.category_id || undefined,
      category_name: item.product?.category?.name || 'other',
      meal_source: `${t('history.archivedList')}: ${listDetails.name || t('navigation.history')}`,
      is_ad_hoc: !item.product_id
    }))

    addMultipleToDraft(draftItems)
    setAllAdded(true)
    setTimeout(() => setAllAdded(false), 2000)
  }

  const getCategoryLabel = (catName: string) => {
    return t(`categories.${catName}` as any) !== `categories.${catName}`
      ? t(`categories.${catName}` as any)
      : catName
  }

  // Calculate stats for current details
  const items = listDetails?.items || []
  const checkedCount = items.filter((i) => i.is_checked).length
  const totalCount = items.length

  // Group items by category
  const categoryMap = new Map<string, { name: string; sort_order: number; items: typeof items }>()
  items.forEach((item) => {
    const catName = item.product?.category?.name || 'other'
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
      {/* Left List Column: 5 Cols (History Shopping Lists) */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">
                {t('navigation.history')} ({historyLists.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                {t('history.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* List of archives */}
        <div className="flex flex-col gap-2.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
          {loadingLists ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : historyLists.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center bg-card/40 border border-border border-dashed rounded-3xl p-8">
              <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground mb-3 shadow-inner">
                <History className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-foreground">{t('history.emptyTitle')}</p>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {t('history.emptySubtitle')}
              </p>
            </div>
          ) : historyLists.map((list) => {
            const isSelected = selectedListId === list.id
            const displayDate = formatDate(list.target_date || list.created_at || new Date())
            const listTitle = list.name || `${t('history.archivedList')} ${displayDate}`

            return (
              <div
                key={list.id}
                onClick={() => setSelectedListId(list.id)}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 shadow-xs group",
                  isSelected
                    ? "bg-primary/10 border-primary/40 text-foreground shadow-md"
                    : "bg-card border-border hover:border-border/80 hover:bg-muted/60"
                )}
              >
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <h4 className={cn("font-bold text-sm truncate", isSelected ? "text-primary" : "text-foreground group-hover:text-foreground")}>
                    {listTitle}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
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
                        ? "bg-primary text-primary-foreground font-extrabold"
                        : "bg-muted text-muted-foreground border border-border"
                    )}
                  >
                    {t('history.completedOn')}
                  </Badge>

                  <ChevronRight className={cn("w-4 h-4 transition-transform", isSelected ? "text-primary translate-x-1" : "text-muted-foreground group-hover:text-foreground")} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right Detail Column: 7 Cols (Selected list breakdown) */}
      <div className="lg:col-span-7 flex flex-col gap-6 sticky top-24">
        {loadingDetails ? (
          <div className="p-12 rounded-3xl bg-card border border-border flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
          </div>
        ) : !listDetails ? (
          <div className="p-12 rounded-3xl bg-card border border-border border-dashed flex flex-col items-center justify-center text-center">
            <PackageCheck className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm font-bold text-foreground">{t('history.viewDetails')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('history.emptySubtitle')}</p>
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-card border border-border shadow-2xl flex flex-col gap-6 backdrop-blur-xl">
            {/* Header: Title, Edit, Date & Meta */}
            <div className="flex flex-col gap-3 pb-4 border-b border-border">
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
                      className="h-10 bg-background border-input text-sm font-bold text-foreground"
                    />
                    <Button
                      onClick={handleSaveName}
                      disabled={isSavingName}
                      size="sm"
                      className="h-10 px-3 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setIsEditingName(false)}
                      disabled={isSavingName}
                      variant="ghost"
                      size="sm"
                      className="h-10 px-3 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-extrabold text-lg text-foreground">
                      {listDetails.name || `${t('history.archivedList')} ${formatDate(listDetails.target_date || listDetails.created_at || new Date())}`}
                    </h3>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-muted-foreground hover:text-primary p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      title={t('common.edit')}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-primary/10 text-primary border border-primary/20 text-xs py-1">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {t('history.completedOn')}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{formatDate(listDetails.target_date || listDetails.created_at || new Date())}</span>
                </span>
                <span>
                  {t('history.itemsBoughtRatio', { bought: checkedCount, total: totalCount })}
                </span>
              </div>
            </div>

            {/* Categorized items container */}
            <div className="flex flex-col gap-5 max-h-[480px] overflow-y-auto pr-1">
              {sortedCategories.map((group) => (
                <div key={group.name} className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider px-1 flex items-center justify-between">
                    <span>{group.sort_order !== 99 ? `${group.sort_order}. ${getCategoryLabel(group.name)}` : getCategoryLabel(group.name)}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {formatQuantity(group.items.length, 'pcs')}
                    </span>
                  </h4>

                  <div className="flex flex-col gap-2">
                    {group.items.map((item) => {
                      const name = item.product?.name || 'Product'
                      const unit = item.product?.unit_type || 'pcs'
                      const isItemAdded = addedItemIds[item.id]

                      return (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-2xl bg-card border border-border flex items-center justify-between gap-3 shadow-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs",
                                item.is_checked
                                  ? "bg-primary/20 text-primary border border-primary/30"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {item.is_checked ? <Check className="w-3 h-3" /> : null}
                            </div>

                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-sm text-foreground truncate">
                                {name}
                              </span>
                              {item.added_ad_hoc && (
                                <span className="text-[10px] text-muted-foreground font-mono">{t('draft.adHocItem')}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="font-mono text-xs text-primary font-bold bg-background border border-border px-2.5 py-1 rounded-xl">
                              {formatQuantity(item.total_quantity, unit)}
                            </span>

                            <Button
                              onClick={() => handleAddSingleItemToDraft(item)}
                              size="sm"
                              variant="outline"
                              className={cn(
                                "h-8 px-2.5 text-xs rounded-xl border transition-all cursor-pointer",
                                isItemAdded
                                  ? "bg-primary text-primary-foreground border-primary font-bold"
                                  : "bg-card hover:bg-muted text-foreground border-border hover:border-primary/40 hover:text-primary"
                              )}
                              title={t('draft.addMealsButton')}
                            >
                              {isItemAdded ? (
                                <span className="flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{t('toasts.saved')}</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Plus className="w-3.5 h-3.5 text-primary" />
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
            <div className="pt-4 border-t border-border flex flex-col gap-3">
              <Button
                onClick={handleAddAllToDraft}
                disabled={items.length === 0 || allAdded}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-[0.98]"
              >
                {allAdded ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>{t('history.restoredSuccess')}</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 fill-current" />
                    <span>{t('history.restoreToDraft')} ({items.length})</span>
                  </>
                )}
              </Button>

              {isConfirmingDelete ? (
                <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-2 text-destructive text-xs font-semibold">
                    <CircleAlert className="w-4 h-4 shrink-0" />
                    <span>{t('history.deleteHistoryConfirm')}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      onClick={handleDeleteList}
                      disabled={isDeleting}
                      size="sm"
                      className="flex-1 h-9 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold text-xs cursor-pointer"
                    >
                      {isDeleting ? t('common.loading') : t('dialogs.confirmDelete.confirmButton')}
                    </Button>
                    <Button
                      onClick={() => setIsConfirmingDelete(false)}
                      disabled={isDeleting}
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 text-xs cursor-pointer"
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsConfirmingDelete(true)}
                  className="text-xs text-muted-foreground hover:text-destructive flex items-center justify-center gap-1.5 py-1 transition-colors cursor-pointer self-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('history.deleteHistoryConfirm')}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
