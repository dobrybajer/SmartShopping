import { expect, type Locator, type Page } from '@playwright/test'
import { TEST_HOUSEHOLD_NAME, type ProductSeed } from '../fixtures/baseDataset'

export type AppTab = 'cookbook' | 'calendar' | 'products' | 'draft' | 'active' | 'history' | 'pantry'

const TAB_LABEL_REGEX: Record<AppTab, RegExp> = {
  cookbook: /^(Przepisy|Recipes)\b/i,
  calendar: /^(Kalendarz|Calendar)\b/i,
  products: /^(Produkty|Products)\b/i,
  draft: /^(Koszyk|Draft|Cart)\b/i,
  active: /^(Aktywna Lista|Lista|Active List|List)\b/i,
  history: /^(Historia|History)\b/i,
  pantry: /^(Spiżarnia|Pantry)\b/i,
}

export function isMobileViewport(page: Page): boolean {
  const vp = page.viewportSize()
  return (vp?.width ?? 1440) < 1024
}

export function formatLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addLocalDays(days: number, baseDate: Date = new Date()): string {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + days)
  return formatLocalDate(d)
}

export function getNextMondayDate(weeksAhead = 1): string {
  const now = new Date()
  const day = now.getDay()
  const daysUntilCurrentMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysUntilCurrentMonday + weeksAhead * 7
  )
  return formatLocalDate(monday)
}

export async function assertAuthenticated(page: Page): Promise<void> {
  const loginBtn = page.getByRole('button', { name: /Zaloguj przez Google|Sign in with Google/i })
  const nav = page.locator('nav').first()

  await Promise.race([
    nav.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined),
    loginBtn.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined),
  ])

  const isLoginVisible = await loginBtn.isVisible().catch(() => false)
  if (isLoginVisible) {
    throw new Error(
      'Brak aktywnej sesji w e2e/.auth/user.json! Uruchom `npm run e2e:auth`, zaloguj się kontem Google i powtórz testy.'
    )
  }
}

export async function closeTopDialog(page: Page): Promise<void> {
  const topDialog = page.getByRole('dialog').last()
  if (!(await topDialog.isVisible().catch(() => false))) {
    return
  }

  // Anchor wait to this exact dialog's id because closing a nested dialog un-hides (aria-hidden) the underlying dialog!
  const dialogId = await topDialog.getAttribute('id')
  const exactDialog = dialogId ? page.locator(`[id="${dialogId}"]`) : topDialog

  const closeByName = topDialog.getByRole('button', { name: /^(Zamknij|Close)$/i }).last()
  const closeByIcon = topDialog.locator('button').filter({ has: page.locator('svg.lucide-x') }).last()

  if (await closeByName.isVisible().catch(() => false)) {
    await closeByName.click()
  } else if (await closeByIcon.isVisible().catch(() => false)) {
    await closeByIcon.click()
  } else {
    await page.keyboard.press('Escape')
  }

  await expect(exactDialog).toBeHidden({ timeout: 5_000 })
}

export async function closeAllDialogs(page: Page): Promise<void> {
  for (let i = 0; i < 4; i++) {
    const count = await page.getByRole('dialog').count()
    if (count === 0) return
    await closeTopDialog(page)
  }
}

export async function navigateToTab(page: Page, tab: AppTab): Promise<void> {
  const mobile = isMobileViewport(page)
  const navContainer = mobile
    ? page.locator('nav[aria-label]').last()
    : page.locator('aside nav').first()

  const button = navContainer.getByRole('button', { name: TAB_LABEL_REGEX[tab] }).first()
  await button.click()
  await page.waitForTimeout(200)
}

export async function openHouseholdsDialog(page: Page): Promise<Locator> {
  const mobile = isMobileViewport(page)
  if (mobile) {
    await page.locator('header button[title]').first().click()
    await page.getByRole('button', { name: /Gospodarstwa|Households/i }).click()
  } else {
    await page.locator('aside div[title]').first().click()
  }
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  return dialog
}

