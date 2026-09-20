import { supabase } from '@/lib/supabase'
import type {
  NotificationType,
  NotificationPayloadMap,
  PushPermissionState
} from '@/types/notification'
import { NOTIFICATION_REGISTRY } from '@/lib/notifications/registry'
import {
  isPushSupported,
  getNotificationPermission,
  isIosSafariBrowser,
  getVapidPublicKey,
  urlBase64ToUint8Array
} from '@/lib/notifications/webPush'

export interface NotificationStorageChannel {
  saveNotification?<T extends NotificationType>(
    type: T,
    payload: NotificationPayloadMap[T],
    meta: { householdId: string; senderUserId?: string; createdAt: string }
  ): Promise<void>
}

export const noopStorageChannel: NotificationStorageChannel = {
  saveNotification: async () => {
    // No-op memory stub for Phase 1. Ready for persistent DB log in future phase.
  }
}

let activeStorageChannel: NotificationStorageChannel = noopStorageChannel

export const notificationService = {
  setStorageChannel(channel: NotificationStorageChannel) {
    activeStorageChannel = channel
  },

  getStorageChannel(): NotificationStorageChannel {
    return activeStorageChannel
  },

  isSupported(): boolean {
    return isPushSupported()
  },

  async checkStatus(): Promise<{
    permission: PushPermissionState
    isSubscribed: boolean
    isIosSafariNonPwa: boolean
  }> {
    const isSupported = isPushSupported()
    const permission = getNotificationPermission()
    const isIosSafariNonPwa = isIosSafariBrowser()

    if (!isSupported) {
      return {
        permission: 'unsupported',
        isSubscribed: false,
        isIosSafariNonPwa
      }
    }

    try {
      const sub = await this.getSubscription()
      return {
        permission,
        isSubscribed: !!sub,
        isIosSafariNonPwa
      }
    } catch {
      return {
        permission,
        isSubscribed: false,
        isIosSafariNonPwa
      }
    }
  },

  async getSubscription(): Promise<PushSubscription | null> {
    if (!isPushSupported()) return null
    try {
      const registration = await navigator.serviceWorker.ready
      if (!registration || !registration.pushManager) return null
      return await registration.pushManager.getSubscription()
    } catch (err) {
      console.warn('[NotificationService] Error getting subscription:', err)
      return null
    }
  },

  async subscribe(householdId: string): Promise<PushSubscription | null> {
    if (!isPushSupported()) {
      throw new Error('Push notifications are not supported in this environment')
    }

    // 1. Request permission if not already granted
    let currentPerm = Notification.permission
    if (currentPerm === 'default') {
      currentPerm = await Notification.requestPermission()
    }

    if (currentPerm !== 'granted') {
      return null
    }

    // 2. Get SW Registration & Subscribe via PushManager
    const registration = await navigator.serviceWorker.ready
    const vapidKey = getVapidPublicKey()
    const applicationServerKey = urlBase64ToUint8Array(vapidKey)

    let subscription = await registration.pushManager.getSubscription()

    // If subscription already exists, we use it; otherwise create a new one
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any
      })
    }

    // 3. Extract keys
    const rawP256dh = subscription.getKey('p256dh')
    const rawAuth = subscription.getKey('auth')

    if (!rawP256dh || !rawAuth) {
      throw new Error('Push subscription does not contain cryptographic keys')
    }

    const p256dh = btoa(String.fromCharCode(...new Uint8Array(rawP256dh)))
    const auth = btoa(String.fromCharCode(...new Uint8Array(rawAuth)))

    // 4. Save to Supabase push_subscriptions table
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Cannot save push subscription: user is not authenticated')
    }

    const { error: dbError } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        household_id: householdId,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        last_used_at: new Date().toISOString()
      },
      { onConflict: 'endpoint' }
    )

    if (dbError) {
      console.error('[NotificationService] Failed to persist subscription to database:', dbError)
      throw dbError
    }

    return subscription
  },

  async unsubscribe(): Promise<boolean> {
    try {
      const subscription = await this.getSubscription()
      if (subscription) {
        const endpoint = subscription.endpoint
        await subscription.unsubscribe()

        // Remove from database
        await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
      }
      return true
    } catch (err) {
      console.error('[NotificationService] Unsubscribe error:', err)
      return false
    }
  },

  async notify<T extends NotificationType>(
    type: T,
    payload: NotificationPayloadMap[T],
    householdId?: string,
    language: 'pl' | 'en' = 'pl'
  ): Promise<void> {
    const definition = NOTIFICATION_REGISTRY[type]
    if (!definition) {
      console.warn(`[NotificationService] Unknown notification type: ${type}`)
      return
    }

    const formatted = definition.format(payload, language)
    const tag = definition.getTag(payload)
    const url = definition.getUrl(payload)

    // Try to determine householdId if not directly provided
    let targetHouseholdId = householdId
    if (!targetHouseholdId) {
      if ('householdId' in payload && typeof (payload as any).householdId === 'string') {
        targetHouseholdId = (payload as any).householdId
      }
    }

    if (!targetHouseholdId) {
      console.warn('[NotificationService] Skipped push: no householdId provided')
      return
    }

    // Call Supabase Edge Function to deliver background web push
    try {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          householdId: targetHouseholdId,
          title: formatted.title,
          body: formatted.body,
          tag,
          url
        }
      })
    } catch (pushErr) {
      // Per ADR-007, failure to deliver push must NEVER block UI actions or throw to callers
      console.warn('[NotificationService] Push delivery notice:', pushErr)
    }

    // Delegate to pluggable storage channel (for future persistent log)
    try {
      if (activeStorageChannel.saveNotification) {
        const {
          data: { user }
        } = await supabase.auth.getUser()
        await activeStorageChannel.saveNotification(type, payload, {
          householdId: targetHouseholdId,
          senderUserId: user?.id,
          createdAt: new Date().toISOString()
        })
      }
    } catch (storageErr) {
      console.warn('[NotificationService] Storage channel warning:', storageErr)
    }
  }
}
