import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AccountDetailsDialog } from '../AccountDetailsDialog'
import { ThemeProvider, THEME_STORAGE_KEY } from '@/theme'

// Mock AuthContext
const mockUpdateUserProfileName = vi.fn().mockResolvedValue(true)
const mockUpdateUserLanguage = vi.fn().mockResolvedValue(true)
const mockUpdateUserTheme = vi.fn().mockResolvedValue(true)

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com', created_at: '2026-08-20T12:00:00Z' },
    userProfile: { id: 'user-123', name: 'John Doe', email: 'test@example.com', language: 'pl', theme: 'oled-black' },
    updateUserProfileName: mockUpdateUserProfileName,
    updateUserLanguage: mockUpdateUserLanguage,
    updateUserTheme: mockUpdateUserTheme,
  })
}))

describe('AccountDetailsDialog Theme Selector User Flows (ADR-004)', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    vi.clearAllMocks()

    // Mock navigator.vibrate
    if (!('vibrate' in navigator)) {
      Object.defineProperty(navigator, 'vibrate', {
        value: vi.fn().mockReturnValue(true),
        writable: true,
        configurable: true
      })
    } else {
      vi.spyOn(navigator, 'vibrate').mockReturnValue(true)
    }
  })

  it('renders all 6 curated theme swatch cards inside AccountDetailsDialog', () => {
    render(
      <ThemeProvider>
        <AccountDetailsDialog open={true} onOpenChange={vi.fn()} />
      </ThemeProvider>
    )

    // Verify all 6 themes are rendered by their accessible radio buttons
    const themeRadios = screen.getAllByRole('radio')
    expect(themeRadios).toHaveLength(6)

    // OLED Black should be selected by default
    const oledRadio = themeRadios.find(
      (el) => el.getAttribute('aria-checked') === 'true'
    )
    expect(oledRadio).toBeDefined()
  })

  it('allows user to select Midnight Blue theme, triggering haptic feedback and instant DOM update', async () => {
    render(
      <ThemeProvider>
        <AccountDetailsDialog open={true} onOpenChange={vi.fn()} />
      </ThemeProvider>
    )

    // Find and click the Midnight Blue theme button
    const midnightBlueCard = screen.getByText('Midnight Blue')
    fireEvent.click(midnightBlueCard)

    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('midnight-blue')
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('midnight-blue')
    })

    // Verify haptic feedback was triggered (50ms)
    expect(navigator.vibrate).toHaveBeenCalledWith(50)
  })

  it('allows user to switch between multiple themes seamlessly', async () => {
    render(
      <ThemeProvider>
        <AccountDetailsDialog open={true} onOpenChange={vi.fn()} />
      </ThemeProvider>
    )

    // Click Cyberpunk Violet
    const cyberpunkCard = screen.getByText('Cyberpunk Violet')
    fireEvent.click(cyberpunkCard)

    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('cyberpunk-violet')
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('cyberpunk-violet')
    })

    // Click Clean Light
    const cleanLightCard = screen.getByText('Clean Light')
    fireEvent.click(cleanLightCard)

    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('clean-light')
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('clean-light')
    })
  })
})
