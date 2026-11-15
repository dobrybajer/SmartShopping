import React from 'react'
import { useTranslation } from '@/i18n'
import { cn } from '@/lib/utils'
import { usePantryViewController } from '@/hooks/usePantryViewController'
import { PantryItemRow } from '@/components/pantry/PantryItemRow'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import { AddPantryItemDialog } from '@/components/dialogs/AddPantryItemDialog'
import { Warehouse, Plus, Search, CalendarClock, Layers } from 'lucide-react'

export const PantryView: React.FC = () => {
  const { t } = useTranslation()
  const c = usePantryViewController()

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* 1. Header Banner & Add Button */}
      <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <Warehouse className="w-5 h-5 text-primary shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <span>{t('pantry.title')}</span>
              <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                {c.pantryItems.length}
              </Badge>
            </span>
            <span className="text-[11px] text-muted-foreground">
              {t('dialogs.households.currentHousehold')}: <strong>{c.household?.name}</strong>
            </span>
          </div>
        </div>

        <Button
          onClick={() => c.setIsAddOpen(true)}
          size="sm"
          className="h-9 px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>{t('pantry.addItem')}</span>
        </Button>
      </div>

      {/* 2. Search, Sort Toggle & Category Filter Chips */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <Input
              value={c.searchQuery}
              onChange={(e) => c.setSearchQuery(e.target.value)}
              placeholder={t('pantry.searchPlaceholder')}
              className="h-9 pl-9 bg-card border-border text-xs rounded-xl w-full"
            />
          </div>

          <div className="flex items-center bg-card border border-border rounded-xl p-0.5 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => c.setSortMode('aisle')}
              className={cn(
                'h-8 px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all',
                c.sortMode === 'aisle'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Layers className="w-3 h-3" />
              <span>{t('pantry.expiry.sortByAisle')}</span>
            </button>
            <button
              type="button"
              onClick={() => c.setSortMode('expiry')}
              className={cn(
                'h-8 px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all',
                c.sortMode === 'expiry'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <CalendarClock className="w-3 h-3" />
              <span>{t('pantry.expiry.sortByExpiry')}</span>
            </button>
          </div>
        </div>

        {c.sortMode === 'aisle' && c.resolvedCategories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            <button
              onClick={() => c.setSelectedCategoryFilter(null)}
              className={cn(
                'h-7 px-2.5 rounded-lg text-[11px] font-semibold shrink-0 transition-all cursor-pointer select-none border',
                c.selectedCategoryFilter === null
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {t('common.all')}
            </button>

            {c.resolvedCategories.map((cat) => {
              const isSelected = c.selectedCategoryFilter === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => c.setSelectedCategoryFilter(isSelected ? null : cat.id)}
                  className={cn(
                    'h-7 px-2.5 rounded-lg text-[11px] font-semibold shrink-0 transition-all cursor-pointer select-none border',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  {c.getCategoryLabel(cat.name)}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 3. Items List */}
      {c.isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : c.pantryItems.length === 0 ? (
        <div className="py-16 px-4 bg-card/60 border border-dashed border-border rounded-2xl text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-muted/80 border border-border flex items-center justify-center text-muted-foreground mb-3">
            <Warehouse className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-foreground">{t('pantry.emptyTitle')}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
            {t('pantry.emptySubtitle')}
          </p>
          <Button
            onClick={() => c.setIsAddOpen(true)}
            className="mt-4 h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t('pantry.addItem')}</span>
          </Button>
        </div>
      ) : c.filteredItems.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          {t('common.noResults')}
        </div>
      ) : c.sortMode === 'expiry' ? (
        <div className="flex flex-col gap-2">
          {c.expirySortedItems.map((item) => (
            <PantryItemRow
              key={item.id}
              item={item}
              variant="mobile"
              isEditing={c.editingId === item.id}
              editValue={c.editValue}
              onStartEdit={(it) => {
                c.setEditingId(it.id)
                c.setEditValue(String(it.quantity))
              }}
              onEditValueChange={c.setEditValue}
              onCommitEdit={c.handleCommitEdit}
              onCancelEdit={() => {
                c.setEditingId(null)
                c.setEditValue('')
              }}
              onIncrease={c.handleIncrease}
              onDecrease={c.handleDecrease}
              onRequestDelete={c.requestDelete}
              onUpdateExpirationDate={c.updateExpirationDate}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {c.groupedAisles.map((group, index) => (
            <div key={group.categoryId ?? `pantry_group_${group.name}`} className="flex flex-col gap-2">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider px-1 flex items-center justify-between">
                <span>
                  {group.sort_order !== 99999
                    ? `${index + 1}. ${c.getCategoryLabel(group.name)}`
                    : c.getCategoryLabel(group.name)}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {group.items.length}
                </span>
              </h4>

              <div className="flex flex-col gap-2">
                {group.items.map((item) => (
                  <PantryItemRow
                    key={item.id}
                    item={item}
                    variant="mobile"
                    isEditing={c.editingId === item.id}
                    editValue={c.editValue}
                    onStartEdit={(it) => {
                      c.setEditingId(it.id)
                      c.setEditValue(String(it.quantity))
                    }}
                    onEditValueChange={c.setEditValue}
                    onCommitEdit={c.handleCommitEdit}
                    onCancelEdit={() => {
                      c.setEditingId(null)
                      c.setEditValue('')
                    }}
                    onIncrease={c.handleIncrease}
                    onDecrease={c.handleDecrease}
                    onRequestDelete={c.requestDelete}
                    onUpdateExpirationDate={c.updateExpirationDate}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddPantryItemDialog open={c.isAddOpen} onOpenChange={c.setIsAddOpen} />

      <ConfirmDeleteDialog
        open={c.isDeleteModalOpen}
        onOpenChange={c.setIsDeleteModalOpen}
        itemName={c.itemToDelete?.product?.name || c.itemToDelete?.ad_hoc_name || undefined}
        onConfirm={c.handleConfirmDelete}
      />
    </div>
  )
}
