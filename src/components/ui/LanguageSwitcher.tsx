import React from 'react'
import { useTranslation } from '@/i18n'
import { useAuth } from '@/context/AuthContext'
import type { SupportedLanguage } from '@/i18n/types'
import { Globe } from 'lucide-react'

interface LanguageSwitcherProps {
  variant?: 'pill' | 'segmented' | 'dropdown'
  className?: string
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'pill',
  className = '',
}) => {
  const { language, setLanguage } = useTranslation()
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
        className={`flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-xl ${className}`}
        role="group"
        aria-label="Language selector"
      >
        <button
          type="button"
          onClick={() => handleLanguageChange('pl')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-lg transition-all min-h-[44px] ${
            language === 'pl'
              ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
          aria-pressed={language === 'pl'}
        >
          <span className="text-base leading-none">🇵🇱</span>
          <span>Polski</span>
        </button>
        <button
          type="button"
          onClick={() => handleLanguageChange('en')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-lg transition-all min-h-[44px] ${
            language === 'en'
              ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
          aria-pressed={language === 'en'}
        >
          <span className="text-base leading-none">🇬🇧</span>
          <span>English</span>
        </button>
      </div>
    )
  }

  if (variant === 'dropdown') {
    return (
      <div className={`relative inline-flex items-center ${className}`}>
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
          className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-600 appearance-none pr-8 cursor-pointer"
          aria-label="Select language"
        >
          <option value="pl">🇵🇱 Polski (PL)</option>
          <option value="en">🇬🇧 English (EN)</option>
        </select>
        <Globe className="w-4 h-4 text-zinc-400 absolute right-2.5 pointer-events-none" />
      </div>
    )
  }

  // Default 'pill' variant (Desktop Header)
  return (
    <div
      className={`inline-flex items-center bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-full p-0.5 transition-colors ${className}`}
      role="group"
      aria-label="Language selector"
    >
      <button
        type="button"
        onClick={() => handleLanguageChange('pl')}
        className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 ${
          language === 'pl'
            ? 'bg-zinc-800 text-white shadow-xs'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
        title="Polish"
        aria-pressed={language === 'pl'}
      >
        <span className="text-xs">🇵🇱</span>
        <span>PL</span>
      </button>
      <button
        type="button"
        onClick={() => handleLanguageChange('en')}
        className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 ${
          language === 'en'
            ? 'bg-zinc-800 text-white shadow-xs'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
        title="English language"
        aria-pressed={language === 'en'}
      >
        <span className="text-xs">🇬🇧</span>
        <span>EN</span>
      </button>
    </div>
  )
}
