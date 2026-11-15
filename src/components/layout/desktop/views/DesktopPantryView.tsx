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
import { Warehouse, Plus, Search, Package, CalendarClock, Layers } from 'lucide-react'

export const DesktopPantryView: React.FC = () => {
  const { t } = useTranslation()
  const c = usePantryViewController()

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* 1. Header Card & Stats Banner */}
      <div className="p-6 rounded-3xl bg-card border border-border shadow-md flex flex-col gap-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Warehouse className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{t('pantry.title')}</h2>
                <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
                  {c.pantryItems.length}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{t('pantry.subtitle')}</p>
            </div>
          </div>

          <Button
            onClick={() => c.setIsAddOpen(true)}
            size="lg"
            className="h-11 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl text-sm flex items-center gap-2 shadow-lg cursor-pointer transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>{t('pantry.addItem')}</span>
          </Button>
        </div>

        {/* 2. Breakdown Pills, Sort Toggle & Search Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4 border-t border-border/80">
          <div className="flex items-center gap-2.5 text-xs flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background border border-border">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Świeże / niedawno:</span>
              <strong className="text-foreground font-mono">{c.stats.fresh}</strong>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background border border-border">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Weryfikacja:</span>
              <strong className="text-foreground font-mono">{c.stats.medium}</strong>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background border border-border">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-muted-foreground">Dawno / uzupełnij:</span>
              <strong className="text-foreground font-mono">{c.stats.old}</strong>
            </div>

            {c.stats.expiringAlerts > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400">
                <CalendarClock className="w-3.5 h-3.5" />
                <span>{t('pantry.expiry.expiringSoon')}:</span>
                <strong className="font-mono">{c.stats.expiringAlerts}</strong>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 sm:w-64 lg:w-72 min-w-[220px]">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <Input
                value={c.searchQuery}
                onChange={(e) => c.setSearchQuery(e.target.value)}
                placeholder={t('pantry.searchPlaceholder')}
                className="h-9 pl-9 bg-background border-border text-foreground text-xs rounded-xl w-full"
              />
            </div>

            <div className="flex items-center bg-background border border-border rounded-xl p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => c.setSortMode('aisle')}
                className={cn(
                  'h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all',
                  c.sortMode === 'aisle'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{t('pantry.expiry.sortByAisle')}</span>
              </button>
              <button
                type="button"
                onClick={() => c.setSortMode('expiry')}
                className={cn(
                  'h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all',
                  c.sortMode === 'expiry'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <CalendarClock className="w-3.5 h-3.5" />
                <span>{t('pantry.expiry.sortByExpiry')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Chips */}
        {c.sortMode === 'aisle' && c.resolvedCategories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-border/40">
            <button
              onClick={() => c.setSelectedCategoryFilter(null)}
              className={cn(
                'h-8 px-3 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer select-none border',
                c.selectedCategoryFilter === null
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted'
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
                    'h-8 px-3 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer select-none border',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  {c.getCategoryLabel(cat.name)}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 3. Items Multi-Column Layout */}
      {c.isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : c.pantryItems.length === 0 ? (
        <div className="py-20 px-6 bg-card/60 border border-dashed border-border rounded-3xl text-center flex flex-col items-center justify-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-muted/80 border border-border flex items-center justify-center text-muted-foreground mb-3">
            <Warehouse className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-foreground">{t('pantry.emptyTitle')}</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
            {t('pantry.emptySubtitle')}
          </p>
          <Button
            onClick={() => c.setIsAddOpen(true)}
            className="mt-5 h-11 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center gap-2 shadow-md cursor-pointer text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t('pantry.addItem')}</span>
          </Button>
        </div>
      ) : c.filteredItems.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {t('common.noResults')}
        </div>
      ) : c.sortMode === 'expiry' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {c.expirySortedItems.map((item) => (
            <PantryItemRow
              key={item.id}
              item={item}
              variant="desktop"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {c.groupedAisles.map((group, index) => (
            <div
              key={group.categoryId ?? `pantry_group_${group.name}`}
              className="p-5 rounded-2xl bg-card border border-border flex flex-col gap-3 shadow-sm h-fit"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-3.5 h-3.5" />
                  <span>
                    {group.sort_order !== 99999
                      ? `${index + 1}. ${c.getCategoryLabel(group.name)}`
                      : c.getCategoryLabel(group.name)}
                  </span>
                </h4>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {group.items.length}
                </Badge>
              </div>

              <div className="flex flex-col gap-2.5">
                {group.items.map((item) => (
                  <PantryItemRow
                    key={item.id}
                    item={item}
                    variant="desktop"
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
