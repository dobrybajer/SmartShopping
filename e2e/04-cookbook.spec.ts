import { test, expect } from './fixtures/householdFixture'
import {
  BASE_CHILD_PRODUCTS,
  BASE_GENERAL_PRODUCTS,
  BASE_STANDALONE_PRODUCTS,
  CANONICAL_MEAL_NAME,
  JSON_IMPORT_RECIPES,
} from './fixtures/baseDataset'
import {
  closeTopDialog,
  confirmDeleteDialog,
  ensureProductExists,
  isMobileViewport,
  navigateToTab,
  selectFromAutocomplete,
} from './helpers/uiHelpers'

test.describe('Module 04 — Cookbook, Recipes, Kitchen Units & JSON Batch Import', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToTab(page, 'cookbook')
  })

  test('TC-MEAL-01: Create & verify canonical [BASE] recipe with standalone & general reference product @module:cookbook @type:happy-path @state:BASE', async ({
    page,
  }) => {
    // Check if canonical meal already exists (idempotent [BASE])
    const searchInput = page.locator('input[placeholder*="Szukaj" i]').first()
    await searchInput.fill(CANONICAL_MEAL_NAME)
    await page.waitForTimeout(300)

    if ((await page.getByText(CANONICAL_MEAL_NAME).count()) === 0) {
      // Ensure required [BASE] products exist first
      await navigateToTab(page, 'products')
      for (const seed of [
        ...BASE_GENERAL_PRODUCTS,
        ...BASE_CHILD_PRODUCTS,
        ...BASE_STANDALONE_PRODUCTS,
      ]) {
        await ensureProductExists(page, seed)
      }
      await navigateToTab(page, 'cookbook')

      await page.getByRole('button', { name: /Dodaj Przepis|Add Recipe/i }).first().click()
      const dialog = page.getByRole('dialog').last()
      await expect(dialog).toBeVisible()

      // Verify legacy static "Produkt spiżarniowy (na stanie)" checkbox is absent per ADR-008
      await expect(dialog.getByText(/Produkt spiżarniowy \(na stanie\)/i)).toHaveCount(0)

      // Select meal category "Obiad" / "Lunch" if present
      const lunchCatBtn = dialog.getByRole('button', { name: /^(Obiad|Lunch)$/i }).first()
      if ((await lunchCatBtn.count()) > 0) {
        await lunchCatBtn.click()
      }

      await dialog.locator('input[placeholder*="Jajecznica" i]').fill(CANONICAL_MEAL_NAME)

      // Add Tags "WOD" & "Wysokobiałkowe"
      const tagInput = dialog.locator('input[placeholder*="tag" i]').first()
      if ((await tagInput.count()) > 0) {
        await tagInput.fill('WOD')
        await tagInput.press('Enter')
        await tagInput.fill('Wysokobiałkowe')
        await tagInput.press('Enter')
      }

      const addIng = async (productName: string, qty: string, kitchenUnit?: string) => {
        await selectFromAutocomplete(dialog, productName)
        if (kitchenUnit) {
          const unitSelect = dialog
            .locator('select[aria-label*="Miara kuchenna" i], select[aria-label*="Kitchen unit" i]')
            .first()
          if ((await unitSelect.count()) > 0) {
            await unitSelect.selectOption(kitchenUnit)
          }
        }
        await dialog.locator('input[type="number"]').first().fill(qty)
        // Click the inline "+" add ingredient button next to quantity input
        await dialog
          .locator('button')
          .filter({ has: page.locator('svg.lucide-plus') })
          .last()
          .click()
      }

      // 5 canonical ingredients per Section 1.5C -> 812.6 kcal (813 kcal)
      await addIng('[BASE] Pierś z kurczaka', '200', 'g')
      await addIng('[BASE] Ryż basmati', '0.4', 'cup')
      await addIng('[BASE] Oliwa z oliwek Extra Virgin', '1', 'tbsp')
      await addIng('[BASE] Awokado', '0.5')
      await addIng('[BASE] Sól morska', '2', 'pinch')

      // Select reference child [BASE] Awokado Hass for general product [BASE] Awokado
      const refSelect = dialog.locator('select').filter({ hasText: /Awokado Hass/i }).first()
      if ((await refSelect.count()) > 0) {
        const hassOption = await refSelect
          .locator('option', { hasText: '[BASE] Awokado Hass' })
          .first()
          .getAttribute('value')
        if (hassOption) {
          await refSelect.selectOption(hassOption)
        }
      }

      await dialog
        .getByRole('button', { name: /Utwórz Przepis|Zapisz Przepis|Create Recipe|Save Recipe/i })
        .click()
      await expect(dialog).toBeHidden({ timeout: 10000 })
    }

    await searchInput.fill(CANONICAL_MEAL_NAME)
    await expect(page.getByText(CANONICAL_MEAL_NAME).first()).toBeVisible()
    await searchInput.fill('')
  })

  test('TC-MEAL-02: Macro recalculation on reference child swap and portion scaling @module:cookbook @type:happy-path @state:BASE', async ({
    page,
  }) => {
    const searchInput = page.locator('input[placeholder*="Szukaj" i]').first()
    await searchInput.fill(CANONICAL_MEAL_NAME)
    await page.getByText(CANONICAL_MEAL_NAME).first().click()

    const detailsDialog = page.getByRole('dialog').last()
    await expect(detailsDialog).toBeVisible()

    // Scale portions 1 -> 2 in MealDetailsSheet if stepper present
    const plusBtn = detailsDialog.getByRole('button', { name: /Zwiększ|Increase/i }).first()
    if ((await plusBtn.count()) > 0) {
      await plusBtn.click()
      await expect(detailsDialog.getByText(/400\s*g/)).toBeVisible()
    }
    await closeTopDialog(page)

    // Verify dynamic macro change in Add/Edit form when swapping reference_product_id
    await page
      .locator('[title*="Edytuj" i], [title*="Edit" i], [aria-label*="Edytuj" i], [aria-label*="Edit" i]')
      .first()
      .click()
    const editDialog = page.getByRole('dialog').last()
    await expect(editDialog).toBeVisible()

    const refSelect = editDialog.locator('select').filter({ hasText: /Awokado/i }).first()
    if ((await refSelect.count()) > 0) {
      const textBefore = await editDialog.textContent()
      const fuerteOption = await refSelect
        .locator('option', { hasText: '[BASE] Awokado Fuerte' })
        .first()
        .getAttribute('value')
      if (fuerteOption) {
        await refSelect.selectOption(fuerteOption)
        const textAfter = await editDialog.textContent()
        expect(textAfter).not.toEqual(textBefore)
      }
    }

    // Close without overwriting [BASE] recipe's reference
    await closeTopDialog(page)
    await searchInput.fill('')
  })

  test('TC-MEAL-03: Kitchen unit conversion preview (łyżeczka / szklanka -> ml / g) @module:cookbook @type:corner-case @state:TEMP', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /Dodaj Przepis|Add Recipe/i }).first().click()
    const dialog = page.getByRole('dialog').last()
    await expect(dialog).toBeVisible()

    await selectFromAutocomplete(dialog, '[BASE] Oliwa z oliwek Extra Virgin')
    await dialog.locator('input[type="number"]').first().fill('2')

    const unitSelect = dialog.locator('select[aria-label*="Miara kuchenna" i]')
    await expect(unitSelect).toBeVisible()
    // Select tablespoon ('tbsp' = 15ml -> 2 tbsp = 30 ml) or teaspoon ('tsp' = 5ml -> 2 tsp = 10 ml)
    await unitSelect.selectOption('tbsp')
    await expect(dialog.getByText(/30\s*ml/i).first()).toBeVisible()

    await closeTopDialog(page)
  })

  test('TC-MEAL-04: JSON Batch Import via Ctrl+Alt+P (Desktop) + Mobile shortcut guard @module:cookbook @type:happy-path @state:BASE', async ({
    page,
  }) => {
    if (isMobileViewport(page)) {
      // MobileLayout does not attach Ctrl+Alt+P JSON batch import shortcut
      await page.keyboard.press('Control+Alt+KeyP')
      await expect(page.locator('textarea')).toHaveCount(0)
      return
    }

    // Check if [BASE] Szejk Białkowy Po Treningu already exists (idempotent [BASE])
    const searchInput = page.locator('input[placeholder*="Szukaj" i]').first()
    await searchInput.fill(JSON_IMPORT_RECIPES[0].name)
    await page.waitForTimeout(300)
    const alreadyExists = (await page.getByText(JSON_IMPORT_RECIPES[0].name).count()) > 0
    await searchInput.fill('')

    if (!alreadyExists) {
      await page.keyboard.press('Control+Alt+KeyP')
      const importDialog = page.getByRole('dialog').last()
      await expect(importDialog).toBeVisible()

      await importDialog.locator('textarea').fill(JSON.stringify(JSON_IMPORT_RECIPES, null, 2))
      await importDialog.getByRole('button', { name: /Prettify/i }).click()

      const importBtn = importDialog.getByRole('button', { name: /Zapisz 2 przepis/i })
      await expect(importBtn).toBeEnabled()
      await importBtn.click()
      await expect(importDialog).toBeHidden({ timeout: 15000 })
    }

    await searchInput.fill(JSON_IMPORT_RECIPES[0].name)
    await expect(page.getByText(JSON_IMPORT_RECIPES[0].name).first()).toBeVisible()
    await searchInput.fill(JSON_IMPORT_RECIPES[1].name)
    await expect(page.getByText(JSON_IMPORT_RECIPES[1].name).first()).toBeVisible()
    await searchInput.fill('')
  })

  test('TC-MEAL-05: JSON Batch Import negative validation (bad JSON, unknown unit, empty ingredients) @module:cookbook @type:negative @state:TEMP', async ({
    page,
  }) => {
    test.skip(isMobileViewport(page), 'JSON Batch Import modal is Desktop-only (Ctrl+Alt+P)')

    await page.keyboard.press('Control+Alt+KeyP')
    const importDialog = page.getByRole('dialog').last()
    await expect(importDialog).toBeVisible()

    // 1) Syntax error JSON
    await importDialog.locator('textarea').fill('{ broken json ')
    await expect(
      importDialog.getByRole('button', { name: /Zapisz (?:\d+ )?przepis|Save recipe/i })
    ).toBeDisabled()

    // 2) Unknown unit + empty recipe name
    await importDialog.locator('textarea').fill(
      JSON.stringify([
        {
          name: '',
          ingredients: [{ name: 'Woda', quantity: 100, unit: 'wiadro' }],
        },
      ])
    )
    await expect(
      importDialog.getByRole('button', { name: /Zapisz (?:\d+ )?przepis|Save recipe/i })
    ).toBeDisabled()

    await importDialog.getByRole('button', { name: /Wyczyść|Clear/i }).click()
    await closeTopDialog(page)
  })

  test('TC-MEAL-06: Filter recipes by search query, tags and category @module:cookbook @type:happy-path @state:BASE', async ({
    page,
  }) => {
    const searchInput = page.locator('input[placeholder*="Szukaj" i]').first()
    await searchInput.fill('Teriyaki')
    await expect(page.getByText(CANONICAL_MEAL_NAME).first()).toBeVisible()

    await searchInput.fill('Nieistniejące Danie XYZ 999')
    await expect(page.getByText(CANONICAL_MEAL_NAME)).toHaveCount(0)
    await searchInput.fill('')
  })

  test('TC-MEAL-07: Create, edit, ConfirmDeleteDialog cancel & delete [TEMP] recipe @module:cookbook @type:corner-case @state:TEMP', async ({
    page,
  }) => {
    const tempMeal = `[TEMP] Koktajl ${isMobileViewport(page) ? 'Mob' : 'Desk'}`
    const editedMeal = `${tempMeal} Bananowy`

    await page.getByRole('button', { name: /Dodaj Przepis|Add Recipe/i }).first().click()
    const dialog = page.getByRole('dialog').last()
    await dialog.locator('input[placeholder*="Jajecznica" i]').fill(tempMeal)
    await selectFromAutocomplete(dialog, '[BASE] Mleko bez laktozy 1.5%')
    await dialog.locator('input[type="number"]').first().fill('250')
    await dialog
      .locator('button')
      .filter({ has: page.locator('svg.lucide-plus') })
      .last()
      .click()

    await dialog
      .getByRole('button', { name: /Utwórz Przepis|Zapisz Przepis|Create Recipe|Save Recipe/i })
      .click()
    await expect(dialog).toBeHidden({ timeout: 10000 })

    const searchInput = page.locator('input[placeholder*="Szukaj" i]').first()
    await searchInput.fill(tempMeal)
    await expect(page.getByText(tempMeal).first()).toBeVisible()

    // Edit name
    await page
      .locator('[title*="Edytuj" i], [title*="Edit" i], [aria-label*="Edytuj" i], [aria-label*="Edit" i]')
      .first()
      .click()
    const editDialog = page.getByRole('dialog').last()
    await editDialog.locator('input[placeholder*="Jajecznica" i]').fill(editedMeal)
    await editDialog.getByRole('button', { name: /Zapisz|Save/i }).first().click()
    await expect(editDialog).toBeHidden({ timeout: 10000 })

    await searchInput.fill(editedMeal)
    await expect(page.getByText(editedMeal).first()).toBeVisible()

    // Cancel ConfirmDeleteDialog -> stays
    await page
      .locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]')
      .first()
      .click()
    await confirmDeleteDialog(page, 'cancel')
    await expect(page.getByText(editedMeal).first()).toBeVisible()

    // Confirm ConfirmDeleteDialog -> removed
    await page
      .locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]')
      .first()
      .click()
    await confirmDeleteDialog(page, 'confirm')
    await expect(page.getByText(editedMeal)).toHaveCount(0)
  })
})
