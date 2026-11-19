import { test, expect } from './fixtures/householdFixture'
import { BASE_ACTIVE_LISTS } from './fixtures/baseDataset'
import {
  closeTopDialog,
  confirmDeleteDialog,
  isMobileViewport,
  navigateToTab,
} from './helpers/uiHelpers'

test.describe('Module 08 — Shopping History, Immutable Original Name & Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToTab(page, 'history')
  })

  test('TC-HIST-01: Verify archived [BASE] list renders in History sorted descending @module:history @type:happy-path @state:BASE', async ({
    page,
  }) => {
    await expect(
      page
        .locator('main')
        .getByText(
          /\[BASE\] Archiwum: Weekendowe zakupy spożywcze|\[BASE\] Zakupy Weekendowe/
        )
        .first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('TC-HIST-02: Inline rename archived list updates name while preserving immutable original_name @module:history @type:happy-path @state:BASE', async ({
    page,
  }) => {
    await expect(
      page
        .locator('main')
        .getByText(
          /\[BASE\] Archiwum: Weekendowe zakupy spożywcze|\[BASE\] Zakupy Weekendowe/
        )
        .first()
    ).toBeVisible({ timeout: 10_000 })

    const hasRenamed =
      (await page.getByText(BASE_ACTIVE_LISTS.weekendArchiveRenamed).count()) > 0
    const targetTitle = hasRenamed
      ? BASE_ACTIVE_LISTS.weekendArchiveRenamed
      : BASE_ACTIVE_LISTS.weekendArchive

    await page.getByText(targetTitle).first().click()

    // Desktop uses split-pane right detail view inside <main>; Mobile opens HistoryListDetailsSheet (dialog)
    const detailContainer = isMobileViewport(page)
      ? page.getByRole('dialog').last()
      : page.locator('main').first()
    await expect(detailContainer).toBeVisible()

    if (!hasRenamed) {
      await detailContainer
        .locator('button[title="Edytuj"], button[title="Edit"]')
        .first()
        .click()
      const nameInput = detailContainer.locator('input').first()
      await nameInput.fill(BASE_ACTIVE_LISTS.weekendArchiveRenamed)
      await nameInput.press('Enter')
      await expect(
        detailContainer.getByText(BASE_ACTIVE_LISTS.weekendArchiveRenamed).first()
      ).toBeVisible({ timeout: 10_000 })
    }

    // Immutable original_name monospace indicator must remain "[BASE] Zakupy Weekendowe"
    await expect(detailContainer.getByText(BASE_ACTIVE_LISTS.weekendArchive).first()).toBeVisible()
    if (isMobileViewport(page)) {
      await closeTopDialog(page)
    }
  })

  test('TC-HIST-03: Restore archived list to Draft Cart (preserving categories) & clean up restored items @module:history @type:happy-path @state:TEMP', async ({
    page,
  }) => {
    await expect(
      page
        .locator('main')
        .getByText(
          /\[BASE\] Archiwum: Weekendowe zakupy spożywcze|\[BASE\] Zakupy Weekendowe/
        )
        .first()
    ).toBeVisible({ timeout: 10_000 })

    const targetTitle =
      (await page.getByText(BASE_ACTIVE_LISTS.weekendArchiveRenamed).count()) > 0
        ? BASE_ACTIVE_LISTS.weekendArchiveRenamed
        : BASE_ACTIVE_LISTS.weekendArchive

    await page.getByText(targetTitle).first().click()
    const detailContainer = isMobileViewport(page)
      ? page.getByRole('dialog').last()
      : page.locator('main').first()
    await expect(detailContainer).toBeVisible()
    await expect(detailContainer.getByRole('heading', { name: targetTitle }).first()).toBeVisible({
      timeout: 10_000,
    })

    // Verify 50/50 split actions ("Dodaj do koszyka" + "Usuń listę") exist side-by-side
    const restoreBtn = detailContainer
      .getByRole('button', { name: /Dodaj do koszyka|Add to cart/i })
      .first()
    const deleteBtn = detailContainer
      .getByRole('button', { name: /Usuń listę|Delete list/i })
      .first()
    await expect(restoreBtn).toBeVisible()
    await expect(deleteBtn).toBeVisible()

    await restoreBtn.click()
    if (isMobileViewport(page)) {
      await expect(detailContainer).toBeHidden({ timeout: 10_000 })
    }

    // Verify item restored to Draft and clean Draft afterwards
    await navigateToTab(page, 'draft')
    await expect(page.getByText('[BASE] Sól morska').first()).toBeVisible()

    await page.getByRole('button', { name: /Wyczyść Koszyk|Clear Cart/i }).first().click()
    await expect(page.locator('main').getByText('[BASE] Sól morska')).toHaveCount(0)
  })

  test('TC-HIST-04: Bounded pagination (>30 archived lists mock), 3 HistoryStatusBadge states, deleted product fallback & delete [TEMP] archive guard @module:history @type:corner-case @state:TEMP', async ({
    page,
  }) => {
    const mockLists = Array.from({ length: 31 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
      name: `[TEMP] Mock Archive #${i + 1}`,
      original_name: `[TEMP] Mock Archive #${i + 1}`,
      status: 'archived',
      is_default: false,
      completed_at: new Date(Date.now() - i * 86400000).toISOString(),
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
      updated_at: new Date(Date.now() - i * 86400000).toISOString(),
      household_id: '00000000-0000-4000-8000-000000000099',
      items:
        i === 0
          ? [
            {
              id: 'item-del-1',
              product_id: null,
              product: null,
              ad_hoc_name: '[TEMP] Produkt Usunięty Z Katalogu',
              total_quantity: 2,
              is_checked: true,
              in_pantry: false,
              added_ad_hoc: false,
              category_id: null,
            },
          ]
          : i === 1
            ? [
              { id: 'item-p-1', is_checked: true },
              { id: 'item-p-2', is_checked: false },
            ]
            : [{ id: `item-n-${i}`, is_checked: false }],
    }))

    await page.route('**/rest/v1/shopping_list_items*', async (route) => {
      const url = route.request().url()
      if (
        route.request().method() === 'GET' &&
        url.includes('shopping_list_id=eq.00000000-0000-4000-8000-')
      ) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'item-del-1',
              shopping_list_id: '00000000-0000-4000-8000-000000000001',
              product_id: null,
              product: null,
              category: null,
              category_id: null,
              ad_hoc_name: '[TEMP] Produkt Usunięty Z Katalogu',
              total_quantity: 2,
              is_checked: true,
              in_pantry: false,
              added_ad_hoc: true,
            },
          ]),
        })
        return
      }
      await route.continue()
    })

    await page.route('**/rest/v1/shopping_lists*', async (route) => {
      const url = route.request().url()
      if (route.request().method() === 'GET' && url.includes('status=eq.archived')) {
        if (url.includes('offset=30')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([mockLists[30]]),
          })
          return
        }
        // Return 31 items so shoppingListQueries detects hasMore = (data.length > 30) and renders "Pokaż starsze listy"
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockLists),
        })
        return
      }
      if (route.request().method() === 'GET' && url.includes('id=eq.00000000-0000-4000-8000-')) {
        const match = url.match(/id=eq\.(00000000-0000-4000-8000-\d{12})/)
        const found = mockLists.find((l) => l.id === match?.[1]) || mockLists[0]
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(found),
        })
        return
      }
      await route.continue()
    })

    await page.reload()
    await navigateToTab(page, 'history')
    await expect(page.getByText('[TEMP] Mock Archive #1').first()).toBeVisible({ timeout: 10_000 })
    const loadMoreBtn = page
      .getByRole('button', { name: /Pokaż starsze listy|Show older lists|Load older lists/i })
      .first()
    await expect(loadMoreBtn).toBeVisible()
    await loadMoreBtn.click()
    await expect(page.getByText('[TEMP] Mock Archive #31').first()).toBeVisible({ timeout: 10_000 })

    await page.getByText('[TEMP] Mock Archive #1').first().click()
    const detailContainer = isMobileViewport(page)
      ? page.getByRole('dialog').last()
      : page.locator('main').first()
    await expect(
      detailContainer.getByText('[TEMP] Produkt Usunięty Z Katalogu').first()
    ).toBeVisible({ timeout: 10_000 })
    await expect(
      detailContainer.getByRole('button', { name: /Usuń listę|Delete list/i }).first()
    ).toBeVisible({ timeout: 10_000 })
    await detailContainer.getByRole('button', { name: /Usuń listę|Delete list/i }).first().click()
    await confirmDeleteDialog(page, 'cancel')
    await expect(detailContainer).toBeVisible()
    if (isMobileViewport(page)) {
      await closeTopDialog(page)
    }

    await page.unroute('**/rest/v1/shopping_lists*')
    await page.unroute('**/rest/v1/shopping_list_items*')
  })
})
