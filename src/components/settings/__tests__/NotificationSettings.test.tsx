import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { NotificationSettings } from '../NotificationSettings'
import { useAuth } from '@/context/AuthContext'
import { useNotificationStore } from '@/store/useNotificationStore'

vi.mock('@/context/AuthContext')

describe('NotificationSettings - Component & User Flow Tests (ADR-007)', () => {
  const mockHousehold = { id: 'hh-settings-1', name: 'Dom Testowy' }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      household: mockHousehold,
      userProfile: { name: 'Kamil' },
      user: { id: 'u1', email: 'kamil@example.com' }
    } as any)

    useNotificationStore.setState({
      permission: 'default',
      isSubscribed: false,
      isLoading: false,
      isIosSafariNonPwa: false,
      error: null
    })
  })

  it('Flow 01: Renders header, description, and status badge (Wymaga włączenia)', () => {
    render(<NotificationSettings />)

    expect(screen.getByText(/Powiadomienia Web Push|Web Push Notifications/i)).toBeInTheDocument()
    expect(screen.getByText(/Wymaga włączenia|Needs Permission/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Włącz powiadomienia|Enable/i })).toBeInTheDocument()
  })

  it('Flow 02: Clicking enable button invokes subscribe action', async () => {
    const subscribeSpy = vi.fn().mockResolvedValue(true)
    useNotificationStore.setState({ subscribe: subscribeSpy })

    render(<NotificationSettings />)

    const enableBtn = screen.getByRole('button', { name: /Włącz powiadomienia|Enable/i })
    await act(async () => {
      fireEvent.click(enableBtn)
    })

    expect(subscribeSpy).toHaveBeenCalledWith(mockHousehold.id)
  })

  it('Flow 03: Renders Active badge, disable button, and test push button when subscribed', () => {
    useNotificationStore.setState({
      permission: 'granted',
      isSubscribed: true
    })

    render(<NotificationSettings />)

    expect(screen.getByText(/Aktywne|Active/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Wyłącz powiadomienia|Disable/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Wyślij testowe|Send test/i })).toBeInTheDocument()
  })

  it('Flow 04: Displays browser unlock instructions when permission is denied', () => {
    useNotificationStore.setState({
      permission: 'denied',
      isSubscribed: false
    })

    render(<NotificationSettings />)

    expect(screen.getByText(/Zablokowane w przeglądarce|Blocked in Browser/i)).toBeInTheDocument()
    expect(screen.getByText(/zablokowane w ustawieniach|blocked in your browser/i)).toBeInTheDocument()
  })

  it('Flow 05: Displays iOS Safari PWA instructions when on non-standalone iOS device', () => {
    useNotificationStore.setState({
      isIosSafariNonPwa: true
    })

    render(<NotificationSettings />)

    expect(screen.getByText(/ekranu początkowego|Home Screen/i)).toBeInTheDocument()
  })

  it('Flow 06: Renders "Powiadamiaj mnie" checkbox (default unchecked) and clicking it updates notifySelf', async () => {
    const setNotifySelfSpy = vi.fn()
    useNotificationStore.setState({
      notifySelf: false,
      setNotifySelf: setNotifySelfSpy
    })

    render(<NotificationSettings />)

    const checkbox = screen.getByRole('checkbox', { name: /Powiadamiaj mnie|Notify me as well/i })
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()

    await act(async () => {
      fireEvent.click(checkbox)
    })

    expect(setNotifySelfSpy).toHaveBeenCalledWith(true)
  })
})
