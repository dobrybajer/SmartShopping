import { test, expect } from './fixtures/householdFixture'
import { BASE_CATEGORIES } from './fixtures/baseDataset'
import {
  closeAllDialogs,
  confirmDeleteDialog,
  ensureCustomCategoryExists,
  navigateToTab,
  openCategoryManager,
} from './helpers/uiHelpers'

test.describe('Moduł 02: Puste Stany i Alejki Sklepowe @module:categories-empty-states', () => {
  test('TC-CAT-01: Weryfikacja stanów początkowych w 7 widokach aplikacji @type:happy-path @state:READONLY', async ({
    page,
  }) => {
    await navigateToTab(page, 'draft')
    await expect(page.locator('h1')).toHaveCount(1)

    await navigateToTab(page, 'active')
    await expect(page.locator('h1')).toHaveCount(1)

    await navigateToTab(page, 'history')
    await expect(page.locator('h1')).toHaveCount(1)

    await navigateToTab(page, 'pantry')
    await expect(page.locator('h1')).toHaveCount(1)

    await navigateToTab(page, 'calendar')
    await expect(page.locator('h1')).toHaveCount(1)

    await navigateToTab(page, 'products')
    await expect(page.locator('h1')).toHaveCount(1)

    await navigateToTab(page, 'cookbook')
    await expect(page.locator('h1')).toHaveCount(1)
  })

  test('TC-CAT-02: Ochrona kategorii globalnych przed edycją i usunięciem @type:negative @type:security @state:READONLY', async ({
    page,
  }) => {
    const manager = await openCategoryManager(page)

    const globalRow = manager.locator('div[draggable]').filter({ hasText: /Owoce i Warzywa|Fruits & Vegetables/i }).first()
    await expect(globalRow).toBeVisible()
    await expect(globalRow.getByText(/Globalna|Global/i)).toBeVisible()

    // Globalna kategoria NIE MOŻE mieć przycisków edycji ani usunięcia
    await expect(globalRow.getByRole('button', { name: /Edytuj kategorię|Edit category/i })).toHaveCount(0)
    await expect(globalRow.getByRole('button', { name: /Usuń kategorię|Delete category/i })).toHaveCount(0)

    // Ma przyciski kolejności i ukrycia
    await expect(globalRow.getByRole('button', { name: /Ukryj kategorię|Hide category/i })).toBeVisible()
  })

  test('TC-CAT-03: Utworzenie własnych kategorii [BASE] Suplementy i EKO Chemia @type:happy-path @state:BASE', async ({
    page,
  }) => {
    await ensureCustomCategoryExists(page, BASE_CATEGORIES.supplements)
    await ensureCustomCategoryExists(page, BASE_CATEGORIES.ecoHome)

    const manager = await openCategoryManager(page)
    for (const catName of [BASE_CATEGORIES.supplements, BASE_CATEGORIES.ecoHome]) {
      const row = manager.locator('div[draggable]', { hasText: catName }).first()
      await expect(row).toBeVisible()
      await expect(row.getByText(/Własna|Custom/i)).toBeVisible()
      await expect(row.getByRole('button', { name: /Edytuj kategorię|Edit category/i })).toBeVisible()
      await expect(row.getByRole('button', { name: /Usuń kategorię|Delete category/i })).toBeVisible()
    }
  })

  test('TC-CAT-04: Kolejność alejek, ukrywanie kategorii i usuwanie [TEMP] @type:happy-path @type:corner-case @state:TEMP', async ({
    page,
  }) => {
    const tempCat = '[TEMP] Kategoria Testowa'
    const tempCatRenamed = '[TEMP] Kategoria Zmieniona'
    const manager = await openCategoryManager(page)

    // Przesunięcie [BASE] Suplementy i Odżywki na pozycję 1
    const supRow = manager.locator('div[draggable]', { hasText: BASE_CATEGORIES.supplements }).first()
    const moveUpBtn = supRow.getByRole('button', { name: /Przesuń alejkę wyżej|Move aisle up/i })
    while (await moveUpBtn.isEnabled()) {
      await moveUpBtn.click()
      await page.waitForTimeout(100)
    }

    // Dodanie, edycja i usunięcie kategorii [TEMP]
    const input = manager.getByPlaceholder(/Nazwa kategorii|Category name/i)
    await input.fill(tempCat)
    await manager.getByRole('button', { name: /Dodaj kategorię|Add Category/i }).click()
    const tempRow = manager.locator('div[draggable]', { hasText: tempCat }).first()
    await expect(tempRow).toBeVisible({ timeout: 10_000 })

    // Edycja
    await tempRow.getByRole('button', { name: /Edytuj kategorię|Edit category/i }).click()
    const inlineInput = tempRow.locator('input')
    await inlineInput.fill(tempCatRenamed)
    await inlineInput.press('Enter')
    const renamedRow = manager.locator('div[draggable]', { hasText: tempCatRenamed }).first()
    await expect(renamedRow).toBeVisible({ timeout: 10_000 })

    // Usunięcie -> najpierw Anuluj, potem Usuń
    await renamedRow.getByRole('button', { name: /Usuń kategorię|Delete category/i }).click()
    await confirmDeleteDialog(page, 'cancel')
    await expect(renamedRow).toBeVisible()

    await renamedRow.getByRole('button', { name: /Usuń kategorię|Delete category/i }).click()
    await confirmDeleteDialog(page, 'confirm')
    await expect(manager.locator('div[draggable]', { hasText: tempCatRenamed })).toHaveCount(0, {
      timeout: 10_000,
    })

    // Ukrycie i ponowne odkrycie kategorii globalnej Napoje
    const drinksRow = manager.locator('div[draggable]', { hasText: /^Napoje|Beverages/i }).first()
    if (await drinksRow.isVisible().catch(() => false)) {
      await drinksRow.getByRole('button', { name: /Ukryj kategorię|Hide category/i }).click()
      await expect(drinksRow.getByText(/Ukryta|Hidden/i)).toBeVisible()
      await drinksRow.getByRole('button', { name: /Pokaż kategorię|Show category/i }).click()
    }
  })

  test('TC-CAT-05: Walidacja formularza kategorii (za krótka, >40 znaków, duplikat, spacje) @type:negative @type:corner-case @state:READONLY', async ({
    page,
  }) => {
    const manager = await openCategoryManager(page)
    const input = manager.getByPlaceholder(/Nazwa kategorii|Category name/i)
    const addBtn = manager.getByRole('button', { name: /Dodaj kategorię|Add Category/i })

    // Same spacje -> przycisk disabled
    await input.fill('   ')
    await expect(addBtn).toBeDisabled()

    // 1 znak -> tooShort
    await input.fill('A')
    await addBtn.click()
    await expect(manager.getByText(/co najmniej 2 znaki|at least 2 characters/i)).toBeVisible()

    // 41 znaków -> tooLong
    await input.fill('X'.repeat(41))
    await addBtn.click()
    await expect(manager.getByText(/nie może przekraczać 40 znaków|cannot exceed 40 characters/i)).toBeVisible()

    // Duplikat niezależnie od wielkości liter
    await input.fill(BASE_CATEGORIES.supplements.toLowerCase())
    await addBtn.click()
    await expect(manager.getByText(/już istnieje|already exists/i)).toBeVisible()
  })

  test('TC-CAT-06: Lokalizacja kategorii systemowych vs własnych PL <-> EN @type:i18n @state:READONLY', async ({
    page,
  }) => {
    const manager = await openCategoryManager(page)
    await expect(manager.getByText('Owoce i Warzywa')).toBeVisible()
    await expect(manager.getByText(BASE_CATEGORIES.supplements)).toBeVisible()
    await closeAllDialogs(page)

    // Przełączenie na EN (jeśli widoczny pill switcher w DesktopHeader lub przez AccountDialog)
    const enBtn = page.getByRole('button', { name: /^EN$/i }).first()
    if (await enBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await enBtn.click()
      const managerEn = await openCategoryManager(page)
      await expect(managerEn.getByText('Fruits & Vegetables')).toBeVisible()
      await expect(managerEn.getByText(BASE_CATEGORIES.supplements)).toBeVisible()
      await expect(managerEn.getByText(`categories.${BASE_CATEGORIES.supplements}`)).toHaveCount(0)
      await closeAllDialogs(page)
      await page.getByRole('button', { name: /^PL$/i }).first().click()
    }
  })
})
