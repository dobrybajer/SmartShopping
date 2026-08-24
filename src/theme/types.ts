export type ThemeId =
  | 'oled-black'
  | 'midnight-blue'
  | 'forest-sage'
  | 'warm-amber'
  | 'cyberpunk-violet'
  | 'clean-light'

export interface ThemePreview {
  background: string
  card: string
  primary: string
  accent: string
  border: string
}

export interface ThemeConfig {
  id: ThemeId
  nameKey: string
  descriptionKey: string
  isDark: boolean
  preview: ThemePreview
}

export interface ThemeContextType {
  currentTheme: ThemeId
  themeConfig: ThemeConfig
  isDark: boolean
  setTheme: (theme: ThemeId) => Promise<void>
  availableThemes: ThemeConfig[]
}
