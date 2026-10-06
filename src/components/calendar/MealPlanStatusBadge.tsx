import React from 'react'
import type { MealStatusDetails } from '@/types/calendar'
import { ShoppingCart, CheckSquare, Check, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { cn } from '@/lib/utils'

interface MealPlanStatusBadgeProps {
  details: MealStatusDetails
  onClickUncertainty?: () => void
  compact?: boolean
  className?: string
}

export const MealPlanStatusBadge: React.FC<MealPlanStatusBadgeProps> = ({
  details,
  onClickUncertainty,
  compact = false,
  className = ''
}) => {
  const { t } = useTranslation()
  const { status, missingIngredients } = details

  switch (status) {
    case 'uncertain':
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClickUncertainty?.()
          }}
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 border border-rose-500/40 text-rose-400 hover:bg-rose-500/25 transition-colors cursor-pointer animate-pulse shadow-xs",
            compact && "px-1.5 py-0 text-[10px]",
            className
          )}
          title={t('calendar.uncertainty.title')}
        >
          <AlertTriangle className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
          <span>{compact ? `⚠️ (${missingIngredients.length})` : t('calendar.status.uncertain')}</span>
        </button>
      )

    case 'bought':
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400",
            compact && "px-1.5 py-0 text-[10px]",
            className
          )}
        >
          <Check className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
          <span>{compact ? '' : t('calendar.status.bought')}</span>
        </span>
      )

    case 'in_list':
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 border border-amber-500/30 text-amber-400",
            compact && "px-1.5 py-0 text-[10px]",
            className
          )}
        >
          <CheckSquare className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
          <span>{compact ? '' : t('calendar.status.inList')}</span>
        </span>
      )

    case 'in_draft':
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-500/15 border border-sky-500/30 text-sky-400",
            compact && "px-1.5 py-0 text-[10px]",
            className
          )}
        >
          <ShoppingCart className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
          <span>{compact ? '' : t('calendar.status.inDraft')}</span>
        </span>
      )

    case 'planned':
    default:
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted/60 border border-border text-muted-foreground",
            compact && "px-1.5 py-0 text-[10px]",
            className
          )}
        >
          <CalendarIcon className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
          <span>{compact ? '' : t('calendar.status.planned')}</span>
        </span>
      )
  }
}
