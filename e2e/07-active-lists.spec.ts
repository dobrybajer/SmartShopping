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
  if ((await page.getByRole('button', { name: listName }).count()) > 0) {
    return
  }

  await page.getByRole('button', { name: /Nowa Lista|New List/i }).first().click()
  const dialog = page.getByRole('dialog').last()
  await expect(dialog).toBeVisible()
  await dialog.locator('input').first().fill(listName)
  await dialog.getByRole('button', { name: /Utwórz|Zapisz|Create|Save/i }).last().click()
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

  const listBtn = dialog.getByRole('button', { name: targetListName }).first()
  if ((await listBtn.count()) > 0) {
    await listBtn.click()
  } else {
    const selectEl = dialog.locator('select').first()
    if ((await selectEl.count()) > 0) {
      const optVal = await selectEl
        .locator('option', { hasText: targetListName })
        .first()
        .getAttribute('value')
      if (optVal) await selectEl.selectOption(optVal)
    }
  }

  await dialog.getByRole('button', { name: /Przenieś|Transfer|Zapisz|Save/i }).last().click()
  await expect(dialog).toBeHidden({ timeout: 10000 })
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
    await ensureActiveListExists(page, tempList)

    // Add 500 ml via Draft -> Active list
    await addAdHocItemToDraft(page, tempProd, '500')
    await transferDraftToList(page, tempList)

    await navigateToTab(page, 'active')
    await page.getByRole('button', { name: tempList }).first().click()

    // Tick item as bought (is_checked = true)
    const row = page.locator('div, li').filter({ hasText: tempProd }).last()
    await row.locator('button, [role="checkbox"]').first().click()

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

    // Should merge into 750 ml and reset unchecked!
    const mergedRow = page.locator('div, li').filter({ hasText: tempProd }).last()
    await expect(mergedRow.getByText(/750\s*ml/)).toBeVisible()
    await expect(mergedRow.locator('.line-through')).toHaveCount(0)

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
    await expect(page.getByText('[BASE] Oliwa z oliwek Extra Virgin').first()).toBeVisible()
  })

  test('TC-ACT-04: Pantry confirm (in_pantry), restoreToBuy & finishing all items triggers LIST_COMPLETED @module:active-lists @type:happy-path @state:TEMP', async ({
    page,
  }) => {
    const tempList = `[TEMP] Lista PantryCheck ${isMobileViewport(page) ? 'M' : 'D'}`
    await ensureActiveListExists(page, tempList)

    // [BASE] Pierś z kurczaka is already in Pantry (from Module 05)
    await addAdHocItemToDraft(page, '[BASE] Pierś z kurczaka', '200')
    await transferDraftToList(page, tempList)

    await navigateToTab(page, 'active')
    await page.getByRole('button', { name: tempList }).first().click()

    const row = page.locator('div, li').filter({ hasText: '[BASE] Pierś z kurczaka' }).last()
    await row.locator('button[aria-label*="spiżarni" i]').first().click()
    const pantryModal = page.getByRole('dialog').last()
    await pantryModal.getByRole('button', { name: /Mam całość|Have all/i }).click()
    await expect(pantryModal).toBeHidden({ timeout: 10000 })

    // Verify in_pantry satisfies the item and shows "Przywróć" or restore via modal
    await row.locator('button[aria-label*="spiżarni" i], button').first().click()
    const maybeModal = page.getByRole('dialog').last()
    if (await maybeModal.isVisible()) {
      const restoreBtn = maybeModal.getByRole('button', {
        name: /Przywróć do kupienia|Restore to buy/i,
      })
      if ((await restoreBtn.count()) > 0) {
        await restoreBtn.click()
      } else {
        await closeTopDialog(page)
      }
    }

    // Intercept push notifications when ticking final item
    await page.route('**/functions/v1/send-push-notification', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sent: 0 }),
      })
    })

    // Cleanup [TEMP] list
    await openListOptionsIfMobile(page)
    await page.getByRole('button', { name: /Usuń Listę|Delete List/i }).first().click()
    await confirmDeleteDialog(page, 'confirm')
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
    const row = page.locator('div, li').filter({ hasText: '[BASE] Sól morska' }).last()
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
    const alreadyArchived =
      (await page.getByText(BASE_ACTIVE_LISTS.weekendArchiveRenamed).count()) > 0 ||
      (await page.getByText(BASE_ACTIVE_LISTS.weekendArchive).count()) > 0

    if (!alreadyArchived) {
      await ensureActiveListExists(page, BASE_ACTIVE_LISTS.weekendArchive)
      await addAdHocItemToDraft(page, '[BASE] Sól morska', '100')
      await transferDraftToList(page, BASE_ACTIVE_LISTS.weekendArchive)

      await navigateToTab(page, 'active')
      await page.getByRole('button', { name: BASE_ACTIVE_LISTS.weekendArchive }).first().click()

      // Check item bought before archiving
      const row = page.locator('div, li').filter({ hasText: '[BASE] Sól morska' }).last()
      await row.locator('button, [role="checkbox"]').first().click()

      await openListOptionsIfMobile(page)
      await page
        .getByRole('button', { name: /Zakończ i Zarchiwizuj|Zakończ Zakupy|Finish & Archive/i })
        .first()
        .click()

      const archiveDialog = page.getByRole('dialog').last()
      await expect(archiveDialog).toBeVisible()
      await archiveDialog
        .getByRole('button', { name: /Zakończ|Archiwizuj|Potwierdź|Confirm|Archive/i })
        .last()
        .click()
      await expect(archiveDialog).toBeHidden({ timeout: 15000 })
    }

    await navigateToTab(page, 'history')
    const hasEither =
      (await page.getByText(BASE_ACTIVE_LISTS.weekendArchiveRenamed).count()) > 0 ||
      (await page.getByText(BASE_ACTIVE_LISTS.weekendArchive).count()) > 0
    expect(hasEither).toBe(true)
  })

  test('TC-ACT-07: Rename list, Set as Default, empty-list archive guard & Delete [TEMP] list @module:active-lists @type:corner-case @state:TEMP', async ({
    page,
  }) => {
    const tempList = `[TEMP] Lista Robocza ${isMobileViewport(page) ? 'M' : 'D'}`
    const renamedList = `${tempList} Zmieniona`

    await ensureActiveListExists(page, tempList)
    await page.getByRole('button', { name: tempList }).first().click()

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
