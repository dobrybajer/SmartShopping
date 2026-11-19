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

  test('TC-PROD-04: Blokada usunięcia Produktu Ogólnego z dziećmi (ON DELETE RESTRICT, ADR-010) @module:products @type:negative @type:security @state:READONLY', async ({
    page,
  }) => {
    const searchInput = page.locator('input[placeholder*="Szukaj produktu" i]').first()
    await searchInput.fill('[BASE] Awokado')
    await page.waitForTimeout(300)

    const deleteSelector = page.locator(
      '[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]'
    )
    const parentCard = page
      .locator('div, article, li')
      .filter({ has: page.locator('h4', { hasText: /^\[BASE\] Awokado$/ }) })
      .filter({ has: deleteSelector })
      .last()
    await expect(parentCard).toBeVisible()

    const deleteBtn = parentCard.locator(deleteSelector).first()
    await deleteBtn.click()

    await expect(
      page.getByText(/Nie można usunąć produktu ogólnego|Cannot delete general product/i).first()
    ).toBeVisible({ timeout: 5000 })
    await searchInput.fill('')
  })

  test('TC-PROD-05: Ochrona produktów Global oraz parytet UI <-> RLS (HIGH-08) @module:products @type:negative @type:security @state:READONLY', async ({
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
      await searchInput.fill('[BASE] Sól morska')
      await expect(page.getByText('[BASE] Sól morska').first()).toBeVisible()
    }
  })

  test('TC-PROD-06: Walidacja formularza produktu i ochrona przed 3-poziomową hierarchią @module:products @type:negative @type:corner-case @state:READONLY', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /Dodaj Produkt|Add Product/i }).first().click()
    const dialog = page.getByRole('dialog').last()
    await expect(dialog).toBeVisible()

    // Empty name cannot submit
    const submitBtn = dialog.getByRole('button', {
      name: /Dodaj Produkt|Zapisz Produkt|Add Product|Save Product/i,
    })
    await expect(submitBtn).toBeDisabled()

    // Fill valid name + attempt negative kcal -> ProductMacroFields guards non-negative (>= 0, min="0")
    const nameInput = dialog.locator('input[placeholder*="Jogurt grecki" i]')
    await nameInput.fill('[TEMP] Nieprawidłowy Produkt')
    const numericInputs = dialog.locator('input[type="number"]')
    await expect(numericInputs.nth(0)).toHaveAttribute('min', '0')
    await numericInputs.nth(0).fill('-150')
    await expect(numericInputs.nth(0)).not.toHaveValue('-150')

    // 2-level hierarchy guard: parent dropdown ONLY lists general products ([BASE] Awokado), never child variants ([BASE] Awokado Hass)
    const parentSelect = dialog.locator('select').first()
    await expect(parentSelect).toBeVisible()
    await expect(parentSelect).toContainText('[BASE] Awokado', { timeout: 10_000 })
    const parentOptionsText = (await parentSelect.textContent()) || ''
    expect(parentOptionsText).not.toContain('[BASE] Awokado Hass')

    // Clearing name keeps submit disabled without mutating DB
    await nameInput.fill('   ')
    await expect(submitBtn).toBeDisabled()
    await closeTopDialog(page)
  })

  test('TC-PROD-07: Filtrowanie, wyszukiwanie i szybkie zarządzanie Spiżarnią z karty produktu (Warehouse icon) @module:products @type:happy-path @type:rwd @state:READONLY', async ({
    page,
  }) => {
    const searchInput = page.locator('input[placeholder*="Szukaj produktu" i]').first()
    await searchInput.fill('[BASE] Baterie')
    await expect(page.getByText('[BASE] Baterie AA Alkaliczne').first()).toBeVisible()

    await searchInput.fill('[BASE] Awokado')
    await expect(page.getByText('[BASE] Awokado Hass').first()).toBeVisible()
    await expect(page.getByText('[BASE] Awokado Fuerte').first()).toBeVisible()

    // Szybkie otwarcie modala Spiżarni z karty produktu (ikona Warehouse)
    const warehouseBtn = page
      .locator('button[title*="spiżarni" i], button[aria-label*="spiżarni" i]')
      .first()
    if (await warehouseBtn.isVisible().catch(() => false)) {
      await warehouseBtn.click()
      await expect(page.getByRole('dialog').last()).toBeVisible()
      await closeTopDialog(page)
    }

    await searchInput.fill('')
  })

  test('TC-PROD-08: Edycja i usuwanie produktu tymczasowego [TEMP] (ConfirmDeleteDialog Anuluj -> Usuń) @module:products @type:happy-path @type:negative @state:TEMP', async ({
    page,
  }) => {
    const searchInput = page.locator('input[placeholder*="Szukaj produktu" i]').first()
    const tempName = `[TEMP] Jogurt Testowy ${isMobileViewport(page) ? 'Mob' : 'Desk'}`
    const renamedTemp = `${tempName} 2%`

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

    // Cancel first on ConfirmDeleteDialog -> product stays
    await page
      .locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]')
      .first()
      .click()
    await confirmDeleteDialog(page, 'cancel')
    await expect(page.getByText(renamedTemp).first()).toBeVisible()

    // Confirm delete -> product removed
    await page
      .locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]')
      .first()
      .click()
    await confirmDeleteDialog(page, 'confirm')
    await expect(page.getByText(renamedTemp)).toHaveCount(0)
    await searchInput.fill('')
  })
})
