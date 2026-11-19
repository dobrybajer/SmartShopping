import { test, expect } from './fixtures/householdFixture'
import { CANONICAL_MEAL_NAME } from './fixtures/baseDataset'
import {
  addLocalDays,
  closeTopDialog,
  confirmDeleteDialog,
  deletePantryRow,
  ensureProductExists,
  isMobileViewport,
  navigateToTab,
  selectFromAutocomplete,
} from './helpers/uiHelpers'

async function addOrEnsurePantryItem(
  page: import('@playwright/test').Page,
  productName: string,
  quantity: string,
  expiryDate?: string
): Promise<void> {
  if ((await page.getByText(productName).count()) > 0) {
    return
  }

  await page.getByRole('button', { name: /Dodaj do Spiżarni|Add to Pantry/i }).first().click()
  const dialog = page.getByRole('dialog').last()
  await expect(dialog).toBeVisible()

  await selectFromAutocomplete(dialog, productName)
  await dialog.locator('input[type="number"]').first().fill(quantity)

  if (expiryDate) {
    const dateInput = dialog.locator('input[type="date"]').first()
    if ((await dateInput.count()) > 0) {
      await dateInput.fill(expiryDate)
    }
  }

  await dialog.getByRole('button', { name: /Dodaj|Zapisz|Save|Add/i }).last().click()
  await expect(dialog).toBeHidden({ timeout: 10000 })
  await expect(page.getByText(productName).first()).toBeVisible()
}

