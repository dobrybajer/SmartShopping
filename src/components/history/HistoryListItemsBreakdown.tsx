import React from 'react'
import { useTranslation } from '@/i18n'
import type { AisleGroup } from '@/lib/calculations/categorySorting'
import type { ActiveListItemWithProduct } from '@/services/shoppingListService'
import { Button } from '@/components/ui/button'
import { Check, Plus, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HistoryListItemsBreakdownProps {
  sortedCategories: AisleGroup<ActiveListItemWithProduct>[]
  addedItemIds: Record<string, boolean>
  getCategoryLabel: (catName: string) => string
  onAddSingleItem: (
    item: ActiveListItemWithProduct,
    group: AisleGroup<ActiveListItemWithProduct>
  ) => void
  variant?: 'desktop' | 'mobile'
}

export const HistoryListItemsBreakdown: React.FC<HistoryListItemsBreakdownProps> = ({
  sortedCategories,
  addedItemIds,
  getCategoryLabel,
  onAddSingleItem,
  variant = 'desktop'
}) => {
  const { t, formatQuantity } = useTranslation()
  const isDesktop = variant === 'desktop'

  return (
    <div
      className={cn(
        'flex flex-col',
        isDesktop ? 'gap-5 max-h-[480px] overflow-y-auto pr-1' : 'gap-4'
      )}
    >
      {sortedCategories.map((group) => (
        <div key={group.categoryId ?? `group_${group.name}`} className="flex flex-col gap-2">
          <h4
            className={cn(
              'font-bold text-primary uppercase tracking-wider px-1 flex items-center justify-between',
              isDesktop ? 'text-xs' : 'text-[11px]'
            )}
          >
            <span>
              {group.sort_order !== 99999
                ? `${group.sort_order / 10 || 1}. ${getCategoryLabel(group.name)}`
                : getCategoryLabel(group.name)}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {formatQuantity(group.items.length, 'pcs')}
            </span>
          </h4>

          <div className={cn('flex flex-col', isDesktop ? 'gap-2' : 'gap-1.5')}>
            {group.items.map((item) => {
              const name = item.product?.name || item.ad_hoc_name || 'Product'
              const unit = item.product?.unit_type || 'pcs'
              const isItemAdded = addedItemIds[item.id]

              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center justify-between transition-all',
                    isDesktop
                      ? 'p-3.5 rounded-2xl bg-card border border-border gap-3 shadow-xs'
                      : cn(
                          'p-3 rounded-xl bg-card border',
                          item.is_checked ? 'border-border/60 bg-card/70' : 'border-border'
                        )
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center min-w-0',
                      isDesktop ? 'gap-3' : 'gap-2.5 pr-2'
                    )}
                  >
                    <div
                      className={cn(
                        'rounded-full flex items-center justify-center shrink-0',
                        isDesktop ? 'w-5 h-5 text-xs' : 'w-4 h-4 text-[10px]',
                        item.is_checked
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : isDesktop
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-muted text-muted-foreground border border-border'
                      )}
                    >
                      {item.is_checked ? (
                        <Check className={isDesktop ? 'w-3 h-3' : 'w-2.5 h-2.5'} />
                      ) : null}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span
                        className={cn(
                          'text-foreground truncate',
                          isDesktop ? 'font-bold text-sm' : 'font-semibold text-xs'
                        )}
                      >
                        {name}
                      </span>
                      {item.added_ad_hoc && (
                        <span
                          className={cn(
                            'text-muted-foreground font-mono',
                            isDesktop ? 'text-[10px]' : 'text-[9px]'
                          )}
                        >
                          {t('draft.adHocItem')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={cn('flex items-center shrink-0', isDesktop ? 'gap-2.5' : 'gap-2')}>
                    <span
                      className={cn(
                        'font-mono text-xs text-primary font-bold',
                        isDesktop
                          ? 'bg-background border border-border px-2.5 py-1 rounded-xl'
                          : 'bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg'
                      )}
                    >
                      {formatQuantity(item.total_quantity, unit)}
                    </span>

                    <Button
                      onClick={() => onAddSingleItem(item, group)}
                      size="sm"
                      variant="outline"
                      className={cn(
                        'h-8 px-2.5 text-xs border transition-all cursor-pointer',
                        isDesktop ? 'rounded-xl' : 'rounded-lg',
                        isItemAdded
                          ? 'bg-primary text-primary-foreground border-primary font-bold'
                          : 'bg-card hover:bg-muted text-foreground border-border hover:border-primary/40 hover:text-primary'
                      )}
                      title={t('history.restoreToDraft')}
                    >
                      {isItemAdded ? (
                        <span className="flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span className={isDesktop ? undefined : 'text-[10px]'}>
                            {t('toasts.saved')}
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5 text-primary" />
                          <ShoppingCart className={isDesktop ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

