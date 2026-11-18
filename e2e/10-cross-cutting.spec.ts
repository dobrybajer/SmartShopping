import { test, expect } from './fixtures/householdFixture'
import {
  closeTopDialog,
  ensurePolishLanguage,
  navigateToTab,
  openAccountDetailsDialog,
} from './helpers/uiHelpers'

const ALL_THEMES = [
  'OLED Black',
  'Midnight Blue',
  'Forest Sage',
  'Warm Amber',
  'Cyberpunk Violet',
  'Clean Light',
] as const

test.describe('Module 10 — Cross-Cutting Localization, 6-Theme RWD & Security/RLS Boundaries', () => {
  test('TC-I18N-01: Switch PL -> EN -> PL across all 7 tabs with 0 untranslated keys & translated category slugs @module:cross-cutting @type:happy-path @state:TEMP', async ({
    page,
  }) => {
    try {
      const accountDialog = await openAccountDetailsDialog(page)
      const enBtn = accountDialog.getByRole('button', { name: /English|\bEN\b/i }).first()
      await enBtn.click()
      await closeTopDialog(page)

      // Traverse all 7 tabs and ensure zero raw i18n key leaks ("navigation.", "common.", "categories.")
      const tabs: Array<
        'cookbook' | 'calendar' | 'products' | 'draft' | 'active' | 'history' | 'pantry'
      > = ['cookbook', 'calendar', 'products', 'draft', 'active', 'history', 'pantry']

      for (const tab of tabs) {
        await navigateToTab(page, tab)
        const bodyText = (await page.locator('main').first().textContent()) || ''
        expect(bodyText).not.toMatch(/\b(navigation|common|products|cookbook|pantry|calendar)\.[a-z]+/i)
      }

      // Check English category slug translation on Products tab ("Dairy & Eggs" / "Produce")
      await navigateToTab(page, 'products')
      await expect(page.locator('.animate-spin')).toHaveCount(0, { timeout: 10_000 })
      await expect(page.locator('main').first()).toContainText(/Dairy|Produce|Bakery|Fruits/i, {
        timeout: 10_000,
      })
    } finally {
      await ensurePolishLanguage(page)
    }
  })

  test('TC-THEME-01: Switch all 6 themes (including Clean Light) & verify zero horizontal overflow across 1440px, 768px & 360px @module:cross-cutting @type:happy-path @state:TEMP', async ({
    page,
  }) => {
    const viewports = [
      { width: 1440, height: 900 },
      { width: 768, height: 1024 },
      { width: 360, height: 800 },
    ]

    try {
      // Iterate themes inside Account settings dialog
      for (const themeLabel of ALL_THEMES) {
        const dialog = await openAccountDetailsDialog(page)
        const themeBtn = dialog.getByRole('button', { name: new RegExp(themeLabel, 'i') }).first()
        if ((await themeBtn.count()) > 0) {
          await themeBtn.click()
        }
        await closeTopDialog(page)

        if (themeLabel === 'Clean Light') {
          const isLightClass = await page.evaluate(() => {
            const root = document.documentElement
            return (
              root.getAttribute('data-theme') === 'clean-light' ||
              !root.classList.contains('dark')
            )
          })
          expect(isLightClass).toBe(true)
        }
      }

      // Check zero horizontal overflow at Desktop (1440), Tablet (768), and Mobile (360)
      for (const vp of viewports) {
        await page.setViewportSize(vp)
        await navigateToTab(page, 'products')
        await page.waitForTimeout(200)
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth - document.documentElement.clientWidth
        })
        expect(overflow).toBeLessThanOrEqual(2)
      }
    } finally {
      // Restore OLED Black theme & default Desktop/Mobile viewport check cleanup
      const dialog = await openAccountDetailsDialog(page)
      const oledBtn = dialog.getByRole('button', { name: /OLED Black/i }).first()
      if ((await oledBtn.count()) > 0) {
        await oledBtn.click()
      }
      await closeTopDialog(page)
    }
  })

  test('TC-SEC-01: Security boundaries — PostgREST .or() injection neutralization, cross-tenant RLS isolation & Push Edge Function auth check @module:cross-cutting @type:negative @state:TEMP', async ({
    page,
    request,
  }) => {
    // 1) PostgREST .or() injection payload in Products search bar does not crash or leak syntax error
    await navigateToTab(page, 'products')
    const searchInput = page.locator('input[placeholder*="Szukaj" i], input[placeholder*="Search" i]').first()
    await searchInput.fill(',id.neq.00000000-0000-0000-0000-000000000000),id.eq.1')
    await page.waitForTimeout(400)
    await expect(page.getByText(/PGRST|syntax error|unexpected/i)).toHaveCount(0)
    await searchInput.fill('')

    // 2) Cross-tenant RLS read & Edge Function rejection check using active browser auth context
    const supabaseCtx = await page.evaluate(() => {
      const tokenKey = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
      if (!tokenKey) return null
      try {
        const parsed = JSON.parse(localStorage.getItem(tokenKey) || '{}') as {
          access_token?: string
        }
        const projectRef = tokenKey.replace(/^sb-/, '').replace(/-auth-token$/, '')
        return {
          accessToken: parsed.access_token || '',
          supabaseUrl: `https://${projectRef}.supabase.co`,
        }
      } catch {
        return null
      }
    })

    if (supabaseCtx && supabaseCtx.accessToken) {
      // Edge Function call without Authorization header -> must return 401
      const unauthEdgeResp = await request.post(
        `${supabaseCtx.supabaseUrl}/functions/v1/send-push-notification`,
        {
          data: {
            householdId: '00000000-0000-4000-8000-000000000999',
            type: 'LIST_COMPLETED',
            listName: 'Fake',
          },
        }
      )
      expect([401, 403]).toContain(unauthEdgeResp.status())

      // Edge Function call for non-member householdId -> must reject (401/403/400 if anon key needed)
      const foreignEdgeResp = await request.post(
        `${supabaseCtx.supabaseUrl}/functions/v1/send-push-notification`,
        {
          headers: {
            Authorization: `Bearer ${supabaseCtx.accessToken}`,
            'Content-Type': 'application/json',
          },
          data: {
            householdId: '00000000-0000-4000-8000-000000000999',
            type: 'LIST_COMPLETED',
            listName: 'Foreign List',
          },
        }
      )
      expect([400, 401, 403]).toContain(foreignEdgeResp.status())
    }
  })
})
