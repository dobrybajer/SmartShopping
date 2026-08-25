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
import { Input } from '@/components/ui/input'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import { CreateActiveListDialog } from '@/components/dialogs/CreateActiveListDialog'
import { RenameActiveListDialog } from '@/components/dialogs/RenameActiveListDialog'
import {
  Calendar,
  Radio,
  Archive,
  ShoppingCart,
  Plus,
  Minus,
  Package,
  Star,
  Search,
  Edit2,
  Trash2
} from 'lucide-react'
import { cn, getNextQuantity } from '@/lib/utils'
import { useActiveListRealtime } from '@/hooks/useActiveListRealtime'
import {
  sortActiveLists,
  findDefaultOrFirstListId
} from '@/lib/calculations/activeListCalculations'

export const DesktopActiveListView: React.FC = () => {
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
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

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

  // 3. Switch list details when tab clicked
  const switchActiveList = async (listId: string) => {
    if (listId === activeList?.id) return
    setSelectedActiveListId(listId)
    setLoadingDetails(true)
    const details = await shoppingListService.getListWithDetails(listId)
    setActiveList(details)
    setLoadingDetails(false)
  }

  // 4. Realtime subscription
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

    await loadActiveLists()
  }

  const handleDeleteList = async () => {
    if (!activeList || !household) return
    setIsDeleting(true)

    const success = await shoppingListService.deleteShoppingList(activeList.id)
    setIsDeleting(false)

    if (success) {
      setIsDeleteListModalOpen(false)
      await loadActiveLists()
    }
  }

  const handleSetDefault = async () => {
    if (!activeList || !household) return
    const success = await shoppingListService.setDefaultActiveList(activeList.id, household.id)
    if (success) {
      setActiveList({ ...activeList, is_default: true })
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
      <div className="py-24 flex flex-col items-center justify-center text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  // Empty state when no active lists exist
  if (!activeListsSummary || activeListsSummary.length === 0 || !activeList) {
    return (
      <div className="flex flex-col gap-6 max-w-5xl mx-auto py-8">
        <div className="py-20 px-6 bg-card border border-border rounded-3xl flex flex-col items-center justify-center text-center shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center text-primary mb-4">
            <ShoppingCart className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">{t('activeList.noListsTitle')}</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md leading-relaxed">
            {t('activeList.noListsSubtitle')}
          </p>
          <Button
            onClick={() => setIsNewListOpen(true)}
            className="mt-6 h-11 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center gap-2 shadow-md cursor-pointer"
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
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  // Filter items by search
  const filteredItems = activeList.items.filter((item) => {
    const name = (item.product?.name || item.ad_hoc_name || '').toLowerCase()
    return name.includes(searchQuery.toLowerCase())
  })

  // Group by category sort_order
  const categoryMap = new Map<string, { name: string; sort_order: number; items: typeof activeList.items }>()

  filteredItems.forEach((item) => {
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
    <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* 1. Desktop Segmented List Switcher Bar */}
      <div className="flex items-center justify-between gap-3 p-2 bg-card border border-border rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
          {activeListsSummary.map((list) => {
            const isSelected = list.id === activeList.id
            return (
              <button
                key={list.id}
                onClick={() => switchActiveList(list.id)}
                className={cn(
                  "h-10 px-4 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-2.5 border transition-all cursor-pointer select-none",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted"
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
                <span className="font-semibold text-sm">{list.name}</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] font-mono px-2 py-0.5 rounded-lg border",
                    isSelected
                      ? "bg-black/20 text-primary-foreground border-transparent"
                      : "bg-card text-muted-foreground border-border"
                  )}
                >
                  {list.unchecked_items}
                </Badge>
              </button>
            )
          })}
        </div>

        <Button
          onClick={() => setIsNewListOpen(true)}
          size="sm"
          className="h-10 px-3.5 bg-card hover:bg-muted text-primary border border-border rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{t('activeList.newList')}</span>
        </Button>
      </div>

      {/* 2. List Header Card & Management Actions */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-md flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{activeList.name}</h2>
                {activeList.is_default && (
                  <Badge variant="secondary" className="bg-amber-400/10 text-amber-400 border-amber-400/30 text-xs gap-1 py-0.5">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{t('activeList.defaultBadge')}</span>
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono mt-0.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(activeList.target_date || activeList.created_at || new Date())}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-primary">
                  <Radio className="w-3.5 h-3.5" />
                  {t('activeList.realtimeSync')}
                </span>
              </div>
            </div>
          </div>

          {/* Action Toolbar Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRenameOpen(true)}
              className="h-9 border-border bg-background hover:bg-muted text-foreground rounded-xl text-xs gap-1.5 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{t('activeList.renameList')}</span>
            </Button>

            {!activeList.is_default && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSetDefault}
                className="h-9 border-border bg-background hover:bg-muted text-foreground rounded-xl text-xs gap-1.5 cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('activeList.setAsDefault')}</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleArchiveList}
              disabled={isArchiving}
              className="h-9 border-border bg-background hover:bg-muted text-foreground rounded-xl text-xs gap-1.5 cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5 text-primary" />
              <span>{t('activeList.archiveList')}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteListModalOpen(true)}
              className="h-9 border-border bg-background hover:bg-destructive/10 text-destructive rounded-xl text-xs gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('activeList.deleteList')}</span>
            </Button>
          </div>
        </div>

        {/* Progress Bar & Search Filter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-border/80 items-center">
          <div className="md:col-span-2 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">{t('activeList.progress')}:</span>
              <span className="font-mono text-primary font-bold">
                {checkedCount} / {totalCount} ({progressPercent}%)
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('products.searchPlaceholder')}
              className="h-9 pl-9 bg-background border-border text-foreground text-xs rounded-xl"
            />
          </div>
        </div>
      </div>

      {loadingDetails ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : activeList.items.length === 0 ? (
        <div className="py-16 px-6 bg-card/60 border border-dashed border-border rounded-3xl text-center flex flex-col items-center justify-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-muted/80 border border-border flex items-center justify-center text-muted-foreground mb-3">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">{t('activeList.emptyTitle')}</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
            {t('activeList.emptySubtitle')}
          </p>
        </div>
      ) : (
        /* Multi-Column Category Groups */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedCategories.map((group) => (
            <div
              key={group.name}
              className="p-5 rounded-2xl bg-card border border-border flex flex-col gap-3 shadow-sm h-fit"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-3.5 h-3.5" />
                  <span>
                    {group.sort_order !== 99
                      ? `${group.sort_order}. ${getCategoryLabel(group.name)}`
                      : getCategoryLabel(group.name)}
                  </span>
                </h4>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {group.items.filter((i) => i.is_checked).length} / {group.items.length}
                </Badge>
              </div>

              <div className="flex flex-col gap-2.5">
                {group.items.map((item) => {
                  const isChecked = !!item.is_checked
                  const name = item.product?.name || item.ad_hoc_name || 'Product'
                  const unit = item.product?.unit_type || 'pcs'

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleCheck(item.id, isChecked)}
                      className={cn(
                        "p-3 rounded-xl bg-background border border-border/80 flex items-center justify-between cursor-pointer transition-all hover:border-primary/50 gap-3",
                        isChecked && "bg-background/40 border-border/40 opacity-55"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleToggleCheck(item.id, isChecked)}
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
                        className="flex items-center bg-card border border-border rounded-lg p-0.5 shrink-0"
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
