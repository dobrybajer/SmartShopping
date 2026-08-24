import React, { useEffect, useRef, useState, useCallback } from 'react'
import type { ThemeId } from './types'
import { ThemeContext } from './ThemeContextInstance'
import { DEFAULT_THEME, THEME_STORAGE_KEY, THEMES, getThemeConfig, isValidTheme } from './themes'
import { supabase } from '@/lib/supabase'

function getInitialTheme(): ThemeId {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
      if (isValidTheme(stored)) {
        return stored
      }
    }
  } catch {
    // Ignore localStorage access errors
  }
  return DEFAULT_THEME
}

function applyThemeToDOM(theme: ThemeId) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentThemeState] = useState<ThemeId>(getInitialTheme)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Apply to DOM on initial mount
  useEffect(() => {
    applyThemeToDOM(currentTheme)
  }, [currentTheme])

  const setTheme = useCallback(async (newTheme: ThemeId) => {
    if (!isValidTheme(newTheme)) return

    // 1. Instant local DOM and state update (<1ms)
    setCurrentThemeState(newTheme)
    applyThemeToDOM(newTheme)

    // 2. Synchronous local storage backup
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(THEME_STORAGE_KEY, newTheme)
      }
    } catch {
      // Ignore
    }

    // 3. Debounced asynchronous sync to Supabase (500ms)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.id) {
          await supabase
            .from('users')
            .update({ theme: newTheme })
            .eq('id', session.user.id)
        }
      } catch (err) {
        console.error('Error syncing theme to profile:', err)
      }
    }, 500)
  }, [])

  const themeConfig = getThemeConfig(currentTheme)

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        themeConfig,
        isDark: themeConfig.isDark,
        setTheme,
        availableThemes: THEMES
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
