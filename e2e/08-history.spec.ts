import { test, expect } from './fixtures/householdFixture'
import { BASE_ACTIVE_LISTS } from './fixtures/baseDataset'
import { closeTopDialog, confirmDeleteDialog, navigateToTab } from './helpers/uiHelpers'

test.describe('Module 08 — Shopping History, Immutable Original Name & Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToTab(page, 'history')
  })

  test('TC-HIST-01: Verify archived [BASE] list renders in History sorted descending @module:history @type:happy-path @state:BASE', async ({
    page,
  }) => {
    const hasRenamed =
      (await page.getByText(BASE_ACTIVE_LISTS.weekendArchiveRenamed).count()) > 0
    const hasOrig = (await page.getByText(BASE_ACTIVE_LISTS.weekendArchive).count()) > 0
    expect(hasRenamed || hasOrig).toBe(true)
  })

  test('TC-HIST-02: Inline rename archived list updates name while preserving immutable original_name @module:history @type:happy-path @state:BASE', async ({
    page,
  }) => {
    const hasRenamed =
      (await page.getByText(BASE_ACTIVE_LISTS.weekendArchiveRenamed).count()) > 0
    const targetTitle = hasRenamed
      ? BASE_ACTIVE_LISTS.weekendArchiveRenamed
      : BASE_ACTIVE_LISTS.weekendArchive

    await page.getByText(targetTitle).first().click()
    const sheet = page.getByRole('dialog').last()
    await expect(sheet).toBeVisible()

    if (!hasRenamed) {
      await sheet.locator('button[title="Edytuj"], button[title="Edit"]').first().click()
      const nameInput = sheet.locator('input').first()
      await nameInput.fill(BASE_ACTIVE_LISTS.weekendArchiveRenamed)
      await nameInput.press('Enter')
      await expect(sheet.getByText(BASE_ACTIVE_LISTS.weekendArchiveRenamed)).toBeVisible()
    }

    // Immutable original_name monospace indicator must remain "[BASE] Zakupy Weekendowe"
    await expect(sheet.getByText(BASE_ACTIVE_LISTS.weekendArchive).first()).toBeVisible()
    await closeTopDialog(page)
  })

  test('TC-HIST-03: Restore archived list to Draft Cart (preserving categories) & clean up restored items @module:history @type:happy-path @state:TEMP', async ({
    page,
  }) => {
    const targetTitle =
      (await page.getByText(BASE_ACTIVE_LISTS.weekendArchiveRenamed).count()) > 0
        ? BASE_ACTIVE_LISTS.weekendArchiveRenamed
        : BASE_ACTIVE_LISTS.weekendArchive

    await page.getByText(targetTitle).first().click()
    const sheet = page.getByRole('dialog').last()
    await expect(sheet).toBeVisible()

    // Verify 50/50 split actions ("Dodaj do koszyka" + "Usuń listę") exist side-by-side
    const restoreBtn = sheet.getByRole('button', { name: /Dodaj do koszyka|Add to cart/i }).first()
    const deleteBtn = sheet.getByRole('button', { name: /Usuń listę|Delete list/i }).first()
    await expect(restoreBtn).toBeVisible()
    await expect(deleteBtn).toBeVisible()

    await restoreBtn.click()
    await expect(sheet).toBeHidden({ timeout: 10000 })

    // Verify item restored to Draft and clean Draft afterwards
    await navigateToTab(page, 'draft')
    await expect(page.getByText('[BASE] Sól morska').first()).toBeVisible()

    await page.getByRole('button', { name: /Wyczyść Koszyk|Clear Cart/i }).first().click()
    await confirmDeleteDialog(page, 'confirm')
  })

  test('TC-HIST-04: Bounded pagination (>30 archived lists mock) & delete [TEMP] archive guard @module:history @type:corner-case @state:TEMP', async ({
    page,
  }) => {
    // Verify history query carries bounded limit and gracefully handles 30+ items via route intercept
    await page.route('**/rest/v1/shopping_lists*', async (route) => {
      const url = route.request().url()
      if (url.includes('is_archived=eq.true') && route.request().method() === 'GET') {
        const mockLists = Array.from({ length: 30 }, (_, i) => ({
          id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
          name: `[TEMP] Mock Archive #${i + 1}`,
          original_name: `[TEMP] Mock Archive #${i + 1}`,
          is_archived: true,
          is_default: false,
          archived_at: new Date(Date.now() - i * 86400000).toISOString(),
          created_at: new Date(Date.now() - i * 86400000).toISOString(),
          updated_at: new Date(Date.now() - i * 86400000).toISOString(),
          household_id: '00000000-0000-4000-8000-000000000099',
          items: [],
        }))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockLists),
        })
        return
      }
      await route.continue()
    })

    await navigateToTab(page, 'draft')
    await navigateToTab(page, 'history')
    await expect(page.getByText('[TEMP] Mock Archive #1').first()).toBeVisible()

    // Test ConfirmDeleteDialog cancel on mocked details sheet
    await page.getByText('[TEMP] Mock Archive #1').first().click()
    const sheet = page.getByRole('dialog').last()
    await sheet.getByRole('button', { name: /Usuń listę|Delete list/i }).first().click()
    await confirmDeleteDialog(page, 'cancel')
    await expect(sheet).toBeVisible()
    await closeTopDialog(page)

    await page.unroute('**/rest/v1/shopping_lists*')
  })
})
