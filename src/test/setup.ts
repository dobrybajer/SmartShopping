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

// Global mock for realtime hook to prevent hanging WebSocket intervals in tests
vi.mock('@/hooks/useActiveListRealtime', () => ({
  useActiveListRealtime: vi.fn(),
}));
