import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useShoppingStore } from '@/store/useShoppingStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useTranslation } from '@/i18n'
import { shoppingListService } from '@/services/shoppingListService'
import type { ActiveListWithDetails, ActiveListItemWithProduct, HistoryShoppingList } from '@/services/shoppingListService'
import { groupItemsByAisle } from '@/lib/calculations/categorySorting'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HistoryStatusBadge } from '@/components/ui/HistoryStatusBadge'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import {
  Calendar,
  History,
  ShoppingCart,
  Check,
  Plus,
  Trash2,
  Edit2,
  X,
  ChevronRight,
  PackageCheck,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const DesktopHistoryView: React.FC = () => {
  const { household } = useAuth()
  const { addItemToDraft, addMultipleToDraft } = useShoppingStore()
  const { categoriesByHousehold, loadCategories } = useCategoryStore()
  const { t, formatQuantity, formatDate, formatTime } = useTranslation()

  const [historyLists, setHistoryLists] = useState<HistoryShoppingList[]>([])
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [listDetails, setListDetails] = useState<ActiveListWithDetails | null>(null)
  const [loadingLists, setLoadingLists] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)

  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({})
  const [allAdded, setAllAdded] = useState(false)

  const householdId = household?.id

  useEffect(() => {
    loadCategories(householdId)
  }, [householdId, loadCategories])

  const loadHistoryLists = useCallback(async (isInitial = false) => {
    if (!householdId) return
    if (isInitial) {
      setLoadingLists(true)
    }
    const lists = await shoppingListService.getHistoryLists(householdId)
    setHistoryLists(lists)
    setSelectedListId((prev) => {
      if (prev && lists.some((l) => l.id === prev)) return prev
      return lists[0]?.id || null
    })
    setLoadingLists(false)
  }, [householdId])

  useEffect(() => {
    loadHistoryLists(true)
  }, [loadHistoryLists])

  const loadDetails = useCallback(async (listId: string) => {
    setLoadingDetails(true)
    const data = await shoppingListService.getListWithDetails(listId)
    setListDetails(data)
    setEditedName(data?.name || '')
    setIsEditingName(false)
    setIsDeleteModalOpen(false)
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
      const currentList = historyLists.find((l) => l.id === selectedListId)
      const origName = currentList?.original_name || currentList?.name || null
      setListDetails((prev) => (prev ? { ...prev, name: editedName.trim(), original_name: prev.original_name || origName } : null))
      setHistoryLists((prev) =>
        prev.map((l) => (l.id === selectedListId ? { ...l, name: editedName.trim(), original_name: l.original_name || origName } : l))
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
      setIsDeleteModalOpen(false)
    }
  }

  const householdKey = household?.id || 'global'
  const resolvedCategories = categoriesByHousehold[householdKey] || []

  const handleAddSingleItemToDraft = (item: ActiveListItemWithProduct) => {
    const selectedCatId = item.category_id ?? item.category?.id ?? item.product?.category_id
    const resolvedCat = selectedCatId ? resolvedCategories.find((c) => c.id === selectedCatId) : undefined

    addItemToDraft({
      product_id: item.product_id || undefined,
      name: item.product?.name || item.ad_hoc_name || 'Product',
      quantity: item.total_quantity,
      unit_type: (item.product?.unit_type as any) || 'pcs',
      category_id: selectedCatId || undefined,
      category_name: resolvedCat?.custom_name || resolvedCat?.name || item.category?.name || item.product?.category?.name || 'other',
      sort_order: resolvedCat?.sort_order ?? item.category?.sort_order ?? item.product?.category?.sort_order ?? 99,
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

    const draftItems = listDetails.items.map((item) => {
      const selectedCatId = item.category_id ?? item.category?.id ?? item.product?.category_id
      const resolvedCat = selectedCatId ? resolvedCategories.find((c) => c.id === selectedCatId) : undefined
      return {
        product_id: item.product_id || undefined,
        name: item.product?.name || item.ad_hoc_name || 'Product',
        quantity: item.total_quantity,
        unit_type: (item.product?.unit_type as any) || 'pcs',
        category_id: selectedCatId || undefined,
        category_name: resolvedCat?.custom_name || resolvedCat?.name || item.category?.name || item.product?.category?.name || 'other',
        sort_order: resolvedCat?.sort_order ?? item.category?.sort_order ?? item.product?.category?.sort_order ?? 99,
        meal_source: `${t('history.archivedList')}: ${listDetails.name || t('navigation.history')}`,
        is_ad_hoc: !item.product_id
      }
    })

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

  // Group items by category using aisle hierarchy and item.category_id override
  const sortedCategories = groupItemsByAisle(items, resolvedCategories, 'other')

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
            const completedDate = list.completed_at || list.updated_at || list.created_at || list.target_date || new Date()
            const displayDate = formatDate(completedDate)
            const displayTime = formatTime(completedDate)
            const listTitle = list.name || `${t('history.archivedList')} ${displayDate}`
            const hasOriginalName = Boolean(list.original_name && list.name && list.original_name.trim() !== list.name.trim())

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
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <h4 className={cn("font-bold text-sm truncate", isSelected ? "text-primary" : "text-foreground group-hover:text-foreground")}>
                    {listTitle}
                  </h4>
                  {hasOriginalName && (
                    <span className="text-xs text-muted-foreground font-mono truncate">
                      {list.original_name}
                    </span>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-0.5">
                    <span className="flex items-center gap-1.5" title={t('history.completedAt')}>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{displayDate}</span>
                    </span>
                    {displayTime && (
                      <span className="flex items-center gap-1" title={t('history.completedAt')}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{displayTime}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <HistoryStatusBadge items={list.items} />

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
            {(() => {
              const completedDate = listDetails.completed_at || listDetails.updated_at || listDetails.created_at || listDetails.target_date || new Date()
              const completedFormattedDate = formatDate(completedDate)
              const completedFormattedTime = formatTime(completedDate)
              const createdFormattedDate = listDetails.created_at ? formatDate(listDetails.created_at) : null
              const createdFormattedTime = listDetails.created_at ? formatTime(listDetails.created_at) : null
              const hasOriginalName = Boolean(listDetails.original_name && listDetails.name && listDetails.original_name.trim() !== listDetails.name.trim())

              return (
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
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-extrabold text-lg text-foreground">
                            {listDetails.name || `${t('history.archivedList')} ${completedFormattedDate}`}
                          </h3>
                          <button
                            onClick={() => setIsEditingName(true)}
                            className="text-muted-foreground hover:text-primary p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                            title={t('common.edit')}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {hasOriginalName && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {listDetails.original_name}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <HistoryStatusBadge items={listDetails.items} className="text-xs py-1" />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground font-mono">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1.5" title={t('history.completedAt')}>
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span>{t('history.completedAt')}: {completedFormattedDate}</span>
                        {completedFormattedTime && (
                          <span className="text-muted-foreground">({completedFormattedTime})</span>
                        )}
                      </span>
                      {createdFormattedDate && (
                        <span className="flex items-center gap-1.5 text-muted-foreground/80" title={t('history.createdAt')}>
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{t('history.createdAt')}: {createdFormattedDate}</span>
                          {createdFormattedTime && (
                            <span>({createdFormattedTime})</span>
                          )}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0">
                      {t('history.itemsBoughtRatio', { bought: checkedCount, total: totalCount })}
                    </span>
                  </div>
                </div>
              )
            })()}

            {/* Categorized items container */}
            <div className="flex flex-col gap-5 max-h-[480px] overflow-y-auto pr-1">
              {sortedCategories.map((group) => (
                <div key={group.categoryId ?? `group_${group.name}`} className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider px-1 flex items-center justify-between">
                    <span>{group.sort_order !== 99999 ? `${group.sort_order / 10 || 1}. ${getCategoryLabel(group.name)}` : getCategoryLabel(group.name)}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {formatQuantity(group.items.length, 'pcs')}
                    </span>
                  </h4>

                  <div className="flex flex-col gap-2">
                    {group.items.map((item) => {
                      const name = item.product?.name || item.ad_hoc_name || 'Product'
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
            <div className="pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-3 w-full">
                <Button
                  onClick={handleAddAllToDraft}
                  disabled={items.length === 0 || allAdded}
                  className="h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-[0.98]"
                >
                  {allAdded ? (
                    <>
                      <Check className="w-4 h-4 shrink-0" />
                      <span className="truncate">{t('history.restoredSuccess')}</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 fill-current shrink-0" />
                      <span className="truncate">{t('history.restoreToDraft')} ({items.length})</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteModalOpen(true)}
                  disabled={isDeleting}
                  className="h-12 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-extrabold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-[0.98]"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t('history.deleteList')}</span>
                </Button>
              </div>

              <ConfirmDeleteDialog
                open={isDeleteModalOpen}
                onOpenChange={setIsDeleteModalOpen}
                title={t('activeList.deleteListTitle')}
                itemName={listDetails.name || t('history.archivedList')}
                onConfirm={handleDeleteList}
                isDeleting={isDeleting}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