export async function openAccountDetailsDialog(page: Page): Promise<Locator> {
  const mobile = isMobileViewport(page)
  if (mobile) {
    await page.locator('header button[title]').first().click()
    await page.getByRole('button', { name: /Konto|Account/i }).click()
  } else {
    await page.locator('aside button[title]').last().click()
    await page.getByRole('button', { name: /Konto|Account/i }).click()
  }
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  return dialog
}

export async function openCategoryManager(page: Page): Promise<Locator> {
  const householdsDialog = await openHouseholdsDialog(page)
  await householdsDialog.getByRole('button', { name: /Konfiguruj|Configure/i }).click()
  const managerContainer = page.getByRole('dialog').last()
  await expect(managerContainer).toBeVisible()
  return managerContainer
}

export async function switchOrCreateTestHousehold(
  page: Page,
  householdName: string = TEST_HOUSEHOLD_NAME
): Promise<void> {
  const headerArea = isMobileViewport(page) ? page.locator('header') : page.locator('aside')
  // Wait briefly for initial household store hydration on page reload
  try {
    await expect(headerArea).toContainText(householdName, { timeout: 2_500 })
    return
  } catch {
    // Active household differs or is not yet Household_Test; open manager dialog
  }

  const dialog = await openHouseholdsDialog(page)
  // Wait for household rows to render before deciding if TEST_HOUSEHOLD_NAME exists
  await expect(dialog.getByText(/Domyślne|Default|Aktywne|Active/i).first()).toBeVisible({
    timeout: 10_000,
  })

  const matchingRows = dialog.locator('div.p-3.rounded-xl.border').filter({ hasText: householdName })
  const count = await matchingRows.count()
  // Prefer a copy that is already Default or Active if duplicates exist
  const preferredDefault = matchingRows.filter({ hasText: /Domyślne|Default/i }).first()
  const preferredActive = matchingRows.filter({ hasText: /Aktywne|Active/i }).first()
  const householdCard =
    (await preferredDefault.count()) > 0
      ? preferredDefault
      : (await preferredActive.count()) > 0
        ? preferredActive
        : matchingRows.first()

  if (count > 0) {
    const hasActiveBadge = (await householdCard.getByText(/^(Aktywne|Active)$/i).count()) > 0
    if (!hasActiveBadge) {
      // Click "Wybierz" badge area (clicking the name <span> opens inline rename instead!)
      await householdCard.getByText(/^(Wybierz|Select)$/i).first().click()
      await expect(householdCard.getByText(/^(Aktywne|Active)$/i)).toBeVisible({
        timeout: 10_000,
      })
    }
  } else {
    const createInput = dialog.getByPlaceholder(/Wpisz nazwę gospodarstwa|Enter household name/i)
    await createInput.fill(householdName)
    await dialog.getByRole('button', { name: /Utwórz|Create/i }).click()
    await expect(householdCard).toBeVisible({ timeout: 15_000 })
  }

  // Also ensure it is pinned as default so future page reloads start directly in Household_Test
  const setDefaultBtn = householdCard
    .getByRole('button', { name: /Ustaw to gospodarstwo jako domyślne|Set.*default/i })
    .first()
  if (await setDefaultBtn.isVisible().catch(() => false)) {
    await setDefaultBtn.click()
    await expect(householdCard.getByText(/^(Domyślne|Default)$/i)).toBeVisible({
      timeout: 10_000,
    })
  }

  await closeAllDialogs(page)
  await expect(headerArea).toContainText(householdName, { timeout: 10_000 })
}

export async function ensurePolishLanguage(page: Page): Promise<void> {
  const plButton = page.getByRole('button', { name: /^PL$/i }).first()
  if (await plButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    const ariaPressed = await plButton.getAttribute('aria-pressed')
    if (ariaPressed !== 'true') {
      await plButton.click()
    }
  }
}

export async function confirmDeleteDialog(
  page: Page,
  action: 'confirm' | 'cancel' = 'confirm'
): Promise<void> {
  const dialog = page.getByRole('dialog').last()
  await expect(dialog).toBeVisible()
  if (action === 'cancel') {
    await dialog.getByRole('button', { name: /Anuluj|Cancel/i }).click()
  } else {
    await dialog.getByRole('button', { name: /^(Usuń|Delete)$/i }).click()
  }
}

