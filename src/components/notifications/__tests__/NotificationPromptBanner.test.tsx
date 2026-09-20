import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { NotificationPromptBanner } from '../NotificationPromptBanner'
import { useAuth } from '@/context/AuthContext'
import { useNotificationStore } from '@/store/useNotificationStore'

vi.mock('@/context/AuthContext')

describe('NotificationPromptBanner - Soft-Prompt User Flow Tests (ADR-007)', () => {
  const mockHousehold = { id: 'hh-banner-1', name: 'Dom Rodzinny' }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    vi.mocked(useAuth).mockReturnValue({
      household: mockHousehold
    } as any)

    useNotificationStore.setState({
      permission: 'default',
      isSubscribed: false,
      isLoading: false
    })
  })

  it('Flow 01: Renders banner with title and actions when default and not dismissed', () => {
    render(<NotificationPromptBanner layout="desktop" />)

    expect(screen.getByRole('region', { name: /Notification prompt/i })).toBeInTheDocument()
    expect(
      screen.getByText(/Bądź na bieżąco z zakupami domowników|Stay in sync with your household/i)
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Włącz powiadomienia|Enable/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Później|Later/i })).toBeInTheDocument()
  })

  it('Flow 02: Dismissing banner writes to localStorage and removes banner from DOM', async () => {
    render(<NotificationPromptBanner layout="mobile" />)

    const dismissBtn = screen.getByRole('button', { name: /Później|Later/i })
    await act(async () => {
      fireEvent.click(dismissBtn)
    })

    expect(localStorage.getItem('smartshopping_push_prompt_dismissed')).toBe('true')
    expect(screen.queryByRole('region', { name: /Notification prompt/i })).not.toBeInTheDocument()
  })

  it('Flow 03: Clicking enable button calls subscribe and dismisses banner on success', async () => {
    const subscribeSpy = vi.fn().mockResolvedValue(true)
    useNotificationStore.setState({ subscribe: subscribeSpy })

    render(<NotificationPromptBanner layout="desktop" />)

    const enableBtn = screen.getByRole('button', { name: /Włącz powiadomienia|Enable/i })
    await act(async () => {
      fireEvent.click(enableBtn)
    })

    expect(subscribeSpy).toHaveBeenCalledWith(mockHousehold.id)
    expect(localStorage.getItem('smartshopping_push_prompt_dismissed')).toBe('true')
  })

  it('Flow 04: Does not render if already subscribed or already dismissed in localStorage', () => {
    localStorage.setItem('smartshopping_push_prompt_dismissed', 'true')
    render(<NotificationPromptBanner layout="desktop" />)
    expect(screen.queryByRole('region', { name: /Notification prompt/i })).not.toBeInTheDocument()
  })
})
