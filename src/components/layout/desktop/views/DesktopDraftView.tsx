import React, { useState } from 'react'
import { useShoppingStore } from '@/store/useShoppingStore'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/i18n'
import type { DraftItem } from '@/store/useShoppingStore'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AddAdHocSheet } from '@/components/dialogs/AddAdHocSheet'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import { TransferToActiveListDialog } from '@/components/dialogs/TransferToActiveListDialog'
import { PantryConfirmModal } from '@/components/dialogs/PantryConfirmModal'
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Play,
  CheckCircle2,
  Utensils,
  Layers,
  Check,
  Warehouse
} from 'lucide-react'
import { cn, getNextQuantity } from '@/lib/utils'
import { usePantryStore } from '@/store/usePantryStore'
import { calculatePantryFreshness } from '@/lib/calculations/pantryCalculations'

interface DesktopDraftViewProps {
  onActiveListCreated?: () => void
}

export const DesktopDraftView: React.FC<DesktopDraftViewProps> = ({
  onActiveListCreated
}) => {
  const {
    draftItems,
    updateDraftQuantity,
    removeFromDraft,
    removeMultipleFromDraft,
    clearDraft
  } = useShoppingStore()
  const { pantryMapByProductId, pantryMapByAdHocName } = usePantryStore()
  const { household } = useAuth()
  const { t, formatUnit, formatQuantity } = useTranslation()

  const [unselectedIds, setUnselectedIds] = useState<Set<string>>(new Set())
  const [isAdHocOpen, setIsAdHocOpen] = useState(false)
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
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
    setEditingId(null)
    setEditValue('')

    if (!isNaN(parsed) && parsed > 0) {
      updateDraftQuantity(itemId, parsed)
    }
  }

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      removeFromDraft(itemToDelete.id)
      setItemToDelete(null)
      setIsDeleteModalOpen(false)
    }
  }

  const handleOpenTransferDialog = () => {
    if (!household || selectedItems.length === 0) return
    setIsTransferDialogOpen(true)
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

  const selectedAdHocCount = selectedItems.filter((i) => i.is_ad_hoc).length
  const selectedRecipeCount = selectedItems.length - selectedAdHocCount

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {draftItems.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center bg-card/40 border border-border border-dashed rounded-3xl p-12 max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-card border border-border flex items-center justify-center text-muted-foreground mb-5 shadow-2xl">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-extrabold text-foreground">{t('draft.emptyTitle')}</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
            {t('draft.emptySubtitle')}
          </p>

          <Button
            onClick={() => setIsAdHocOpen(true)}
            className="mt-6 h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('draft.addAdHoc')}</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: 2/3 Width Item List */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    {t('navigation.draft')} ({selectedItems.length}/{draftItems.length})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t('draft.subtitle')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleSelectAll}
                  className="h-9 px-3 bg-card hover:bg-muted text-foreground border-border rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all"
                >
                  <div
                    className={cn(
                      "w-3.5 h-3.5 rounded border flex items-center justify-center transition-all",
                      allSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : noneSelected
                        ? "border-border bg-card"
                        : "bg-primary/20 border-primary text-primary"
                    )}
                  >
                    {allSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    {!allSelected && !noneSelected && <div className="w-2 h-0.5 bg-primary rounded-xs" />}
                  </div>
                  <span>{allSelected ? t('draft.deselectAll') : t('draft.selectAll')}</span>
                </Button>

                <Button
                  onClick={() => setIsAdHocOpen(true)}
                  size="sm"
                  className="h-9 px-3 bg-card hover:bg-muted text-primary border border-border rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('draft.addAdHoc')}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearDraft()}
                  className="h-9 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-border rounded-xl text-xs font-medium cursor-pointer"
                  title={t('draft.clearCart')}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span>{t('draft.clearCart')}</span>
                </Button>
              </div>
            </div>

            {/* List of Items */}
            <div className="flex flex-col gap-2.5">
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
                  <div
                    key={item.id}
                    onClick={() => toggleItemSelection(item.id)}
                    className={cn(
                      "p-4 rounded-2xl bg-card border border-border hover:border-border/80 transition-all flex items-center justify-between gap-4 shadow-sm group cursor-pointer",
                      !isSelected && "opacity-50 bg-card/40 border-border/40"
                    )}
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-3">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                          enableHaptics
                        />
                      </div>

                      <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/30 transition-colors shrink-0">
                        {item.is_ad_hoc ? <ShoppingBag className="w-4 h-4 text-amber-400" /> : <Utensils className="w-4 h-4 text-primary" />}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              "font-bold text-sm transition-colors truncate",
                              isSelected ? "text-foreground group-hover:text-primary" : "text-muted-foreground line-through decoration-border"
                            )}
                          >
                            {item.name}
                          </span>
                          {item.is_ad_hoc ? (
                            <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                              {t('draft.adHocItem')}
                            </Badge>
                          ) : item.meal_source ? (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 text-muted-foreground bg-background border-border">
                              {item.meal_source}
                            </Badge>
                          ) : null}
                        </div>
                        <span className="text-xs text-muted-foreground mt-0.5">
                          {getCategoryLabel(item.category_name)}
                        </span>
                      </div>
                    </div>

                    {/* Stepper +/- & Numeric Editor & Pantry Button */}
                    <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center bg-background border border-border rounded-xl p-1 shadow-inner">
                        <button
                          type="button"
                          onClick={() => handleDecrease(item)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer"
                          title={t('common.decrease')}
                          aria-label={t('common.decrease')}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        {editingId === item.id ? (
                          <div className="flex items-center gap-1 px-1.5">
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
                              className="w-16 h-8 bg-background text-center font-mono text-xs font-bold text-primary border border-primary/60 rounded px-1 outline-none ring-1 ring-primary/40 shadow-inner"
                            />
                            <span className="font-mono text-xs text-primary font-bold pr-1 select-none">
                              {formatUnit(item.unit_type)}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditing(item.id, item.quantity)}
                            className="font-mono text-xs px-3 py-1 font-bold min-w-[4.5rem] text-center text-primary hover:bg-muted rounded-lg transition-colors cursor-text select-none"
                            title={t('common.edit')}
                          >
                            {formatQuantity(item.quantity, item.unit_type)}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleIncrease(item)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer"
                          title={t('common.increase')}
                          aria-label={t('common.increase')}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Pantry Indicator Button */}
                      {pantryItem && freshness && (
                        <button
                          type="button"
                          onClick={() => setSelectedPantryModalItem(item)}
                          className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer shrink-0 active:scale-90 hover:opacity-80",
                            freshness.badgeBgClass,
                            freshness.colorClass
                          )}
                          title={t('pantry.modal.viewPantryDetails')}
                          aria-label={t('pantry.modal.viewPantryDetails')}
                        >
                          <Warehouse className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete Item Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setItemToDelete(item)
                          setIsDeleteModalOpen(true)
                        }}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors cursor-pointer"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Column: 1/3 Summary & Launch Deck */}
          <div className="flex flex-col gap-5 sticky top-24">
            <div className="p-6 rounded-3xl bg-card border border-border shadow-2xl flex flex-col gap-6 backdrop-blur-xl">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  <span>{t('draft.generateActiveList')}</span>
                </h3>
                <Badge variant="default" className="bg-primary/10 text-primary border border-primary/20">
                  {t('draft.readyBadge')}
                </Badge>
              </div>

              {/* Statistics Breakdown */}
              <div className="flex flex-col gap-3 font-mono text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{t('draft.selectedItems')}:</span>
                  <strong className="text-primary text-sm font-bold font-mono">
                    {selectedItems.length} <span className="text-xs text-muted-foreground font-normal">/ {draftItems.length}</span>
                  </strong>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{t('navigation.cookbook')}:</span>
                  <strong className="text-primary">{selectedRecipeCount}</strong>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{t('draft.adHocItem')}:</span>
                  <strong className="text-amber-400">{selectedAdHocCount}</strong>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t('dialogs.households.currentHousehold')}:</span>
                  <span className="text-foreground font-sans font-semibold truncate max-w-[150px]">
                    {household?.name}
                  </span>
                </div>
              </div>

              {/* Action Banner */}
              <div className="p-3.5 rounded-2xl bg-background/60 border border-border text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>
                  {t('draft.subtitle')}
                </span>
              </div>

              {/* Big Launch Button */}
              <Button
                onClick={handleOpenTransferDialog}
                disabled={selectedItems.length === 0}
                className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2.5 shadow-xl disabled:opacity-50 cursor-pointer transition-all active:scale-[0.98]"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>
                  {selectedItems.length === 0
                    ? t('draft.noItemsSelected')
                    : selectedItems.length === draftItems.length
                    ? t('draft.generateActiveList')
                    : `${t('draft.generateActiveList')} (${selectedItems.length})`}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Ad-hoc Sheet */}
      <AddAdHocSheet open={isAdHocOpen} onOpenChange={setIsAdHocOpen} />

      {/* Transfer to Active List Dialog */}
      <TransferToActiveListDialog
        open={isTransferDialogOpen}
        onOpenChange={setIsTransferDialogOpen}
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

