import type { ThemeConfig, ThemeId } from './types'

export const THEMES: ThemeConfig[] = [
  {
    id: 'oled-black',
    nameKey: 'themes.oledBlack.name',
    descriptionKey: 'themes.oledBlack.description',
    isDark: true,
    preview: {
      background: '#000000',
      card: '#0d0d0d',
      primary: '#10b981', // Emerald
      accent: '#27272a',
      border: '#27272a'
    }
  },
  {
    id: 'midnight-blue',
    nameKey: 'themes.midnightBlue.name',
    descriptionKey: 'themes.midnightBlue.description',
    isDark: true,
    preview: {
      background: '#070b14',
      card: '#0f172a',
      primary: '#38bdf8', // Sky Blue
      accent: '#1e293b',
      border: '#1e293b'
    }
  },
  {
    id: 'forest-sage',
    nameKey: 'themes.forestSage.name',
    descriptionKey: 'themes.forestSage.description',
    isDark: true,
    preview: {
      background: '#06100a',
      card: '#0d1f14',
      primary: '#34d399', // Mint Sage
      accent: '#132e1e',
      border: '#1b3b27'
    }
  },
  {
    id: 'warm-amber',
    nameKey: 'themes.warmAmber.name',
    descriptionKey: 'themes.warmAmber.description',
    isDark: true,
    preview: {
      background: '#0d0905',
      card: '#1a130b',
      primary: '#f59e0b', // Amber / Gold
      accent: '#261b0f',
      border: '#382615'
    }
  },
  {
    id: 'cyberpunk-violet',
    nameKey: 'themes.cyberpunkViolet.name',
    descriptionKey: 'themes.cyberpunkViolet.description',
    isDark: true,
    preview: {
      background: '#090514',
      card: '#130d24',
      primary: '#c084fc', // Neon Purple
      accent: '#231545',
      border: '#321c60'
    }
  },
  {
    id: 'clean-light',
    nameKey: 'themes.cleanLight.name',
    descriptionKey: 'themes.cleanLight.description',
    isDark: false,
    preview: {
      background: '#f8fafc',
      card: '#ffffff',
      primary: '#059669', // Deep Emerald
      accent: '#f1f5f9',
      border: '#e2e8f0'
    }
  }
]

export const DEFAULT_THEME: ThemeId = 'oled-black'

export const THEME_STORAGE_KEY = 'smartshopping_theme'

export function isValidTheme(themeId: string | null | undefined): themeId is ThemeId {
  if (!themeId) return false
  return THEMES.some((t) => t.id === themeId)
}

export function getThemeConfig(themeId: ThemeId): ThemeConfig {
  return THEMES.find((t) => t.id === themeId) || THEMES[0]
}
