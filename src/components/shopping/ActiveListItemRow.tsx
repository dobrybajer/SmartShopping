import React from 'react'
import { useTranslation } from '@/i18n'
import type { ActiveListItemWithProduct } from '@/services/shoppingListService'
import type { PantryItemWithDetails } from '@/types/pantry'
import { calculatePantryFreshness } from '@/lib/calculations/pantryCalculations'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Minus, Plus, Warehouse } from 'lucide-react'

interface ActiveListItemRowProps {
  item: ActiveListItemWithProduct
  variant: 'mobile' | 'desktop'
  pantryMapByProductId: Record<string, PantryItemWithDetails>
  pantryMapByAdHocName: Record<string, PantryItemWithDetails>
  pantryItemsByParentId: Record<string, PantryItemWithDetails[]>
  editingId: string | null
  editValue: string
  onToggleCheck: (itemId: string, currentChecked: boolean) => void
  onSelectPantryItem: (item: ActiveListItemWithProduct) => void
  onIncrease: (item: ActiveListItemWithProduct) => void
  onDecrease: (item: ActiveListItemWithProduct) => void
  onStartEdit: (itemId: string, currentQty: number) => void
  onEditInputChange: (val: string) => void
  onCommitEdit: (item: ActiveListItemWithProduct) => void
  onCancelEdit: () => void
}

export const ActiveListItemRow: React.FC<ActiveListItemRowProps> = ({
  item,
  variant,
  pantryMapByProductId,
  pantryMapByAdHocName,
  pantryItemsByParentId,
  editingId,
  editValue,
  onToggleCheck,
  onSelectPantryItem,
  onIncrease,
  onDecrease,
  onStartEdit,
  onEditInputChange,
  onCommitEdit,
  onCancelEdit
}) => {
  const { t, formatUnit, formatQuantity } = useTranslation()
  const isDesktop = variant === 'desktop'

  const isChecked = !!item.is_checked
  const isInPantry = !!item.in_pantry
  const name = item.product?.name || item.ad_hoc_name || 'Product'
  const unit = item.product?.unit_type || 'pcs'

  const childItems = item.product_id ? pantryItemsByParentId[item.product_id] || [] : []
  const directPantryItem = item.product_id
    ? pantryMapByProductId[item.product_id]
    : item.ad_hoc_name
      ? pantryMapByAdHocName[item.ad_hoc_name.toLowerCase().trim()]
      : undefined
  const pantryItem = directPantryItem || (childItems.length > 0 ? childItems[0] : undefined)
  const aggregatedQty =
    childItems.length > 0 && !directPantryItem
      ? childItems.reduce((acc, c) => acc + Number(c.quantity || 0), 0)
      : pantryItem?.quantity

  const isNonFood = !!(
    pantryItem?.category?.is_non_food ||
    pantryItem?.product?.category?.is_non_food ||
    item.product?.category?.is_non_food
  )

  const freshness = pantryItem
    ? calculatePantryFreshness(
        pantryItem.last_purchased_at,
        isNonFood,
        name,
        formatQuantity(aggregatedQty || 0, pantryItem.unit_type),
        pantryItem.last_verified_at
      )
    : null

  return (
    <div
      onClick={() => {
        if (isInPantry) {
          onSelectPantryItem(item)
        } else {
          onToggleCheck(item.id, isChecked)
        }
      }}
      className={cn(
        'rounded-xl flex items-center justify-between cursor-pointer transition-all gap-3',
        isDesktop ? 'p-3 select-none' : 'p-3.5 active:scale-[0.99]',
        isInPantry
          ? isDesktop
            ? 'border border-dashed border-amber-500/40 bg-amber-500/5 opacity-60 hover:border-amber-500/60'
            : 'border border-dashed border-amber-500/40 bg-amber-500/5 opacity-60'
          : isChecked
            ? isDesktop
              ? 'bg-background/40 border border-border/40 opacity-55'
              : 'bg-card/40 border border-border/40 opacity-55'
            : isDesktop
              ? 'bg-background border border-border/80 hover:border-primary/50'
              : 'bg-card border border-border/80'
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isChecked || isInPantry}
            disabled={isInPantry}
            onCheckedChange={() => {
              if (!isInPantry) {
                onToggleCheck(item.id, isChecked)
              }
            }}
            enableHaptics={!isDesktop}
            className={cn(
              isInPantry &&
                'border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500'
            )}
          />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                'font-semibold text-sm transition-all truncate',
                isInPantry
                  ? 'line-through text-amber-500/80 decoration-amber-500/50'
                  : isChecked
                    ? 'line-through text-muted-foreground'
                    : 'text-foreground'
              )}
            >
              {name}
            </span>
            {isInPantry ? (
              <Badge
                variant="secondary"
                className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 gap-1 py-0"
              >
                <Warehouse className="w-3 h-3" />
                <span>{t('pantry.badgeInPantry')}</span>
              </Badge>
            ) : item.added_ad_hoc ? (
              <span className="text-[10px] text-muted-foreground font-mono">
                {t('draft.adHocItem')}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div
          className="flex items-center bg-card border border-border rounded-lg p-0.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDecrease(item)
            }}
            disabled={isChecked || isInPantry}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title={t('common.decrease')}
            aria-label={t('common.decrease')}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {editingId === item.id && !isChecked && !isInPantry ? (
            <div className="flex items-center gap-1 px-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoFocus
                value={editValue}
                onChange={(e) => onEditInputChange(e.target.value)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onCommitEdit(item)
                  else if (e.key === 'Escape') onCancelEdit()
                }}
                onBlur={() => onCommitEdit(item)}
                className="w-14 h-7 bg-background text-center font-mono text-xs font-bold text-primary border border-primary/60 rounded px-1 outline-none ring-1 ring-primary/40 shadow-inner"
              />
              <span className="font-mono text-xs text-primary font-bold pr-1 select-none">
                {formatUnit(unit)}
              </span>
            </div>
          ) : (
            <button
              type="button"
              disabled={isChecked || isInPantry}
              onClick={(e) => {
                e.stopPropagation()
                if (!isChecked && !isInPantry) {
                  onStartEdit(item.id, item.total_quantity)
                }
              }}
              className={cn(
                'font-mono text-xs font-bold min-w-[3.5rem] text-center select-none transition-colors',
                isDesktop ? 'px-2.5 py-0.5 rounded-md' : 'px-2 py-0.5 rounded',
                isInPantry
                  ? 'text-amber-500/70 cursor-default'
                  : isChecked
                    ? 'text-muted-foreground line-through cursor-default'
                    : 'text-primary hover:bg-muted cursor-text'
              )}
              title={isChecked || isInPantry ? undefined : t('common.edit')}
            >
              {formatQuantity(item.total_quantity, unit)}
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onIncrease(item)
            }}
            disabled={isChecked || isInPantry}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title={t('common.increase')}
            aria-label={t('common.increase')}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {!isInPantry && pantryItem && freshness && !isChecked && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onSelectPantryItem(item)
            }}
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer shrink-0 active:scale-90',
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
  )
}