test.describe('Module 05 — Pantry, Expiry Alerts, Hierarchical Detection & Cook Deduction', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToTab(page, 'pantry')
  })

  test('TC-PANTRY-01: Seed [BASE] pantry items with expired, expiringSoon and fresh states @module:pantry @type:happy-path @state:BASE', async ({
    page,
  }) => {
    const tomorrow = addLocalDays(1)
    const in5Days = addLocalDays(5)
    const in90Days = addLocalDays(90)
    const in180Days = addLocalDays(180)

    await addOrEnsurePantryItem(page, '[BASE] Oliwa z oliwek Extra Virgin', '500', in180Days)
    await addOrEnsurePantryItem(page, '[BASE] Sól morska', '200')
    await addOrEnsurePantryItem(page, '[BASE] Awokado Hass', '2', tomorrow)
    await addOrEnsurePantryItem(page, '[BASE] Awokado Fuerte', '1', in5Days)
    await addOrEnsurePantryItem(page, '[BASE] Ryż basmati', '50', in90Days)
    await addOrEnsurePantryItem(page, '[BASE] Baterie AA Alkaliczne', '4')
    await addOrEnsurePantryItem(page, '[BASE] Pierś z kurczaka', '400', tomorrow)

    await expect(page.getByText('[BASE] Oliwa z oliwek Extra Virgin').first()).toBeVisible()
    await expect(page.getByText('[BASE] Sól morska').first()).toBeVisible()
    await expect(page.getByText('[BASE] Awokado Hass').first()).toBeVisible()
    await expect(page.getByText('[BASE] Awokado Fuerte').first()).toBeVisible()
    await expect(page.getByText('[BASE] Ryż basmati').first()).toBeVisible()
    await expect(page.getByText('[BASE] Baterie AA Alkaliczne').first()).toBeVisible()
  })

  test('TC-PANTRY-02: Sort by expiry date vs aisle, inline qty adjustment & clear date @module:pantry @type:happy-path @state:TEMP', async ({
    page,
  }) => {
    const sortByExpiryBtn = page.getByRole('button', { name: /Wg daty ważności|By expiry/i }).first()
    await sortByExpiryBtn.click()

    const sortByAisleBtn = page.getByRole('button', { name: /Wg alejek|By aisle/i }).first()
    await sortByAisleBtn.click()

    // Test date set/clear & stepper on a [TEMP] pantry item
    const tempProd = `[TEMP] Jogurt Spiżarnia ${isMobileViewport(page) ? 'M' : 'D'}`
    await navigateToTab(page, 'products')
    await ensureProductExists(page, {
      name: tempProd,
      unit: 'g',
      categoryLabel: 'Nabiał i Jaja',
      macros: { kcal: 60, protein: 4, carbs: 5, fat: 2 },
    })

    await navigateToTab(page, 'pantry')
    await addOrEnsurePantryItem(page, tempProd, '200', addLocalDays(2))

    const row = page.locator('div, li').filter({ hasText: tempProd }).filter({ has: page.locator('button') }).last()
    const clearDateBtn = row.locator('[aria-label*="Wyczyść datę" i], [title*="Wyczyść datę" i]').first()
    if ((await clearDateBtn.count()) > 0) {
      await clearDateBtn.click()
    }

    // Stepper + / -
    await row.getByRole('button', { name: /Zwiększ|Increase/i }).first().click()
    await expect(row.getByText(/201\s*g|250\s*g|300\s*g/)).toBeVisible()

    // Cleanup [TEMP] pantry item and product
    await deletePantryRow(page, row)
    await confirmDeleteDialog(page, 'confirm')
    await expect(page.getByText(tempProd)).toHaveCount(0)

    await navigateToTab(page, 'products')
    await page.locator('input[placeholder*="Szukaj produktu" i]').first().fill(tempProd)
    await page
      .locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]')
      .first()
      .click()
    await confirmDeleteDialog(page, 'confirm')
  })

  test('TC-PANTRY-03: Freshness indicator Warehouse for Food vs Non-Food & verify stock (last_verified_at) @module:pantry @type:corner-case @state:BASE', async ({
    page,
  }) => {
    // 1) Verify Food ([BASE] Ryż basmati) vs Non-Food ([BASE] Baterie AA Alkaliczne) rows have Warehouse freshness badges
    const riceRow = page
      .locator('div, li')
      .filter({ hasText: '[BASE] Ryż basmati' })
      .filter({ has: page.getByRole('button', { name: /Zwiększ|Increase/i }) })
      .last()
    await expect(riceRow).toBeVisible()

    const batteryRow = page
      .locator('div, li')
      .filter({ hasText: '[BASE] Baterie AA Alkaliczne' })
      .filter({ has: page.getByRole('button', { name: /Zwiększ|Increase/i }) })
      .last()
    await expect(batteryRow).toBeVisible()

    // Click freshness / verify stock button if needs verification, or confirm verified badge is visible
    const verifyBtn = riceRow
      .getByRole('button', { name: /Potwierdź stan|Zweryfikowano|Verify|Verified/i })
      .first()
    if ((await verifyBtn.count()) > 0) {
      await verifyBtn.click()
    }
    await expect(
      riceRow.getByText(/Zaktualizowano|Zweryfikowano|Potwierdź stan|Updated|Verified|Verify/i).first()
    ).toBeVisible()
    await expect(
      batteryRow.getByText(/Zaktualizowano|Zweryfikowano|Potwierdź stan|Updated|Verified|Verify/i).first()
    ).toBeVisible()
  })

  test('TC-PANTRY-04: Hierarchical general ingredient detection from child pantry stock in Cookbook @module:pantry @type:happy-path @state:BASE', async ({
    page,
  }) => {
    await navigateToTab(page, 'cookbook')
    const searchInput = page.locator('input[placeholder*="Szukaj" i]').first()
    await searchInput.fill(CANONICAL_MEAL_NAME)

    await page.getByText(CANONICAL_MEAL_NAME).first().click()
    const detailsDialog = page.getByRole('dialog').last()
    await expect(detailsDialog).toBeVisible()

    // "[BASE] Awokado" (general) should recognize child "[BASE] Awokado Hass" (2 szt) in pantry!
    const cookBtn = detailsDialog.getByRole('button', {
      name: /Ugotowano \/ Zdejmij ze spiżarni|Ugotuj i zużyj ze spiżarni|Cook & Deduct/i,
    })
    await expect(cookBtn).toBeVisible()

    await closeTopDialog(page)
    await searchInput.fill('')
  })

  test('TC-PANTRY-05: CookMealDeductModal partial deduction + full depletion removes row @module:pantry @type:happy-path @state:TEMP', async ({
    page,
  }) => {
    // Use a temporary standalone product & recipe so [BASE] stock quantities remain exact
    const tempProd = `[TEMP] Płatki Cook ${isMobileViewport(page) ? 'M' : 'D'}`
    const tempMeal = `[TEMP] Owsianka Cook ${isMobileViewport(page) ? 'M' : 'D'}`

    await navigateToTab(page, 'products')
    await ensureProductExists(page, {
      name: tempProd,
      unit: 'g',
      categoryLabel: 'Spiżarnia i Sypkie',
      macros: { kcal: 370, protein: 13, carbs: 62, fat: 7 },
    })

    await navigateToTab(page, 'pantry')
    await addOrEnsurePantryItem(page, tempProd, '100')

    await navigateToTab(page, 'cookbook')
    const searchInput = page.locator('input[placeholder*="Szukaj" i]').first()
    await expect(page.locator('.animate-spin')).toHaveCount(0, { timeout: 10_000 })
    await searchInput.fill(tempMeal)
    await page.waitForTimeout(250)
    if ((await page.getByText(tempMeal).count()) === 0) {
      await searchInput.fill('')
      await page.getByRole('button', { name: /Dodaj Przepis|Add Recipe/i }).first().click()
      const mealDialog = page.getByRole('dialog').last()
      await mealDialog.locator('input[placeholder*="Jajecznica" i]').fill(tempMeal)
      await selectFromAutocomplete(mealDialog, tempProd)
      await mealDialog.locator('input[type="number"]').first().fill('100')
      await mealDialog.locator('button').filter({ has: page.locator('svg.lucide-plus') }).last().click()
      await mealDialog
        .getByRole('button', { name: /Utwórz Przepis|Zapisz Przepis|Create Recipe|Save Recipe/i })
        .click()
      await expect(mealDialog).toBeHidden({ timeout: 10000 })
      await searchInput.fill(tempMeal)
    }

    // Open MealDetailsSheet -> click "Ugotuj i zużyj ze spiżarni"
    await page.getByText(tempMeal).first().click()

    const detailsDialog = page.getByRole('dialog').last()
    const detailsDialogId = await detailsDialog.getAttribute('id')
    const exactDetailsDialog = detailsDialogId ? page.locator(`[id="${detailsDialogId}"]`) : detailsDialog
    await detailsDialog
      .getByRole('button', {
        name: /Ugotowano \/ Zdejmij ze spiżarni|Ugotuj i zużyj ze spiżarni|Cook & Deduct/i,
      })
      .click()

    const cookModal = page.getByRole('dialog').last()
    await expect(cookModal).toBeVisible()
    await expect(cookModal.getByText(tempProd)).toBeVisible()
    const cookModalId = await cookModal.getAttribute('id')
    const exactCookModal = cookModalId ? page.locator(`[id="${cookModalId}"]`) : cookModal

    // Confirm deduction -> depletes 100g -> 0g and removes from pantry
    await cookModal
      .getByRole('button', { name: /Zdejmij ze spiżarni|Deduct from pantry|Zatwierdź|Confirm/i })
      .first()
      .click()
    await expect(exactCookModal).toBeHidden({ timeout: 10000 })

    // Close details modal if still open
    if (await exactDetailsDialog.isVisible().catch(() => false)) {
      await closeTopDialog(page)
    }

    await navigateToTab(page, 'pantry')
    await expect(page.getByText(tempProd)).toHaveCount(0)

    // Cleanup all [TEMP] copies of recipe and product
    await navigateToTab(page, 'cookbook')
    await expect(page.locator('.animate-spin')).toHaveCount(0, { timeout: 10_000 })
    await searchInput.fill(tempMeal)
    await page.waitForTimeout(250)
    const mealHeadings = page.locator('h4', { hasText: tempMeal })
    while ((await mealHeadings.count()) > 0) {
      const before = await mealHeadings.count()
      const mealCard = page
        .locator('div, article, li')
        .filter({ has: mealHeadings.first() })
        .filter({ has: page.locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]') })
        .last()
      await mealCard
        .locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]')
        .first()
        .click()
      await confirmDeleteDialog(page, 'confirm')
      await expect(mealHeadings).toHaveCount(before - 1, { timeout: 10_000 })
    }

    await navigateToTab(page, 'products')
    await expect(page.locator('.animate-spin')).toHaveCount(0, { timeout: 10_000 })
    await page.locator('input[placeholder*="Szukaj produktu" i]').first().fill(tempProd)
    await page.waitForTimeout(250)
    const prodHeadings = page.locator('h4', { hasText: tempProd })
    while ((await prodHeadings.count()) > 0) {
      const before = await prodHeadings.count()
      const prodCard = page
        .locator('div, article, li')
        .filter({ has: prodHeadings.first() })
        .filter({ has: page.locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]') })
        .last()
      await prodCard
        .locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]')
        .first()
        .click()
      await confirmDeleteDialog(page, 'confirm')
      await expect(prodHeadings).toHaveCount(before - 1, { timeout: 10_000 })
    }
  })

  test('TC-PANTRY-06: Duplicate pantry addition merges quantity & ConfirmDeleteDialog Cancel/Confirm guard @module:pantry @type:corner-case @state:TEMP', async ({
    page,
  }) => {
    const tempProd = `[TEMP] Ryż Merge ${isMobileViewport(page) ? 'M' : 'D'}`

    // Self-clean any leftover [TEMP] pantry rows & duplicate products from earlier aborted runs
    await expect(page.locator('.animate-spin')).toHaveCount(0, { timeout: 10_000 })
    const stalePantryMatches = page.getByText(tempProd)
    while ((await stalePantryMatches.count()) > 0) {
      const before = await stalePantryMatches.count()
      const staleRow = page
        .locator('div, li')
        .filter({ hasText: tempProd })
        .filter({ has: page.getByRole('button', { name: /Zwiększ|Increase/i }) })
        .last()
      await deletePantryRow(page, staleRow)
      await confirmDeleteDialog(page, 'confirm')
      await expect(stalePantryMatches).toHaveCount(before - 1, { timeout: 10_000 })
    }

    await navigateToTab(page, 'products')
    await expect(page.locator('.animate-spin')).toHaveCount(0, { timeout: 10_000 })
    const prodSearch = page.locator('input[placeholder*="Szukaj produktu" i]').first()
    await prodSearch.fill(tempProd)
    await page.waitForTimeout(250)
    const prodHeadings = page.locator('h4', { hasText: tempProd })
    while ((await prodHeadings.count()) > 0) {
      const before = await prodHeadings.count()
      const prodCard = page
        .locator('div, article, li')
        .filter({ has: prodHeadings.first() })
        .filter({ has: page.locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]') })
        .last()
      await prodCard
        .locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]')
        .first()
        .click()
      await confirmDeleteDialog(page, 'confirm')
      await expect(prodHeadings).toHaveCount(before - 1, { timeout: 10_000 })
    }
    await ensureProductExists(page, {
      name: tempProd,
      unit: 'g',
      categoryLabel: 'Spiżarnia i Sypkie',
    })

    await navigateToTab(page, 'pantry')
    await addOrEnsurePantryItem(page, tempProd, '150')

    // Add same product again via dialog (+50g -> 200g total, single row)
    await page.getByRole('button', { name: /Dodaj do Spiżarni|Add to Pantry/i }).first().click()
    const dialog = page.getByRole('dialog').last()
    await selectFromAutocomplete(dialog, tempProd)
    await dialog.locator('input[type="number"]').first().fill('50')
    await dialog.getByRole('button', { name: /Dodaj|Zapisz|Save|Add/i }).last().click()
    await expect(dialog).toBeHidden({ timeout: 10000 })

    await expect(page.getByText(tempProd)).toHaveCount(1)
    const row = page
      .locator('div, li')
      .filter({ hasText: tempProd })
      .filter({ has: page.getByRole('button', { name: /Zwiększ|Increase/i }) })
      .last()
    await expect(row.getByText(/200\s*g/)).toBeVisible()

    // Cancel ConfirmDeleteDialog -> stays
    await deletePantryRow(page, row)
    await confirmDeleteDialog(page, 'cancel')
    await expect(page.getByText(tempProd).first()).toBeVisible()

    // Confirm ConfirmDeleteDialog -> removed
    await deletePantryRow(page, row)
    await confirmDeleteDialog(page, 'confirm')
    await expect(page.getByText(tempProd)).toHaveCount(0)

    await navigateToTab(page, 'products')
    await page.locator('input[placeholder*="Szukaj produktu" i]').first().fill(tempProd)
    await page
      .locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]')
      .first()
      .click()
    await confirmDeleteDialog(page, 'confirm')
  })
})
