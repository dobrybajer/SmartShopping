import { describe, it, expect } from 'vitest'
import {
  urlBase64ToUint8Array,
  isPushSupported,
  getNotificationPermission,
  isIosStandalone,
  isIosSafariBrowser,
  getVapidPublicKey
} from '../webPush'
import { parsePushPayload } from '../swHandler'

describe('Web Push Utilities & SW Handler (ADR-007)', () => {
  it('Flow 01: Converts base64url string to Uint8Array correctly', () => {
    // Valid standard test string
    const input = 'BM9JR2PEb8GmmHFufkhuRhnsLyRVSLiX4PkoSloevXiMs8FrMlcbXOb63r7_T96OJucgeg6IpaSvT92QP8rT7M8'
    const result = urlBase64ToUint8Array(input)

    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('Flow 02: isPushSupported returns true when environment has SW, Notification, and PushManager', () => {
    expect(isPushSupported()).toBe(true)
  })

  it('Flow 03: getNotificationPermission returns current permission', () => {
    expect(getNotificationPermission()).toBe('default')
  })

  it('Flow 04: Detects iOS Standalone PWA mode', () => {
    expect(isIosStandalone()).toBe(false)

    // Simulate standalone
    Object.defineProperty(window.navigator, 'standalone', {
      writable: true,
      configurable: true,
      value: true
    })
    expect(isIosStandalone()).toBe(true)

    // Cleanup
    Object.defineProperty(window.navigator, 'standalone', {
      writable: true,
      configurable: true,
      value: undefined
    })
  })

  it('Flow 05: Detects iOS Safari browser mode (non-PWA)', () => {
    const originalUA = window.navigator.userAgent

    // Simulate iPhone Safari
    Object.defineProperty(window.navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
    })

    expect(isIosSafariBrowser()).toBe(true)

    // Reset
    Object.defineProperty(window.navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: originalUA
    })
  })

  it('Flow 06: Returns configured VAPID public key or fallback', () => {
    const key = getVapidPublicKey()
    expect(typeof key).toBe('string')
    expect(key.length).toBeGreaterThan(20)
  })

  it('Flow 07: parsePushPayload handles valid JSON payload and populates notification options', () => {
    const raw = JSON.stringify({
      title: '🛒 Nowy produkt',
      body: 'Kamil dodał: Mleko',
      tag: 'list-123',
      url: '/?tab=active&listId=123'
    })

    const { title, options } = parsePushPayload(raw)
    expect(title).toBe('🛒 Nowy produkt')
    expect(options.body).toBe('Kamil dodał: Mleko')
    expect(options.tag).toBe('list-123')
    expect((options.data as any)?.url).toBe('/?tab=active&listId=123')
    expect(options.renotify).toBe(true)
    expect(options.vibrate).toEqual([100, 50, 100])
  })

  it('Flow 08: parsePushPayload handles malformed or empty data gracefully', () => {
    const emptyResult = parsePushPayload(null)
    expect(emptyResult.title).toBe('Smart Shopping')
    expect(emptyResult.options.tag).toBe('smart-shopping-default')

    const brokenJson = parsePushPayload('plain text notification')
    expect(brokenJson.title).toBe('Smart Shopping')
    expect(brokenJson.options.body).toBe('plain text notification')
  })
})
