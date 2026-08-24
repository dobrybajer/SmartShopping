import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useShoppingStore } from '@/store/useShoppingStore'
import { useTranslation } from '@/i18n'
import { shoppingListService } from '@/services/shoppingListService'
import type { ActiveListWithDetails, ActiveListItemWithProduct } from '@/services/shoppingListService'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import {
  Calendar,
  Radio,
  Archive,
  ShoppingCart,
  Plus,
  Minus,
  CheckCheck,
  Package
} from 'lucide-react'
import { cn, getNextQuantity } from '@/lib/utils'
import { useActiveListRealtime } from '@/hooks/useActiveListRealtime'

export const DesktopActiveListView: React.FC = () => {
  const { household } = useAuth()
  const { setDraftItems, draftItems } = useShoppingStore()
  const { t, formatUnit, formatQuantity, formatDate } = useTranslation()
  const [activeList, setActiveList] = useState<ActiveListWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [isArchiving, setIsArchiving] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ActiveListItemWithProduct | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  const loadActiveList = useCallback(async () => {
    if (!household) return
    setLoading(true)
    const list = await shoppingListService.getActiveList(household.id)
    setActiveList(list)
    setLoading(false)
  }, [household])

  useEffect(() => {
    loadActiveList()
  }, [loadActiveList])

  // Realtime Supabase listener
  useActiveListRealtime(activeList?.id || null, () => {
    if (household && activeList?.id) {
      shoppingListService.getActiveList(household.id).then((freshList) => {
        if (freshList) setActiveList(freshList)
      })
    }
  })

  const handleToggleCheck = async (itemId: string, currentStatus: boolean) => {
    if (!activeList) return

    // Optimistic UI update
    const previousItems = activeList.items
    const updatedItems = activeList.items.map((item) =>
      item.id === itemId ? { ...item, is_checked: !currentStatus } : item
    )
    setActiveList({ ...activeList, items: updatedItems })

    const success = await shoppingListService.toggleItemChecked(itemId, !currentStatus)
    if (!success) {
      setActiveList({ ...activeList, items: previousItems })
    }
  }

  const handleIncrease = async (item: ActiveListItemWithProduct) => {
    if (!activeList) return
    const newQty = getNextQuantity(item.total_quantity, item.product?.unit_type, 'increase')

    const previousItems = activeList.items
    const updatedItems = activeList.items.map((i) =>
      i.id === item.id ? { ...i, total_quantity: newQty } : i
    )
    setActiveList({ ...activeList, items: updatedItems })

    const success = await shoppingListService.updateItemQuantity(item.id, newQty)
    if (!success) {
      setActiveList({ ...activeList, items: previousItems })
    }
  }

  const handleDecrease = async (item: ActiveListItemWithProduct) => {
    if (!activeList) return
    const newQty = getNextQuantity(item.total_quantity, item.product?.unit_type, 'decrease')

    if (newQty <= 0) {
      setItemToDelete(item)
      setIsDeleteModalOpen(true)
      return
    }

    const previousItems = activeList.items
    const updatedItems = activeList.items.map((i) =>
      i.id === item.id ? { ...i, total_quantity: newQty } : i
    )
    setActiveList({ ...activeList, items: updatedItems })

    const success = await shoppingListService.updateItemQuantity(item.id, newQty)
    if (!success) {
      setActiveList({ ...activeList, items: previousItems })
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

  const handleCommitEdit = async (item: ActiveListItemWithProduct) => {
    const parsed = parseInt(editValue, 10)
    setEditingId(null)
    setEditValue('')

    if (!isNaN(parsed) && parsed > 0 && parsed !== item.total_quantity && activeList) {
      const previousItems = activeList.items
      const updatedItems = activeList.items.map((i) =>
        i.id === item.id ? { ...i, total_quantity: parsed } : i
      )
      setActiveList({ ...activeList, items: updatedItems })

      const success = await shoppingListService.updateItemQuantity(item.id, parsed)
      if (!success) {
        setActiveList({ ...activeList, items: previousItems })
      }
    }
  }

  const handleConfirmDelete = async () => {
    if (!activeList || !itemToDelete) return
    setIsDeleting(true)

    const previousItems = activeList.items
    const updatedItems = activeList.items.filter((i) => i.id !== itemToDelete.id)
    setActiveList({ ...activeList, items: updatedItems })

    const success = await shoppingListService.deleteListItem(itemToDelete.id)
    setIsDeleting(false)

    if (!success) {
      setActiveList({ ...activeList, items: previousItems })
    } else {
      setItemToDelete(null)
      setIsDeleteModalOpen(false)
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
      setDraftItems([...draftItems, ...uncheckedItemsToDraft])
    }

    setActiveList(null)
  }

  const getCategoryLabel = (catName: string) => {
    return t(`categories.${catName}` as any) !== `categories.${catName}`
      ? t(`categories.${catName}` as any)
      : catName
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  if (!activeList || activeList.items.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center max-w-lg mx-auto bg-card border border-border rounded-3xl p-12 shadow-xl">
        <div className="w-20 h-20 rounded-3xl bg-background border border-border flex items-center justify-center text-muted-foreground mb-5 shadow-inner">
          <ShoppingCart className="w-10 h-10 stroke-[1.5]" />
        </div>
        <h3 className="text-xl font-extrabold text-foreground">{t('activeList.emptyTitle')}</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
          {t('activeList.emptySubtitle')}
        </p>
      </div>
    )
  }

  const checkedCount = activeList.items.filter((i) => i.is_checked).length
  const totalCount = activeList.items.length
  const percentage = Math.round((checkedCount / totalCount) * 100)

  // Group by category
  const categoryMap = new Map<string, { name: string; sort_order: number; items: typeof activeList.items }>()

  activeList.items.forEach((item) => {
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
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Top Status & Progress Bar Card */}
      <div className="p-6 rounded-3xl bg-card border border-border shadow-2xl flex flex-col gap-4 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-foreground">
                  {activeList.name || t('activeList.title')}
                </h3>
                <Badge variant="default" className="bg-primary/10 text-primary border border-primary/20 text-xs">
                  {t('activeList.realtimeSync')}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 font-mono">
                <Calendar className="w-3.5 h-3.5" />
                <span>{t('history.completedOn')}: {formatDate(activeList.target_date || activeList.created_at || new Date())}</span>
              </p>
            </div>
          </div>

          {/* Progress summary & Archive trigger */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground font-mono">
                {t('history.itemsBoughtRatio', { bought: checkedCount, total: totalCount })} ({percentage}%)
              </span>
            </div>

            <Button
              onClick={handleArchiveList}
              disabled={isArchiving}
              className="h-11 px-5 bg-card hover:bg-muted text-foreground border border-border font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              {isArchiving ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Archive className="w-4 h-4 text-primary" />
                  <span>{t('activeList.archiveButton')}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-background rounded-full h-2.5 overflow-hidden border border-border">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Completion celebratory state */}
      {checkedCount === totalCount && (
        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30 text-center flex items-center justify-center gap-3 text-primary text-sm font-extrabold shadow-lg animate-in zoom-in-95 duration-300">
          <CheckCheck className="w-5 h-5 text-primary stroke-[3]" />
          <span>{t('activeList.allPurchased')}</span>
        </div>
      )}

      {/* 2-Column Responsive Category Board */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {sortedCategories.map((group) => {
          const groupChecked = group.items.filter((i) => i.is_checked).length
          const isGroupComplete = groupChecked === group.items.length

          return (
            <div
              key={group.name}
              className={cn(
                "p-5 rounded-3xl bg-card border transition-all duration-200 flex flex-col gap-3 shadow-md",
                isGroupComplete
                  ? "border-primary/40 bg-gradient-to-b from-primary/5 to-card"
                  : "border-border"
              )}
            >
              {/* Category Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <h4 className="font-extrabold text-sm text-foreground tracking-tight">
                    {group.sort_order !== 99 ? `${group.sort_order}. ${getCategoryLabel(group.name)}` : getCategoryLabel(group.name)}
                  </h4>
                </div>

                <span
                  className={cn(
                    "text-xs font-mono px-2 py-0.5 rounded-full border font-bold",
                    isGroupComplete
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-background text-muted-foreground border-border"
                  )}
                >
                  {groupChecked} / {group.items.length}
                </span>
              </div>

              {/* Items in this category */}
              <div className="flex flex-col gap-2">
                {group.items.map((item) => {
                  const isChecked = !!item.is_checked
                  const name = item.product?.name || item.ad_hoc_name || 'Product'
                  const unit = item.product?.unit_type || 'pcs'

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleCheck(item.id, isChecked)}
                      className={cn(
                        "p-3.5 rounded-2xl bg-background/60 border transition-all flex items-center justify-between gap-3 cursor-pointer group hover:bg-muted/50",
                        isChecked
                          ? "bg-card/40 border-border/60 opacity-50"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleToggleCheck(item.id, isChecked)}
                          enableHaptics
                        />

                        <div className="flex flex-col min-w-0">
                          <span
                            className={cn(
                              "font-bold text-sm transition-all truncate",
                              isChecked ? "line-through text-muted-foreground" : "text-foreground group-hover:text-foreground"
                            )}
                          >
                            {name}
                          </span>
                          {item.added_ad_hoc && (
                            <span className="text-[10px] text-muted-foreground font-mono">{t('draft.adHocItem')}</span>
                          )}
                        </div>
                      </div>

                      {/* Stepper +/- */}
                      <div
                        className="flex items-center bg-card border border-border rounded-xl p-0.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDecrease(item)
                          }}
                          disabled={isChecked}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                          title={t('common.decrease')}
                          aria-label={t('common.decrease')}
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        {editingId === item.id && !isChecked ? (
                          <div className="flex items-center gap-1 px-1" onClick={(e) => e.stopPropagation()}>
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
                                  handleCommitEdit(item)
                                } else if (e.key === 'Escape') {
                                  setEditingId(null)
                                  setEditValue('')
                                }
                              }}
                              onBlur={() => handleCommitEdit(item)}
                              className="w-14 h-7 bg-background text-center font-mono text-xs font-bold text-primary border border-primary/60 rounded px-1 outline-none ring-1 ring-primary/40 shadow-inner"
                            />
                            <span className="font-mono text-xs text-primary font-bold pr-1 select-none">
                              {formatUnit(unit)}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isChecked}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!isChecked) {
                                startEditing(item.id, item.total_quantity)
                              }
                            }}
                            className={cn(
                              "font-mono text-xs px-2.5 py-0.5 font-bold min-w-[3.5rem] text-center select-none transition-colors rounded-md",
                              isChecked
                                ? "text-muted-foreground line-through cursor-default"
                                : "text-primary hover:bg-muted cursor-text"
                            )}
                            title={isChecked ? undefined : t('common.edit')}
                          >
                            {formatQuantity(item.total_quantity, unit)}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleIncrease(item)
                          }}
                          disabled={isChecked}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                          title={t('common.increase')}
                          aria-label={t('common.increase')}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        itemName={itemToDelete?.product?.name || itemToDelete?.ad_hoc_name}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  )
}
