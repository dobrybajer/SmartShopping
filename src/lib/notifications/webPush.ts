import type { PushPermissionState } from '@/types/notification'

/**
 * Converts a base64url-encoded string to a Uint8Array for PushManager subscription.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Checks if the current browser environment supports the W3C Push API and Notifications.
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/**
 * Retrieves current browser notification permission state.
 */
export function getNotificationPermission(): PushPermissionState {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

/**
 * Detects if the web application is running in iOS standalone PWA mode.
 */
export function isIosStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as any
  return !!nav.standalone || window.matchMedia('(display-mode: standalone)').matches
}

/**
 * Detects if the user is on an iOS device (iPhone/iPad/iPod) using Safari in regular browser mode
 * (where Web Push is disabled by Apple until added to Home Screen).
 */
export function isIosSafariBrowser(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent || ''
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return isIos && !isIosStandalone()
}

/**
 * Gets the configured VAPID public key from Vite environment variables.
 */
export function getVapidPublicKey(): string {
  return (
    import.meta.env.VITE_VAPID_PUBLIC_KEY ||
    'BM9JR2PEb8GmmHFufkhuRhnsLyRVSLiX4PkoSloevXiMs8FrMlcbXOb63r7_T96OJucgeg6IpaSvT92QP8rT7M8'
  )
}
