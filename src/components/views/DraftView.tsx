import React from 'react'
import { useTranslation } from '@/i18n'
import { useDraftViewController } from '@/hooks/useDraftViewController'
import { DraftItemRow } from '@/components/shopping/DraftItemRow'
import { SwipeToDismiss } from '@/components/ui/SwipeToDismiss'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { AddAdHocSheet } from '@/components/dialogs/AddAdHocSheet'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import { TransferToActiveListSheet } from '@/components/dialogs/TransferToActiveListSheet'
import { PantryConfirmModal } from '@/components/dialogs/PantryConfirmModal'
import { Trash2, Play, Plus, ShoppingBag } from 'lucide-react'

interface DraftViewProps {
  onActiveListCreated?: () => void
}

export const DraftView: React.FC<DraftViewProps> = ({ onActiveListCreated }) => {
  const { t, formatQuantity } = useTranslation()
  const ctrl = useDraftViewController(onActiveListCreated)

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShoppingBag className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs text-foreground">
            {t('navigation.draft')}:{' '}
            <strong className="text-foreground font-mono">
              {formatQuantity(ctrl.draftItems.length, 'pcs')}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => ctrl.setIsAdHocOpen(true)}
            size="sm"
            className="h-8 bg-card hover:bg-muted text-primary border border-border rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('draft.addAdHoc')}</span>
          </Button>

          {ctrl.draftItems.length > 0 && (
            <button
              onClick={() => ctrl.clearDraft()}
              className="text-muted-foreground hover:text-destructive p-1.5 transition-colors cursor-pointer"
              title={t('draft.clearCart')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {ctrl.draftItems.length === 0 ? (
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
          <div className="flex items-center justify-between px-1">
            <div
              role="button"
              tabIndex={0}
              onClick={ctrl.handleToggleSelectAll}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  ctrl.handleToggleSelectAll()
                }
              }}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors cursor-pointer py-1 px-1 rounded-md hover:bg-muted/40 select-none"
            >
              <Checkbox
                checked={ctrl.allSelected ? true : ctrl.noneSelected ? false : 'indeterminate'}
                onCheckedChange={ctrl.handleToggleSelectAll}
                enableHaptics
                className="w-4 h-4 rounded pointer-events-none"
              />
              <span>{ctrl.allSelected ? t('draft.deselectAll') : t('draft.selectAll')}</span>
            </div>

            <span className="text-[11px] text-muted-foreground font-mono">
              {t('draft.selectedCount', {
                selected: ctrl.selectedItems.length,
                total: ctrl.draftItems.length
              })}
            </span>
          </div>

          {ctrl.draftItems.map((item) => {
            const { pantryItem, freshness } = ctrl.getItemPantryStatus(item)
            return (
              <SwipeToDismiss key={item.id} onDismiss={() => ctrl.removeFromDraft(item.id)}>
                <DraftItemRow
                  item={item}
                  isSelected={!ctrl.unselectedIds.has(item.id)}
                  isEditing={ctrl.editingId === item.id}
                  editValue={ctrl.editValue}
                  categoryLabel={ctrl.getCategoryLabel(item.category_name)}
                  hasPantryBadge={!!(pantryItem && freshness)}
                  freshness={freshness}
                  variant="mobile"
                  onToggleSelect={ctrl.toggleItemSelection}
                  onIncrease={ctrl.handleIncrease}
                  onDecrease={ctrl.handleDecrease}
                  onStartEdit={ctrl.startEditing}
                  onEditChange={ctrl.handleInputChange}
                  onCommitEdit={ctrl.handleCommitEdit}
                  onCancelEdit={ctrl.cancelEditing}
                  onOpenPantryModal={ctrl.setSelectedPantryModalItem}
                />
              </SwipeToDismiss>
            )
          })}
        </div>
      )}

      {ctrl.draftItems.length > 0 && (
        <Button
          onClick={ctrl.handleOpenTransfer}
          disabled={ctrl.selectedItems.length === 0}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold rounded-xl mt-4 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>
            {ctrl.selectedItems.length === 0
              ? t('draft.noItemsSelected')
              : ctrl.selectedItems.length === ctrl.draftItems.length
                ? t('draft.generateActiveList')
                : `${t('draft.generateActiveList')} (${ctrl.selectedItems.length})`}
          </span>
        </Button>
      )}

      <AddAdHocSheet open={ctrl.isAdHocOpen} onOpenChange={ctrl.setIsAdHocOpen} />

      <TransferToActiveListSheet
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
