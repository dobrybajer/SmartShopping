import React from 'react'
import { useTranslation } from '@/i18n'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  calculateHistoryListStatus,
  type ItemCheckSummary,
  type HistoryListCompletionStatus
} from '@/lib/calculations/historyStatusCalculations'

export interface HistoryStatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: ItemCheckSummary[] | null
  status?: HistoryListCompletionStatus
  showIcon?: boolean
  className?: string
}

export const HistoryStatusBadge: React.FC<HistoryStatusBadgeProps> = ({
  items,
  status: statusOverride,
  showIcon = true,
  className,
  ...props
}) => {
  const { t } = useTranslation()

  const calculated = calculateHistoryListStatus(items)
  const finalStatus: HistoryListCompletionStatus = statusOverride || calculated.status

  if (finalStatus === 'completed') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 shadow-2xs',
          className
        )}
        {...props}
      >
        {showIcon && <CheckCircle2 className="w-3 h-3 mr-1 shrink-0 text-emerald-500 dark:text-emerald-400" />}
        <span>{t('history.completedOn')}</span>
      </Badge>
    )
  }

  if (finalStatus === 'partially_completed') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 shadow-2xs',
          className
        )}
        {...props}
      >
        {showIcon && <CheckCircle2 className="w-3 h-3 mr-1 shrink-0 text-amber-500 dark:text-amber-400" />}
        <span>{t('history.completedOn')}</span>
      </Badge>
    )
  }

  // not_completed
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 shadow-2xs',
        className
      )}
      {...props}
    >
      {showIcon && <XCircle className="w-3 h-3 mr-1 shrink-0 text-rose-500 dark:text-rose-400" />}
      <span>{t('history.notCompleted')}</span>
    </Badge>
  )
}
