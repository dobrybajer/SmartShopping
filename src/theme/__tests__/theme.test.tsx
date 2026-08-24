import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import {
  THEMES,
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  isValidTheme,
  getThemeConfig,
  ThemeProvider,
  useTheme
} from '../index'
import { en } from '@/i18n/locales/en'
import { pl } from '@/i18n/locales/pl'

describe('Theme Engine & Catalog (ADR-004)', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    vi.clearAllMocks()
  })

  describe('Theme Catalog & Registry Integrity', () => {
    it('should contain all 6 core curated themes', () => {
      const themeIds = THEMES.map((t) => t.id)
      expect(themeIds).toEqual([
        'oled-black',
        'midnight-blue',
        'forest-sage',
        'warm-amber',
        'cyberpunk-violet',
        'clean-light'
      ])
    })

    it('should have DEFAULT_THEME set to oled-black', () => {
      expect(DEFAULT_THEME).toBe('oled-black')
    })

    it('should have complete preview color definitions for every theme', () => {
      for (const theme of THEMES) {
        expect(theme.preview.background, `Theme ${theme.id} missing preview.background`).toBeTruthy()
        expect(theme.preview.card, `Theme ${theme.id} missing preview.card`).toBeTruthy()
        expect(theme.preview.primary, `Theme ${theme.id} missing preview.primary`).toBeTruthy()
        expect(theme.preview.accent, `Theme ${theme.id} missing preview.accent`).toBeTruthy()
        expect(theme.preview.border, `Theme ${theme.id} missing preview.border`).toBeTruthy()
      }
    })

    it('should validate theme IDs with isValidTheme helper', () => {
      expect(isValidTheme('oled-black')).toBe(true)
      expect(isValidTheme('midnight-blue')).toBe(true)
      expect(isValidTheme('forest-sage')).toBe(true)
      expect(isValidTheme('warm-amber')).toBe(true)
      expect(isValidTheme('cyberpunk-violet')).toBe(true)
      expect(isValidTheme('clean-light')).toBe(true)

      expect(isValidTheme('invalid-theme')).toBe(false)
      expect(isValidTheme('')).toBe(false)
      expect(isValidTheme(null)).toBe(false)
      expect(isValidTheme(undefined)).toBe(false)
    })

    it('should retrieve theme config and gracefully fall back to default for unknown IDs', () => {
      const midnight = getThemeConfig('midnight-blue')
      expect(midnight.id).toBe('midnight-blue')
      expect(midnight.isDark).toBe(true)

      const light = getThemeConfig('clean-light')
      expect(light.id).toBe('clean-light')
      expect(light.isDark).toBe(false)

      const fallback = getThemeConfig('unknown' as any)
      expect(fallback.id).toBe(DEFAULT_THEME)
    })

    it('should ensure every registered theme has corresponding translation keys in en.ts and pl.ts', () => {
      for (const theme of THEMES) {
        // Name key format: themes.<camelCaseId>.name
        const keyParts = theme.nameKey.split('.')
        expect(keyParts[0]).toBe('themes')
        const themeSubKey = keyParts[1] as keyof typeof en.themes

        expect((en.themes as any)[themeSubKey], `en.ts missing themes.${themeSubKey}`).toBeDefined()
        expect((pl.themes as any)[themeSubKey], `pl.ts missing themes.${themeSubKey}`).toBeDefined()

        expect((en.themes as any)[themeSubKey]?.name).toBeTruthy()
        expect((pl.themes as any)[themeSubKey]?.name).toBeTruthy()
        expect((en.themes as any)[themeSubKey]?.description).toBeTruthy()
        expect((pl.themes as any)[themeSubKey]?.description).toBeTruthy()
      }
    })
  })

  describe('ThemeProvider & useTheme Hook', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    )

    it('should initialize with default theme if localStorage is empty', () => {
      const { result } = renderHook(() => useTheme(), { wrapper })

      expect(result.current.currentTheme).toBe('oled-black')
      expect(result.current.isDark).toBe(true)
      expect(document.documentElement.getAttribute('data-theme')).toBe('oled-black')
    })

    it('should initialize with stored theme from localStorage', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'forest-sage')

      const { result } = renderHook(() => useTheme(), { wrapper })

      expect(result.current.currentTheme).toBe('forest-sage')
      expect(document.documentElement.getAttribute('data-theme')).toBe('forest-sage')
    })

    it('should ignore corrupt/invalid values in localStorage and fall back to default', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'corrupted_theme_name')

      const { result } = renderHook(() => useTheme(), { wrapper })

      expect(result.current.currentTheme).toBe('oled-black')
      expect(document.documentElement.getAttribute('data-theme')).toBe('oled-black')
    })

    it('should update DOM and localStorage when setTheme is called', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper })

      await act(async () => {
        await result.current.setTheme('warm-amber')
      })

      expect(result.current.currentTheme).toBe('warm-amber')
      expect(result.current.themeConfig.id).toBe('warm-amber')
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('warm-amber')
      expect(document.documentElement.getAttribute('data-theme')).toBe('warm-amber')
    })

    it('should switch to clean-light and correctly report isDark: false', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper })

      await act(async () => {
        await result.current.setTheme('clean-light')
      })

      expect(result.current.currentTheme).toBe('clean-light')
      expect(result.current.isDark).toBe(false)
      expect(document.documentElement.getAttribute('data-theme')).toBe('clean-light')
    })

    it('should ignore invalid theme IDs passed to setTheme', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper })

      await act(async () => {
        await result.current.setTheme('invalid' as any)
      })

      expect(result.current.currentTheme).toBe('oled-black')
      expect(document.documentElement.getAttribute('data-theme')).toBe('oled-black')
    })

    it('should throw an error when useTheme is used outside of ThemeProvider', () => {
      expect(() => {
        renderHook(() => useTheme())
      }).toThrow('useTheme must be used within a ThemeProvider')
    })
  })
})