export async function selectFromAutocomplete(
  container: Locator | Page,
  productName: string
): Promise<void> {
  const input = container.getByPlaceholder(/Szukaj|Search/i).first()
  await input.click()
  await input.fill(productName)
  const option = container.locator('ul li button', { hasText: productName }).first()
  await expect(option).toBeVisible({ timeout: 5000 })
  await option.click()
}

export async function ensureCustomCategoryExists(page: Page, categoryName: string): Promise<void> {
  const manager = await openCategoryManager(page)
  const existing = manager.locator('span', { hasText: categoryName }).first()
  if ((await existing.count()) === 0) {
    const input = manager.getByPlaceholder(/Nazwa kategorii|Category name/i)
    await input.fill(categoryName)
    await manager.getByRole('button', { name: /Dodaj kategorię|Add Category/i }).click()
    await expect(manager.locator('span', { hasText: categoryName }).first()).toBeVisible({
      timeout: 10_000,
    })
  }
  await closeAllDialogs(page)
}

export async function ensureProductExists(page: Page, seed: ProductSeed): Promise<void> {
  await navigateToTab(page, 'products')
  const searchInput = page.getByPlaceholder(/Szukaj produktu|Search products/i)
  await searchInput.fill(seed.name)
  await page.waitForTimeout(250)

  const existingHeading = page.locator('h4', { hasText: seed.name }).first()
  if ((await existingHeading.count()) > 0) {
    await searchInput.fill('')
    return
  }

  await searchInput.fill('')
  await page.getByRole('button', { name: /Dodaj Produkt|Add Product/i }).first().click()
  const form = page.getByRole('dialog').last()
  await expect(form).toBeVisible()

  if (seed.isGeneral) {
    await form.getByRole('button', { name: /Produkt ogólny|General product/i }).click()
  } else {
    await form.getByRole('button', { name: /Produkt szczegółowy|Specific product/i }).click()
  }

  await form.getByPlaceholder(/Jogurt grecki|Greek yogurt/i).fill(seed.name)

  const selects = form.locator('select')
  let categorySelectIndex = 0
  let unitSelectIndex = 1

  if (!seed.isGeneral && seed.parentName) {
    await selects.nth(0).selectOption({ label: seed.parentName })
    categorySelectIndex = 1
    unitSelectIndex = 2
  } else if (!seed.isGeneral) {
    categorySelectIndex = 1
    unitSelectIndex = 2
  }

  if (seed.categoryLabel) {
    const options = await selects.nth(categorySelectIndex).locator('option').allTextContents()
    const match = options.find((opt) => opt.toLowerCase().includes(seed.categoryLabel.toLowerCase()))
    if (match) {
      await selects.nth(categorySelectIndex).selectOption({ label: match })
    }
  }

  await selects.nth(unitSelectIndex).selectOption(seed.unit)

  if (!seed.isGeneral) {
    const isFoodCheckbox = form.locator('#isFood')
    if (seed.isNonFood) {
      if ((await isFoodCheckbox.getAttribute('data-state')) === 'checked') {
        await isFoodCheckbox.click()
      }
    } else if (seed.macros) {
      if ((await isFoodCheckbox.getAttribute('data-state')) !== 'checked') {
        await isFoodCheckbox.click()
      }
      const numInputs = form.locator('input[type="number"]')
      await numInputs.nth(0).fill(String(seed.macros.kcal))
      await numInputs.nth(1).fill(String(seed.macros.protein))
      await numInputs.nth(2).fill(String(seed.macros.carbs))
      await numInputs.nth(3).fill(String(seed.macros.fat))
    }
  }

  await form.getByRole('button', { name: /Dodaj Produkt|Zapisz|Add Product|Save/i }).last().click()
  await expect(form).toBeHidden({ timeout: 10_000 })
  await expect(page.locator('h4', { hasText: seed.name }).first()).toBeVisible({ timeout: 10_000 })
}
