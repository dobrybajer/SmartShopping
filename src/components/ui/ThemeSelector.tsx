import React from 'react'
import { useTheme } from '@/theme'
import { useTranslation } from '@/i18n'
import type { ThemeId } from '@/theme'
import { Check } from 'lucide-react'

interface ThemeSelectorProps {
  variant?: 'grid' | 'compact'
  className?: string
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  variant = 'grid',
  className = ''
}) => {
  const { currentTheme, setTheme, availableThemes } = useTheme()
  const { t } = useTranslation()

  const handleSelect = (themeId: ThemeId) => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(50)
      } catch {
        // Ignore vibration errors
      }
    }
    setTheme(themeId)
  }

  if (variant === 'compact') {
    return (
      <div
        role="radiogroup"
        aria-label={t('dialogs.account.themeTitle')}
        className={`flex gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar ${className}`}
      >
        {availableThemes.map((theme) => {
          const isSelected = currentTheme === theme.id
          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleSelect(theme.id)}
              className={`group shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/30 shadow-md scale-[1.02]'
                  : 'border-border/60 hover:border-border hover:scale-[1.01]'
              }`}
              style={{ backgroundColor: theme.preview.card }}
            >
              <div
                className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm shrink-0"
                style={{ backgroundColor: theme.preview.primary }}
              />
              <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                {t(theme.nameKey)}
              </span>
              {isSelected && (
                <div className="w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      role="radiogroup"
      aria-label={t('dialogs.account.themeTitle')}
      className={`grid grid-cols-2 sm:grid-cols-3 gap-2.5 ${className}`}
    >
      {availableThemes.map((theme) => {
        const isSelected = currentTheme === theme.id
        return (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => handleSelect(theme.id)}
            className={`group relative flex flex-col p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isSelected
                ? 'border-primary ring-2 ring-primary/30 shadow-lg scale-[1.02]'
                : 'border-border/60 hover:border-border hover:scale-[1.01]'
            }`}
            style={{ backgroundColor: theme.preview.card }}
          >
            {/* Color Palette Preview Ribbon */}
            <div className="flex items-center gap-1.5 mb-2">
              {/* Primary Accent Dot */}
              <div
                className="w-4 h-4 rounded-full border border-white/20 shadow-sm shrink-0"
                style={{ backgroundColor: theme.preview.primary }}
                title={`Primary: ${theme.preview.primary}`}
              />
              {/* Background Tone Dot */}
              <div
                className="w-3 h-3 rounded-full border border-white/10 shrink-0"
                style={{ backgroundColor: theme.preview.background }}
                title={`Background: ${theme.preview.background}`}
              />
              {/* Surface Border Dot */}
              <div
                className="w-3 h-3 rounded-full border border-white/10 shrink-0"
                style={{ backgroundColor: theme.preview.border }}
                title={`Border: ${theme.preview.border}`}
              />

              {isSelected && (
                <div className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
            </div>

            <div className="text-xs font-bold text-foreground truncate">
              {t(theme.nameKey)}
            </div>
            <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 leading-tight">
              {t(theme.descriptionKey)}
            </div>
          </button>
        )
      })}
    </div>
  )
}
