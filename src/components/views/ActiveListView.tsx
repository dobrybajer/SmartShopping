import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useShoppingStore } from '@/store/useShoppingStore'
import { useTranslation } from '@/i18n'
import { shoppingListService } from '@/services/shoppingListService'
import type {
  ActiveListWithDetails,
  ActiveListItemWithProduct
} from '@/services/shoppingListService'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import { CreateActiveListDialog } from '@/components/dialogs/CreateActiveListDialog'
import { RenameActiveListDialog } from '@/components/dialogs/RenameActiveListDialog'
import {
  CheckCircle2,
  Calendar,
  Radio,
  Archive,
  ShoppingCart,
  Plus,
  Minus,
  Star,
  MoreVertical,
  Edit2,
  Trash2,
  Package
} from 'lucide-react'
import { cn, getNextQuantity } from '@/lib/utils'
import { useActiveListRealtime } from '@/hooks/useActiveListRealtime'
import {
  sortActiveLists,
  findDefaultOrFirstListId
} from '@/lib/calculations/activeListCalculations'

export const ActiveListView: React.FC = () => {
  const { household } = useAuth()
  const {
    setDraftItems,
    draftItems,
    setSelectedActiveListId,
    activeListsSummary,
    setActiveListsSummary
  } = useShoppingStore()
  const { t, formatUnit, formatQuantity, formatDate } = useTranslation()

  const [activeList, setActiveList] = useState<ActiveListWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ActiveListItemWithProduct | null>(null)
  const [isDeleteItemModalOpen, setIsDeleteItemModalOpen] = useState(false)
  const [isDeleteListModalOpen, setIsDeleteListModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isNewListOpen, setIsNewListOpen] = useState(false)
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)

  const householdId = household?.id

  // 1. Fetch active lists summaries and determine selected list
  const loadActiveLists = useCallback(async (listIdToSelect?: string) => {
    if (!householdId) return
    const summaries = await shoppingListService.getActiveListsSummary(householdId)
    const sorted = sortActiveLists(summaries)
    setActiveListsSummary(sorted)

    if (sorted.length === 0) {
      setActiveList(null)
      setSelectedActiveListId(null)
      setLoading(false)
      return
    }

    const currentSelectedId = listIdToSelect || useShoppingStore.getState().selectedActiveListId
    const targetId =
      sorted.find((l) => l.id === currentSelectedId)?.id ||
      findDefaultOrFirstListId(sorted)

    if (targetId) {
      setSelectedActiveListId(targetId)
      const details = await shoppingListService.getListWithDetails(targetId)
      setActiveList(details)
    } else {
      setActiveList(null)
    }

    setLoading(false)
  }, [householdId, setSelectedActiveListId, setActiveListsSummary])

  // 2. Initial load
  useEffect(() => {
    loadActiveLists()
  }, [loadActiveLists])

  // 3. Switch list details when selectedActiveListId changes
  const switchActiveList = async (listId: string) => {
    if (listId === activeList?.id) return
    setSelectedActiveListId(listId)
    setLoadingDetails(true)
    const details = await shoppingListService.getListWithDetails(listId)
    setActiveList(details)
    setLoadingDetails(false)
  }

  // 4. Realtime subscription (household & current list level)
  useActiveListRealtime(household?.id ?? null, activeList?.id ?? null, () => {
    if (household) {
      shoppingListService.getActiveListsSummary(household.id).then((summaries) => {
        const sorted = sortActiveLists(summaries)
        setActiveListsSummary(sorted)
        if (activeList?.id) {
          shoppingListService.getListWithDetails(activeList.id).then((fresh) => {
            if (fresh) setActiveList(fresh)
          })
        }
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
    } else if (household) {
      // Update summary badge
      shoppingListService.getActiveListsSummary(household.id).then(setActiveListsSummary)
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
      setIsDeleteItemModalOpen(true)
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

  const handleConfirmDeleteItem = async () => {
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
      setIsDeleteItemModalOpen(false)
      if (household) {
        shoppingListService.getActiveListsSummary(household.id).then(setActiveListsSummary)
      }
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

    // Refresh active lists and select next available list
    await loadActiveLists()
  }

  const handleDeleteList = async () => {
    if (!activeList || !household) return
    setIsDeleting(true)

    const success = await shoppingListService.deleteShoppingList(activeList.id)
    setIsDeleting(false)

    if (success) {
      setIsDeleteListModalOpen(false)
      setShowOptionsMenu(false)
      await loadActiveLists()
    }
  }

  const handleSetDefault = async () => {
    if (!activeList || !household) return
    const success = await shoppingListService.setDefaultActiveList(activeList.id, household.id)
    if (success) {
      setActiveList({ ...activeList, is_default: true })
      setShowOptionsMenu(false)
      if (household) {
        shoppingListService.getActiveListsSummary(household.id).then(setActiveListsSummary)
      }
    }
  }

  const handleListCreated = async (newListId: string) => {
    setSelectedActiveListId(newListId)
    await loadActiveLists()
  }

  const handleListRenamed = (newName: string) => {
    if (activeList) {
      setActiveList({ ...activeList, name: newName })
      if (household) {
        shoppingListService.getActiveListsSummary(household.id).then(setActiveListsSummary)
      }
    }
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

  // Empty state when no active lists exist
  if (!activeListsSummary || activeListsSummary.length === 0 || !activeList) {
    return (
      <div className="flex flex-col gap-4 animate-in fade-in duration-200">
        <div className="py-16 px-4 bg-card border border-border rounded-2xl flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center text-primary mb-3">
            <ShoppingCart className="w-7 h-7" />
          </div>
          <p className="text-base font-bold text-foreground">{t('activeList.noListsTitle')}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
            {t('activeList.noListsSubtitle')}
          </p>
          <Button
            onClick={() => setIsNewListOpen(true)}
            className="mt-5 h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('activeList.createFirstList')}</span>
          </Button>
        </div>

        <CreateActiveListDialog
          open={isNewListOpen}
          onOpenChange={setIsNewListOpen}
          onCreated={handleListCreated}
        />
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
    <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
      {/* 1. Horizontal Scrollable List Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {activeListsSummary.map((list) => {
          const isSelected = list.id === activeList.id
          return (
            <button
              key={list.id}
              onClick={() => switchActiveList(list.id)}
              className={cn(
                "h-9 px-3.5 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-2 border transition-all cursor-pointer select-none",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {list.is_default && (
                <Star
                  className={cn(
                    "w-3.5 h-3.5 shrink-0",
                    isSelected ? "text-amber-300 fill-amber-300" : "text-amber-400 fill-amber-400"
                  )}
                />
              )}
              <span className="truncate max-w-[130px]">{list.name}</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-mono",
                  isSelected
                    ? "bg-black/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {list.unchecked_items}
              </span>
            </button>
          )
        })}

        {/* Add New List Chip */}
        <button
          onClick={() => setIsNewListOpen(true)}
          className="h-9 px-3 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 border border-dashed border-border bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          title={t('activeList.newList')}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('activeList.newList')}</span>
        </button>
      </div>

      {/* 2. Active List Header Banner & Options Menu */}
      <div className="p-3.5 rounded-xl bg-card border border-border flex flex-col gap-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping shrink-0" />
            <h3 className="text-sm font-bold text-foreground truncate flex items-center gap-1.5">
              <span>{activeList.name}</span>
              {activeList.is_default && (
                <Badge variant="secondary" className="text-[10px] bg-amber-400/10 text-amber-400 border-amber-400/30 gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  <span>{t('activeList.defaultBadge')}</span>
                </Badge>
              )}
            </h3>
          </div>

          <div className="flex items-center gap-1 relative">
            <Badge variant="default" className="text-[10px] font-mono">
              {checkedCount} / {totalCount}
            </Badge>

            {/* List Options Dropdown Trigger */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOptionsMenu((prev) => !prev)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
              title={t('activeList.listOptions')}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>

            {/* Options Dropdown Menu */}
            {showOptionsMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowOptionsMenu(false)}
                />
                <div className="absolute right-0 top-9 z-50 w-48 bg-card border border-border rounded-xl shadow-xl p-1.5 flex flex-col gap-1 text-xs text-foreground animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    onClick={() => {
                      setShowOptionsMenu(false)
                      setIsRenameOpen(true)
                    }}
                    className="w-full px-2.5 py-2 rounded-lg hover:bg-muted flex items-center gap-2 text-left cursor-pointer transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{t('activeList.renameList')}</span>
                  </button>

                  {!activeList.is_default && (
                    <button
                      onClick={handleSetDefault}
                      className="w-full px-2.5 py-2 rounded-lg hover:bg-muted flex items-center gap-2 text-left cursor-pointer transition-colors"
                    >
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t('activeList.setAsDefault')}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowOptionsMenu(false)
                      handleArchiveList()
                    }}
                    className="w-full px-2.5 py-2 rounded-lg hover:bg-muted flex items-center gap-2 text-left cursor-pointer transition-colors"
                  >
                    <Archive className="w-3.5 h-3.5 text-primary" />
                    <span>{t('activeList.archiveList')}</span>
                  </button>

                  <div className="h-px bg-border my-0.5" />

                  <button
                    onClick={() => {
                      setShowOptionsMenu(false)
                      setIsDeleteListModalOpen(true)
                    }}
                    className="w-full px-2.5 py-2 rounded-lg hover:bg-destructive/10 text-destructive flex items-center gap-2 text-left cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    <span>{t('activeList.deleteList')}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono pt-1 border-t border-border/60">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-sans">{t('activeList.realtimeSync')}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(activeList.target_date || activeList.created_at || new Date())}</span>
          </div>
        </div>
      </div>

      {loadingDetails ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : activeList.items.length === 0 ? (
        <div className="py-12 px-4 bg-card/60 border border-dashed border-border rounded-2xl text-center flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-muted/80 border border-border flex items-center justify-center text-muted-foreground mb-2.5">
            <Package className="w-5 h-5" />
          </div>
          <p className="text-sm font-bold text-foreground">{t('activeList.emptyTitle')}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
            {t('activeList.emptySubtitle')}
          </p>
        </div>
      ) : (
        /* Sorted Category Groups */
        <div className="flex flex-col gap-5 mt-1">
          {sortedCategories.map((group) => (
            <div key={group.name} className="flex flex-col gap-2">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider px-1 flex items-center justify-between">
                <span>
                  {group.sort_order !== 99
                    ? `${group.sort_order}. ${getCategoryLabel(group.name)}`
                    : getCategoryLabel(group.name)}
                </span>
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
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {t('draft.adHocItem')}
                            </span>
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
      )}

      {/* Complete & Archive CTA */}
      {activeList.items.length > 0 && (
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
      )}

      {/* Dialogs */}
      <CreateActiveListDialog
        open={isNewListOpen}
        onOpenChange={setIsNewListOpen}
        onCreated={handleListCreated}
      />

      <RenameActiveListDialog
        open={isRenameOpen}
        onOpenChange={setIsRenameOpen}
        listId={activeList.id}
        currentName={activeList.name || ''}
        onRenamed={handleListRenamed}
      />

      <ConfirmDeleteDialog
        open={isDeleteItemModalOpen}
        onOpenChange={setIsDeleteItemModalOpen}
        itemName={itemToDelete?.product?.name || itemToDelete?.ad_hoc_name}
        onConfirm={handleConfirmDeleteItem}
        isDeleting={isDeleting}
      />

      <ConfirmDeleteDialog
        open={isDeleteListModalOpen}
        onOpenChange={setIsDeleteListModalOpen}
        title={t('activeList.deleteListTitle')}
        itemName={activeList.name || ''}
        onConfirm={handleDeleteList}
        isDeleting={isDeleting}
      />
    </div>
  )
}
