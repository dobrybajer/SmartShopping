import { describe, it, expect, vi, beforeEach } from 'vitest'
import { notificationService, type NotificationStorageChannel } from '../notificationService'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(),
    functions: {
      invoke: vi.fn()
    }
  }
}))

describe('notificationService - Universal Dispatch & Web Push Subscription (ADR-007)', () => {
  const mockUser = { id: 'user-push-1', email: 'kamil@example.com' }
  const mockHouseholdId = 'hh-push-100'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null
    })
  })

  it('Flow 01: checkStatus returns current permission and subscription state', async () => {
    const status = await notificationService.checkStatus()
    expect(status.permission).toBe('default')
    expect(status.isSubscribed).toBe(false)
  })

  it('Flow 02: subscribe() requests permission, subscribes with PushManager, and persists to Supabase', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockReturnValue({
      upsert: upsertMock
    } as any)

    const sub = await notificationService.subscribe(mockHouseholdId)
    expect(sub).toBeDefined()
    expect(sub?.endpoint).toContain('test-sub-token')

    expect(supabase.from).toHaveBeenCalledWith('push_subscriptions')
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockUser.id,
        household_id: mockHouseholdId,
        endpoint: sub?.endpoint
      }),
      { onConflict: 'endpoint' }
    )
  })

  it('Flow 03: unsubscribe() calls browser unsubscribe and deletes record from Supabase', async () => {
    // Setup getSubscription to return mock
    const readySW = await navigator.serviceWorker.ready
    const mockSub = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-sub-token',
      unsubscribe: vi.fn().mockResolvedValue(true)
    }
    vi.spyOn(readySW.pushManager, 'getSubscription').mockResolvedValue(mockSub as any)

    const deleteEqMock = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: deleteEqMock
      })
    } as any)

    const success = await notificationService.unsubscribe()
    expect(success).toBe(true)
    expect(mockSub.unsubscribe).toHaveBeenCalled()
    expect(deleteEqMock).toHaveBeenCalledWith('endpoint', mockSub.endpoint)
  })

  it('Flow 04: notify() calls send-push-notification Edge Function with formatted payload', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { sentCount: 1, pruned: 0 },
      error: null
    })

    const result = await notificationService.notify(
      'LIST_ITEM_ADDED',
      {
        listId: 'list-777',
        listName: 'Wieczorne Zakupy',
        itemName: 'Kawa Ziarnista',
        addedByName: 'Kamil'
      },
      mockHouseholdId,
      'pl',
      { includeSender: true }
    )

    expect(result.success).toBe(true)
    expect(result.sentCount).toBe(1)
    expect(supabase.functions.invoke).toHaveBeenCalledWith('send-push-notification', {
      body: expect.objectContaining({
        householdId: mockHouseholdId,
        title: expect.stringContaining('Nowy produkt'),
        body: expect.stringContaining('Kawa Ziarnista'),
        tag: 'list-list-777',
        url: '/?tab=active&listId=list-777',
        includeSender: true
      })
    })
  })

  it('Flow 05: notify() suppresses network push errors silently without throwing to callers', async () => {
    vi.mocked(supabase.functions.invoke).mockRejectedValue(new Error('Network offline or edge error'))

    // Should resolve cleanly without throwing and return success: true with sentCount: 0
    const result = await notificationService.notify(
      'LIST_COMPLETED',
      {
        listId: 'list-888',
        listName: 'Poranne Zakupy',
        completedByName: 'Anna'
      },
      mockHouseholdId
    )

    expect(result.success).toBe(true)
    expect(result.sentCount).toBe(0)
  })

  it('Flow 06: delegates to pluggable NotificationStorageChannel for future DB logging', async () => {
    const mockStorageChannel: NotificationStorageChannel = {
      saveNotification: vi.fn().mockResolvedValue(undefined)
    }
    notificationService.setStorageChannel(mockStorageChannel)

    await notificationService.notify(
      'HOUSEHOLD_MEMBER_JOINED',
      {
        householdId: mockHouseholdId,
        householdName: 'Nasz Dom',
        memberName: 'Piotr'
      },
      mockHouseholdId
    )

    expect(mockStorageChannel.saveNotification).toHaveBeenCalledWith(
      'HOUSEHOLD_MEMBER_JOINED',
      expect.objectContaining({ memberName: 'Piotr' }),
      expect.objectContaining({ householdId: mockHouseholdId })
    )
  })

  it('Flow 07: notify() defaults includeSender to getNotifySelf() when options.includeSender is omitted', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { sentCount: 2, totalCount: 2 },
      error: null
    })

    // Default is false
    notificationService.setNotifySelf(false)
    await notificationService.notify(
      'LIST_ITEM_ADDED',
      { listId: 'l1', listName: 'Lista', itemName: 'Chleb', addedByName: 'Jan' },
      mockHouseholdId
    )
    expect(supabase.functions.invoke).toHaveBeenLastCalledWith('send-push-notification', {
      body: expect.objectContaining({ includeSender: false })
    })

    // When setNotifySelf is true
    notificationService.setNotifySelf(true)
    await notificationService.notify(
      'LIST_ITEM_ADDED',
      { listId: 'l1', listName: 'Lista', itemName: 'Mleko', addedByName: 'Jan' },
      mockHouseholdId
    )
    expect(supabase.functions.invoke).toHaveBeenLastCalledWith('send-push-notification', {
      body: expect.objectContaining({ includeSender: true })
    })

    // Cleanup
    notificationService.setNotifySelf(false)
  })
})
