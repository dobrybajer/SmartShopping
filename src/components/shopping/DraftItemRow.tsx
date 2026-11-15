import React from 'react'
import type { DraftItem } from '@/store/useShoppingStore'
import type { FreshnessCalculationResult } from '@/lib/calculations/pantryCalculations'
import { useTranslation } from '@/i18n'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ShoppingBag, Plus, Minus, Trash2, Utensils, Warehouse } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DraftItemRowProps {
  item: DraftItem
  isSelected: boolean
  isEditing: boolean
  editValue: string
  categoryLabel: string
  hasPantryBadge: boolean
  freshness: FreshnessCalculationResult | null
  variant?: 'desktop' | 'mobile'
  onToggleSelect: (id: string) => void
  onIncrease: (item: DraftItem) => void
  onDecrease: (item: DraftItem) => void
  onStartEdit: (itemId: string, qty: number) => void
  onEditChange: (val: string) => void
  onCommitEdit: (itemId: string) => void
  onCancelEdit: () => void
  onOpenPantryModal: (item: DraftItem) => void
  onRequestDelete?: (item: DraftItem) => void
}

export const DraftItemRow: React.FC<DraftItemRowProps> = ({
  item,
  isSelected,
  isEditing,
  editValue,
  categoryLabel,
  hasPantryBadge,
  freshness,
  variant = 'desktop',
  onToggleSelect,
  onIncrease,
  onDecrease,
  onStartEdit,
  onEditChange,
  onCommitEdit,
  onCancelEdit,
  onOpenPantryModal,
  onRequestDelete
}) => {
  const { t, formatUnit, formatQuantity } = useTranslation()
  const isDesktop = variant === 'desktop'

  return (
    <div
      onClick={() => onToggleSelect(item.id)}
      className={cn(
        'flex items-center justify-between transition-all cursor-pointer',
        isDesktop
          ? 'p-4 rounded-2xl bg-card border border-border hover:border-border/80 gap-4 shadow-sm group'
          : 'p-3.5 gap-3 active:scale-[0.99]',
        !isSelected && (isDesktop ? 'opacity-50 bg-card/40 border-border/40' : 'opacity-50 bg-card/40')
      )}
    >
      <div className="min-w-0 flex-1 flex items-center gap-3">
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(item.id)}
            enableHaptics
          />
        </div>

        {isDesktop && (
          <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/30 transition-colors shrink-0">
            {item.is_ad_hoc ? (
              <ShoppingBag className="w-4 h-4 text-amber-400" />
            ) : (
              <Utensils className="w-4 h-4 text-primary" />
            )}
          </div>
        )}

        <div className={cn('min-w-0', isDesktop ? 'flex flex-col' : 'flex-1')}>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                'text-sm transition-colors',
                isDesktop ? 'font-bold truncate' : 'font-semibold',
                isSelected
                  ? isDesktop
                    ? 'text-foreground group-hover:text-primary'
                    : 'text-foreground'
                  : 'text-muted-foreground line-through decoration-border'
              )}
            >
              {item.name}
            </span>
            {item.is_ad_hoc ? (
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                {t('draft.adHocItem')}
              </Badge>
            ) : item.meal_source ? (
              <Badge
                variant="secondary"
                className={cn(
                  'text-[9px] px-1.5 py-0 text-muted-foreground',
                  isDesktop && 'bg-background border-border'
                )}
              >
                {item.meal_source}
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{categoryLabel}</p>
        </div>
      </div>

      <div
        className={cn('flex items-center shrink-0', isDesktop ? 'gap-3' : 'gap-2')}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            'flex items-center bg-background border border-border',
            isDesktop ? 'rounded-xl p-1 shadow-inner' : 'rounded-lg p-0.5 shrink-0'
          )}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDecrease(item)
            }}
            className={cn(
              'flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer',
              isDesktop ? 'w-8 h-8 rounded-lg' : 'w-9 h-9 min-w-[36px] min-h-[36px] rounded-md'
            )}
            title={t('common.decrease')}
            aria-label={t('common.decrease')}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {isEditing ? (
            <div
              className={cn('flex items-center gap-1', isDesktop ? 'px-1.5' : 'px-1')}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                value={editValue}
                onChange={(e) => onEditChange(e.target.value)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onCommitEdit(item.id)
                  } else if (e.key === 'Escape') {
                    onCancelEdit()
                  }
                }}
                onBlur={() => onCommitEdit(item.id)}
                className={cn(
                  'bg-background text-center font-mono text-xs font-bold text-primary border border-primary/60 rounded px-1 outline-none ring-1 ring-primary/40 shadow-inner',
                  isDesktop ? 'w-16 h-8' : 'w-14 h-7'
                )}
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
                onStartEdit(item.id, item.quantity)
              }}
              className={cn(
                'font-mono text-xs font-bold text-center text-primary hover:bg-muted transition-colors cursor-text select-none',
                isDesktop ? 'px-3 py-1 min-w-[4.5rem] rounded-lg' : 'px-2 py-1 min-h-[36px] flex items-center justify-center min-w-[3.5rem] rounded'
              )}
              title={t('common.edit')}
            >
              {formatQuantity(item.quantity, item.unit_type)}
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onIncrease(item)
            }}
            className={cn(
              'flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer',
              isDesktop ? 'w-8 h-8 rounded-lg' : 'w-9 h-9 min-w-[36px] min-h-[36px] rounded-md'
            )}
            title={t('common.increase')}
            aria-label={t('common.increase')}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {hasPantryBadge && freshness && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpenPantryModal(item)
            }}
            className={cn(
              'flex items-center justify-center border transition-all cursor-pointer shrink-0 active:scale-90',
              isDesktop ? 'w-9 h-9 rounded-xl hover:opacity-80' : 'w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg',
              freshness.badgeBgClass,
              freshness.colorClass
            )}
            title={t('pantry.modal.viewPantryDetails')}
            aria-label={t('pantry.modal.viewPantryDetails')}
          >
            <Warehouse className="w-4 h-4" />
          </button>
        )}

        {isDesktop && onRequestDelete && (
          <button
            type="button"
            onClick={() => onRequestDelete(item)}
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors cursor-pointer"
            title={t('common.delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
