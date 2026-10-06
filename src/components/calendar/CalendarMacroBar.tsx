import React from 'react'
import type { DayMacroSummary } from '@/types/calendar'
import { Flame } from 'lucide-react'
import { useTranslation } from '@/i18n'

interface CalendarMacroBarProps {
  macros: DayMacroSummary
  className?: string
  compact?: boolean
}

export const CalendarMacroBar: React.FC<CalendarMacroBarProps> = ({
  macros,
  className = '',
  compact = false
}) => {
  const { t } = useTranslation()

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
        <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
        <span className="font-semibold text-foreground">{macros.kcal}</span>
        <span className="text-[10px]">{t('common.kcal')}</span>
      </div>
    )
  }

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-2xl bg-card border border-border shadow-xs ${className}`}
    >
      {/* Calories */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
          <Flame className="w-4 h-4 fill-amber-500/20" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground font-medium">{t('common.kcal')}</span>
          <span className="text-base font-bold tracking-tight text-foreground">{macros.kcal}</span>
        </div>
      </div>

      {/* Macros B / W / T */}
      <div className="flex items-center gap-3">
        {/* Protein */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
            {t('common.proteinShort')}
          </span>
          <span className="text-xs font-bold text-sky-400">{macros.protein}g</span>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Carbs */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
            {t('common.carbsShort')}
          </span>
          <span className="text-xs font-bold text-amber-400">{macros.carbs}g</span>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Fat */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
            {t('common.fatShort')}
          </span>
          <span className="text-xs font-bold text-rose-400">{macros.fat}g</span>
        </div>
      </div>
    </div>
  )
}
