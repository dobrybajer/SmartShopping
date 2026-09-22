import { useCallback } from 'react'
import { create } from 'zustand'
import { en } from './locales/en'
import { pl } from './locales/pl'
import type { SupportedLanguage, TranslationDictionary, PluralForms } from './types'
export type { SupportedLanguage, TranslationDictionary, PluralForms } from './types'

export const translations: Record<SupportedLanguage, TranslationDictionary> = { en, pl }

export const STORAGE_KEY = 'smartshopping_language'

export interface I18nState {
  language: SupportedLanguage
  setLanguage: (lang: SupportedLanguage) => void
}

export const getInitialLanguage = (): SupportedLanguage => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null
      if (stored === 'pl' || stored === 'en') {
        return stored
      }
    }
  } catch {
    // Ignore localStorage access errors (e.g. private browsing)
  }

  if (typeof navigator !== 'undefined' && navigator.language) {
    if (navigator.language.toLowerCase().startsWith('pl')) {
      return 'pl'
    }
  }

  return 'pl' // Polish is the default locale
}

export const useI18nStore = create<I18nState>((set) => ({
  language: getInitialLanguage(),
  setLanguage: (lang) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, lang)
      }
    } catch {
      // Ignore
    }
    set({ language: lang })
  },
}))

export const formatTranslation = (
  currentDict: any,
  fallbackDict: any,
  language: SupportedLanguage,
  path: string,
  params?: Record<string, string | number>
): string => {
  const keys = path.split('.')
  let current: any = currentDict

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key]
    } else {
      // Fallback to English dictionary
      let fallback: any = fallbackDict
      for (const fbKey of keys) {
        if (fallback && typeof fallback === 'object' && fbKey in fallback) {
          fallback = fallback[fbKey]
        } else {
          fallback = path
          break
        }
      }
      current = fallback
      break
    }
  }

  // Handle Pluralization via native Intl.PluralRules
  if (current && typeof current === 'object' && ('one' in current || 'other' in current)) {
    const count = params?.count !== undefined ? Number(params.count) : 0
    try {
      const pr = new Intl.PluralRules(language)
      const rule = pr.select(count) as keyof PluralForms
      const pluralForms = current as PluralForms
      current = pluralForms[rule] || pluralForms.other || pluralForms.many || pluralForms.few || pluralForms.one || ''
    } catch {
      const pluralForms = current as PluralForms
      current = count === 1 ? pluralForms.one : pluralForms.other || ''
    }
  }

  if (typeof current !== 'string') {
    return path
  }

  // Parameter Interpolation ({count}, {name}, etc.)
  if (params) {
    return Object.entries(params).reduce(
      (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      current
    )
  }

  return current
}

export const translate = (
  path: string,
  params?: Record<string, string | number>,
  language?: SupportedLanguage
): string => {
  const activeLang = language || useI18nStore.getState().language || 'pl'
  const currentDict = translations[activeLang] || translations.en
  return formatTranslation(currentDict, translations.en, activeLang, path, params)
}

export const useTranslation = () => {
  const { language, setLanguage } = useI18nStore()
  const currentDict = translations[language] || translations.en

  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      return formatTranslation(currentDict, translations.en, language, path, params)
    },
    [language, currentDict]
  )

  const formatUnit = useCallback(
    (unit: 'g' | 'ml' | 'pcs' | string, count?: number): string => {
      if (unit === 'pcs') {
        return count !== undefined
          ? t('units.pcs', { count })
          : t('units.pcsShort')
      }
      if (unit === 'g') return t('units.g')
      if (unit === 'ml') return t('units.ml')
      return unit
    },
    [t]
  )

  const formatQuantity = useCallback(
    (count: number, unit: 'g' | 'ml' | 'pcs' | string): string => {
      return `${count} ${formatUnit(unit, count)}`
    },
    [formatUnit]
  )

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions): string => {
      try {
        return new Intl.NumberFormat(language === 'pl' ? 'pl-PL' : 'en-US', options).format(value)
      } catch {
        return String(value)
      }
    },
    [language]
  )

  const formatDate = useCallback(
    (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
      try {
        const d = typeof date === 'string' ? new Date(date) : date
        return new Intl.DateTimeFormat(
          language === 'pl' ? 'pl-PL' : 'en-US',
          options || { dateStyle: 'medium' }
        ).format(d)
      } catch {
        return String(date)
      }
    },
    [language]
  )

  const formatTime = useCallback(
    (date: string | Date | null | undefined): string => {
      if (!date) return ''
      try {
        const d = typeof date === 'string' ? new Date(date) : date
        if (isNaN(d.getTime())) return ''
        const hours = String(d.getHours()).padStart(2, '0')
        const minutes = String(d.getMinutes()).padStart(2, '0')
        return `${hours}:${minutes}`
      } catch {
        return ''
      }
    },
    []
  )

  return {
    t,
    language,
    setLanguage,
    formatUnit,
    formatQuantity,
    formatNumber,
    formatDate,
    formatTime,
  }
}
