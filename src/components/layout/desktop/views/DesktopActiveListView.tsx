import React, { useState } from 'react'
import { useTranslation } from '@/i18n'
import { useActiveListController } from '@/hooks/useActiveListController'
import { ActiveListItemRow } from '@/components/shopping/ActiveListItemRow'
import { groupItemsByAisle } from '@/lib/calculations/categorySorting'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import { CreateActiveListDialog } from '@/components/dialogs/CreateActiveListDialog'
import { RenameActiveListDialog } from '@/components/dialogs/RenameActiveListDialog'
import { PantryConfirmModal } from '@/components/dialogs/PantryConfirmModal'
import {
  Calendar,
  Radio,
  Archive,
  ShoppingCart,
  Plus,
  Package,
  Star,
  Search,
  Edit2,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const DesktopActiveListView: React.FC = () => {
  const { t, formatDate } = useTranslation()
  const c = useActiveListController()
  const [searchQuery, setSearchQuery] = useState('')

  if (c.loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  if (!c.activeListsSummary || c.activeListsSummary.length === 0 || !c.activeList) {
    return (
      <div className="max-w-2xl mx-auto py-16">
        <div className="py-16 px-8 bg-card border border-border rounded-3xl flex flex-col items-center justify-center text-center shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center text-primary mb-4">
            <ShoppingCart className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-foreground">{t('activeList.noListsTitle')}</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
            {t('activeList.noListsSubtitle')}
          </p>
          <Button
            onClick={() => c.setIsNewListOpen(true)}
            size="lg"
            className="mt-6 h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Plus className="w-5 h-5" />
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
  const totalCount = activeList.items.length
  const coveredCount = activeList.items.filter((i) => i.is_checked || i.in_pantry).length
  const progressPercent = totalCount > 0 ? Math.round((coveredCount / totalCount) * 100) : 0

  const filteredItems = activeList.items.filter((item) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    const name = (item.product?.name || item.ad_hoc_name || '').toLowerCase()
    return name.includes(q)
  })

  const sortedCategories = groupItemsByAisle(filteredItems, c.resolvedCategories, 'other')

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* 1. Segmented Tabs for Active Lists + Create List CTA */}
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {c.activeListsSummary.map((list) => {
            const isSelected = list.id === activeList.id
            return (
              <button
                key={list.id}
                onClick={() => c.switchActiveList(list.id)}
                className={cn(
                  'h-10 px-4 rounded-xl text-sm font-medium flex items-center gap-2.5 transition-all cursor-pointer border select-none',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
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
                <span className="font-semibold text-sm">{list.name}</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px] font-mono px-2 py-0.5 rounded-lg border',
                    isSelected
                      ? 'bg-black/20 text-primary-foreground border-transparent'
                      : 'bg-card text-muted-foreground border-border'
                  )}
                >
                  {list.unchecked_items}
                </Badge>
              </button>
            )
          })}
        </div>

        <Button
          onClick={() => c.setIsNewListOpen(true)}
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
                  <Badge
                    variant="secondary"
                    className="bg-amber-400/10 text-amber-400 border-amber-400/30 text-xs gap-1 py-0.5"
                  >
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

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => c.setIsRenameOpen(true)}
              className="h-9 border-border bg-background hover:bg-muted text-foreground rounded-xl text-xs gap-1.5 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{t('activeList.renameList')}</span>
            </Button>

            {!activeList.is_default && (
              <Button
                variant="outline"
                size="sm"
                onClick={c.handleSetDefault}
                className="h-9 border-border bg-background hover:bg-muted text-foreground rounded-xl text-xs gap-1.5 cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('activeList.setAsDefault')}</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={c.handleArchiveList}
              disabled={c.isArchiving}
              className="h-9 border-border bg-background hover:bg-muted text-foreground rounded-xl text-xs gap-1.5 cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5 text-primary" />
              <span>{t('activeList.archiveList')}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => c.setIsDeleteListModalOpen(true)}
              className="h-9 border-border bg-background hover:bg-destructive/10 text-destructive rounded-xl text-xs gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('activeList.deleteList')}</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-border/80 items-center">
          <div className="md:col-span-2 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">{t('activeList.progress')}:</span>
              <span className="font-mono text-primary font-bold">
                {coveredCount} / {totalCount} ({progressPercent}%)
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

      {c.loadingDetails ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedCategories.map((group, index) => (
            <div
              key={group.categoryId ?? `group_${group.name}`}
              className="p-5 rounded-2xl bg-card border border-border flex flex-col gap-3 shadow-sm h-fit"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-3.5 h-3.5" />
                  <span className="flex items-center gap-1.5">
                    <span>
                      {group.sort_order !== 99999
                        ? `${index + 1}. ${c.getCategoryLabel(group.name)}`
                        : c.getCategoryLabel(group.name)}
                    </span>
                    {group.has_fallback_items && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-sm bg-amber-500/10 text-amber-400 font-normal normal-case border border-amber-500/20"
                        title={t('categoryManager.hiddenCategoryWithActiveItemsBanner')}
                      >
                        {t('common.hidden')}
                      </span>
                    )}
                  </span>
                </h4>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {group.items.filter((i) => i.is_checked || i.in_pantry).length} / {group.items.length}
                </Badge>
              </div>

              <div className="flex flex-col gap-2.5">
                {group.items.map((item) => (
                  <ActiveListItemRow
                    key={item.id}
                    item={item}
                    variant="desktop"
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
