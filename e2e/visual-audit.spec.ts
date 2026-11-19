import { test, expect, type Page } from '@playwright/test'

const HOUSEHOLD_ID = '11111111-1111-4111-8111-111111111111'
const USER_ID = '22222222-2222-4222-8222-222222222222'

const MOCK_CATEGORIES = [
  { id: 1, name: 'vegetables_fruits', sort_order: 1, is_non_food: false, household_id: null },
  { id: 2, name: 'dairy', sort_order: 2, is_non_food: false, household_id: null },
  { id: 3, name: 'meat_fish', sort_order: 3, is_non_food: false, household_id: null },
  { id: 4, name: 'bakery', sort_order: 4, is_non_food: false, household_id: null },
  { id: 5, name: 'dry_goods', sort_order: 5, is_non_food: false, household_id: null },
]

const MOCK_MEAL_CATEGORIES = [
  { id: 1, name: 'Śniadanie' },
  { id: 2, name: 'Obiad' },
  { id: 3, name: 'Kolacja' },
]

const MOCK_PRODUCTS = [
  {
    id: 'prod-1',
    household_id: null,
    type: 'Global',
    name: 'Pierś z kurczaka',
    unit_type: 'g',
    category_id: 3,
    kcal_per_100: 110,
    protein_per_100: 23,
    carbs_per_100: 0,
    fat_per_100: 1.5,
    is_ad_hoc: false,
    is_general: false,
    parent_id: null,
    created_at: '2026-01-01T10:00:00Z',
  },
  {
    id: 'prod-2',
    household_id: null,
    type: 'Global',
    name: 'Ryż basmati',
    unit_type: 'g',
    category_id: 5,
    kcal_per_100: 350,
    protein_per_100: 7.5,
    carbs_per_100: 77,
    fat_per_100: 0.8,
    is_ad_hoc: false,
    is_general: false,
    parent_id: null,
    created_at: '2026-01-01T10:00:00Z',
  },
  {
    id: 'prod-3',
    household_id: HOUSEHOLD_ID,
    type: 'Household',
    name: 'Mleko bez laktozy 1.5%',
    unit_type: 'ml',
    category_id: 2,
    kcal_per_100: 45,
    protein_per_100: 3.3,
    carbs_per_100: 4.8,
    fat_per_100: 1.5,
    is_ad_hoc: false,
    is_general: false,
    parent_id: null,
    created_at: '2026-01-01T10:00:00Z',
  },
  {
    id: 'prod-4',
    household_id: null,
    type: 'Global',
    name: 'Awokado Hass',
    unit_type: 'pcs',
    category_id: 1,
    kcal_per_100: 160,
    protein_per_100: 2,
    carbs_per_100: 8.5,
    fat_per_100: 14.7,
    is_ad_hoc: false,
    is_general: false,
    parent_id: null,
    created_at: '2026-01-01T10:00:00Z',
  },
]

const MOCK_MEALS = [
  {
    id: 'meal-1',
    household_id: HOUSEHOLD_ID,
    type: 'Household',
    name: 'Kurczak Teriyaki z ryżem basmati i awokado',
    description: 'Szybki obiad wysokobiałkowy z sosem teriyaki i świeżym awokado.',
    preparation_steps: '1. Ugotuj ryż.\n2. Podsmaż kurczaka.\n3. Podaj z awokado.',
    comments: 'Ulubiony przepis domowników',
    category_id: 2,
    tags: ['Wysokobiałkowe', 'Szybkie', 'Azjatyckie'],
    created_at: '2026-01-01T10:00:00Z',
    ingredients: [
      {
        id: 'ing-1',
        meal_id: 'meal-1',
        product_id: 'prod-1',
        reference_product_id: null,
        base_quantity: 200,
        is_pantry_item: false,
        product: MOCK_PRODUCTS[0],
        reference_product: null,
      },
      {
        id: 'ing-2',
        meal_id: 'meal-1',
        product_id: 'prod-2',
        reference_product_id: null,
        base_quantity: 100,
        is_pantry_item: false,
        product: MOCK_PRODUCTS[1],
        reference_product: null,
      },
    ],
  },
]

function getTodayIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function setupAuthenticatedMockSession(page: Page) {
  const todayIso = getTodayIso()

  const fakeSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'kamil@smartshopping.local',
      user_metadata: { name: 'Kamil Tester' },
      app_metadata: { provider: 'google' },
      created_at: '2026-01-01T00:00:00Z',
    },
  }

  await page.addInitScript(
    ({ session, hhId }) => {
      // Populate any Supabase auth token key pattern in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
          localStorage.setItem(k, JSON.stringify(session))
        }
      }
      // Also set default project ref token & intercept getItem for sb-*-auth-token
      const origGetItem = Storage.prototype.getItem
      Storage.prototype.getItem = function (key: string) {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          return JSON.stringify(session)
        }
        return origGetItem.call(this, key)
      }

      // Seed draft items in Zustand localStorage so Koszyk badge & rows are visible
      const draftState = {
        state: {
          activeHouseholdId: hhId,
          draftsByHousehold: {
            [hhId]: [
              {
                id: 'draft-1',
                product_id: 'prod-1',
                name: 'Pierś z kurczaka',
                unit_type: 'g',
                category_id: 3,
                category_name: 'meat_fish',
                sort_order: 3,
                quantity: 400,
                is_ad_hoc: false,
                meal_source: 'Kurczak Teriyaki z ryżem basmati',
              },
              {
                id: 'draft-2',
                product_id: 'prod-4',
                name: 'Awokado Hass',
                unit_type: 'pcs',
                category_id: 1,
                category_name: 'vegetables_fruits',
                sort_order: 1,
                quantity: 2,
                is_ad_hoc: false,
              },
            ],
          },
          draftItems: [
            {
              id: 'draft-1',
              product_id: 'prod-1',
              name: 'Pierś z kurczaka',
              unit_type: 'g',
              category_id: 3,
              category_name: 'meat_fish',
              sort_order: 3,
              quantity: 400,
              is_ad_hoc: false,
              meal_source: 'Kurczak Teriyaki z ryżem basmati',
            },
            {
              id: 'draft-2',
              product_id: 'prod-4',
              name: 'Awokado Hass',
              unit_type: 'pcs',
              category_id: 1,
              category_name: 'vegetables_fruits',
              sort_order: 1,
              quantity: 2,
              is_ad_hoc: false,
            },
          ],
          selectedActiveListId: 'list-active-1',
          selectedActiveListIdByHousehold: { [hhId]: 'list-active-1' },
          activeListsSummary: [],
        },
        version: 0,
      }
      localStorage.setItem('smartshopping_draft_store', JSON.stringify(draftState))
    },
    { session: fakeSession, hhId: HOUSEHOLD_ID }
  )

  await page.route('**/auth/v1/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/user')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fakeSession.user),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fakeSession),
    })
  })

  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    const accept = route.request().headers()['accept'] || ''
    const isSingleObject = accept.includes('application/vnd.pgrst.object+json')

    const respond = async (data: unknown) => {
      const payload = isSingleObject && Array.isArray(data) ? (data[0] ?? null) : data
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      })
    }

    if (path.endsWith('/users')) {
      return respond({
        id: USER_ID,
        email: 'kamil@smartshopping.local',
        name: 'Kamil Tester',
        household_id: HOUSEHOLD_ID,
        language: 'pl',
        theme: 'oled-black',
        created_at: '2026-01-01T00:00:00Z',
      })
    }

    if (path.endsWith('/household_invites')) {
      return respond([])
    }

    if (path.endsWith('/household_members')) {
      return respond([
        {
          id: 'hm-1',
          household_id: HOUSEHOLD_ID,
          user_id: USER_ID,
          created_at: '2026-01-01T00:00:00Z',
          households: {
            id: HOUSEHOLD_ID,
            name: 'Dom Kamila',
            created_at: '2026-01-01T00:00:00Z',
          },
          users: {
            id: USER_ID,
            email: 'kamil@smartshopping.local',
            name: 'Kamil Tester',
            household_id: HOUSEHOLD_ID,
          },
        },
      ])
    }

    if (path.endsWith('/households')) {
      return respond([
        {
          id: HOUSEHOLD_ID,
          name: 'Dom Kamila',
          created_at: '2026-01-01T00:00:00Z',
        },
      ])
    }

    if (path.endsWith('/product_categories')) {
      return respond(MOCK_CATEGORIES)
    }

    if (path.endsWith('/meal_categories')) {
      return respond(MOCK_MEAL_CATEGORIES)
    }

    if (path.endsWith('/products')) {
      return respond(MOCK_PRODUCTS)
    }

    if (path.endsWith('/meals')) {
      return respond(MOCK_MEALS)
    }

    if (path.endsWith('/meal_plans')) {
      return respond([
        {
          id: 'plan-1',
          household_id: HOUSEHOLD_ID,
          date: todayIso,
          meal_id: 'meal-1',
          meal_category_id: 2,
          custom_name: null,
          is_ad_hoc: false,
          servings: 2,
          target_kcal: 650,
          notes: 'Z dodatkiem sezamu',
          sort_order: 0,
          is_uncertainty_dismissed: false,
          created_at: '2026-01-01T10:00:00Z',
          meal: MOCK_MEALS[0],
        },
      ])
    }

    if (path.endsWith('/pantry_items')) {
      return respond([
        {
          id: 'pantry-1',
          household_id: HOUSEHOLD_ID,
          product_id: 'prod-2',
          ad_hoc_name: null,
          category_id: 5,
          quantity: 500,
          unit_type: 'g',
          last_purchased_at: new Date().toISOString(),
          last_verified_at: new Date().toISOString(),
          expiration_date: todayIso,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          category: MOCK_CATEGORIES[4],
          product: {
            ...MOCK_PRODUCTS[1],
            category: MOCK_CATEGORIES[4],
          },
        },
        {
          id: 'pantry-2',
          household_id: HOUSEHOLD_ID,
          product_id: 'prod-3',
          ad_hoc_name: null,
          category_id: 2,
          quantity: 1000,
          unit_type: 'ml',
          last_purchased_at: '2026-01-01T10:00:00Z',
          last_verified_at: '2026-01-01T10:00:00Z',
          expiration_date: '2025-12-01',
          created_at: '2026-01-01T10:00:00Z',
          updated_at: '2026-01-01T10:00:00Z',
          category: MOCK_CATEGORIES[1],
          product: {
            ...MOCK_PRODUCTS[2],
            category: MOCK_CATEGORIES[1],
          },
        },
      ])
    }

    if (path.endsWith('/shopping_lists')) {
      const statusParam = url.searchParams.get('status') || ''
      if (statusParam.includes('archived')) {
        return respond([
          {
            id: 'list-arch-1',
            household_id: HOUSEHOLD_ID,
            name: 'Zakupy Weekendowe Biedronka',
            original_name: 'Zakupy Weekendowe Biedronka',
            status: 'archived',
            is_default: false,
            target_date: todayIso,
            created_at: '2026-01-01T10:00:00Z',
            updated_at: '2026-01-02T12:00:00Z',
            completed_at: '2026-01-02T12:00:00Z',
            items: [
              { id: 'arch-item-1', is_checked: true },
              { id: 'arch-item-2', is_checked: true },
            ],
          },
        ])
      }
      return respond([
        {
          id: 'list-active-1',
          household_id: HOUSEHOLD_ID,
          name: 'Główna Lista Zakupów',
          status: 'active',
          is_default: true,
          target_date: todayIso,
          created_at: '2026-01-01T10:00:00Z',
          updated_at: '2026-01-02T12:00:00Z',
          items: [
            { id: 'item-1', is_checked: false },
            { id: 'item-2', is_checked: true },
          ],
        },
      ])
    }

    if (path.endsWith('/shopping_list_items')) {
      return respond([
        {
          id: 'item-1',
          shopping_list_id: 'list-active-1',
          product_id: 'prod-1',
          total_quantity: 400,
          is_checked: false,
          in_pantry: false,
          added_ad_hoc: false,
          category_id: 3,
          category: MOCK_CATEGORIES[2],
          product: {
            ...MOCK_PRODUCTS[0],
            category: MOCK_CATEGORIES[2],
          },
        },
        {
          id: 'item-2',
          shopping_list_id: 'list-active-1',
          product_id: 'prod-4',
          total_quantity: 2,
          is_checked: true,
          in_pantry: false,
          added_ad_hoc: false,
          category_id: 1,
          category: MOCK_CATEGORIES[0],
          product: {
            ...MOCK_PRODUCTS[3],
            category: MOCK_CATEGORIES[0],
          },
        },
      ])
    }

    return respond([])
  })
}

