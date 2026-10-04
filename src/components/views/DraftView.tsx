import React, { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useShoppingStore, type DraftItem } from '@/store/useShoppingStore'
import { useTranslation } from '@/i18n'
import { SwipeToDismiss } from '@/components/ui/SwipeToDismiss'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AddAdHocSheet } from '@/components/dialogs/AddAdHocSheet'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import { TransferToActiveListSheet } from '@/components/dialogs/TransferToActiveListSheet'
import { PantryConfirmModal } from '@/components/dialogs/PantryConfirmModal'
import { Trash2, Play, Plus, Minus, ShoppingBag, Warehouse } from 'lucide-react'
import { cn, getNextQuantity } from '@/lib/utils'
import { usePantryStore } from '@/store/usePantryStore'
import { calculatePantryFreshness } from '@/lib/calculations/pantryCalculations'

interface DraftViewProps {
  onActiveListCreated?: () => void
}

export const DraftView: React.FC<DraftViewProps> = ({ onActiveListCreated }) => {
  const { household } = useAuth()
  const {
    draftItems,
    removeFromDraft,
    removeMultipleFromDraft,
    updateDraftQuantity,
    clearDraft
  } = useShoppingStore()
  const { pantryMapByProductId, pantryMapByAdHocName } = usePantryStore()
  const { t, formatUnit, formatQuantity } = useTranslation()
  const [unselectedIds, setUnselectedIds] = useState<Set<string>>(new Set())
  const [isAdHocOpen, setIsAdHocOpen] = useState(false)
  const [isTransferSheetOpen, setIsTransferSheetOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<DraftItem | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [selectedPantryModalItem, setSelectedPantryModalItem] = useState<DraftItem | null>(null)

  const selectedItems = draftItems.filter((i) => !unselectedIds.has(i.id))
  const allSelected = draftItems.length > 0 && selectedItems.length === draftItems.length
  const noneSelected = selectedItems.length === 0

  const toggleItemSelection = (id: string) => {
    setUnselectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setUnselectedIds(new Set(draftItems.map((i) => i.id)))
    } else {
      setUnselectedIds(new Set())
    }
  }

  const handleIncrease = (item: DraftItem) => {
    const newQty = getNextQuantity(item.quantity, item.unit_type, 'increase')
    updateDraftQuantity(item.id, newQty)
  }

  const handleDecrease = (item: DraftItem) => {
    const newQty = getNextQuantity(item.quantity, item.unit_type, 'decrease')
    if (newQty <= 0) {
      setItemToDelete(item)
      setIsDeleteModalOpen(true)
    } else {
      updateDraftQuantity(item.id, newQty)
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

  const handleCommitEdit = (itemId: string) => {
    const parsed = parseInt(editValue, 10)
    if (!isNaN(parsed) && parsed > 0) {
      updateDraftQuantity(itemId, parsed)
    }
    setEditingId(null)
    setEditValue('')
  }

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      removeFromDraft(itemToDelete.id)
      setItemToDelete(null)
      setIsDeleteModalOpen(false)
    }
  }

  const handleOpenTransferSheet = () => {
    if (!household || selectedItems.length === 0) return
    setIsTransferSheetOpen(true)
  }

  const handleTransferSuccess = (_targetListId: string) => {
    if (selectedItems.length === draftItems.length) {
      clearDraft()
    } else {
      removeMultipleFromDraft(selectedItems.map((i) => i.id))
    }
    setUnselectedIds(new Set())

    if (onActiveListCreated) {
      onActiveListCreated()
    }
  }

  const getCategoryLabel = (catName: string) => {
    return t(`categories.${catName}` as any) !== `categories.${catName}`
      ? t(`categories.${catName}` as any)
      : catName
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Top Banner & AdHoc Button */}
      <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShoppingBag className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs text-foreground">
            {t('navigation.draft')}: <strong className="text-foreground font-mono">{formatQuantity(draftItems.length, 'pcs')}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAdHocOpen(true)}
            size="sm"
            className="h-8 bg-card hover:bg-muted text-primary border border-border rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('draft.addAdHoc')}</span>
          </Button>

          {draftItems.length > 0 && (
            <button
              onClick={() => clearDraft()}
              className="text-muted-foreground hover:text-destructive p-1.5 transition-colors cursor-pointer"
              title={t('draft.clearCart')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Draft Items List */}
      {draftItems.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground mb-3">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <p className="text-sm font-bold text-foreground">{t('draft.emptyTitle')}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
            {t('draft.emptySubtitle')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {/* Select All & Swipe Hint Header */}
          <div className="flex items-center justify-between px-1">
            <div
              role="button"
              tabIndex={0}
              onClick={handleToggleSelectAll}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleToggleSelectAll()
                }
              }}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors cursor-pointer py-1 px-1 rounded-md hover:bg-muted/40 select-none"
            >
              <Checkbox
                checked={allSelected ? true : noneSelected ? false : 'indeterminate'}
                onCheckedChange={handleToggleSelectAll}
                enableHaptics
                className="w-4 h-4 rounded pointer-events-none"
              />
              <span>
                {allSelected ? t('draft.deselectAll') : t('draft.selectAll')}
              </span>
            </div>

            <span className="text-[11px] text-muted-foreground font-mono">
              {t('draft.selectedCount', {
                selected: selectedItems.length,
                total: draftItems.length
              })}
            </span>
          </div>

          {draftItems.map((item) => {
            const isSelected = !unselectedIds.has(item.id)
            const pantryItem = item.product_id
              ? pantryMapByProductId[item.product_id]
              : pantryMapByAdHocName[item.name.toLowerCase().trim()]
            const isNonFood = !!(
              pantryItem?.category?.is_non_food ||
              pantryItem?.product?.category?.is_non_food
            )
            const freshness = pantryItem
              ? calculatePantryFreshness(
                  pantryItem.last_purchased_at,
                  isNonFood,
                  item.name,
                  formatQuantity(pantryItem.quantity, pantryItem.unit_type),
                  pantryItem.last_verified_at
                )
              : null

            return (
              <SwipeToDismiss key={item.id} onDismiss={() => removeFromDraft(item.id)}>
                <div
                  onClick={() => toggleItemSelection(item.id)}
                  className={cn(
                    "p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99]",
                    !isSelected && "opacity-50 bg-card/40"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleItemSelection(item.id)}
                        enableHaptics
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "font-semibold text-sm transition-colors",
                            isSelected ? "text-foreground" : "text-muted-foreground line-through decoration-border"
                          )}
                        >
                          {item.name}
                        </span>
                        {item.is_ad_hoc ? (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                            {t('draft.adHocItem')}
                          </Badge>
                        ) : item.meal_source ? (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 text-muted-foreground">
                            {item.meal_source}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{getCategoryLabel(item.category_name)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
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
                        className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer"
                        title={t('common.decrease')}
                        aria-label={t('common.decrease')}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      {editingId === item.id ? (
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
                                handleCommitEdit(item.id)
                              } else if (e.key === 'Escape') {
                                setEditingId(null)
                                setEditValue('')
                              }
                            }}
                            onBlur={() => handleCommitEdit(item.id)}
                            className="w-14 h-7 bg-background text-center font-mono text-xs font-bold text-primary border border-primary/60 rounded px-1 outline-none ring-1 ring-primary/40 shadow-inner"
                          />
                          <span className="font-mono text-xs text-primary font-bold pr-1 select-none">
                            {formatUnit(item.unit_type)}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            startEditing(item.id, item.quantity)
                          }}
                          className="font-mono text-xs px-2 py-0.5 font-bold min-w-[3.5rem] text-center text-primary hover:bg-muted rounded transition-colors cursor-text select-none"
                          title={t('common.edit')}
                        >
                          {formatQuantity(item.quantity, item.unit_type)}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleIncrease(item)
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer"
                        title={t('common.increase')}
                        aria-label={t('common.increase')}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {pantryItem && freshness && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedPantryModalItem(item)
                        }}
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer shrink-0 active:scale-90",
                          freshness.badgeBgClass,
                          freshness.colorClass
                        )}
                        title={t('pantry.modal.viewPantryDetails')}
                        aria-label={t('pantry.modal.viewPantryDetails')}
                      >
                        <Warehouse className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </SwipeToDismiss>
            )
          })}
        </div>
      )}

      {/* Generate Active List CTA */}
      {/* Transfer to Active List CTA */}
      {draftItems.length > 0 && (
        <Button
          onClick={handleOpenTransferSheet}
          disabled={selectedItems.length === 0}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold rounded-xl mt-4 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>
            {selectedItems.length === 0
              ? t('draft.noItemsSelected')
              : selectedItems.length === draftItems.length
              ? t('draft.generateActiveList')
              : `${t('draft.generateActiveList')} (${selectedItems.length})`}
          </span>
        </Button>
      )}

      {/* Add Ad-hoc Sheet */}
      <AddAdHocSheet open={isAdHocOpen} onOpenChange={setIsAdHocOpen} />

      {/* Transfer to Active List Sheet */}
      <TransferToActiveListSheet
        open={isTransferSheetOpen}
        onOpenChange={setIsTransferSheetOpen}
        selectedItems={selectedItems}
        onSuccess={handleTransferSuccess}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        itemName={itemToDelete?.name}
        onConfirm={handleConfirmDelete}
      />

      {/* Pantry Confirm Modal */}
      {selectedPantryModalItem && (
        <PantryConfirmModal
          open={!!selectedPantryModalItem}
          onOpenChange={(open) => {
            if (!open) setSelectedPantryModalItem(null)
          }}
          context="cart"
          productId={selectedPantryModalItem.product_id}
          adHocName={selectedPantryModalItem.is_ad_hoc ? selectedPantryModalItem.name : null}
          productName={selectedPantryModalItem.name}
          unitType={selectedPantryModalItem.unit_type}
          neededQuantity={selectedPantryModalItem.quantity}
          draftItemId={selectedPantryModalItem.id}
          onSuccess={() => setSelectedPantryModalItem(null)}
        />
      )}
    </div>
  )
}

