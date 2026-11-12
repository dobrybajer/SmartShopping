import React, { useState } from 'react'
import { useTranslation } from '@/i18n'
import type { PantryItemWithDetails } from '@/types/pantry'
import { calculateExpiryStatus, calculatePantryFreshness } from '@/lib/calculations/pantryCalculations'
import { cn } from '@/lib/utils'
import { SwipeToDismiss } from '@/components/ui/SwipeToDismiss'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Minus,
  Plus,
  Trash2,
  X
} from 'lucide-react'

interface PantryItemRowProps {
  item: PantryItemWithDetails
  variant: 'mobile' | 'desktop'
  isEditing: boolean
  editValue: string
  onStartEdit: (item: PantryItemWithDetails) => void
  onEditValueChange: (val: string) => void
  onCommitEdit: (itemId: string) => void
  onCancelEdit: () => void
  onIncrease: (item: PantryItemWithDetails) => void
  onDecrease: (item: PantryItemWithDetails) => void
  onRequestDelete: (item: PantryItemWithDetails) => void
  onUpdateExpirationDate: (itemId: string, expirationDate: string | null) => Promise<boolean>
}

export const PantryItemRow: React.FC<PantryItemRowProps> = ({
  item,
  variant,
  isEditing,
  editValue,
  onStartEdit,
  onEditValueChange,
  onCommitEdit,
  onCancelEdit,
  onIncrease,
  onDecrease,
  onRequestDelete,
  onUpdateExpirationDate
}) => {
  const { t, formatUnit, formatQuantity, formatDate } = useTranslation()
  const [isEditingExpiry, setIsEditingExpiry] = useState(false)

  const name = item.product?.name || item.ad_hoc_name || 'Product'
  const isNonFood = !!(item.category?.is_non_food || item.product?.category?.is_non_food)
  const freshness = calculatePantryFreshness(
    item.last_purchased_at,
    isNonFood,
    name,
    formatQuantity(item.quantity, item.unit_type),
    item.last_verified_at
  )
  const expiry = calculateExpiryStatus(item.expiration_date)

  const isDesktop = variant === 'desktop'
  const stepBtnSize = isDesktop ? 'w-8 h-8 rounded-lg' : 'w-7 h-7 rounded-md'

  const card = (
    <div
      className={cn(
        'p-3.5 rounded-xl flex items-center justify-between gap-3 transition-all',
        isDesktop
          ? 'bg-background border border-border/80 hover:border-border select-none'
          : 'bg-card border border-border shadow-xs',
        expiry.isAlert && 'border-rose-500/40'
      )}
    >
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-foreground truncate">{name}</span>
          <span
            className={cn(
              'w-2.5 h-2.5 rounded-full shrink-0',
              freshness.level === 'fresh' && 'bg-emerald-500',
              freshness.level === 'medium' && 'bg-amber-500',
              freshness.level === 'old' && 'bg-rose-500',
              freshness.level === 'unknown' && 'bg-muted-foreground'
            )}
            title={t(freshness.messageKey as never, freshness.translationParams as never)}
          />

          {expiry.level !== 'none' && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0 font-semibold flex items-center gap-1 cursor-pointer',
                expiry.badgeClass
              )}
              onClick={() => setIsEditingExpiry((prev) => !prev)}
            >
              {expiry.isAlert && <AlertTriangle className="w-3 h-3 shrink-0" />}
              <span>
                {expiry.level === 'upcoming' && expiry.daysRemaining !== null
                  ? t(expiry.messageKey as never, { days: expiry.daysRemaining } as never)
                  : expiry.level === 'ok' && item.expiration_date
                    ? t(expiry.messageKey as never, { date: item.expiration_date } as never)
                    : t(expiry.messageKey as never)}
              </span>
              {expiry.isAlert && item.expiration_date && (
                <span className="font-mono opacity-80">({item.expiration_date})</span>
              )}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1 flex-wrap">
          {item.last_purchased_at && (
            <span className="flex items-center gap-1 font-mono">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(item.last_purchased_at)}</span>
            </span>
          )}
          {item.last_verified_at && (
            <span className="flex items-center gap-1 font-mono text-emerald-400/90">
              <CheckCircle2 className="w-3 h-3" />
              <span>{t('pantry.verifiedBadge')}</span>
            </span>
          )}
          {expiry.level === 'none' && !isEditingExpiry && (
            <button
              type="button"
              onClick={() => setIsEditingExpiry(true)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <CalendarClock className="w-3 h-3" />
              <span>{t('pantry.expiry.setDate')}</span>
            </button>
          )}
        </div>

        {isEditingExpiry && (
          <div className="flex items-center gap-1.5 mt-2">
            <input
              type="date"
              aria-label={t('pantry.expiry.label')}
              value={item.expiration_date ? item.expiration_date.slice(0, 10) : ''}
              onChange={(e) => {
                const val = e.target.value || null
                void onUpdateExpirationDate(item.id, val)
                setIsEditingExpiry(false)
              }}
              className="h-7 px-2 rounded-lg bg-background border border-border text-foreground font-mono text-[11px] outline-none focus:ring-1 focus:ring-primary"
            />
            {item.expiration_date && (
              <button
                type="button"
                onClick={() => {
                  void onUpdateExpirationDate(item.id, null)
                  setIsEditingExpiry(false)
                }}
                className="h-7 px-2 rounded-lg text-[10px] text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                title={t('pantry.expiry.clearDate')}
                aria-label={t('pantry.expiry.clearDate')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div
          className={cn(
            'flex items-center border border-border shrink-0',
            isDesktop ? 'bg-card rounded-xl p-1 shadow-inner' : 'bg-background rounded-lg p-0.5'
          )}
        >
          <button
            type="button"
            onClick={() => onDecrease(item)}
            className={cn(
              stepBtnSize,
              'flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer'
            )}
            title={t('common.decrease')}
            aria-label={t('common.decrease')}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {isEditing ? (
            <div className={cn('flex items-center gap-1', isDesktop ? 'px-1.5' : 'px-1')}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoFocus
                value={editValue}
                onChange={(e) => onEditValueChange(e.target.value.replace(/[^0-9.]/g, ''))}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onCommitEdit(item.id)
                  else if (e.key === 'Escape') onCancelEdit()
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
              onClick={() => onStartEdit(item)}
              className={cn(
                'font-mono text-xs font-bold text-center text-primary hover:bg-muted transition-colors cursor-text select-none',
                isDesktop ? 'px-3 py-1 min-w-[4.5rem] rounded-lg' : 'px-2 py-0.5 min-w-[3.5rem] rounded'
              )}
              title={t('common.edit')}
            >
              {formatQuantity(item.quantity, item.unit_type)}
            </button>
          )}

          <button
            type="button"
            onClick={() => onIncrease(item)}
            className={cn(
              stepBtnSize,
              'flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer'
            )}
            title={t('common.increase')}
            aria-label={t('common.increase')}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {isDesktop && (
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

  if (!isDesktop) {
    return (
      <SwipeToDismiss onDismiss={() => onRequestDelete(item)}>
        {card}
      </SwipeToDismiss>
    )
  }

  return card
}

