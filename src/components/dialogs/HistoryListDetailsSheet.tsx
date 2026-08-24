import React, { useState, useEffect } from 'react'
import { shoppingListService } from '@/services/shoppingListService'
import type { ShoppingList, ActiveListWithDetails, ActiveListItemWithProduct } from '@/services/shoppingListService'
import { useShoppingStore } from '@/store/useShoppingStore'
import type { AddToDraftPayload } from '@/store/useShoppingStore'
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
  const { t, formatQuantity, formatDate } = useTranslation()

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
      setEditedName(list.name || `${t('history.archivedList')} ${formatDate(list.target_date || list.created_at || new Date())}`)
      setIsEditingName(false)
      setIsConfirmingDelete(false)
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
  }, [open, list, t, formatDate])

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
      name: item.product?.name || 'Product',
      unit_type: (item.product?.unit_type as any) || 'pcs',
      category_id: item.product?.category_id || undefined,
      category_name: item.product?.category?.name || 'other',
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
        // Ignore
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
        // Ignore
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

  const getCategoryLabel = (catName: string) => {
    return t(`categories.${catName}` as any) !== `categories.${catName}`
      ? t(`categories.${catName}` as any)
      : catName
  }

  // Group by category
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

  const formattedDate = formatDate(list.target_date || list.created_at || new Date())

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] flex flex-col overflow-hidden p-0 gap-0 bg-card border-t border-border text-foreground">
        {/* Header */}
        <SheetHeader className="p-4 pb-3 border-b border-border shrink-0">
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
                <div className="flex items-center gap-2 group flex-1 min-w-0">
                  <SheetTitle className="text-base font-bold text-foreground truncate">
                    {list.name || `${t('history.archivedList')} ${formattedDate}`}
                  </SheetTitle>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-muted-foreground hover:text-primary p-1 transition-colors rounded-md hover:bg-muted shrink-0 cursor-pointer"
                    title={t('common.edit')}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Date & Status */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{formattedDate}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Badge variant="default" className="text-[10px] bg-primary/10 text-primary border border-primary/20 py-0.5">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {t('history.completedOn')}
                </Badge>
                {totalCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-mono py-0.5">
                    {t('history.itemsBoughtRatio', { bought: checkedCount, total: totalCount })}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <SheetDescription className="sr-only">{t('history.viewDetails')}</SheetDescription>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground mb-2">
                <PackageCheck className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">{t('history.emptyTitle')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('history.emptySubtitle')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {sortedCategories.map((group) => (
                <div key={group.name} className="flex flex-col gap-2">
                  <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider px-1 flex items-center justify-between">
                    <span>{group.sort_order !== 99 ? `${group.sort_order}. ${getCategoryLabel(group.name)}` : getCategoryLabel(group.name)}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {formatQuantity(group.items.length, 'pcs')}
                    </span>
                  </h4>

                  <div className="flex flex-col gap-1.5">
                    {group.items.map((item) => {
                      const name = item.product?.name || 'Product'
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
                              onClick={() => handleAddSingleItemToDraft(item)}
                              size="sm"
                              variant="outline"
                              className={cn(
                                "h-8 px-2.5 text-xs rounded-lg border transition-all cursor-pointer",
                                isItemAdded
                                  ? "bg-primary text-primary-foreground border-primary font-bold"
                                  : "bg-card hover:bg-muted text-foreground border-border hover:border-primary/40 hover:text-primary"
                              )}
                              title={t('draft.addMealsButton')}
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

          {/* Delete confirmation section */}
          {isConfirmingDelete ? (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150 mt-2">
              <div className="flex items-center gap-2 text-destructive text-xs font-semibold">
                <CircleAlert className="w-4 h-4 shrink-0" />
                <span>{t('history.deleteHistoryConfirm')}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t('dialogs.confirmDelete.description')}
              </p>
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
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setIsConfirmingDelete(true)}
                className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('history.deleteHistoryConfirm')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <SheetFooter className="p-4 pt-3 border-t border-border bg-card/90 shrink-0">
          <Button
            onClick={handleAddAllToDraft}
            disabled={items.length === 0 || allAdded}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all text-sm cursor-pointer"
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
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
