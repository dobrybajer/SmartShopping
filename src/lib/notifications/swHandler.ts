/**
 * Core Service Worker Push handling logic for SmartShopping.
 * Separated for pure testing and reusability.
 */

export interface RawPushPayload {
  title?: string
  body?: string
  tag?: string
  url?: string
  icon?: string
  badge?: string
  vibrate?: number[]
}

export interface ExtendedNotificationOptions extends NotificationOptions {
  renotify?: boolean
  vibrate?: number[]
}

export function parsePushPayload(rawData: string | null | undefined): {
  title: string
  options: ExtendedNotificationOptions
} {
  if (!rawData) {
    return {
      title: 'Smart Shopping',
      options: {
        body: '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'smart-shopping-default',
        renotify: true,
        data: { url: '/' },
        vibrate: [100, 50, 100]
      }
    }
  }

  let parsed: RawPushPayload
  try {
    parsed = JSON.parse(rawData)
  } catch {
    parsed = {
      title: 'Smart Shopping',
      body: rawData
    }
  }

  const title = parsed.title || 'Smart Shopping'
  const options: ExtendedNotificationOptions = {
    body: parsed.body || '',
    icon: parsed.icon || '/icon-192.png',
    badge: parsed.badge || '/icon-192.png',
    tag: parsed.tag || 'smart-shopping-default',
    renotify: true,
    data: {
      url: parsed.url || '/'
    },
    vibrate: parsed.vibrate || [100, 50, 100]
  }

  return { title, options }
}