test.describe('SmartShopping Live Visual & UX Audit on Microsoft Edge', () => {
  test('1. LoginScreen visual & responsive check (Desktop 1440px vs Mobile 360px)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('Smart Shopping')

    const desktopCardBox = await page.locator('div.max-w-md').first().boundingBox()
    console.log('[AUDIT] LoginScreen Desktop (1440px) card width:', desktopCardBox?.width)

    await page.setViewportSize({ width: 360, height: 800 })
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    )
    console.log('[AUDIT] LoginScreen Mobile (360px) horizontal overflow:', hasHorizontalOverflow)
    expect(hasHorizontalOverflow).toBe(false)
  })

  test('2. Mobile (360px), Tablet (768px) & Desktop (1440px) comprehensive visual audit', async ({ page }) => {
    await setupAuthenticatedMockSession(page)

    // Helper to audit current view in the live DOM
    const auditCurrentView = async (viewName: string, viewportLabel: string) => {
      return await page.evaluate(
        ({ vName, vpLabel }) => {
          const vw = window.innerWidth
          const vh = window.innerHeight
          const docScrollWidth = document.documentElement.scrollWidth
          const hasHorizontalOverflow = docScrollWidth > vw

          // Check scrollable main container horizontal overflow too
          const mainEl = document.querySelector('main')
          const mainOverflow = mainEl ? mainEl.scrollWidth > mainEl.clientWidth : false

          // Collect visible interactive controls and their bounding boxes
          const interactiveEls = Array.from(
            document.querySelectorAll('button, [role="button"], input, select, a[href]')
          )
          const undersizedTargets: Array<{
            tag: string
            label: string
            width: number
            height: number
            classes: string
          }> = []
          const allTargets: Array<{
            label: string
            width: number
            height: number
          }> = []

          for (const el of interactiveEls) {
            const rect = el.getBoundingClientRect()
            const style = getComputedStyle(el)
            if (
              rect.width === 0 ||
              rect.height === 0 ||
              style.visibility === 'hidden' ||
              style.display === 'none' ||
              style.opacity === '0'
            ) {
              continue
            }
            const label = (
              el.getAttribute('aria-label') ||
              el.getAttribute('title') ||
              el.textContent ||
              (el as HTMLInputElement).placeholder ||
              el.tagName
            )
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 50)

            const w = Math.round(rect.width * 10) / 10
            const h = Math.round(rect.height * 10) / 10
            allTargets.push({ label, width: w, height: h })

            if (w < 44 || h < 44) {
              undersizedTargets.push({
                tag: el.tagName.toLowerCase(),
                label,
                width: w,
                height: h,
                classes: (el.className?.toString() || '').slice(0, 80),
              })
            }
          }

          // Check text truncation on visible text elements
          const textEls = Array.from(
            document.querySelectorAll('h1, h2, h3, h4, p, span, div.truncate, button span')
          )
          const truncatedTexts: Array<{
            text: string
            clientWidth: number
            scrollWidth: number
            tag: string
          }> = []
          for (const el of textEls) {
            const rect = el.getBoundingClientRect()
            if (rect.width === 0 || rect.height === 0) continue
            const style = getComputedStyle(el)
            if (
              (style.overflow === 'hidden' || style.textOverflow === 'ellipsis') &&
              el.scrollWidth > el.clientWidth + 1
            ) {
              truncatedTexts.push({
                text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
                clientWidth: el.clientWidth,
                scrollWidth: el.scrollWidth,
                tag: el.tagName.toLowerCase(),
              })
            }
          }

          return {
            viewport: vpLabel,
            view: vName,
            vw,
            vh,
            docScrollWidth,
            hasHorizontalOverflow,
            mainOverflow,
            totalInteractive: allTargets.length,
            undersizedCount: undersizedTargets.length,
            undersizedTargets: undersizedTargets.slice(0, 25),
            truncatedTexts: truncatedTexts.slice(0, 15),
          }
        },
        { vName: viewName, vpLabel: viewportLabel }
      )
    }

    // --- A. MOBILE 360x800 AUDIT ---
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto('/')
    await expect(page.locator('nav')).toBeVisible()
    await page.waitForTimeout(400)

    // Check BottomNavigation 7 tabs truncation & bounding boxes on 360px screen
    const navButtons = page.locator('nav button')
    const navCount = await navButtons.count()
    const navReport: Array<{
      index: number
      text: string | null
      ariaLabel: string | null
      width: number
      height: number
      spanClientWidth: number
      spanScrollWidth: number
      isTruncated: boolean
    }> = []
    for (let i = 0; i < navCount; i++) {
      const btn = navButtons.nth(i)
      const box = await btn.boundingBox()
      const ariaLabel = await btn.getAttribute('aria-label')
      const labelSpan = btn.locator('span').last()
      const text = await labelSpan.textContent()
      const spanMetrics = await labelSpan.evaluate((el) => ({
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
        isTruncated: el.scrollWidth > el.clientWidth,
      }))
      navReport.push({
        index: i,
        text,
        ariaLabel,
        width: Math.round((box?.width ?? 0) * 10) / 10,
        height: Math.round((box?.height ?? 0) * 10) / 10,
        spanClientWidth: spanMetrics.clientWidth,
        spanScrollWidth: spanMetrics.scrollWidth,
        isTruncated: spanMetrics.isTruncated,
      })
    }
    console.log('[AUDIT] Mobile 360px BottomNavigation (7 tabs):', JSON.stringify(navReport))

    // Audit View 0: Przepiśnik (Cookbook) on Mobile
    const mobileCookbookAudit = await auditCurrentView('Przepiśnik (Cookbook)', 'Mobile 360x800')
    console.log('[AUDIT] Mobile View 0 - Cookbook:', JSON.stringify(mobileCookbookAudit))

    // Open Meal Details Sheet/Modal on Mobile Cookbook
    const mealCard = page.getByText('Kurczak Teriyaki z ryżem basmati i awokado').first()
    if (await mealCard.isVisible()) {
      await mealCard.click()
      await page.waitForTimeout(350)
      const dialogBox = await page.locator('[role="dialog"]').first().boundingBox()
      console.log('[AUDIT] Mobile Recipe Detail Sheet/Dialog boundingBox:', JSON.stringify(dialogBox))
      await page.keyboard.press('Escape')
      await page.waitForTimeout(250)
    }

    // Audit View 1: Kalendarz (Month, Week, Day) on Mobile
    await navButtons.nth(1).click()
    await page.waitForTimeout(350)
    const mobileCalMonthAudit = await auditCurrentView('Kalendarz - Miesiąc', 'Mobile 360x800')
    console.log('[AUDIT] Mobile View 1a - Calendar Month:', JSON.stringify(mobileCalMonthAudit))

    const weekViewBtn = page.getByRole('button', { name: /Tydzień|Week/i }).first()
    if (await weekViewBtn.isVisible()) {
      await weekViewBtn.click()
      await page.waitForTimeout(250)
      const mobileCalWeekAudit = await auditCurrentView('Kalendarz - Tydzień', 'Mobile 360x800')
      console.log('[AUDIT] Mobile View 1b - Calendar Week:', JSON.stringify(mobileCalWeekAudit))
    }

    const dayViewBtn = page.getByRole('button', { name: /Dzień|Day/i }).first()
    if (await dayViewBtn.isVisible()) {
      await dayViewBtn.click()
      await page.waitForTimeout(250)
      const mobileCalDayAudit = await auditCurrentView('Kalendarz - Dzień', 'Mobile 360x800')
      console.log('[AUDIT] Mobile View 1c - Calendar Day:', JSON.stringify(mobileCalDayAudit))
    }

    // Audit View 2: Produkty (Products) on Mobile
    await navButtons.nth(2).click()
    await page.waitForTimeout(350)
    const mobileProductsAudit = await auditCurrentView('Produkty (Products)', 'Mobile 360x800')
    console.log('[AUDIT] Mobile View 2 - Products:', JSON.stringify(mobileProductsAudit))

    // Audit View 3: Koszyk (Draft) on Mobile
    await navButtons.nth(3).click()
    await page.waitForTimeout(350)
    const mobileDraftAudit = await auditCurrentView('Koszyk (Draft)', 'Mobile 360x800')
    console.log('[AUDIT] Mobile View 3 - Draft:', JSON.stringify(mobileDraftAudit))

    // Audit View 4: Lista Zakupów (Active List) on Mobile
    await navButtons.nth(4).click()
    await page.waitForTimeout(400)
    const mobileActiveAudit = await auditCurrentView('Lista Zakupów (Active List)', 'Mobile 360x800')
    console.log('[AUDIT] Mobile View 4 - Active List:', JSON.stringify(mobileActiveAudit))

    // Audit View 5: Historia (History) on Mobile
    await navButtons.nth(5).click()
    await page.waitForTimeout(350)
    const mobileHistoryAudit = await auditCurrentView('Historia (History)', 'Mobile 360x800')
    console.log('[AUDIT] Mobile View 5 - History:', JSON.stringify(mobileHistoryAudit))

    // Audit View 6: Spiżarnia (Pantry) on Mobile
    await navButtons.nth(6).click()
    await page.waitForTimeout(350)
    const mobilePantryAudit = await auditCurrentView('Spiżarnia (Pantry)', 'Mobile 360x800')
    console.log('[AUDIT] Mobile View 6 - Pantry:', JSON.stringify(mobilePantryAudit))

    // Test AccountSettingsModal on Mobile
    const headerButtons = page.locator('header button')
    const headerBtnCount = await headerButtons.count()
    if (headerBtnCount > 0) {
      await headerButtons.last().click()
      await page.waitForTimeout(350)
      const settingsDialog = page.locator('[role="dialog"]').first()
      if (await settingsDialog.isVisible()) {
        const settingsBox = await settingsDialog.boundingBox()
        console.log('[AUDIT] Mobile AccountSettings Dialog boundingBox:', JSON.stringify(settingsBox))
        await page.keyboard.press('Escape')
        await page.waitForTimeout(250)
      }
    }

    // --- B. TABLET 768x1024 AUDIT ---
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(350)
    const tabletMainWidth = await page.locator('div.max-w-md').first().boundingBox()
    console.log(
      '[AUDIT] Tablet 768px main container boundingBox:',
      JSON.stringify(tabletMainWidth)
    )
    const tabletNavReport: Array<{ text: string | null; width: number; height: number; isTruncated: boolean }> = []
    for (let i = 0; i < navCount; i++) {
      const btn = navButtons.nth(i)
      const box = await btn.boundingBox()
      const labelSpan = btn.locator('span').last()
      const text = await labelSpan.textContent()
      const isTruncated = await labelSpan.evaluate((el) => el.scrollWidth > el.clientWidth)
      tabletNavReport.push({
        text,
        width: Math.round((box?.width ?? 0) * 10) / 10,
        height: Math.round((box?.height ?? 0) * 10) / 10,
        isTruncated,
      })
    }
    console.log('[AUDIT] Tablet 768px BottomNavigation:', JSON.stringify(tabletNavReport))

    for (let i = 0; i < navCount; i++) {
      await navButtons.nth(i).click()
      await page.waitForTimeout(200)
      const tabAudit = await auditCurrentView(`Tab-${i}`, 'Tablet 768x1024')
      console.log(`[AUDIT] Tablet 768px Tab ${i}:`, JSON.stringify({
        view: tabAudit.view,
        hasHorizontalOverflow: tabAudit.hasHorizontalOverflow,
        mainOverflow: tabAudit.mainOverflow,
        undersizedCount: tabAudit.undersizedCount,
        truncatedTexts: tabAudit.truncatedTexts,
      }))
    }

    // --- C. DESKTOP 1440x900 AUDIT ACROSS ALL 7 VIEWS & ALL 6 THEMES ---
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForTimeout(500)

    const sidebarBox = await page.locator('aside').first().boundingBox()
    const headerBox = await page.locator('header').first().boundingBox()
    console.log('[AUDIT] Desktop Sidebar & Header boundingBoxes:', JSON.stringify({ sidebarBox, headerBox }))

    const desktopTabs = [
      { name: 'Przepisy (Cookbook)', pattern: /^(Przepisy|Przepiśnik|Cookbook|Recipes)$/i },
      { name: 'Kalendarz (Calendar)', pattern: /^(Kalendarz|Calendar)$/i },
      { name: 'Produkty (Products)', pattern: /^(Produkty|Products)$/i },
      { name: 'Koszyk (Draft)', pattern: /^(Koszyk|Draft|Cart)$/i },
      { name: 'Lista Zakupów (Active List)', pattern: /^(Aktywna Lista|Lista Zakupów|Active List)$/i },
      { name: 'Historia (History)', pattern: /^(Historia|History)$/i },
      { name: 'Spiżarnia (Pantry)', pattern: /^(Spiżarnia|Pantry)$/i },
    ]

    for (const tab of desktopTabs) {
      const btn = page
        .locator('aside nav button')
        .filter({ has: page.locator('span.font-bold', { hasText: tab.pattern }) })
        .first()
      if (await btn.isVisible()) {
        await btn.click()
        await page.waitForTimeout(350)
        const h1Texts = await page.locator('h1').allTextContents()
        const desktopAudit = await auditCurrentView(tab.name, 'Desktop 1440x900')
        console.log(
          `[AUDIT] Desktop View - ${tab.name}:`,
          JSON.stringify({
            h1Texts,
            hasHorizontalOverflow: desktopAudit.hasHorizontalOverflow,
            mainOverflow: desktopAudit.mainOverflow,
            totalInteractive: desktopAudit.totalInteractive,
            undersizedCount: desktopAudit.undersizedCount,
            undersizedSample: desktopAudit.undersizedTargets.slice(0, 8),
            truncatedTexts: desktopAudit.truncatedTexts,
          })
        )
      }
    }

    // Switch back to Cookbook on Desktop and inspect all 6 themes
    const cookbookSidebarBtn = page
      .locator('aside nav button')
      .filter({ has: page.locator('span.font-bold', { hasText: /^(Przepisy|Przepiśnik|Cookbook|Recipes)$/i }) })
      .first()
    if (await cookbookSidebarBtn.isVisible()) {
      await cookbookSidebarBtn.click()
      await page.waitForTimeout(350)
    }

    const themes = [
      'oled-black',
      'midnight-blue',
      'forest-sage',
      'warm-amber',
      'cyberpunk-violet',
      'clean-light',
    ]

    const themeReport = await page.evaluate((themeList) => {
      const parseRgb = (rgbStr: string): [number, number, number] => {
        const m = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        if (!m) return [0, 0, 0]
        return [Number(m[1]), Number(m[2]), Number(m[3])]
      }
      const luminance = ([r, g, b]: [number, number, number]) => {
        const a = [r, g, b].map((v) => {
          const s = v / 255
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
        })
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722
      }
      const contrastRatio = (c1: string, c2: string) => {
        const l1 = luminance(parseRgb(c1))
        const l2 = luminance(parseRgb(c2))
        const brightest = Math.max(l1, l2)
        const darkest = Math.min(l1, l2)
        return Math.round(((brightest + 0.05) / (darkest + 0.05)) * 100) / 100
      }

      const results: Record<string, unknown> = {}
      for (const th of themeList) {
        document.documentElement.setAttribute('data-theme', th)
        document.documentElement.classList.toggle('dark', th !== 'clean-light')
        const bodyStyle = getComputedStyle(document.body)
        const bodyBg = bodyStyle.backgroundColor
        const bodyFg = bodyStyle.color

        const cardEl = document.querySelector('.bg-card') as HTMLElement | null
        const cardBg = cardEl ? getComputedStyle(cardEl).backgroundColor : bodyBg

        const mutedEl = document.querySelector('.text-muted-foreground') as HTMLElement | null
        const mutedFg = mutedEl ? getComputedStyle(mutedEl).color : bodyFg

        const primaryEl = document.querySelector('.bg-primary') as HTMLElement | null
        const primaryBg = primaryEl ? getComputedStyle(primaryEl).backgroundColor : ''
        const primaryFg = primaryEl ? getComputedStyle(primaryEl).color : ''

        const badges = Array.from(
          document.querySelectorAll('[class*="text-amber-400"], [class*="text-sky-400"], [class*="text-emerald-400"]')
        )
          .slice(0, 4)
          .map((el) => {
            const c = getComputedStyle(el).color
            return {
              text: el.textContent?.trim().slice(0, 25),
              color: c,
              contrastVsCard: contrastRatio(c, cardBg),
            }
          })

        results[th] = {
          bodyBg,
          bodyFg,
          bodyContrast: contrastRatio(bodyFg, bodyBg),
          cardBg,
          mutedFg,
          mutedContrastVsCard: contrastRatio(mutedFg, cardBg),
          primaryBg,
          primaryFg,
          primaryContrast: primaryBg && primaryFg ? contrastRatio(primaryFg, primaryBg) : null,
          badges,
        }
      }
      return results
    }, themes)

    console.log('[AUDIT] All 6 Themes Computed Styles & Contrast Ratios:', JSON.stringify(themeReport))
  })
})

