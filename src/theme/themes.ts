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
      primary: '#0e7650', // Deep Emerald (WCAG AA compliant)
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

export type HslTuple = [number, number, number]

export interface ThemeHslPalette {
  background: HslTuple
  foreground: HslTuple
  card: HslTuple
  cardForeground: HslTuple
  popover: HslTuple
  popoverForeground: HslTuple
  primary: HslTuple
  primaryForeground: HslTuple
  secondary: HslTuple
  secondaryForeground: HslTuple
  mutedForeground: HslTuple
  destructive: HslTuple
  destructiveForeground: HslTuple
}

/**
 * Canonical HSL palettes synchronized with `src/index.css` for automated WCAG 2.1 AA contrast validation.
 */
export const THEME_HSL_TOKENS: Record<ThemeId, ThemeHslPalette> = {
  'oled-black': {
    background: [0, 0, 0],
    foreground: [210, 40, 98],
    card: [0, 0, 5],
    cardForeground: [210, 40, 98],
    popover: [0, 0, 5],
    popoverForeground: [210, 40, 98],
    primary: [158, 64, 52],
    primaryForeground: [0, 0, 0],
    secondary: [240, 3.7, 15.9],
    secondaryForeground: [210, 40, 98],
    mutedForeground: [240, 5, 64.9],
    destructive: [0, 62.8, 30.6],
    destructiveForeground: [210, 40, 98]
  },
  'midnight-blue': {
    background: [222, 47, 5],
    foreground: [210, 40, 98],
    card: [222, 47, 9],
    cardForeground: [210, 40, 98],
    popover: [222, 47, 9],
    popoverForeground: [210, 40, 98],
    primary: [199, 89, 48],
    primaryForeground: [222, 47, 5],
    secondary: [217, 33, 17],
    secondaryForeground: [210, 40, 98],
    mutedForeground: [215, 20, 65],
    destructive: [0, 62.8, 30.6],
    destructiveForeground: [210, 40, 98]
  },
  'forest-sage': {
    background: [150, 40, 4],
    foreground: [140, 20, 96],
    card: [150, 35, 8],
    cardForeground: [140, 20, 96],
    popover: [150, 35, 8],
    popoverForeground: [140, 20, 96],
    primary: [152, 57, 53],
    primaryForeground: [150, 40, 4],
    secondary: [150, 25, 15],
    secondaryForeground: [140, 20, 96],
    mutedForeground: [145, 15, 60],
    destructive: [0, 62.8, 30.6],
    destructiveForeground: [140, 20, 96]
  },
  'warm-amber': {
    background: [24, 25, 4],
    foreground: [35, 30, 96],
    card: [24, 22, 8],
    cardForeground: [35, 30, 96],
    popover: [24, 22, 8],
    popoverForeground: [35, 30, 96],
    primary: [38, 92, 50],
    primaryForeground: [24, 25, 4],
    secondary: [24, 18, 15],
    secondaryForeground: [35, 30, 96],
    mutedForeground: [30, 15, 60],
    destructive: [0, 62.8, 30.6],
    destructiveForeground: [35, 30, 96]
  },
  'cyberpunk-violet': {
    background: [270, 35, 4],
    foreground: [270, 30, 96],
    card: [270, 30, 9],
    cardForeground: [270, 30, 96],
    popover: [270, 30, 9],
    popoverForeground: [270, 30, 96],
    primary: [270, 95, 75],
    primaryForeground: [270, 35, 4],
    secondary: [270, 25, 18],
    secondaryForeground: [270, 30, 96],
    mutedForeground: [270, 15, 65],
    destructive: [0, 62.8, 30.6],
    destructiveForeground: [270, 30, 96]
  },
  'clean-light': {
    background: [210, 40, 98],
    foreground: [222, 47, 11],
    card: [0, 0, 100],
    cardForeground: [222, 47, 11],
    popover: [0, 0, 100],
    popoverForeground: [222, 47, 11],
    primary: [158, 78, 26],
    primaryForeground: [0, 0, 100],
    secondary: [210, 40, 96.1],
    secondaryForeground: [222, 47, 11],
    mutedForeground: [215.4, 18, 40],
    destructive: [0, 74, 43],
    destructiveForeground: [210, 40, 98]
  }
}
