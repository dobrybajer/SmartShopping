import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useShoppingStore } from '@/store/useShoppingStore'
import { useTranslation } from '@/i18n'
import { shoppingListService } from '@/services/shoppingListService'
import type { ActiveListWithDetails, ActiveListItemWithProduct } from '@/services/shoppingListService'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import { CheckCircle2, Calendar, Radio, Archive, ShoppingCart, Plus, Minus } from 'lucide-react'
import { cn, getNextQuantity } from '@/lib/utils'
import { useActiveListRealtime } from '@/hooks/useActiveListRealtime'

export const ActiveListView: React.FC = () => {
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

  const loadActiveList = React.useCallback(async () => {
    if (!household) return
    setLoading(true)
    const list = await shoppingListService.getActiveList(household.id)
    setActiveList(list)
    setLoading(false)
  }, [household])

  useEffect(() => {
    loadActiveList()
  }, [loadActiveList])

  // Realtime subscription
  useActiveListRealtime(activeList?.id || null, () => {
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

    // 2. Async backend update
    const success = await shoppingListService.toggleItemChecked(itemId, !currentStatus)

    // 3. Rollback on failure
    if (!success) {
      setActiveList({ ...activeList, items: previousItems })
    }
  }

  const handleIncrease = async (item: ActiveListItemWithProduct) => {
    if (!activeList) return
    const newQty = getNextQuantity(item.total_quantity, item.product?.unit_type, 'increase')

    // Optimistic UI update
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

    // Optimistic UI update
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
      <div className="py-16 flex flex-col items-center justify-center text-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  if (!activeList || activeList.items.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground mb-3">
          <ShoppingCart className="w-7 h-7" />
        </div>
        <p className="text-sm font-bold text-foreground">{t('activeList.emptyTitle')}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
          {t('activeList.emptySubtitle')}
        </p>
      </div>
    )
  }

  const checkedCount = activeList.items.filter((i) => i.is_checked).length
  const totalCount = activeList.items.length

  // Group by category sort_order
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
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Realtime Status Banner */}
      <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
          <span className="text-xs text-foreground font-semibold flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-primary" />
            <span>{t('activeList.title')} ({t('activeList.realtimeSync')})</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDate(activeList.target_date || activeList.created_at || new Date())}</span>
          <Badge variant="default" className="text-[10px] ml-1">
            {checkedCount} / {totalCount}
          </Badge>
        </div>
      </div>

      {/* Sorted Category Groups */}
      <div className="flex flex-col gap-5 mt-1">
        {sortedCategories.map((group) => (
          <div key={group.name} className="flex flex-col gap-2">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider px-1 flex items-center justify-between">
              <span>{group.sort_order !== 99 ? `${group.sort_order}. ${getCategoryLabel(group.name)}` : getCategoryLabel(group.name)}</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {group.items.filter((i) => i.is_checked).length}/{group.items.length}
              </span>
            </h4>

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
                      "p-3.5 rounded-xl bg-card border border-border/80 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] gap-3",
                      isChecked && "bg-card/40 border-border/40 opacity-55"
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
                            "font-semibold text-sm transition-all truncate",
                            isChecked ? "line-through text-muted-foreground" : "text-foreground"
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
                      className="flex items-center bg-background border border-border rounded-lg p-0.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDecrease(item)
                        }}
                        disabled={isChecked}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        title={t('common.decrease')}
                        aria-label={t('common.decrease')}
                      >
                        <Minus className="w-3.5 h-3.5" />
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
                            "font-mono text-xs px-2 py-0.5 font-bold min-w-[3.5rem] text-center select-none transition-colors rounded",
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
                        className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        title={t('common.increase')}
                        aria-label={t('common.increase')}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
          <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 text-center flex items-center justify-center gap-2 text-primary text-xs font-bold animate-bounce">
            <CheckCircle2 className="w-4 h-4" />
            <span>{t('activeList.allPurchased')}</span>
          </div>
        )}

        <Button
          onClick={handleArchiveList}
          disabled={isArchiving}
          className="w-full h-12 bg-card hover:bg-muted text-foreground border border-border font-bold rounded-xl flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
        >
          {isArchiving ? (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Archive className="w-4 h-4 text-primary" />
              <span>{t('activeList.archiveButton')}</span>
            </>
          )}
        </Button>
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
