import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock window.matchMedia for responsive layout tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock navigator.vibrate for haptic feedback tests
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: () => true,
});

// Mock ResizeObserver for Radix UI dialogs/sheets in jsdom
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = MockResizeObserver;
globalThis.ResizeObserver = MockResizeObserver;

// Global mock for realtime hooks to prevent hanging WebSocket intervals in tests
vi.mock('@/hooks/useActiveListRealtime', () => ({
  useActiveListRealtime: vi.fn(),
}));
vi.mock('@/hooks/usePantryRealtime', () => ({
  usePantryRealtime: vi.fn(),
}));

// Mock Notification API for Web Push tests
class MockNotification {
  static permission: NotificationPermission = 'default';
  static requestPermission = vi.fn().mockImplementation(async () => {
    MockNotification.permission = 'granted';
    return 'granted';
  });
}

Object.defineProperty(window, 'Notification', {
  writable: true,
  configurable: true,
  value: MockNotification,
});

// Mock PushManager and ServiceWorkerRegistration
export const mockPushSubscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/test-sub-token',
  getKey: (name: string) => {
    if (name === 'p256dh') return new Uint8Array([1, 2, 3, 4]).buffer;
    if (name === 'auth') return new Uint8Array([5, 6, 7, 8]).buffer;
    return null;
  },
  toJSON: () => ({
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-sub-token',
    keys: {
      p256dh: 'AQIDBA==',
      auth: 'BQYHCA=='
    }
  }),
  unsubscribe: vi.fn().mockResolvedValue(true),
};

export const mockPushManager = {
  getSubscription: vi.fn().mockResolvedValue(null),
  subscribe: vi.fn().mockResolvedValue(mockPushSubscription),
};

export const mockRegistration = {
  pushManager: mockPushManager,
  showNotification: vi.fn().mockResolvedValue(undefined),
};

Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  configurable: true,
  value: {
    ready: Promise.resolve(mockRegistration),
    register: vi.fn().mockResolvedValue(mockRegistration),
    getRegistration: vi.fn().mockResolvedValue(mockRegistration),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
});

Object.defineProperty(window, 'PushManager', {
  writable: true,
  configurable: true,
  value: class MockPushManager {},
});

