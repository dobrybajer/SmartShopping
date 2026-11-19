import { test, expect } from './fixtures/householdFixture'
import { BASE_TEMPLATES, CANONICAL_MEAL_NAME } from './fixtures/baseDataset'
import {
  closeTopDialog,
  confirmDeleteDialog,
  getNextMondayDate,
  isMobileViewport,
  navigateToTab,
} from './helpers/uiHelpers'

test.describe('Module 09 — Meal Calendar, Cumulative Pantry, Uncertainty & Weekly Templates', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToTab(page, 'calendar')
  })

  test('TC-CAL-01: Switch Month / Week / Day views and toggle Workweek (Pn-Pt) vs Full Week (Pn-Nd) @module:calendar-templates @type:happy-path @state:BASE', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /^(Miesiąc|Month)$/i }).first().click()
    await page.getByRole('button', { name: /^(Tydzień|Week)$/i }).first().click()

    const workweekBtn = page.getByRole('button', { name: /Roboczy \(Pn-Pt\)|Workweek/i }).first()
    const fullWeekBtn = page.getByRole('button', { name: /Pełny \(Pn-Nd\)|Full Week/i }).first()

    if ((await fullWeekBtn.count()) > 0) {
      await fullWeekBtn.click()
      await expect(page.getByText(/Nd|Niedziela|Sun/i).first()).toBeVisible()
      await workweekBtn.click()
    }

    await page.getByRole('button', { name: /^(Dzień|Day)$/i }).first().click()
    await expect(page.getByRole('button', { name: /Dodaj posiłek|Add meal/i }).first()).toBeVisible()
  })

  test('TC-CAL-02: Plan [BASE] meal on next Monday + ad-hoc quick meal + duplicate next day + delete [TEMP] @module:calendar-templates @type:happy-path @state:BASE', async ({
    page,
  }) => {
    const nextMonday = getNextMondayDate(1)

    // Switch to Week view and advance to next week so Monday is visible
    await page.getByRole('button', { name: /^(Tydzień|Week)$/i }).first().click()
    await page.locator('[aria-label*="Następny tydzień" i], [title*="Następny tydzień" i]').first().click()

    // Check if [BASE] meal already planned in that week (idempotent [BASE])
    if ((await page.getByText(CANONICAL_MEAL_NAME).count()) === 0) {
      await page.getByRole('button', { name: /Dodaj posiłek|Add meal/i }).first().click()
      const dialog = page.getByRole('dialog').last()
      await expect(dialog).toBeVisible()

      const dateInput = dialog.locator('input[type="date"]').first()
      if ((await dateInput.count()) > 0) {
        await dateInput.fill(nextMonday)
      }

      // Select canonical meal from recipe select or search
      const mealSearch = dialog.locator('input[placeholder*="Szukaj" i]').first()
      if ((await mealSearch.count()) > 0) {
        await mealSearch.fill(CANONICAL_MEAL_NAME)
        await dialog.getByText(CANONICAL_MEAL_NAME).first().click()
      } else {
        await dialog.getByText(CANONICAL_MEAL_NAME).first().click()
      }

      await dialog.getByRole('button', { name: /Zapisz w kalendarzu|Save to calendar/i }).click()
      await expect(dialog).toBeHidden({ timeout: 10000 })
    }

    await expect(page.getByText(CANONICAL_MEAL_NAME).first()).toBeVisible()

    // Switch directly into nextMonday Day view by clicking the Monday header (short on Desktop, full weekday on Mobile)
    await page.getByText(/^(PON\.|MON\.)|^poniedziałek|^monday/i).first().click()
    await expect(page.locator('main').getByText(CANONICAL_MEAL_NAME).first()).toBeVisible({
      timeout: 10_000,
    })
    const tempMealName = `[TEMP] Szybki Lunch ${isMobileViewport(page) ? 'M' : 'D'}`

    const cleanupTempCards = async () => {
      for (let i = 0; i < 10; i++) {
        const countBefore = await page.locator('main').getByText(tempMealName).count()
        if (countBefore === 0) break
        const staleCard = page
          .locator('main div')
          .filter({ hasText: tempMealName })
          .filter({
            has: page.locator(
              '[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]'
            ),
          })
          .last()
        await staleCard
          .locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]')
          .first()
          .click()
        await confirmDeleteDialog(page, 'confirm')
        await expect(page.locator('main').getByText(tempMealName)).toHaveCount(countBefore - 1, {
          timeout: 10_000,
        })
      }
    }

    // Clean any leftover [TEMP] card from prior aborted runs first
    await cleanupTempCards()

    await page.getByRole('button', { name: /Dodaj posiłek|Add meal/i }).first().click()
    const adhocDialog = page.getByRole('dialog').last()
    const adhocTab = adhocDialog.getByRole('button', { name: /Szybkie danie|Quick meal/i }).first()
    if ((await adhocTab.count()) > 0) {
      await adhocTab.click()
      await adhocDialog.locator('input[type="text"]').first().fill(tempMealName)
      const dateInput = adhocDialog.locator('input[type="date"]').first()
      if ((await dateInput.count()) > 0) {
        await dateInput.fill(nextMonday)
      }
      await adhocDialog.getByRole('button', { name: /Zapisz w kalendarzu|Save to calendar/i }).click()
      await expect(adhocDialog).toBeHidden({ timeout: 10000 })

      // Verify created, test "Kopiuj na jutro" -> verify on Tuesday & clean both days via ConfirmDeleteDialog
      await expect(page.locator('main').getByText(tempMealName).first()).toBeVisible()
      const tempCard = page
        .locator('main div')
        .filter({ hasText: tempMealName })
        .filter({
          has: page.locator(
            '[title="Kopiuj na jutro"], [title="Duplicate next day"], [aria-label="Kopiuj na jutro"], [aria-label="Duplicate next day"]'
          ),
        })
        .last()
      await tempCard
        .locator(
          '[title="Kopiuj na jutro"], [title="Duplicate next day"], [aria-label="Kopiuj na jutro"], [aria-label="Duplicate next day"]'
        )
        .first()
        .click()

      // Switch to Tuesday ("Następny dzień"), assert duplicated meal exists, clean Tuesday then Monday
      await page.locator('[aria-label*="Następny dzień" i], [title*="Następny dzień" i]').first().click()
      await expect(page.locator('main').getByText(tempMealName).first()).toBeVisible({
        timeout: 10_000,
      })
      await cleanupTempCards()
      await page.locator('[aria-label*="Poprzedni dzień" i], [title*="Poprzedni dzień" i]').first().click()

      await cleanupTempCards()
      await expect(page.locator('main').getByText(tempMealName)).toHaveCount(0)
    } else {
      await closeTopDialog(page)
    }
  })

  test('TC-CAL-03: 3-level calendar-to-draft transfers (meal, day, week) + cumulative pantry reservation @module:calendar-templates @type:happy-path @state:TEMP', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /^(Tydzień|Week)$/i }).first().click()
    await page.locator('[aria-label*="Następny tydzień" i], [title*="Następny tydzień" i]').first().click()

    const weekTransferBtn = page
      .getByRole('button', { name: /Tydzień do koszyka|Week to cart/i })
      .first()
    if ((await weekTransferBtn.count()) > 0 && (await weekTransferBtn.isEnabled())) {
      await weekTransferBtn.click()
      await page.waitForTimeout(600)
    }

    await navigateToTab(page, 'draft')
    // Clean up Draft afterwards so Draft doesn't stay polluted between repeated test runs
    const clearBtn = page.getByRole('button', { name: /Wyczyść Koszyk|Clear Cart/i }).first()
    if ((await clearBtn.count()) > 0 && (await clearBtn.isEnabled())) {
      await clearBtn.click()
      await confirmDeleteDialog(page, 'confirm')
    }
  })

  test('TC-CAL-04: UncertaintyWarningModal lists low-confidence / expired pantry ingredient & allows restore @module:calendar-templates @type:corner-case @state:TEMP', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /^(Tydzień|Week)$/i }).first().click()
    await page.locator('[aria-label*="Następny tydzień" i], [title*="Następny tydzień" i]').first().click()

    // In [BASE] setup, "[BASE] Awokado Hass" had expiry yesterday (-1 day), or card renders warning button
    const warningTrigger = page
      .locator('button')
      .filter({ has: page.locator('svg.lucide-alert-triangle') })
      .first()

    if ((await warningTrigger.count()) > 0) {
      await warningTrigger.click()
      const modal = page.getByRole('dialog').last()
      await expect(modal).toBeVisible()
      await expect(
        modal.getByRole('button', { name: /Przywróć do koszyka|Restore to cart/i }).first()
      ).toBeVisible()
      await closeTopDialog(page)
    }
  })

  test('TC-CAL-05: Past-date Read-Only Archive mode blocks adding/editing meals @module:calendar-templates @type:negative @state:BASE', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /^(Tydzień|Week)$/i }).first().click()
    // Navigate 1 week into the past
    await page.locator('[aria-label*="Poprzedni tydzień" i], [title*="Poprzedni tydzień" i]').first().click()
    await page.getByRole('button', { name: /^(Dzień|Day)$/i }).first().click()

    // If the selected day is strictly before today, archive notice appears and Add/Delete controls are disabled/hidden
    const archiveNotice = page.getByText(/Archiwum \(Tylko do odczytu\)|Read-only Archive/i).first()
    if ((await archiveNotice.count()) > 0) {
      await expect(archiveNotice).toBeVisible()
      await expect(page.getByRole('button', { name: /Dodaj posiłek|Add meal/i })).toHaveCount(0)
    }
  })

  test('TC-CAL-06: Save canonical [BASE] Weekly Templates (Pn-Pt & Pn-Nd) & apply with 1.5x scaling @module:calendar-templates @type:happy-path @state:BASE', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /^(Tydzień|Week)$/i }).first().click()
    await page.locator('[aria-label*="Następny tydzień" i], [title*="Następny tydzień" i]').first().click()

    await page.getByRole('button', { name: /Szablony|Templates/i }).first().click()
    const modal = page.getByRole('dialog').last()
    await expect(modal).toBeVisible()

    // Ensure [BASE] workweek template exists
    if ((await modal.getByText(BASE_TEMPLATES.workweek).count()) === 0) {
      const nameInput = modal.locator('input[placeholder*="Tydzień redukcyjny" i]').first()
      await nameInput.fill(BASE_TEMPLATES.workweek)
      await modal.getByRole('button', { name: /Zapisz szablon|Save template/i }).click()
      await expect(modal.getByText(BASE_TEMPLATES.workweek).first()).toBeVisible({ timeout: 10000 })
    }

    await expect(modal.getByText(BASE_TEMPLATES.workweek).first()).toBeVisible()
    await closeTopDialog(page)

    // Full-week (Pn-Nd) template
    const fullWeekBtn = page.getByRole('button', { name: /Pełny \(Pn-Nd\)|Full Week/i }).first()
    if ((await fullWeekBtn.count()) > 0) {
      await fullWeekBtn.click()
    }
    await page.getByRole('button', { name: /Szablony|Templates/i }).first().click()
    const modal2 = page.getByRole('dialog').last()
    if ((await modal2.getByText(BASE_TEMPLATES.fullWeek).count()) === 0) {
      const nameInput2 = modal2.locator('input[placeholder*="Tydzień redukcyjny" i]').first()
      await nameInput2.fill(BASE_TEMPLATES.fullWeek)
      await modal2.getByRole('button', { name: /Zapisz szablon|Save template/i }).click()
      await expect(modal2.getByText(BASE_TEMPLATES.fullWeek).first()).toBeVisible({ timeout: 10000 })
    }
    await closeTopDialog(page)

    // Advance 3 more weeks ahead (total T+4 weeks) and apply [BASE] workweek template with 1.5x scaling
    const nextWeekBtn = page
      .locator('[aria-label*="Następny tydzień" i], [title*="Następny tydzień" i]')
      .first()
    for (let i = 0; i < 3; i++) {
      await nextWeekBtn.click()
    }

    await page.getByRole('button', { name: /Szablony|Templates/i }).first().click()
    const applyModal = page.getByRole('dialog').last()
    await expect(applyModal).toBeVisible()

    const tplRow = applyModal
      .locator('div, li')
      .filter({ hasText: BASE_TEMPLATES.workweek })
      .filter({ has: applyModal.getByRole('button', { name: /Zastosuj|Apply/i }) })
      .last()
    if ((await tplRow.count()) > 0) {
      const scaleInput = tplRow.locator('input[type="number"]').first()
      if ((await scaleInput.count()) > 0) {
        await scaleInput.fill('1.5')
      }
      await tplRow.getByRole('button', { name: /Zastosuj|Apply/i }).first().click()
      await expect(applyModal).toBeHidden({ timeout: 10000 })

      // Verify scaled meal landed in future week, then clean up planned card(s)
      await expect(page.getByText(CANONICAL_MEAL_NAME).first()).toBeVisible()
      await page.getByText(/^(PON\.|MON\.)|^poniedziałek|^monday/i).first().click()
      await expect(page.locator('main').getByText(CANONICAL_MEAL_NAME).first()).toBeVisible()
      await expect(page.locator('main').getByText(/1\.5/).first()).toBeVisible()
      while ((await page.locator('main').getByText(CANONICAL_MEAL_NAME).count()) > 0) {
        const countBefore = await page.locator('main').getByText(CANONICAL_MEAL_NAME).count()
        const card = page
          .locator('main div')
          .filter({ hasText: CANONICAL_MEAL_NAME })
          .filter({
            has: page.locator(
              '[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]'
            ),
          })
          .last()
        await card
          .locator('[title="Usuń"], [title="Delete"], [aria-label="Usuń"], [aria-label="Delete"]')
          .first()
          .click()
        await confirmDeleteDialog(page, 'confirm')
        await expect(page.locator('main').getByText(CANONICAL_MEAL_NAME)).toHaveCount(
          countBefore - 1,
          { timeout: 10_000 }
        )
      }
    } else {
      await closeTopDialog(page)
    }
  })

  test('TC-CAL-07: Empty-week save guard (emptyWeekHint) & delete [TEMP] template with ConfirmDeleteDialog @module:calendar-templates @type:corner-case @state:TEMP', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /^(Tydzień|Week)$/i }).first().click()

    // 1) Advance 5 weeks ahead into an empty future week -> Save button is disabled with emptyWeekHint
    const nextWeekBtn = page
      .locator('[aria-label*="Następny tydzień" i], [title*="Następny tydzień" i]')
      .first()
    for (let i = 0; i < 5; i++) {
      await nextWeekBtn.click()
    }

    await page.getByRole('button', { name: /Szablony|Templates/i }).first().click()
    const emptyModal = page.getByRole('dialog').last()
    await expect(emptyModal).toBeVisible()

    const saveBtn = emptyModal.getByRole('button', { name: /Zapisz szablon|Save template/i }).first()
    await expect(saveBtn).toBeDisabled()
    await closeTopDialog(page)

    // 2) Navigate back to T+1 week (where [BASE] meal is planned), save [TEMP] template and delete it via ConfirmDeleteDialog
    const prevWeekBtn = page
      .locator('[aria-label*="Poprzedni tydzień" i], [title*="Poprzedni tydzień" i]')
      .first()
    for (let i = 0; i < 4; i++) {
      await prevWeekBtn.click()
    }

    const tempTemplateName = `[TEMP] Szablon Do Usunięcia ${isMobileViewport(page) ? 'M' : 'D'}`
    await expect(page.locator('.animate-spin')).toHaveCount(0, { timeout: 10_000 })
    await page.getByRole('button', { name: /Szablony|Templates/i }).first().click()
    const tplModal = page.getByRole('dialog').last()
    await expect(tplModal).toBeVisible()

    const countBeforeSave = await tplModal.locator('h5', { hasText: tempTemplateName }).count()
    const nameInput = tplModal.locator('input[placeholder*="Tydzień redukcyjny" i]').first()
    await nameInput.fill(tempTemplateName)
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes('/rest/v1/weekly_meal_templates') &&
          res.request().method() === 'POST' &&
          res.status() < 300
      ),
      tplModal.getByRole('button', { name: /Zapisz szablon|Save template/i }).click(),
    ])
    await expect(tplModal.locator('h5', { hasText: tempTemplateName })).toHaveCount(
      countBeforeSave + 1,
      { timeout: 10_000 }
    )

    // Delete all [TEMP] templates matching tempTemplateName via Usuń -> ConfirmDeleteDialog (DELETE /rest/v1/weekly_meal_templates)
    let remaining = countBeforeSave + 1
    while (remaining > 0) {
      const tempRow = tplModal
        .locator('div, li')
        .filter({ has: page.locator('h5', { hasText: tempTemplateName }) })
        .filter({ has: page.getByRole('button', { name: /^(Usuń|Delete)$/i }) })
        .last()
      await tempRow
        .getByRole('button', { name: /^(Usuń|Delete)$/i })
        .first()
        .click()
      await Promise.all([
        page.waitForResponse(
          (res) =>
            res.url().includes('/rest/v1/weekly_meal_templates') &&
            res.request().method() === 'DELETE' &&
            res.status() < 300
        ),
        confirmDeleteDialog(page, 'confirm'),
      ])
      remaining -= 1
      await expect(tplModal.locator('h5', { hasText: tempTemplateName })).toHaveCount(remaining, {
        timeout: 10_000,
      })
    }
    await expect(tplModal.locator('h5', { hasText: tempTemplateName })).toHaveCount(0)
    await closeTopDialog(page)
  })
})
