import React from 'react'
import { useTranslation } from '@/i18n'
import { useDraftViewController } from '@/hooks/useDraftViewController'
import { DraftItemRow } from '@/components/shopping/DraftItemRow'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AddAdHocSheet } from '@/components/dialogs/AddAdHocSheet'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import { TransferToActiveListDialog } from '@/components/dialogs/TransferToActiveListDialog'
import { PantryConfirmModal } from '@/components/dialogs/PantryConfirmModal'
import { ShoppingBag, Plus, Trash2, Play, CheckCircle2, Layers, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DesktopDraftViewProps {
  onActiveListCreated?: () => void
}

export const DesktopDraftView: React.FC<DesktopDraftViewProps> = ({ onActiveListCreated }) => {
  const { t } = useTranslation()
  const ctrl = useDraftViewController(onActiveListCreated)

  const selectedAdHocCount = ctrl.selectedItems.filter((i) => i.is_ad_hoc).length
  const selectedRecipeCount = ctrl.selectedItems.length - selectedAdHocCount

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {ctrl.draftItems.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center bg-card/40 border border-border border-dashed rounded-3xl p-12 max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-card border border-border flex items-center justify-center text-muted-foreground mb-5 shadow-2xl">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-extrabold text-foreground">{t('draft.emptyTitle')}</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
            {t('draft.emptySubtitle')}
          </p>

          <Button
            onClick={() => ctrl.setIsAdHocOpen(true)}
            className="mt-6 h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('draft.addAdHoc')}</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    {t('navigation.draft')} ({ctrl.selectedItems.length}/{ctrl.draftItems.length})
                  </h3>
                  <p className="text-xs text-muted-foreground">{t('draft.subtitle')}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={ctrl.handleToggleSelectAll}
                  className="h-9 px-3 bg-card hover:bg-muted text-foreground border-border rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all"
                >
                  <div
                    className={cn(
                      'w-3.5 h-3.5 rounded border flex items-center justify-center transition-all',
                      ctrl.allSelected
                        ? 'bg-primary border-primary text-primary-foreground'
                        : ctrl.noneSelected
                          ? 'border-border bg-card'
                          : 'bg-primary/20 border-primary text-primary'
                    )}
                  >
                    {ctrl.allSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    {!ctrl.allSelected && !ctrl.noneSelected && (
                      <div className="w-2 h-0.5 bg-primary rounded-xs" />
                    )}
                  </div>
                  <span>{ctrl.allSelected ? t('draft.deselectAll') : t('draft.selectAll')}</span>
                </Button>

                <Button
                  onClick={() => ctrl.setIsAdHocOpen(true)}
                  size="sm"
                  className="h-9 px-3 bg-card hover:bg-muted text-primary border border-border rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('draft.addAdHoc')}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => ctrl.clearDraft()}
                  className="h-9 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-border rounded-xl text-xs font-medium cursor-pointer"
                  title={t('draft.clearCart')}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span>{t('draft.clearCart')}</span>
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {ctrl.draftItems.map((item) => {
                const { pantryItem, freshness } = ctrl.getItemPantryStatus(item)
                return (
                  <DraftItemRow
                    key={item.id}
                    item={item}
                    isSelected={!ctrl.unselectedIds.has(item.id)}
                    isEditing={ctrl.editingId === item.id}
                    editValue={ctrl.editValue}
                    categoryLabel={ctrl.getCategoryLabel(item.category_name)}
                    hasPantryBadge={!!(pantryItem && freshness)}
                    freshness={freshness}
                    variant="desktop"
                    onToggleSelect={ctrl.toggleItemSelection}
                    onIncrease={ctrl.handleIncrease}
                    onDecrease={ctrl.handleDecrease}
                    onStartEdit={ctrl.startEditing}
                    onEditChange={ctrl.handleInputChange}
                    onCommitEdit={ctrl.handleCommitEdit}
                    onCancelEdit={ctrl.cancelEditing}
                    onOpenPantryModal={ctrl.setSelectedPantryModalItem}
                    onRequestDelete={ctrl.requestDeleteItem}
                  />
                )
              })}
            </div>
          </div>

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

              <div className="flex flex-col gap-3 font-mono text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{t('draft.selectedItems')}:</span>
                  <strong className="text-primary text-sm font-bold font-mono">
                    {ctrl.selectedItems.length}{' '}
                    <span className="text-xs text-muted-foreground font-normal">
                      / {ctrl.draftItems.length}
                    </span>
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
                    {ctrl.household?.name}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-background/60 border border-border text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>{t('draft.subtitle')}</span>
              </div>

              <Button
                onClick={ctrl.handleOpenTransfer}
                disabled={ctrl.selectedItems.length === 0}
                className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2.5 shadow-xl disabled:opacity-50 cursor-pointer transition-all active:scale-[0.98]"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>
                  {ctrl.selectedItems.length === 0
                    ? t('draft.noItemsSelected')
                    : ctrl.selectedItems.length === ctrl.draftItems.length
                      ? t('draft.generateActiveList')
                      : `${t('draft.generateActiveList')} (${ctrl.selectedItems.length})`}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      <AddAdHocSheet open={ctrl.isAdHocOpen} onOpenChange={ctrl.setIsAdHocOpen} />

      <TransferToActiveListDialog
        open={ctrl.isTransferOpen}
        onOpenChange={ctrl.setIsTransferOpen}
        selectedItems={ctrl.selectedItems}
        onSuccess={ctrl.handleTransferSuccess}
      />

      <ConfirmDeleteDialog
        open={ctrl.isDeleteModalOpen}
        onOpenChange={ctrl.setIsDeleteModalOpen}
        itemName={ctrl.itemToDelete?.name}
        onConfirm={ctrl.handleConfirmDelete}
      />

      {ctrl.selectedPantryModalItem && (
        <PantryConfirmModal
          open={!!ctrl.selectedPantryModalItem}
          onOpenChange={(open) => {
            if (!open) ctrl.setSelectedPantryModalItem(null)
          }}
          context="cart"
          productId={ctrl.selectedPantryModalItem.product_id}
          adHocName={ctrl.selectedPantryModalItem.is_ad_hoc ? ctrl.selectedPantryModalItem.name : null}
          productName={ctrl.selectedPantryModalItem.name}
          unitType={ctrl.selectedPantryModalItem.unit_type}
          neededQuantity={ctrl.selectedPantryModalItem.quantity}
          draftItemId={ctrl.selectedPantryModalItem.id}
          onSuccess={() => ctrl.setSelectedPantryModalItem(null)}
        />
      )}
    </div>
  )
}
