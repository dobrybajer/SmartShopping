import { test, expect } from './fixtures/householdFixture'
import { CANONICAL_MEAL_NAME } from './fixtures/baseDataset'
import {
  confirmDeleteDialog,
  ensureProductExists,
  isMobileViewport,
  navigateToTab,
  selectFromAutocomplete,
} from './helpers/uiHelpers'

async function addCanonicalMealToDraft(page: import('@playwright/test').Page): Promise<void> {
  await navigateToTab(page, 'cookbook')
  const searchInput = page.locator('input[placeholder*="Szukaj" i]').first()
  await searchInput.fill(CANONICAL_MEAL_NAME)
  await page.getByText(CANONICAL_MEAL_NAME).first().click()

  const detailsDialog = page.getByRole('dialog').last()
  await expect(detailsDialog).toBeVisible()
  await detailsDialog
    .getByRole('button', { name: /Dodaj Składniki do Koszyka|Add Ingredients to Cart|Do Koszyka/i })
    .first()
    .click()
  await expect(detailsDialog).toBeHidden({ timeout: 10000 })
  await searchInput.fill('')
}

test.describe('Module 06 — Draft Cart, Duplicate Merging, Pantry Check & Ad-Hoc Items', () => {
  test('TC-DRAFT-01: Add canonical recipe from Cookbook into Draft Cart with pantry badges @module:draft @type:happy-path @state:TEMP', async ({
    page,
  }) => {
    await navigateToTab(page, 'draft')

    // Start clean if leftover items exist
    const clearBtn = page.getByRole('button', { name: /Wyczyść Koszyk|Clear Cart/i }).first()
    if ((await clearBtn.count()) > 0 && (await clearBtn.isEnabled())) {
      await clearBtn.click()
      await expect(page.locator('main').getByText('[BASE] Pierś z kurczaka')).toHaveCount(0)
    }

    await addCanonicalMealToDraft(page)
    await navigateToTab(page, 'draft')

    await expect(page.getByText('[BASE] Pierś z kurczaka').first()).toBeVisible()
    await expect(page.getByText('[BASE] Ryż basmati').first()).toBeVisible()
    await expect(page.getByText('[BASE] Oliwa z oliwek Extra Virgin').first()).toBeVisible()
    await expect(page.getByText('[BASE] Awokado').first()).toBeVisible()

    // Check Warehouse pantry badge appears on items stocked in pantry
    await expect(
      page.locator('[aria-label*="spiżarni" i], [title*="spiżarni" i]').first()
    ).toBeVisible()
  })

  test('TC-DRAFT-02: Adding duplicate recipe merges ingredient quantities atomically @module:draft @type:corner-case @state:TEMP', async ({
    page,
  }) => {
    await navigateToTab(page, 'draft')
    const clearBtn = page.getByRole('button', { name: /Wyczyść Koszyk|Clear Cart/i }).first()
    if ((await clearBtn.count()) > 0 && (await clearBtn.isEnabled())) {
      await clearBtn.click()
      await expect(page.locator('main').getByText('[BASE] Pierś z kurczaka')).toHaveCount(0)
    }

    // Add once (Pierś = 200 g) and then add a second time (Pierś = 400 g)
    await addCanonicalMealToDraft(page)
    await addCanonicalMealToDraft(page)

    await navigateToTab(page, 'draft')
    const chickenRows = page.locator('div, li').filter({ hasText: '[BASE] Pierś z kurczaka' })
    await expect(chickenRows.getByText(/400\s*g/).first()).toBeVisible()
    await expect(page.getByText('[BASE] Pierś z kurczaka')).toHaveCount(1)
  })

  test('TC-DRAFT-03: PantryConfirmModal in Draft marks item "Mam całość" (in_pantry) & "Nie mam produktu" (removeByProductOrName) @module:draft @type:happy-path @state:TEMP', async ({
    page,
  }) => {
    await navigateToTab(page, 'draft')
    if ((await page.getByText('[BASE] Pierś z kurczaka').count()) === 0) {
      await addCanonicalMealToDraft(page)
      await navigateToTab(page, 'draft')
    }

    const row = page
      .locator('div, li')
      .filter({ hasText: '[BASE] Pierś z kurczaka' })
      .filter({ has: page.locator('button[aria-label*="spiżarni" i]') })
      .last()

    await row.locator('button[aria-label*="spiżarni" i]').first().click()
    const pantryModal = page.getByRole('dialog').last()
    await expect(pantryModal).toBeVisible()

    // 1) In Draft Cart, "Mam całość" satisfies the item and removes it from needing purchase
    await pantryModal.getByRole('button', { name: /Mam całość|Have all/i }).click()
    await expect(pantryModal).toBeHidden({ timeout: 10000 })
    await expect(page.locator('main').getByText('[BASE] Pierś z kurczaka')).toHaveCount(0)

    // 2) Test "Nie mam produktu" (removeByProductOrName -> DELETE /rest/v1/pantry_items) on a [TEMP] stocked item
    const tempPantryProd = `[TEMP] DraftDontHave ${isMobileViewport(page) ? 'M' : 'D'}`
    await navigateToTab(page, 'products')
    await ensureProductExists(page, {
      name: tempPantryProd,
      unit: 'g',
      categoryLabel: 'Spiżarnia i Sypkie',
    })

    await navigateToTab(page, 'pantry')
    if ((await page.getByText(tempPantryProd).count()) === 0) {
      await page.getByRole('button', { name: /Dodaj do Spiżarni|Add to Pantry/i }).first().click()
      const pDialog = page.getByRole('dialog').last()
      await selectFromAutocomplete(pDialog, tempPantryProd)
      await pDialog.locator('input[type="number"]').first().fill('100')
      await pDialog.getByRole('button', { name: /Dodaj|Zapisz|Save|Add/i }).last().click()
      await expect(pDialog).toBeHidden({ timeout: 10000 })
    }

    await navigateToTab(page, 'draft')
    await page.getByRole('button', { name: /Dodaj Ad-hoc|Add Ad-hoc/i }).first().click()
    const adhocDialog = page.getByRole('dialog').last()
    await selectFromAutocomplete(adhocDialog, tempPantryProd)
    await adhocDialog.locator('input[type="number"]').first().fill('100')
    await adhocDialog.getByRole('button', { name: /Dodaj|Zapisz|Add|Save/i }).last().click()
    await expect(adhocDialog).toBeHidden({ timeout: 10000 })

    const tempRow = page
      .locator('div, li')
      .filter({ hasText: tempPantryProd })
      .filter({ has: page.locator('button[aria-label*="spiżarni" i]') })
      .last()
    await tempRow.locator('button[aria-label*="spiżarni" i]').first().click()
    const dontHaveModal = page.getByRole('dialog').last()
    await expect(dontHaveModal).toBeVisible()
    await dontHaveModal.getByRole('button', { name: /Nie mam produktu|Don't have/i }).click()
    await expect(dontHaveModal).toBeHidden({ timeout: 10000 })

    // Verify item remains in Draft to buy, and is deleted from Pantry
    await expect(page.locator('main').getByText(tempPantryProd).first()).toBeVisible()
    await navigateToTab(page, 'pantry')
    await expect(page.getByText(tempPantryProd)).toHaveCount(0)

    // Cleanup [TEMP] product
    await navigateToTab(page, 'products')
    await page.locator('input[placeholder*="Szukaj produktu" i]').first().fill(tempPantryProd)
    await page
      .locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]')
      .first()
      .click()
    await confirmDeleteDialog(page, 'confirm')
  })

  test('TC-DRAFT-04: Ad-hoc item + fractional decimal inline quantity edit + negative quantity guard @module:draft @type:corner-case @state:TEMP', async ({
    page,
  }) => {
    const tempAdHoc = `[TEMP] AdHocDecimal ${isMobileViewport(page) ? 'M' : 'D'}`
    await navigateToTab(page, 'products')
    await ensureProductExists(page, {
      name: tempAdHoc,
      unit: 'pcs',
      categoryLabel: 'Spiżarnia i Sypkie',
    })

    await navigateToTab(page, 'draft')
    await page.getByRole('button', { name: /Dodaj Ad-hoc|Add Ad-hoc/i }).first().click()
    const adhocDialog = page.getByRole('dialog').last()
    await expect(adhocDialog).toBeVisible()

    await selectFromAutocomplete(adhocDialog, tempAdHoc)
    await adhocDialog.locator('input[type="number"]').first().fill('1.5')
    await adhocDialog.getByRole('button', { name: /Dodaj|Zapisz|Add|Save/i }).last().click()
    await expect(adhocDialog).toBeHidden({ timeout: 10000 })

    // Filter by Increase button (stays mounted in both read & inline-edit states!)
    const row = page
      .locator('div, li')
      .filter({ hasText: tempAdHoc })
      .filter({ has: page.getByRole('button', { name: /Zwiększ|Increase/i }) })
      .last()
    await expect(row.getByText(/1\.5|1,5/)).toBeVisible()

    // Inline decimal edit to 2.5
    await row.locator('button[title="Edytuj"], button[title="Edit"]').first().click()
    const inlineInput = row.locator('input[inputmode="decimal"]').first()
    await inlineInput.fill('2.5')
    await inlineInput.press('Enter')
    await expect(row.getByText(/2\.5|2,5/)).toBeVisible()

    // Non-positive/negative input guards: '-' is stripped by sanitizer, '0' is ignored on commit (keeps 2.5)
    await row.locator('button[title="Edytuj"], button[title="Edit"]').first().click()
    const inlineInputNeg = row.locator('input[inputmode="decimal"]').first()
    await inlineInputNeg.fill('-0')
    await expect(inlineInputNeg).toHaveValue('0')
    await inlineInputNeg.press('Enter')
    await expect(row.getByText(/2\.5|2,5/)).toBeVisible()

    // Cleanup [TEMP] draft and product
    await page.getByRole('button', { name: /Wyczyść Koszyk|Clear Cart/i }).first().click()
    await expect(page.locator('main').getByText(tempAdHoc)).toHaveCount(0)

    await navigateToTab(page, 'products')
    await page.locator('input[placeholder*="Szukaj produktu" i]').first().fill(tempAdHoc)
    await page
      .locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]')
      .first()
      .click()
    await confirmDeleteDialog(page, 'confirm')
  })

  test('TC-DRAFT-05: Select all / uncheck all toggles, single-item ConfirmDeleteDialog & Clear Cart @module:draft @type:happy-path @state:TEMP', async ({
    page,
  }) => {
    await addCanonicalMealToDraft(page)
    await navigateToTab(page, 'draft')

    const uncheckAllBtn = page
      .getByRole('button', { name: /Odznacz wszystkie|Uncheck all/i })
      .first()
    if ((await uncheckAllBtn.count()) > 0) {
      await uncheckAllBtn.click()
      await expect(
        page.getByRole('button', { name: /Przenieś do Listy Zakupów|Transfer to Shopping List/i }).first()
      ).toBeDisabled()

      await page.getByRole('button', { name: /Zaznacz wszystkie|Check all/i }).first().click()
    }

    // Verify ConfirmDeleteDialog cancel keeps single item (on Desktop trash icon)
    if (!isMobileViewport(page)) {
      const chickenRow = page
        .locator('div, li')
        .filter({ hasText: '[BASE] Pierś z kurczaka' })
        .filter({ has: page.locator('[title="Usuń"], [title="Delete"]') })
        .last()
      await chickenRow.locator('[title="Usuń"], [title="Delete"]').first().click()
      await confirmDeleteDialog(page, 'cancel')
      await expect(page.locator('main').getByText('[BASE] Pierś z kurczaka').first()).toBeVisible()
    }

    // Clear cart -> empty state
    await page.getByRole('button', { name: /Wyczyść Koszyk|Clear Cart/i }).first().click()
    await expect(page.locator('main').getByText('[BASE] Pierś z kurczaka')).toHaveCount(0)
  })
})
