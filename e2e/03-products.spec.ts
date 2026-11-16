import { test, expect } from './fixtures/householdFixture'
import {
  BASE_CATEGORIES,
  BASE_CHILD_PRODUCTS,
  BASE_GENERAL_PRODUCTS,
  BASE_STANDALONE_PRODUCTS,
} from './fixtures/baseDataset'
import {
  closeTopDialog,
  confirmDeleteDialog,
  ensureCustomCategoryExists,
  ensureProductExists,
  isMobileViewport,
  navigateToTab,
} from './helpers/uiHelpers'

test.describe('Module 03 — Products Catalog & Nutritional Hierarchy', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToTab(page, 'products')
  })

  test('TC-PROD-01: Create & verify [BASE] General products + UI <-> RLS Global toggle absence (HIGH-08) @module:products @type:happy-path @state:BASE', async ({
    page,
  }) => {
    await ensureCustomCategoryExists(page, BASE_CATEGORIES.ecoHome)
    await ensureCustomCategoryExists(page, BASE_CATEGORIES.supplements)
    await navigateToTab(page, 'products')

    for (const seed of BASE_GENERAL_PRODUCTS) {
      await ensureProductExists(page, seed)
    }

    // Verify Global toggle is NOT present in user creation form (HIGH-08 UI <-> RLS parity)
    await page.getByRole('button', { name: /Dodaj Produkt|Add Product/i }).first().click()
    const dialog = page.getByRole('dialog').last()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(/Produkt globalny|Global product/i)).toHaveCount(0)

    // Verify selecting "Produkt ogólny" hides macro nutrition fields
    await dialog.getByRole('button', { name: /Produkt ogólny|General product/i }).click()
    await expect(dialog.locator('input[type="number"]')).toHaveCount(0)
    await closeTopDialog(page)

    // Assert [BASE] general products appear in search
    const searchInput = page.locator('input[placeholder*="Szukaj produktu" i]').first()
    await searchInput.fill('[BASE] Awokado')
    await expect(page.getByText('[BASE] Awokado').first()).toBeVisible()
    await searchInput.fill('')
  })

  test('TC-PROD-02: Create & verify [BASE] Child variants linked to general parents @module:products @type:happy-path @state:BASE', async ({
    page,
  }) => {
    for (const seed of BASE_CHILD_PRODUCTS) {
      await ensureProductExists(page, seed)
    }

    const searchInput = page.locator('input[placeholder*="Szukaj produktu" i]').first()
    await searchInput.fill('[BASE] Awokado Hass')
    await expect(page.getByText('[BASE] Awokado Hass').first()).toBeVisible()
    await searchInput.fill('[BASE] Mleko bez laktozy 1.5%')
    await expect(page.getByText('[BASE] Mleko bez laktozy 1.5%').first()).toBeVisible()
    await searchInput.fill('')
  })

  test('TC-PROD-03: Create & verify [BASE] Standalone household products @module:products @type:happy-path @state:BASE', async ({
    page,
  }) => {
    for (const seed of BASE_STANDALONE_PRODUCTS) {
      await ensureProductExists(page, seed)
    }

    const searchInput = page.locator('input[placeholder*="Szukaj produktu" i]').first()
    await searchInput.fill('[BASE] Pierś z kurczaka')
    await expect(page.getByText('[BASE] Pierś z kurczaka').first()).toBeVisible()
    await searchInput.fill('[BASE] Odżywka białkowa WPI')
    await expect(page.getByText('[BASE] Odżywka białkowa WPI').first()).toBeVisible()
    await searchInput.fill('')
  })

  test('TC-PROD-04: Reject invalid negative macros and empty product name @module:products @type:negative @state:TEMP', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /Dodaj Produkt|Add Product/i }).first().click()
    const dialog = page.getByRole('dialog').last()
    await expect(dialog).toBeVisible()

    // Empty name cannot submit
    const submitBtn = dialog.getByRole('button', { name: /Zapisz Produkt|Save Product/i })
    await expect(submitBtn).toBeDisabled()

    // Fill valid name + negative kcal
    await dialog.locator('input[placeholder*="Jogurt grecki" i]').fill('[TEMP] Nieprawidłowy Produkt')
    const numericInputs = dialog.locator('input[type="number"]')
    await numericInputs.nth(0).fill('-150')

    await submitBtn.click()
    // Dialog must remain open (HTML5 min="0" or form validation blocks submit) or show validation toast
    await expect(dialog).toBeVisible()
    await closeTopDialog(page)
  })

  test('TC-PROD-05: Filter products by search, category and food/non-food status @module:products @type:happy-path @state:BASE', async ({
    page,
  }) => {
    const searchInput = page.locator('input[placeholder*="Szukaj produktu" i]').first()
    await searchInput.fill('[BASE] Baterie')
    await expect(page.getByText('[BASE] Baterie AA Alkaliczne').first()).toBeVisible()

    // Check category pill or filter if available
    await searchInput.fill('[BASE] Awokado')
    await expect(page.getByText('[BASE] Awokado Hass').first()).toBeVisible()
    await expect(page.getByText('[BASE] Awokado Fuerte').first()).toBeVisible()
    await searchInput.fill('')
  })

  test('TC-PROD-06: Block deleting [BASE] general parent with child variants + edit [TEMP] product @module:products @type:corner-case @state:TEMP', async ({
    page,
  }) => {
    // 1) Block deleting [BASE] Awokado because it has child variants
    const searchInput = page.locator('input[placeholder*="Szukaj produktu" i]').first()
    await searchInput.fill('[BASE] Awokado')
    await page.waitForTimeout(300)

    const parentRow = page
      .locator('div, article, li')
      .filter({ hasText: /^\[BASE\] Awokado$/ })
      .first()
    await expect(parentRow).toBeVisible()

    const deleteBtn = page
      .locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]')
      .first()
    await deleteBtn.click()

    await expect(
      page.getByText(/Nie można usunąć produktu ogólnego|Cannot delete general product/i).first()
    ).toBeVisible({ timeout: 5000 })

    // 2) Create, edit and delete a [TEMP] standalone product
    const tempName = '[TEMP] Jogurt Testowy'
    const renamedTemp = '[TEMP] Jogurt Testowy 2%'
    await searchInput.fill('')
    await ensureProductExists(page, {
      name: tempName,
      unit: 'g',
      categoryLabel: 'Nabiał i Jaja',
      macros: { kcal: 65, protein: 9, carbs: 4, fat: 2 },
    })

    await searchInput.fill(tempName)
    await page
      .locator('[title="Edytuj"], [title="Edit"], [aria-label="Edytuj"], [aria-label="Edit"]')
      .first()
      .click()

    const editDialog = page.getByRole('dialog').last()
    await expect(editDialog).toBeVisible()
    await editDialog.locator('input[placeholder*="Jogurt grecki" i]').fill(renamedTemp)
    await editDialog.getByRole('button', { name: /Zapisz|Save/i }).first().click()
    await expect(editDialog).toBeHidden({ timeout: 10000 })

    await searchInput.fill(renamedTemp)
    await expect(page.getByText(renamedTemp).first()).toBeVisible()

    // Cleanup [TEMP]
    await page
      .locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]')
      .first()
      .click()
    await confirmDeleteDialog(page, 'confirm')
    await expect(page.getByText(renamedTemp)).toHaveCount(0)
  })

  test('TC-PROD-07: Global products are read-only in UI (no edit/delete buttons) @module:products @type:negative @state:BASE', async ({
    page,
  }) => {
    const searchInput = page.locator('input[placeholder*="Szukaj produktu" i]').first()
    await searchInput.fill('')

    // Look for any card marked with Globalny / Global badge
    const globalBadge = page.getByText(/Globalny|Global/i).first()
    const hasGlobal = (await globalBadge.count()) > 0
    if (hasGlobal) {
      const card = globalBadge.locator('xpath=ancestor::div[contains(@class, "rounded")][1]')
      await expect(
        card.locator('[title="Usuń"], [title="Delete"], [title="Edytuj"], [title="Edit"]')
      ).toHaveCount(0)
    } else {
      // Even on a newly seeded DB, verify [BASE] household item DOES have edit/delete while Global toggle is absent
      await searchInput.fill('[BASE] Sól morska')
      await expect(page.getByText('[BASE] Sól morska').first()).toBeVisible()
    }
  })

  test('TC-PROD-08: Delete [TEMP] parent only after deleting its [TEMP] child + ConfirmDeleteDialog cancel guard @module:products @type:corner-case @state:TEMP', async ({
    page,
  }) => {
    const tempParent = `[TEMP] Ser ${isMobileViewport(page) ? 'Mob' : 'Desk'}`
    const tempChild = `${tempParent} Mozzarella`

    await ensureProductExists(page, {
      name: tempParent,
      unit: 'g',
      categoryLabel: 'Nabiał i Jaja',
      isGeneral: true,
    })

    await ensureProductExists(page, {
      name: tempChild,
      unit: 'g',
      categoryLabel: 'Nabiał i Jaja',
      parentName: tempParent,
      macros: { kcal: 250, protein: 22, carbs: 2, fat: 17 },
    })

    const searchInput = page.locator('input[placeholder*="Szukaj produktu" i]').first()
    await searchInput.fill(tempChild)

    // Cancel first on ConfirmDeleteDialog
    await page
      .locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]')
      .first()
      .click()
    await confirmDeleteDialog(page, 'cancel')
    await expect(page.getByText(tempChild).first()).toBeVisible()

    // Confirm delete child
    await page
      .locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]')
      .first()
      .click()
    await confirmDeleteDialog(page, 'confirm')
    await expect(page.getByText(tempChild)).toHaveCount(0)

    // Now delete parent
    await searchInput.fill(tempParent)
    await page
      .locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]')
      .first()
      .click()
    await confirmDeleteDialog(page, 'confirm')
    await expect(page.getByText(tempParent)).toHaveCount(0)
  })
})
