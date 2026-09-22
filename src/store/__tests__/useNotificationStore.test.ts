import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useNotificationStore } from '../useNotificationStore'
import { notificationService } from '@/services/notificationService'

vi.mock('@/services/notificationService', () => ({
  notificationService: {
    checkStatus: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    notify: vi.fn(),
    isSupported: vi.fn().mockReturnValue(true),
    getNotifySelf: vi.fn().mockReturnValue(false),
    setNotifySelf: vi.fn()
  }
}))

describe('useNotificationStore - Zustand State & Actions (ADR-007)', () => {
  const mockHouseholdId = 'hh-store-1'

  beforeEach(() => {
    vi.clearAllMocks()
    useNotificationStore.setState({
      permission: 'default',
      isSubscribed: false,
      isLoading: false,
      isIosSafariNonPwa: false,
      notifySelf: false,
      error: null
    })
  })

  it('Flow 01: checkStatus updates store with current permission and subscription', async () => {
    vi.mocked(notificationService.checkStatus).mockResolvedValue({
      permission: 'granted',
      isSubscribed: true,
      isIosSafariNonPwa: false
    })

    await useNotificationStore.getState().checkStatus()

    const state = useNotificationStore.getState()
    expect(state.permission).toBe('granted')
    expect(state.isSubscribed).toBe(true)
    expect(state.isIosSafariNonPwa).toBe(false)
  })

  it('Flow 02: subscribe() triggers haptic feedback and updates store state', async () => {
    const vibrateSpy = vi.spyOn(navigator, 'vibrate')
    vi.mocked(notificationService.subscribe).mockResolvedValue({ endpoint: 'https://test-sub' } as any)

    const success = await useNotificationStore.getState().subscribe(mockHouseholdId)

    expect(vibrateSpy).toHaveBeenCalledWith(50)
    expect(success).toBe(true)
    expect(useNotificationStore.getState().isSubscribed).toBe(true)
  })

  it('Flow 03: unsubscribe() clears subscription and updates store state', async () => {
    useNotificationStore.setState({ isSubscribed: true })
    vi.mocked(notificationService.unsubscribe).mockResolvedValue(true)

    const success = await useNotificationStore.getState().unsubscribe()

    expect(success).toBe(true)
    expect(useNotificationStore.getState().isSubscribed).toBe(false)
  })

  it('Flow 04: sendTestNotification() triggers notificationService.notify with TEST_NOTIFICATION and includeSender: true', async () => {
    vi.mocked(notificationService.notify).mockResolvedValue({
      success: true,
      sentCount: 1,
      totalCount: 1
    })

    const success = await useNotificationStore.getState().sendTestNotification(mockHouseholdId, 'Kamil')

    expect(success).toBe(true)
    expect(notificationService.notify).toHaveBeenCalledWith(
      'TEST_NOTIFICATION',
      expect.objectContaining({
        senderName: 'Kamil'
      }),
      mockHouseholdId,
      'pl',
      { includeSender: true }
    )
    expect(useNotificationStore.getState().error).toBeNull()
  })

  it('Flow 05: sendTestNotification() sets error and returns false when sentCount is 0', async () => {
    vi.mocked(notificationService.notify).mockResolvedValue({
      success: true,
      sentCount: 0,
      totalCount: 0
    })

    const success = await useNotificationStore.getState().sendTestNotification(mockHouseholdId, 'Kamil')

    expect(success).toBe(false)
    expect(useNotificationStore.getState().error).toContain('Nie znaleziono zarejestrowanych urządzeń')
  })

  it('Flow 06: setNotifySelf() updates store state and calls notificationService.setNotifySelf', () => {
    useNotificationStore.getState().setNotifySelf(true)

    expect(useNotificationStore.getState().notifySelf).toBe(true)
    expect(notificationService.setNotifySelf).toHaveBeenCalledWith(true)

    useNotificationStore.getState().setNotifySelf(false)
    expect(useNotificationStore.getState().notifySelf).toBe(false)
    expect(notificationService.setNotifySelf).toHaveBeenCalledWith(false)
  })
})
