import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

const AUTH_FILE = path.resolve(import.meta.dirname, 'e2e/.auth/user.json')
const hasAuthState = fs.existsSync(AUTH_FILE)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    channel: 'msedge',
    headless: true,
  },
  projects: [
    {
      name: 'desktop-e2e',
      testIgnore: /visual-audit\.spec\.ts/,
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        viewport: { width: 1440, height: 900 },
        ...(hasAuthState ? { storageState: AUTH_FILE } : {}),
      },
    },
    {
      name: 'tablet-e2e',
      testIgnore: /visual-audit\.spec\.ts/,
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
        ...(hasAuthState ? { storageState: AUTH_FILE } : {}),
      },
    },
    {
      name: 'mobile-pwa-e2e',
      testIgnore: /visual-audit\.spec\.ts/,
      use: {
        ...devices['Pixel 7'],
        channel: 'msedge',
        viewport: { width: 360, height: 800 },
        hasTouch: true,
        isMobile: true,
        ...(hasAuthState ? { storageState: AUTH_FILE } : {}),
      },
    },
    {
      name: 'visual-mock',
      testMatch: /visual-audit\.spec\.ts/,
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
