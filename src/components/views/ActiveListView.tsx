import React, { useState } from 'react'
import { useTranslation } from '@/i18n'
import { useActiveListController } from '@/hooks/useActiveListController'
import { ActiveListItemRow } from '@/components/shopping/ActiveListItemRow'
import { groupItemsByAisle } from '@/lib/calculations/categorySorting'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import { CreateActiveListDialog } from '@/components/dialogs/CreateActiveListDialog'
import { RenameActiveListDialog } from '@/components/dialogs/RenameActiveListDialog'
import { PantryConfirmModal } from '@/components/dialogs/PantryConfirmModal'
import {
  CheckCircle2,
  Calendar,
  Radio,
  Archive,
  ShoppingCart,
  Plus,
  Star,
  MoreVertical,
  Edit2,
  Trash2,
  Package
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const ActiveListView: React.FC = () => {
  const { t, formatDate } = useTranslation()
  const c = useActiveListController()
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)

  if (c.loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  if (!c.activeListsSummary || c.activeListsSummary.length === 0 || !c.activeList) {
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
            onClick={() => c.setIsNewListOpen(true)}
            className="mt-5 h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('activeList.createFirstList')}</span>
          </Button>
        </div>

        <CreateActiveListDialog
          open={c.isNewListOpen}
          onOpenChange={c.setIsNewListOpen}
          onCreated={c.handleListCreated}
        />
      </div>
    )
  }

  const activeList = c.activeList
  const checkedCount = activeList.items.filter((i) => i.is_checked).length
  const totalCount = activeList.items.length
  const sortedCategories = groupItemsByAisle(activeList.items, c.resolvedCategories, 'other')

  return (
    <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
      {/* 1. Horizontal Scrollable List Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {c.activeListsSummary.map((list) => {
          const isSelected = list.id === activeList.id
          return (
            <button
              key={list.id}
              onClick={() => c.switchActiveList(list.id)}
              className={cn(
                'h-9 px-3.5 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-2 border transition-all cursor-pointer select-none',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {list.is_default && (
                <Star
                  className={cn(
                    'w-3.5 h-3.5 shrink-0',
                    isSelected ? 'text-amber-300 fill-amber-300' : 'text-amber-400 fill-amber-400'
                  )}
                />
              )}
              <span className="truncate max-w-[130px]">{list.name}</span>
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-mono',
                  isSelected
                    ? 'bg-black/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {list.unchecked_items}
              </span>
            </button>
          )
        })}

        <button
          onClick={() => c.setIsNewListOpen(true)}
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
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-amber-400/10 text-amber-400 border-amber-400/30 gap-1"
                >
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

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOptionsMenu((prev) => !prev)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
              title={t('activeList.listOptions')}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>

            {showOptionsMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowOptionsMenu(false)} />
                <div className="absolute right-0 top-9 z-50 w-48 bg-card border border-border rounded-xl shadow-xl p-1.5 flex flex-col gap-1 text-xs text-foreground animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    onClick={() => {
                      setShowOptionsMenu(false)
                      c.setIsRenameOpen(true)
                    }}
                    className="w-full px-2.5 py-2 rounded-lg hover:bg-muted flex items-center gap-2 text-left cursor-pointer transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{t('activeList.renameList')}</span>
                  </button>

                  {!activeList.is_default && (
                    <button
                      onClick={async () => {
                        const ok = await c.handleSetDefault()
                        if (ok) setShowOptionsMenu(false)
                      }}
                      className="w-full px-2.5 py-2 rounded-lg hover:bg-muted flex items-center gap-2 text-left cursor-pointer transition-colors"
                    >
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t('activeList.setAsDefault')}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowOptionsMenu(false)
                      c.handleArchiveList()
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
                      c.setIsDeleteListModalOpen(true)
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

      {c.loadingDetails ? (
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
        <div className="flex flex-col gap-5 mt-1">
          {sortedCategories.map((group, index) => (
            <div key={group.categoryId ?? `group_${group.name}`} className="flex flex-col gap-2">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider px-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>
                    {group.sort_order !== 99999
                      ? `${index + 1}. ${c.getCategoryLabel(group.name)}`
                      : c.getCategoryLabel(group.name)}
                  </span>
                  {group.has_fallback_items && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-sm bg-amber-500/10 text-amber-400 font-normal normal-case border border-amber-500/20"
                      title={t('categoryManager.hiddenCategoryWithActiveItemsBanner')}
                    >
                      {t('common.hidden')}
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {group.items.filter((i) => i.is_checked || i.in_pantry).length}/{group.items.length}
                </span>
              </h4>

              <div className="flex flex-col gap-2">
                {group.items.map((item) => (
                  <ActiveListItemRow
                    key={item.id}
                    item={item}
                    variant="mobile"
                    pantryMapByProductId={c.pantryMapByProductId}
                    pantryMapByAdHocName={c.pantryMapByAdHocName}
                    pantryItemsByParentId={c.pantryItemsByParentId}
                    editingId={c.editingId}
                    editValue={c.editValue}
                    onToggleCheck={c.handleToggleCheck}
                    onSelectPantryItem={c.setSelectedPantryItem}
                    onIncrease={c.handleIncrease}
                    onDecrease={c.handleDecrease}
                    onStartEdit={c.startEditing}
                    onEditInputChange={c.handleInputChange}
                    onCommitEdit={c.handleCommitEdit}
                    onCancelEdit={() => {
                      c.setEditingId(null)
                      c.setEditValue('')
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeList.items.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {(checkedCount === totalCount ||
            (totalCount > 0 && activeList.items.every((i) => i.is_checked || i.in_pantry))) && (
            <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 text-center flex items-center justify-center gap-2 text-primary text-xs font-bold animate-bounce">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('activeList.allPurchased')}</span>
            </div>
          )}

          <Button
            onClick={c.handleArchiveList}
            disabled={c.isArchiving}
            className="w-full h-12 bg-card hover:bg-muted text-foreground border border-border font-bold rounded-xl flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
          >
            {c.isArchiving ? (
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

      <CreateActiveListDialog
        open={c.isNewListOpen}
        onOpenChange={c.setIsNewListOpen}
        onCreated={c.handleListCreated}
      />

      <RenameActiveListDialog
        open={c.isRenameOpen}
        onOpenChange={c.setIsRenameOpen}
        listId={activeList.id}
        currentName={activeList.name || ''}
        onRenamed={c.handleListRenamed}
      />

      <ConfirmDeleteDialog
        open={c.isDeleteItemModalOpen}
        onOpenChange={c.setIsDeleteItemModalOpen}
        itemName={c.itemToDelete?.product?.name || c.itemToDelete?.ad_hoc_name}
        onConfirm={c.handleConfirmDeleteItem}
        isDeleting={c.isDeleting}
      />

      <ConfirmDeleteDialog
        open={c.isDeleteListModalOpen}
        onOpenChange={c.setIsDeleteListModalOpen}
        title={t('activeList.deleteListTitle')}
        itemName={activeList.name || ''}
        onConfirm={async () => {
          await c.handleDeleteList()
        }}
        isDeleting={c.isDeleting}
      />

      {c.selectedPantryItem && (
        <PantryConfirmModal
          open={!!c.selectedPantryItem}
          onOpenChange={(open) => {
            if (!open) c.setSelectedPantryItem(null)
          }}
          context="active"
          productId={c.selectedPantryItem.product_id}
          adHocName={c.selectedPantryItem.ad_hoc_name}
          productName={
            c.selectedPantryItem.product?.name || c.selectedPantryItem.ad_hoc_name || 'Product'
          }
          unitType={c.selectedPantryItem.product?.unit_type || 'pcs'}
          neededQuantity={c.selectedPantryItem.total_quantity}
          activeItemId={c.selectedPantryItem.id}
          isAlreadyMarkedInPantry={!!c.selectedPantryItem.in_pantry}
          onSuccess={c.refreshSelectedListAfterPantryConfirm}
        />
      )}
    </div>
  )
}
