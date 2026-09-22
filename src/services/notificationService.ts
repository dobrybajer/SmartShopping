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

async function getActiveRegistration(timeoutMs: number = 6000): Promise<ServiceWorkerRegistration> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('Service Worker is not supported in this environment')
  }

  // If already active registration exists
  const existing = await navigator.serviceWorker.getRegistration()
  if (existing?.active) {
    return existing
  }

  // Wait for ready with safe timeout
  return await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              'Service Worker ready timeout exceeded. Ensure page is loaded via localhost or HTTPS.'
            )
          ),
        timeoutMs
      )
    )
  ])
}

const NOTIFY_SELF_KEY = 'smartshopping_notify_self'
let notifySelfMemory = false

export const notificationService = {
  getNotifySelf(): boolean {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(NOTIFY_SELF_KEY) === 'true'
      } catch {
        return notifySelfMemory
      }
    }
    return notifySelfMemory
  },

  setNotifySelf(value: boolean): void {
    notifySelfMemory = value
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(NOTIFY_SELF_KEY, String(value))
      } catch {
        // Ignore storage errors in restricted contexts
      }
    }
  },

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
      const registration = await getActiveRegistration(3000)
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

    // 2. Get SW Registration & Subscribe via PushManager with timeout guard
    const registration = await getActiveRegistration(8000)
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

    // 3. Extract keys using standard toJSON or raw keys
    const subJson = typeof subscription.toJSON === 'function' ? subscription.toJSON() : null
    const rawP256dh = typeof subscription.getKey === 'function' ? subscription.getKey('p256dh') : null
    const rawAuth = typeof subscription.getKey === 'function' ? subscription.getKey('auth') : null

    const p256dh =
      subJson?.keys?.p256dh ||
      (rawP256dh ? btoa(String.fromCharCode(...new Uint8Array(rawP256dh))) : null)
    const auth =
      subJson?.keys?.auth ||
      (rawAuth ? btoa(String.fromCharCode(...new Uint8Array(rawAuth))) : null)

    if (!p256dh || !auth) {
      throw new Error('Push subscription does not contain cryptographic keys')
    }

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
    language: 'pl' | 'en' = 'pl',
    options?: { includeSender?: boolean }
  ): Promise<{ success: boolean; sentCount: number; totalCount?: number; error?: string }> {
    const definition = NOTIFICATION_REGISTRY[type]
    if (!definition) {
      console.warn(`[NotificationService] Unknown notification type: ${type}`)
      return { success: false, sentCount: 0, error: `Unknown notification type: ${type}` }
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
      return { success: false, sentCount: 0, error: 'No householdId provided' }
    }

    let sentCount = 0
    let totalCount = 0

    // Call Supabase Edge Function to deliver background web push
    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-push-notification', {
        body: {
          householdId: targetHouseholdId,
          title: formatted.title,
          body: formatted.body,
          tag,
          url,
          includeSender: options?.includeSender !== undefined ? options.includeSender : this.getNotifySelf()
        }
      })

      if (fnError) {
        console.warn('[NotificationService] Push delivery notice:', fnError)
      } else if (data) {
        sentCount = data.sentCount ?? 0
        totalCount = data.totalCount ?? sentCount
      }
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

    return {
      success: true,
      sentCount,
      totalCount
    }
  }
}
