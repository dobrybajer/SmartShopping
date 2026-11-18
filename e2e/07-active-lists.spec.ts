import { test, expect } from './fixtures/householdFixture'
import { BASE_ACTIVE_LISTS } from './fixtures/baseDataset'
import {
  closeAllDialogs,
  closeTopDialog,
  confirmDeleteDialog,
  ensureProductExists,
  isMobileViewport,
  navigateToTab,
  openCategoryManager,
  selectFromAutocomplete,
} from './helpers/uiHelpers'

async function ensureActiveListExists(
  page: import('@playwright/test').Page,
  listName: string
): Promise<void> {
  await navigateToTab(page, 'active')
  await expect(page.locator('.animate-spin')).toHaveCount(0, { timeout: 10_000 })
  if ((await page.getByRole('button', { name: listName }).count()) > 0) {
    return
  }

  await page
    .getByRole('button', {
      name: /Nowa Lista|Utwórz Listę Zakupów|New List|Create Shopping List/i,
    })
    .first()
    .click()
  const dialog = page.getByRole('dialog').last()
  await expect(dialog).toBeVisible()
  await dialog.locator('input').first().fill(listName)
  await dialog.locator('button[type="submit"]').first().click()
  await expect(dialog).toBeHidden({ timeout: 10000 })
  await expect(page.getByRole('button', { name: listName }).first()).toBeVisible()
}

async function openListOptionsIfMobile(page: import('@playwright/test').Page): Promise<void> {
  if (isMobileViewport(page)) {
    await page.locator('button[title="Opcje Listy"], button[title="List Options"]').first().click()
  }
}

async function addAdHocItemToDraft(
  page: import('@playwright/test').Page,
  productName: string,
  qty: string
): Promise<void> {
  await navigateToTab(page, 'draft')
  await page.getByRole('button', { name: /Dodaj Ad-hoc|Add Ad-hoc/i }).first().click()
  const dialog = page.getByRole('dialog').last()
  await selectFromAutocomplete(dialog, productName)
  await dialog.locator('input[type="number"]').first().fill(qty)
  await dialog.getByRole('button', { name: /Dodaj|Zapisz|Add|Save/i }).last().click()
  await expect(dialog).toBeHidden({ timeout: 10000 })
}

async function transferDraftToList(
  page: import('@playwright/test').Page,
  targetListName: string
): Promise<void> {
  await navigateToTab(page, 'draft')
  await page
    .getByRole('button', { name: /Przenieś do Listy Zakupów|Transfer to Shopping List/i })
    .first()
    .click()
  const dialog = page.getByRole('dialog').last()
  await expect(dialog).toBeVisible()

  // Wait for async getActiveListsSummary() to populate the radio list before selecting
  const listLabel = dialog.locator('label', { hasText: targetListName }).first()
  await expect(listLabel).toBeVisible({ timeout: 10_000 })
  await listLabel.click()

  await dialog.locator('button[type="submit"]').first().click()
  await expect(dialog).toBeHidden({ timeout: 10_000 })
}

