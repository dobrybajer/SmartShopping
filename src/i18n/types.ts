import type { en } from './locales/en'

export type SupportedLanguage = 'pl' | 'en'

export interface PluralForms {
  one: string
  few?: string
  many?: string
  other: string
}

export type DeepLocale<T> = {
  [K in keyof T]: T[K] extends { one: string; other: string }
    ? PluralForms
    : T[K] extends object
    ? DeepLocale<T[K]>
    : string
}

export type TranslationSchema = DeepLocale<typeof en>
export type TranslationDictionary = typeof en

type Prev = [never, 0, 1, 2, 3, 4, ...0[]]

export type NestedKeyOf<T, Depth extends number = 3> = [Depth] extends [never]
  ? never
  : T extends { one: string; other: string }
  ? never
  : T extends object
  ? {
      [K in keyof T & (string | number)]: T[K] extends { one: string; other: string }
        ? `${K}`
        : T[K] extends object
        ? `${K}` | `${K}.${NestedKeyOf<T[K], Prev[Depth]>}`
        : `${K}`
    }[keyof T & (string | number)]
  : never

export type TranslationKey = NestedKeyOf<TranslationDictionary>
