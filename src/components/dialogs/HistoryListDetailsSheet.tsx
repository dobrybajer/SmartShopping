import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { shoppingListService } from '@/services/shoppingListService'
import type { ShoppingList, ActiveListWithDetails, ActiveListItemWithProduct } from '@/services/shoppingListService'
import { useShoppingStore } from '@/store/useShoppingStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import type { AddToDraftPayload } from '@/store/useShoppingStore'
import { groupItemsByAisle } from '@/lib/calculations/categorySorting'
import type { AisleGroup } from '@/lib/calculations/categorySorting'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import { useTranslation } from '@/i18n'
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
import { HistoryStatusBadge } from '@/components/ui/HistoryStatusBadge'
import {
  Calendar,
  Edit2,
  Check,
  X,
  Trash2,
  ShoppingCart,
  Plus,
  PackageCheck,
  Clock
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
  const { household } = useAuth()
  const { addItemToDraft, addMultipleToDraft } = useShoppingStore()
  const { categoriesByHousehold, loadCategories } = useCategoryStore()
  const { t, formatQuantity, formatDate, formatTime } = useTranslation()

  const [listDetails, setListDetails] = useState<ActiveListWithDetails | null>(null)
  const [loading, setLoading] = useState(false)

  // Edit name state
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)

  // Delete confirm state via ConfirmDeleteDialog
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Added items visual feedback state
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({})
  const [allAdded, setAllAdded] = useState(false)

  useEffect(() => {
    if (open && list) {
      const targetHh = list.household_id || household?.id || null
      loadCategories(targetHh)
      const completedDate = list.completed_at || list.updated_at || list.created_at || list.target_date || new Date()
      setEditedName(list.name || `${t('history.archivedList')} ${formatDate(completedDate)}`)
      setIsEditingName(false)
      setIsDeleteModalOpen(false)
      setAllAdded(false)
      setAddedItemIds({})

      // Load full items details
      setLoading(true)
      let isMounted = true
      shoppingListService.getListWithDetails(list.id).then((details) => {
        if (!isMounted) return
        setListDetails(details)
        setLoading(false)
      })

      return () => {
        isMounted = false
      }
    } else {
      setListDetails(null)
    }
  }, [open, list, household?.id, t, formatDate, loadCategories])

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
      const origName = list.original_name || list.name
      const updated: ShoppingList = { ...list, name: editedName.trim(), original_name: origName }
      if (listDetails) {
        setListDetails({ ...listDetails, name: editedName.trim(), original_name: origName })
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
      setIsDeleteModalOpen(false)
      onOpenChange(false)
    }
  }

  const householdKey = list.household_id || household?.id || 'global'
  const resolvedCategories =
    categoriesByHousehold[householdKey] ||
    (list.household_id ? categoriesByHousehold[list.household_id] : undefined) ||
    (household?.id ? categoriesByHousehold[household.id] : undefined) ||
    categoriesByHousehold['global'] ||
    []

  const mapItemToDraftPayload = (
    item: ActiveListItemWithProduct,
    group?: AisleGroup<ActiveListItemWithProduct>
  ): AddToDraftPayload => {
    const selectedCatId =
      item.category_id ??
      group?.categoryId ??
      item.category?.id ??
      item.product?.category_id ??
      item.product?.category?.id ??
      undefined

    const resolvedCat = selectedCatId ? resolvedCategories.find((c) => c.id === selectedCatId) : undefined

    const resolvedCatName =
      resolvedCat?.custom_name ||
      resolvedCat?.name ||
      (group?.name && group.name !== 'other' ? group.name : undefined) ||
      item.category?.name ||
      item.product?.category?.name ||
      'other'

    const resolvedSortOrder =
      resolvedCat?.sort_order ??
      (group?.sort_order && group.sort_order !== 99999 ? group.sort_order : undefined) ??
      (item.category?.sort_order ? item.category.sort_order * 10 : undefined) ??
      (item.product?.category?.sort_order ? item.product.category.sort_order * 10 : undefined) ??
      99

    const prodId = item.product?.id || item.product_id || undefined

    return {
      product_id: prodId,
      name: item.product?.name || item.ad_hoc_name || 'Product',
      unit_type: (item.product?.unit_type as any) || 'pcs',
      category_id: selectedCatId,
      category_name: resolvedCatName,
      sort_order: resolvedSortOrder,
      quantity: item.total_quantity,
      is_ad_hoc: !prodId || !!item.added_ad_hoc,
      meal_source: `${t('history.archivedList')}: ${listDetails?.name || list.name || t('navigation.history')}`
    }
  }

  const handleAddSingleItemToDraft = (
    item: ActiveListItemWithProduct,
    group?: AisleGroup<ActiveListItemWithProduct>
  ) => {
    const payload = mapItemToDraftPayload(item, group)
    addItemToDraft(payload)

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(25)
      } catch {
        // Ignore
      }
    }

    setAddedItemIds((prev) => ({ ...prev, [item.id]: true }))
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [item.id]: false }))
    }, 1500)
  }

  const items = listDetails?.items || []
  const checkedCount = items.filter((i) => i.is_checked).length
  const totalCount = items.length

  const getCategoryLabel = (catName: string) => {
    return t(`categories.${catName}` as any) !== `categories.${catName}`
      ? t(`categories.${catName}` as any)
      : catName
  }

  // Group items by category using aisle hierarchy and item.category_id override
  const sortedCategories = groupItemsByAisle(items, resolvedCategories, 'other')

  const handleAddAllToDraft = () => {
    if (!listDetails || !listDetails.items || listDetails.items.length === 0) return

    const payloads: AddToDraftPayload[] = []
    if (sortedCategories && sortedCategories.length > 0) {
      for (const group of sortedCategories) {
        for (const item of group.items) {
          payloads.push(mapItemToDraftPayload(item, group))
        }
      }
    } else {
      listDetails.items.forEach((item) => payloads.push(mapItemToDraftPayload(item)))
    }

    if (payloads.length === 0) return

    addMultipleToDraft(payloads)

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([40, 60, 40])
      } catch {
        // Ignore
      }
    }

    setAllAdded(true)
    setTimeout(() => {
      setAllAdded(false)
      onOpenChange(false)
    }, 1000)
  }

  const completedDate = list.completed_at || list.updated_at || list.created_at || list.target_date || new Date()
  const formattedCompletedDate = formatDate(completedDate)
  const formattedCompletedTime = formatTime(completedDate)
  const formattedCreatedDate = list.created_at ? formatDate(list.created_at) : null
  const formattedCreatedTime = list.created_at ? formatTime(list.created_at) : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] flex flex-col overflow-hidden p-0 gap-0 bg-card border-t border-border text-foreground">
        {/* Header */}
        <SheetHeader className="p-4 pb-3 border-b border-border shrink-0 text-left">
          <div className="flex flex-col gap-2">
            {/* Title & Edit */}
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
                    className="h-9 bg-background border-input text-sm font-bold text-foreground"
                    placeholder={t('draft.listNamePlaceholder')}
                  />
                  <Button
                    onClick={handleSaveName}
                    disabled={isSavingName}
                    size="sm"
                    className="h-9 w-9 p-0 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 cursor-pointer"
                    title={t('common.save')}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => setIsEditingName(false)}
                    disabled={isSavingName}
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                    title={t('common.cancel')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5 group flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <SheetTitle className="text-base font-bold text-foreground truncate">
                      {list.name || `${t('history.archivedList')} ${formattedCompletedDate}`}
                    </SheetTitle>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-muted-foreground hover:text-primary p-1 transition-colors rounded-md hover:bg-muted shrink-0 cursor-pointer"
                      title={t('common.edit')}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {list.original_name && list.name && list.original_name.trim() !== list.name.trim() && (
                    <span className="text-xs text-muted-foreground font-mono truncate">
                      {list.original_name}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Meta Details: Dates & Status (Vertical Order) */}
            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              {/* Completed Date & Time (Non-breaking, always 1 line) */}
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap" title={t('history.completedAt')}>
                <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{t('history.completedAt')}: {formattedCompletedDate}</span>
                {formattedCompletedTime && (
                  <span>({formattedCompletedTime})</span>
                )}
              </div>

              {/* Created Date & Time (Non-breaking, always 1 line) */}
              {formattedCreatedDate && (
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground/80 whitespace-nowrap" title={t('history.createdAt')}>
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>{t('history.createdAt')}: {formattedCreatedDate}</span>
                  {formattedCreatedTime && (
                    <span>({formattedCreatedTime})</span>
                  )}
                </div>
              )}

              {/* Status & Items Bought Ratio (1 line if fits, wrap if not) */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <HistoryStatusBadge items={items} />
                {totalCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-mono py-0.5 whitespace-nowrap">
                    {t('history.itemsBoughtRatio', { bought: checkedCount, total: totalCount })}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <SheetDescription className="sr-only">{t('history.viewDetails')}</SheetDescription>
        </SheetHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center bg-muted/20 border border-dashed border-border rounded-2xl p-6">
              <PackageCheck className="w-10 h-10 text-muted-foreground mb-2" />
              <p className="text-xs font-bold text-foreground">{t('history.emptyTitle')}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t('history.emptySubtitle')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {sortedCategories.map((group) => (
                <div key={group.categoryId ?? `group_${group.name}`} className="flex flex-col gap-2">
                  <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider px-1 flex items-center justify-between">
                    <span>{group.sort_order !== 99999 ? `${group.sort_order / 10 || 1}. ${getCategoryLabel(group.name)}` : getCategoryLabel(group.name)}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {formatQuantity(group.items.length, 'pcs')}
                    </span>
                  </h4>

                  <div className="flex flex-col gap-1.5">
                    {group.items.map((item) => {
                      const name = item.product?.name || item.ad_hoc_name || 'Product'
                      const unit = item.product?.unit_type || 'pcs'
                      const isItemAdded = addedItemIds[item.id]

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "p-3 rounded-xl bg-card border flex items-center justify-between transition-all",
                            item.is_checked ? "border-border/60 bg-card/70" : "border-border"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div
                              className={cn(
                                "w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px]",
                                item.is_checked
                                  ? "bg-primary/20 text-primary border border-primary/30"
                                  : "bg-muted text-muted-foreground border border-border"
                              )}
                            >
                              {item.is_checked ? <Check className="w-2.5 h-2.5" /> : null}
                            </div>

                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-xs text-foreground truncate">
                                {name}
                              </span>
                              {item.added_ad_hoc && (
                                <span className="text-[9px] text-muted-foreground font-mono">{t('draft.adHocItem')}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-xs text-primary font-bold bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg">
                              {formatQuantity(item.total_quantity, unit)}
                            </span>

                            <Button
                              onClick={() => handleAddSingleItemToDraft(item, group)}
                              size="sm"
                              variant="outline"
                              className={cn(
                                "h-8 px-2.5 text-xs rounded-lg border transition-all cursor-pointer",
                                isItemAdded
                                  ? "bg-primary text-primary-foreground border-primary font-bold"
                                  : "bg-card hover:bg-muted text-foreground border-border hover:border-primary/40 hover:text-primary"
                              )}
                              title={t('history.restoreToDraft')}
                            >
                              {isItemAdded ? (
                                <span className="flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  <span className="text-[10px]">{t('toasts.saved')}</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Plus className="w-3.5 h-3.5 text-primary" />
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
        </div>

        {/* Footer Actions */}
        <SheetFooter className="p-4 pt-3 border-t border-border bg-card/90 shrink-0">
          <div className="grid grid-cols-2 gap-3 w-full">
            <Button
              onClick={handleAddAllToDraft}
              disabled={items.length === 0 || allAdded}
              className="h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all text-xs cursor-pointer"
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
              className="h-11 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all text-xs cursor-pointer"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span className="truncate">{t('history.deleteList')}</span>
            </Button>
          </div>

          <ConfirmDeleteDialog
            open={isDeleteModalOpen}
            onOpenChange={setIsDeleteModalOpen}
            title={t('activeList.deleteListTitle')}
            itemName={list.name || t('history.archivedList')}
            onConfirm={handleDeleteList}
            isDeleting={isDeleting}
          />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