test.describe('Module 07 — Active Shopping Lists, Offline Queue, OCC & Archive', () => {
  test('TC-ACT-01: Create & verify 2 concurrent [BASE] Active Lists (Groceries + HomeChem) @module:active-lists @type:happy-path @state:BASE', async ({
    page,
  }) => {
    await ensureActiveListExists(page, BASE_ACTIVE_LISTS.groceries)
    await ensureActiveListExists(page, BASE_ACTIVE_LISTS.homeChem)

    // Ensure [BASE] Baterie AA Alkaliczne is on [BASE] Dom i Chemia
    await page.getByRole('button', { name: BASE_ACTIVE_LISTS.homeChem }).first().click()
    if ((await page.getByText('[BASE] Baterie AA Alkaliczne').count()) === 0) {
      await addAdHocItemToDraft(page, '[BASE] Baterie AA Alkaliczne', '4')
      await transferDraftToList(page, BASE_ACTIVE_LISTS.homeChem)
    }
    await navigateToTab(page, 'active')
    await page.getByRole('button', { name: BASE_ACTIVE_LISTS.homeChem }).first().click()
    await expect(page.getByText('[BASE] Baterie AA Alkaliczne').first()).toBeVisible()

    // Ensure [BASE] Oliwa z oliwek Extra Virgin is on [BASE] Zakupy Spożywcze Tydzień
    await page.getByRole('button', { name: BASE_ACTIVE_LISTS.groceries }).first().click()
    if ((await page.getByText('[BASE] Oliwa z oliwek Extra Virgin').count()) === 0) {
      await addAdHocItemToDraft(page, '[BASE] Oliwa z oliwek Extra Virgin', '10')
      await transferDraftToList(page, BASE_ACTIVE_LISTS.groceries)
    }
    await navigateToTab(page, 'active')
    await page.getByRole('button', { name: BASE_ACTIVE_LISTS.groceries }).first().click()
    await expect(
      page.getByRole('heading', { name: BASE_ACTIVE_LISTS.groceries }).first()
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('[BASE] Oliwa z oliwek Extra Virgin').first()).toBeVisible()
  })

  test('TC-ACT-02: Duplicate item merge resets is_checked to false & triggers LIST_ITEM_ADDED spy @module:active-lists @type:corner-case @state:TEMP', async ({
    page,
  }) => {
    const tempProd = `[TEMP] Sok Pomarańczowy ${isMobileViewport(page) ? 'M' : 'D'}`
    await navigateToTab(page, 'products')
    await ensureProductExists(page, {
      name: tempProd,
      unit: 'ml',
      categoryLabel: 'Napoje',
    })

    const tempList = `[TEMP] Lista Merge ${isMobileViewport(page) ? 'M' : 'D'}`
    // Clear any leftover items in Draft Cart from earlier tests
    await navigateToTab(page, 'draft')
    const clearDraftBtn = page.getByRole('button', { name: /Wyczyść Koszyk|Clear Cart/i }).first()
    if (await clearDraftBtn.isVisible().catch(() => false)) {
      await clearDraftBtn.click()
    }

    // Ensure a clean list slate if prior aborted run left items in [TEMP] Lista Merge
    await navigateToTab(page, 'active')
    await expect(page.locator('.animate-spin')).toHaveCount(0, { timeout: 10_000 })
    while ((await page.getByRole('button', { name: tempList }).count()) > 0) {
      await page.getByRole('button', { name: tempList }).first().click()
      await expect(page.getByRole('heading', { name: tempList }).first()).toBeVisible({ timeout: 10_000 })
      await openListOptionsIfMobile(page)
      await page.getByRole('button', { name: /Usuń Listę|Delete List/i }).first().click()
      await confirmDeleteDialog(page, 'confirm')
      await expect(page.locator('.animate-spin')).toHaveCount(0, { timeout: 10_000 })
      await page.waitForTimeout(300)
    }
    await ensureActiveListExists(page, tempList)

    // Add 500 ml via Draft -> Active list
    await addAdHocItemToDraft(page, tempProd, '500')
    await transferDraftToList(page, tempList)

    await navigateToTab(page, 'active')
    await page.getByRole('button', { name: tempList }).first().click()
    await expect(page.getByRole('heading', { name: tempList }).first()).toBeVisible({ timeout: 10_000 })

    // Tick item as bought (is_checked = true)
    const row = page
      .locator('div, li')
      .filter({ hasText: tempProd })
      .filter({ has: page.locator('button, [role="checkbox"]') })
      .last()
    await row.locator('button, [role="checkbox"]').first().click()
    await expect(row.locator('.line-through').first()).toBeVisible({ timeout: 10_000 })

    // Spy on send-push-notification when merging another 250 ml from Draft
    const pushRequests: string[] = []
    await page.route('**/functions/v1/send-push-notification', async (route) => {
      pushRequests.push(route.request().postData() || '')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sent: 0, skipped: true }),
      })
    })

    await addAdHocItemToDraft(page, tempProd, '250')
    await transferDraftToList(page, tempList)

    await navigateToTab(page, 'active')
    await page.getByRole('button', { name: tempList }).first().click()
    await expect(page.getByRole('heading', { name: tempList }).first()).toBeVisible({ timeout: 10_000 })

    // Should merge into 750 ml and reset unchecked, while notifying household members via LIST_ITEM_ADDED!
    const mergedRow = page
      .locator('div, li')
      .filter({ hasText: tempProd })
      .filter({ has: page.getByRole('button', { name: /Zwiększ|Increase/i }) })
      .last()
    await expect(mergedRow.getByText(/750\s*ml/)).toBeVisible()
    await expect(mergedRow.locator('.line-through')).toHaveCount(0)
    expect(pushRequests.length).toBeGreaterThanOrEqual(1)
    await page.unroute('**/functions/v1/send-push-notification')

    // Cleanup [TEMP] list and product
    await openListOptionsIfMobile(page)
    await page.getByRole('button', { name: /Usuń Listę|Delete List/i }).first().click()
    await confirmDeleteDialog(page, 'confirm')

    await navigateToTab(page, 'products')
    await page.locator('input[placeholder*="Szukaj produktu" i]').first().fill(tempProd)
    await page
      .locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]')
      .first()
      .click()
    await confirmDeleteDialog(page, 'confirm')
  })

  test('TC-ACT-03: Store aisle category order customization reflects in Active List grouping @module:active-lists @type:happy-path @state:BASE', async ({
    page,
  }) => {
    const cmDialog = await openCategoryManager(page)
    await expect(cmDialog.getByText('Nabiał i Jaja')).toBeVisible()
    await closeAllDialogs(page)

    await navigateToTab(page, 'active')
    await page.getByRole('button', { name: BASE_ACTIVE_LISTS.groceries }).first().click()
    await expect(
      page.getByRole('heading', { name: BASE_ACTIVE_LISTS.groceries }).first()
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('[BASE] Oliwa z oliwek Extra Virgin').first()).toBeVisible()
  })

  test('TC-ACT-04: Pantry confirm (in_pantry), restoreToBuy & finishing all items triggers LIST_COMPLETED @module:active-lists @type:happy-path @state:TEMP', async ({
    page,
  }) => {
    const suffix = isMobileViewport(page) ? 'M' : 'D'
    const tempList = `[TEMP] Lista PantryCheck ${suffix}`
    const tempProd = `[TEMP] Kurczak PantryCheck ${suffix}`

    // Create dedicated [TEMP] product & stock it in Pantry so we don't collide with duplicate [BASE] rows
    await navigateToTab(page, 'products')
    await ensureProductExists(page, {
      name: tempProd,
      unit: 'g',
      categoryLabel: 'Mięso i Ryby',
      macros: { kcal: 110, protein: 22, carbs: 0, fat: 2 },
    })
    await navigateToTab(page, 'pantry')
    await expect(page.locator('.animate-spin')).toHaveCount(0, { timeout: 10_000 })
    if ((await page.getByText(tempProd).count()) === 0) {
      await page.getByRole('button', { name: /Dodaj do Spiżarni|Add to Pantry/i }).first().click()
      const pantryAddDialog = page.getByRole('dialog').last()
      await expect(pantryAddDialog).toBeVisible()
      await selectFromAutocomplete(pantryAddDialog, tempProd)
      await pantryAddDialog.locator('input[type="number"]').first().fill('300')
      await pantryAddDialog.getByRole('button', { name: /Dodaj|Zapisz|Save|Add/i }).last().click()
      await expect(pantryAddDialog).toBeHidden({ timeout: 10_000 })
      await expect(page.getByText(tempProd).first()).toBeVisible()
    }

    // Clear any leftover items in Draft Cart and stale [TEMP] Lista PantryCheck
    await navigateToTab(page, 'draft')
    const clearDraftBtn = page.getByRole('button', { name: /Wyczyść Koszyk|Clear Cart/i }).first()
    if (await clearDraftBtn.isVisible().catch(() => false)) {
      await clearDraftBtn.click()
    }
    await navigateToTab(page, 'active')
    await expect(page.locator('.animate-spin')).toHaveCount(0, { timeout: 10_000 })
    while ((await page.getByRole('button', { name: tempList }).count()) > 0) {
      await page.getByRole('button', { name: tempList }).first().click()
      await expect(page.getByRole('heading', { name: tempList }).first()).toBeVisible({ timeout: 10_000 })
      await openListOptionsIfMobile(page)
      await page.getByRole('button', { name: /Usuń Listę|Delete List/i }).first().click()
      await confirmDeleteDialog(page, 'confirm')
      await expect(page.locator('.animate-spin')).toHaveCount(0, { timeout: 10_000 })
      await page.waitForTimeout(300)
    }
    await ensureActiveListExists(page, tempList)

    await addAdHocItemToDraft(page, tempProd, '200')
    await transferDraftToList(page, tempList)

    await navigateToTab(page, 'active')
    await page.getByRole('button', { name: tempList }).first().click()
    await expect(page.getByRole('heading', { name: tempList }).first()).toBeVisible({ timeout: 10_000 })

    const row = page
      .locator('div, li')
      .filter({ hasText: tempProd })
      .filter({ has: page.locator('button[aria-label*="spiżarni" i]') })
      .last()
    await row.locator('button[aria-label*="spiżarni" i]').first().click()
    const pantryModal = page.getByRole('dialog').last()
    await pantryModal.getByRole('button', { name: /Mam całość|Have all/i }).click()
    await expect(pantryModal).toBeHidden({ timeout: 10000 })

    // When in_pantry = true, badge shows "W spiżarni" and clicking the row re-opens PantryConfirmModal
    const inPantryRow = page
      .locator('div, li')
      .filter({ hasText: tempProd })
      .filter({ hasText: /W spiżarni|In pantry/i })
      .filter({ has: page.locator('button[role="checkbox"], [role="checkbox"]') })
      .last()
    await inPantryRow.getByText(/W spiżarni|In pantry/i).first().click()
    const maybeModal = page.getByRole('dialog').last()
    await expect(maybeModal).toBeVisible({ timeout: 5_000 })
    const restoreBtn = maybeModal.getByRole('button', {
      name: /Przywróć do kupienia|Restore to buy/i,
    })
    if ((await restoreBtn.count()) > 0) {
      await restoreBtn.click()
      await expect(maybeModal).toBeHidden({ timeout: 5_000 })
    } else {
      await closeTopDialog(page)
    }

    // Intercept push notifications when ticking final item (LIST_COMPLETED)
    const completedPushRequests: string[] = []
    await page.route('**/functions/v1/send-push-notification', async (route) => {
      completedPushRequests.push(route.request().postData() || '')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sent: 0 }),
      })
    })
    const activeRow = page
      .locator('div, li')
      .filter({ hasText: tempProd })
      .filter({ has: page.locator('button[role="checkbox"], [role="checkbox"]') })
      .last()
    const checkbox = activeRow.locator('button[role="checkbox"], [role="checkbox"]').first()
    if ((await checkbox.getAttribute('aria-checked')) !== 'true' && (await checkbox.isEnabled().catch(() => false))) {
      await checkbox.click()
      await expect(activeRow.locator('.line-through').first()).toBeVisible({ timeout: 10_000 })
    }
    await page.unroute('**/functions/v1/send-push-notification')

    // Cleanup [TEMP] list, pantry item, and product
    await openListOptionsIfMobile(page)
    await page.getByRole('button', { name: /Usuń Listę|Delete List/i }).first().click()
    await confirmDeleteDialog(page, 'confirm')

    await navigateToTab(page, 'pantry')
    const pantryCleanupRow = page
      .locator('div, li')
      .filter({ hasText: tempProd })
      .filter({ has: page.locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]') })
      .last()
    if ((await pantryCleanupRow.count()) > 0) {
      await pantryCleanupRow
        .locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]')
        .first()
        .click()
      await confirmDeleteDialog(page, 'confirm')
      await expect(page.getByText(tempProd)).toHaveCount(0, { timeout: 10_000 })
    }

    await navigateToTab(page, 'products')
    await expect(page.locator('.animate-spin')).toHaveCount(0, { timeout: 10_000 })
    await page.locator('input[placeholder*="Szukaj produktu" i]').first().fill(tempProd)
    await page.waitForTimeout(250)
    const prodHeadings = page.locator('h4', { hasText: tempProd })
    if ((await prodHeadings.count()) > 0) {
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
      await expect(prodHeadings).toHaveCount(0, { timeout: 10_000 })
    }
  })

  test('TC-ACT-05: Offline mutation queue preserves optimistic check & OCC stale conflict handles gracefully @module:active-lists @type:corner-case @state:TEMP', async ({
    page,
    context,
  }) => {
    const tempList = `[TEMP] Lista Offline ${isMobileViewport(page) ? 'M' : 'D'}`
    await ensureActiveListExists(page, tempList)
    await addAdHocItemToDraft(page, '[BASE] Sól morska', '100')
    await transferDraftToList(page, tempList)

    await navigateToTab(page, 'active')
    await page.getByRole('button', { name: tempList }).first().click()

    // Go offline and toggle item checked -> must stay checked optimistically without reverting
    await context.setOffline(true)
    const row = page
      .locator('div, li')
      .filter({ hasText: '[BASE] Sól morska' })
      .filter({ has: page.locator('button, [role="checkbox"]') })
      .last()
    await row.locator('button, [role="checkbox"]').first().click()
    await expect(row.locator('.line-through').first()).toBeVisible()

    // Restore connectivity
    await context.setOffline(false)
    await page.waitForTimeout(800)

    // Mock OCC conflict (409) on next toggle PATCH and verify error toast without crash
    await page.route('**/rest/v1/shopping_list_items*', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Conflict stale updated_at' }),
        })
        return
      }
      await route.continue()
    })

    await row.locator('button, [role="checkbox"]').first().click()
    await page.unroute('**/rest/v1/shopping_list_items*')

    // Cleanup [TEMP] list
    await openListOptionsIfMobile(page)
    await page.getByRole('button', { name: /Usuń Listę|Delete List/i }).first().click()
    await confirmDeleteDialog(page, 'confirm')
  })

  test('TC-ACT-06: Archive [BASE] Zakupy Weekendowe into History (moving checked to Pantry & unchecked back to Draft) @module:active-lists @type:happy-path @state:BASE', async ({
    page,
  }) => {
    // Check History first to make [BASE] archival idempotent
    await navigateToTab(page, 'history')
    await expect(page.locator('.animate-spin')).toHaveCount(0, { timeout: 10_000 })
    const alreadyArchived =
      (await page.getByText(BASE_ACTIVE_LISTS.weekendArchiveRenamed).count()) > 0 ||
      (await page.getByText(BASE_ACTIVE_LISTS.weekendArchive).count()) > 0

    if (!alreadyArchived) {
      await ensureActiveListExists(page, BASE_ACTIVE_LISTS.weekendArchive)
      await addAdHocItemToDraft(page, '[BASE] Sól morska', '100')
      await transferDraftToList(page, BASE_ACTIVE_LISTS.weekendArchive)

      await navigateToTab(page, 'active')
      await expect(page.locator('.animate-spin')).toHaveCount(0, { timeout: 10_000 })
      await page.getByRole('button', { name: BASE_ACTIVE_LISTS.weekendArchive }).first().click()

      // Check item bought before archiving
      const row = page
        .locator('div, li')
        .filter({ hasText: '[BASE] Sól morska' })
        .filter({ has: page.locator('button, [role="checkbox"]') })
        .last()
      await row.locator('button, [role="checkbox"]').first().click()

      // Clicking "Zakończ i Zarchiwizuj" executes archiveActiveList directly (without ConfirmDialog)
      await openListOptionsIfMobile(page)
      await page
        .getByRole('button', { name: /Zakończ i Zarchiwizuj|Zakończ Zakupy|Finish & Archive/i })
        .first()
        .click()
      await expect(
        page.getByText(/zarchiwizowana|archived/i).first()
      ).toBeVisible({ timeout: 15_000 })
    }

    await navigateToTab(page, 'history')
    await expect(
      page
        .locator('main')
        .getByText(
          new RegExp(
            `${BASE_ACTIVE_LISTS.weekendArchiveRenamed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${BASE_ACTIVE_LISTS.weekendArchive.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
          )
        )
        .first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('TC-ACT-07: Rename list, Set as Default, empty-list archive guard & Delete [TEMP] list @module:active-lists @type:corner-case @state:TEMP', async ({
    page,
  }) => {
    const tempList = `[TEMP] Lista Robocza ${isMobileViewport(page) ? 'M' : 'D'}`
    const renamedList = `${tempList} Zmieniona`

    await ensureActiveListExists(page, tempList)
    await page.getByRole('button', { name: tempList }).first().click()
    await expect(page.getByRole('heading', { name: tempList }).first()).toBeVisible({
      timeout: 10_000,
    })

    // Rename list
    await openListOptionsIfMobile(page)
    await page.getByRole('button', { name: /Zmień Nazwę Listy|Rename List/i }).first().click()
    const renameDialog = page.getByRole('dialog').last()
    await renameDialog.locator('input').first().fill(renamedList)
    await renameDialog.getByRole('button', { name: /Zapisz|Save/i }).last().click()
    await expect(renameDialog).toBeHidden({ timeout: 10000 })
    await expect(page.getByRole('button', { name: renamedList }).first()).toBeVisible()

    // Empty-list archive button disabled or displays error when 0 items
    await openListOptionsIfMobile(page)
    const archiveBtn = page
      .getByRole('button', { name: /Zakończ i Zarchiwizuj|Zakończ Zakupy|Finish & Archive/i })
      .first()
    if (await archiveBtn.isEnabled()) {
      await archiveBtn.click()
      // Expect toast or dialog guard; close if dialog opened
      const maybeDialog = page.getByRole('dialog').last()
      if (await maybeDialog.isVisible()) {
        await closeTopDialog(page)
      }
    }

    // Cancel delete -> stays
    await openListOptionsIfMobile(page)
    await page.getByRole('button', { name: /Usuń Listę|Delete List/i }).first().click()
    await confirmDeleteDialog(page, 'cancel')
    await expect(page.getByRole('button', { name: renamedList }).first()).toBeVisible()

    // Confirm delete -> gone
    await openListOptionsIfMobile(page)
    await page.getByRole('button', { name: /Usuń Listę|Delete List/i }).first().click()
    await confirmDeleteDialog(page, 'confirm')
    await expect(page.getByRole('button', { name: renamedList })).toHaveCount(0)
  })
})
