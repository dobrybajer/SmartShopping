import { useState, useEffect, useCallback } from 'react'

export type LayoutMode = 'auto' | 'desktop' | 'mobile'

const STORAGE_KEY = 'smartshopping_layout_preference'
const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)'

export function useDeviceLayout() {
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(() => {
    if (typeof window === 'undefined') return 'auto'
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'desktop' || stored === 'mobile' || stored === 'auto') {
      return stored
    }
    return 'auto'
  })

  const [isMediaDesktop, setIsMediaDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(DESKTOP_MEDIA_QUERY).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQueryList = window.matchMedia(DESKTOP_MEDIA_QUERY)
    const handler = (event: MediaQueryListEvent) => {
      setIsMediaDesktop(event.matches)
    }

    // Set initial
    setIsMediaDesktop(mediaQueryList.matches)

    // Modern and fallback listeners
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handler)
      return () => mediaQueryList.removeEventListener('change', handler)
    } else {
      mediaQueryList.addListener(handler)
      return () => mediaQueryList.removeListener(handler)
    }
  }, [])

  const setLayoutMode = (mode: LayoutMode) => {
    setLayoutModeState(mode)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode)
    }
  }

  const toggleLayout = useCallback(() => {
    setLayoutModeState((prev) => {
      const currentIsDesktop = prev === 'desktop' ? true : prev === 'mobile' ? false : isMediaDesktop
      const nextMode: LayoutMode = currentIsDesktop ? 'mobile' : 'desktop'
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, nextMode)
      }
      return nextMode
    })
  }, [isMediaDesktop])

  // Global Keyboard Shortcut: Ctrl + Alt + L (or Cmd + Option + L on Mac)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.altKey &&
        (e.key === 'l' || e.key === 'L' || e.code === 'KeyL')
      ) {
        e.preventDefault()
        toggleLayout()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleLayout])

  const isDesktop = layoutMode === 'desktop' ? true : layoutMode === 'mobile' ? false : isMediaDesktop
  const isMobile = !isDesktop

  return {
    isDesktop,
    isMobile,
    layoutMode,
    setLayoutMode,
    toggleLayout,
    isMediaDesktop
  }
}
