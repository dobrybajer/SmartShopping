import React from 'react'
import { useTranslation } from '@/i18n'
import { useAuth } from '@/context/AuthContext'
import type { SupportedLanguage } from '@/i18n/types'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LanguageSwitcherProps {
  variant?: 'pill' | 'segmented' | 'dropdown'
  className?: string
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'pill',
  className = '',
}) => {
  const { language, setLanguage, t } = useTranslation()
  const { updateUserLanguage } = useAuth()

  const handleLanguageChange = async (newLang: SupportedLanguage) => {
    if (newLang === language) return

    // Trigger subtle haptic feedback on mobile touch devices
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(50)
      } catch {
        // Ignore vibration errors
      }
    }

    setLanguage(newLang)
    if (updateUserLanguage) {
      await updateUserLanguage(newLang)
    }
  }

  if (variant === 'segmented') {
    return (
      <div
        className={cn(
          "flex items-center p-1 bg-background border border-border rounded-xl",
          className
        )}
        role="group"
        aria-label={t('common.language')}
      >
        <button
          type="button"
          onClick={() => handleLanguageChange('pl')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-4 text-xs sm:text-sm rounded-lg transition-all min-h-[40px] font-semibold cursor-pointer",
            language === 'pl'
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
          aria-pressed={language === 'pl'}
        >
          <span className={cn(
            "text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase",
            language === 'pl' ? "bg-black/15 text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            PL
          </span>
          <span>Polski</span>
        </button>
        <button
          type="button"
          onClick={() => handleLanguageChange('en')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-4 text-xs sm:text-sm rounded-lg transition-all min-h-[40px] font-semibold cursor-pointer",
            language === 'en'
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
          aria-pressed={language === 'en'}
        >
          <span className={cn(
            "text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase",
            language === 'en' ? "bg-black/15 text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            EN
          </span>
          <span>English</span>
        </button>
      </div>
    )
  }

  if (variant === 'dropdown') {
    return (
      <div className={cn("relative inline-flex items-center", className)}>
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
          className="bg-card border border-border text-foreground text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-primary appearance-none pr-8 cursor-pointer"
          aria-label={t('common.language')}
        >
          <option value="pl" className="bg-card text-foreground">Polski (PL)</option>
          <option value="en" className="bg-card text-foreground">English (EN)</option>
        </select>
        <Globe className="w-4 h-4 text-muted-foreground absolute right-2.5 pointer-events-none" />
      </div>
    )
  }

  // Default 'pill' variant (Desktop Header & LoginScreen)
  return (
    <div
      className={cn(
        "inline-flex items-center bg-card border border-border hover:border-border/80 rounded-full p-0.5 transition-colors shadow-xs",
        className
      )}
      role="group"
      aria-label={t('common.language')}
    >
      <button
        type="button"
        onClick={() => handleLanguageChange('pl')}
        className={cn(
          "px-2.5 py-1 text-xs font-bold rounded-full transition-all flex items-center gap-1 cursor-pointer",
          language === 'pl'
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        )}
        title="Polski"
        aria-pressed={language === 'pl'}
      >
        <span>PL</span>
      </button>
      <button
        type="button"
        onClick={() => handleLanguageChange('en')}
        className={cn(
          "px-2.5 py-1 text-xs font-bold rounded-full transition-all flex items-center gap-1 cursor-pointer",
          language === 'en'
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        )}
        title="English"
        aria-pressed={language === 'en'}
      >
        <span>EN</span>
      </button>
    </div>
  )
}
