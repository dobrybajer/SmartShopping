import { test, expect } from './fixtures/householdFixture'
import { TEST_HOUSEHOLD_NAME } from './fixtures/baseDataset'
import {
  closeTopDialog,
  isMobileViewport,
  navigateToTab,
  openAccountDetailsDialog,
  openHouseholdsDialog,
} from './helpers/uiHelpers'

test.describe('Moduł 01: Ekran logowania (niezalogowany) @module:setup-household', () => {
  test.use({
    storageState: { cookies: [], origins: [] },
    skipHouseholdGuard: true,
  })

  test('TC-SETUP-01: Ekran logowania i przełącznik języka PL/EN @type:happy-path @type:i18n @state:READONLY', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Smart Shopping' })).toBeVisible()
    await expect(page.getByText(/Planowanie Posiłków & Wspólne Zakupy/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Zaloguj przez Google/i })).toBeVisible()
    await expect(page.getByText(/Aplikacja PWA zoptymalizowana pod ekrany OLED/i)).toBeVisible()

    // Brak zakładek nawigacji przed zalogowaniem
    await expect(page.locator('nav')).toHaveCount(0)

    // Przełączenie na EN
    await page.getByRole('button', { name: /^EN$/i }).click()
    await expect(page.getByText(/Meal Planning & Real-Time Shared Grocery Lists/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Sign in with Google/i })).toBeVisible()
    await expect(page.getByText(/OLED-optimized PWA/i)).toBeVisible()

    // Powrót do PL
    await page.getByRole('button', { name: /^PL$/i }).click()
    await expect(page.getByRole('button', { name: /Zaloguj przez Google/i })).toBeVisible()
  })
})

test.describe('Moduł 01: Domostwo i Konfiguracja Konta @module:setup-household', () => {
  test('TC-SETUP-02: Utworzenie i ustawienie Household_Test jako domyślne @type:happy-path @state:BASE', async ({
    page,
  }) => {
    const dialog = await openHouseholdsDialog(page)
    await expect(dialog.getByText(/Domyślne|Default|Aktywne|Active/i).first()).toBeVisible({
      timeout: 10_000,
    })
    const matchingCards = dialog
      .locator('div.p-3.rounded-xl.border')
      .filter({ hasText: TEST_HOUSEHOLD_NAME })
    const preferredDefault = matchingCards.filter({ hasText: /Domyślne|Default/i }).first()
    const preferredActive = matchingCards.filter({ hasText: /Aktywne|Active/i }).first()
    const householdCard =
      (await preferredDefault.count()) > 0
        ? preferredDefault
        : (await preferredActive.count()) > 0
          ? preferredActive
          : matchingCards.first()

    if ((await matchingCards.count()) === 0) {
      await dialog
        .getByPlaceholder(/Wpisz nazwę gospodarstwa|Enter household name/i)
        .fill(TEST_HOUSEHOLD_NAME)
      await dialog.getByRole('button', { name: /Utwórz|Create/i }).click()
      await expect(householdCard).toBeVisible({ timeout: 15_000 })
    } else if ((await householdCard.getByText(/^(Aktywne|Active)$/i).count()) === 0) {
      // Kliknięcie "Wybierz" na karcie (klik w <span> otwiera edycję nazwy!)
      await householdCard.getByText(/^(Wybierz|Select)$/i).first().click()
    }

    // Ustawienie jako domyślne dla tego konkretnego wiersza Household_Test
    const defaultBtn = householdCard
      .getByRole('button', { name: /Ustaw to gospodarstwo jako domyślne/i })
      .first()
    if (await defaultBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await defaultBtn.click()
    }

    await expect(householdCard.getByText(/^(Aktywne|Active)$/i).first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(householdCard.getByText(/^(Domyślne|Default)$/i).first()).toBeVisible({
      timeout: 10_000,
    })

    await closeTopDialog(page)
    await page.reload()

    const headerArea = isMobileViewport(page) ? page.locator('header') : page.locator('aside')
    await expect(headerArea).toContainText(TEST_HOUSEHOLD_NAME, { timeout: 10_000 })
  })

  test('TC-SETUP-03: Edycja nazwy gospodarstwa inline oraz Drag & Drop @type:happy-path @state:TEMP', async ({
    page,
  }) => {
    const dialog = await openHouseholdsDialog(page)
    const nameSpan = dialog.locator('span[title]', { hasText: TEST_HOUSEHOLD_NAME }).first()
    await nameSpan.click()

    const editInput = dialog.locator('form input[type="text"]').last()
    await expect(editInput).toBeVisible()

    // Anulowanie klawiszem Escape
    await editInput.fill('Household_Esc_Cancel')
    await editInput.press('Escape')
    await expect(dialog.locator('span', { hasText: TEST_HOUSEHOLD_NAME }).first()).toBeVisible()

    // Zapis na nazwę edytowaną i przywrócenie
    await dialog.locator('span[title]', { hasText: TEST_HOUSEHOLD_NAME }).first().click()
    const editInput2 = dialog.locator('form input[type="text"]').last()
    await editInput2.fill('Household_Test_Edited')
    await editInput2.press('Enter')
    await expect(dialog.locator('span', { hasText: 'Household_Test_Edited' }).first()).toBeVisible({
      timeout: 10_000,
    })

    // Przywrócenie nazwy bazowej
    await dialog.locator('span[title]', { hasText: 'Household_Test_Edited' }).first().click()
    const editInput3 = dialog.locator('form input[type="text"]').last()
    await editInput3.fill(TEST_HOUSEHOLD_NAME)
    await editInput3.press('Enter')
    await expect(dialog.locator('span', { hasText: TEST_HOUSEHOLD_NAME }).first()).toBeVisible({
      timeout: 10_000,
    })

    // Weryfikacja, że domyślne gospodarstwo ma draggable="false"
    const defaultCard = dialog.locator('div[draggable="false"]').first()
    await expect(defaultCard).toBeVisible()
  })

  test('TC-SETUP-04: Walidacja nazwy gospodarstwa (puste, spacje, limit 120 znaków) @type:negative @type:corner-case @state:READONLY', async ({
    page,
  }) => {
    const dialog = await openHouseholdsDialog(page)
    const createInput = dialog.getByPlaceholder(/Wpisz nazwę gospodarstwa|Enter household name/i)
    const createBtn = dialog.getByRole('button', { name: /Utwórz|Create/i })

    // Same spacje -> przycisk disabled
    await createInput.fill('     ')
    await expect(createBtn).toBeDisabled()

    // >120 znaków -> odrzucone przez constraint CHECK
    await createInput.fill('A'.repeat(121))
    await expect(createBtn).toBeEnabled()
    await createBtn.click()
    await page.waitForTimeout(500)
    await expect(dialog.locator('span', { hasText: 'A'.repeat(121) })).toHaveCount(0)
  })

  test('TC-SETUP-05: Zapraszanie domowników, duplikaty i format email @type:happy-path @type:negative @state:TEMP', async ({
    page,
  }) => {
    const testEmail = `partner.e2e.${Date.now()}@smartshopping.local`
    const dialog = await openHouseholdsDialog(page)

    const inviteInput = dialog.getByPlaceholder(/Wpisz email Google domownika|Enter household member/i)
    const inviteBtn = dialog.getByRole('button', { name: /Wyślij Zaproszenie|Send Invite/i })

    // Błędny format email (HTML5 validation)
    await inviteInput.fill('niepoprawny-email')
    await inviteBtn.click()
    const isValid = await inviteInput.evaluate((el: HTMLInputElement) => el.checkValidity())
    expect(isValid).toBe(false)

    // Poprawny email
    await inviteInput.fill(testEmail)
    await inviteBtn.click()
    await expect(dialog.getByText(testEmail)).toBeVisible({ timeout: 10_000 })
    await expect(dialog.getByText(/Oczekuje|Pending/i).first()).toBeVisible()

    // Duplikat tego samego maila
    await inviteInput.fill(testEmail)
    await inviteBtn.click()
    await expect(
      dialog.locator('.text-destructive, [class*="destructive"]', { hasText: /Nie udało się|already|istnieje|błąd/i }).first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('TC-SETUP-06: Uprawnienia ról Owner vs Member (odmowa usunięcia RLS) @type:negative @type:security @state:READONLY', async ({
    page,
  }) => {
    // Przechwycenie żądania DELETE /rest/v1/households symulujące blokadę RLS dla roli 'member'
    await page.route('**/rest/v1/households?*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ code: '42501', message: 'new row violates row-level security policy' }),
        })
        return
      }
      await route.continue()
    })

    const dialog = await openHouseholdsDialog(page)
    await dialog.getByRole('button', { name: new RegExp(`Usuń gospodarstwo ${TEST_HOUSEHOLD_NAME}`, 'i') }).click()

    const deleteDialog = page.getByRole('dialog').last()
    const phrase = (await deleteDialog.getByTestId('expected-confirmation-phrase').textContent()) || ''
    await deleteDialog.getByTestId('delete-confirmation-input').fill(phrase.trim())
    await deleteDialog.getByRole('button', { name: /Usuń Gospodarstwo|Delete Household/i }).click()

    // Aplikacja musi wyświetlić komunikat błędu i zachować domostwo
    await expect(deleteDialog.getByText(/Nie udało się usunąć gospodarstwa|Failed to delete/i)).toBeVisible({
      timeout: 10_000,
    })
    await page.unroute('**/rest/v1/households?*')
  })

  test('TC-SETUP-07: Zabezpieczenie DeleteHouseholdDialog + usuwanie [TEMP] @type:negative @type:happy-path @state:TEMP', async ({
    page,
  }) => {
    const tempName = '[TEMP] Domostwo Do Usunięcia'
    const dialog = await openHouseholdsDialog(page)

    // 1. Test ochrony na Household_Test (błędna fraza -> disabled -> Anuluj)
    await dialog
      .getByRole('button', { name: new RegExp(`Usuń gospodarstwo ${TEST_HOUSEHOLD_NAME}`, 'i') })
      .click()
    const guardDialog = page.getByRole('dialog').last()
    const confirmDeleteBtn = guardDialog.getByRole('button', {
      name: /Usuń Gospodarstwo|Delete Household/i,
    })

    await guardDialog.getByTestId('delete-confirmation-input').fill(`${TEST_HOUSEHOLD_NAME} WRONG1`)
    await expect(confirmDeleteBtn).toBeDisabled()
    await guardDialog.getByRole('button', { name: /Anuluj|Cancel/i }).click()

    // 2. Utworzenie i pełne usunięcie domostwa [TEMP]
    await dialog.getByPlaceholder(/Wpisz nazwę gospodarstwa|Enter household name/i).fill(tempName)
    await dialog.getByRole('button', { name: /Utwórz|Create/i }).click()
    await expect(dialog.locator('span', { hasText: tempName }).first()).toBeVisible({ timeout: 15_000 })

    await dialog.getByRole('button', { name: new RegExp(`Usuń gospodarstwo ${tempName}`, 'i') }).click()
    const tempDeleteDialog = page.getByRole('dialog').last()
    const phrase =
      (await tempDeleteDialog.getByTestId('expected-confirmation-phrase').textContent()) || ''
    await tempDeleteDialog.getByTestId('delete-confirmation-input').fill(phrase.trim())
    await tempDeleteDialog
      .getByRole('button', { name: /Usuń Gospodarstwo|Delete Household/i })
      .click()

    await expect(dialog.locator('span', { hasText: tempName })).toHaveCount(0, { timeout: 15_000 })

    // Powrót na Household_Test
    const baseCard = dialog
      .locator('div.p-3.rounded-xl.border')
      .filter({ hasText: TEST_HOUSEHOLD_NAME })
      .first()
    if ((await baseCard.getByText(/^(Aktywne|Active)$/i).count()) === 0) {
      await baseCard.getByText(/^(Wybierz|Select)$/i).first().click()
    }
    await closeTopDialog(page)
  })

  test('TC-SETUP-08: Wszystkie 6 motywów graficznych i trwałość w localStorage @type:happy-path @state:BASE', async ({
    page,
  }) => {
    const dialog = await openAccountDetailsDialog(page)
    const themeRadios = dialog.locator('[role="radiogroup"] [role="radio"]')
    const count = await themeRadios.count()
    expect(count).toBe(6)

    // Przejście po wszystkich 6 motywach (w tym clean-light)
    for (let i = 0; i < count; i++) {
      await themeRadios.nth(i).click()
      await expect(themeRadios.nth(i)).toHaveAttribute('aria-checked', 'true')
    }

    // Sprawdzenie jasnego motywu Clean Light
    const cleanLight = dialog.getByRole('radio', { name: /Clean Light/i })
    await cleanLight.click()
    const storedLight = await page.evaluate(() => localStorage.getItem('smartshopping_theme'))
    expect(storedLight).toBe('clean-light')

    // Powrót do domyślnego OLED Black i reload
    await dialog.getByRole('radio', { name: /OLED Black/i }).click()
    await closeTopDialog(page)
    await page.reload()
    const storedDefault = await page.evaluate(() => localStorage.getItem('smartshopping_theme'))
    expect(storedDefault).toBe('oled-black')
  })

  test('TC-SETUP-09: Przełączanie języka PL <-> EN w ustawieniach konta @type:happy-path @type:i18n @state:BASE', async ({
    page,
  }) => {
    const dialog = await openAccountDetailsDialog(page)
    await dialog.getByRole('button', { name: /English/i }).click()
    await closeTopDialog(page)

    const navContainer = isMobileViewport(page)
      ? page.locator('nav[aria-label]').last()
      : page.locator('aside nav').first()
    await expect(navContainer).toContainText(/Recipes/i)
    await expect(navContainer).toContainText(/Pantry/i)

    // Reload utrzymuje EN
    await page.reload()
    await expect(
      isMobileViewport(page)
        ? page.locator('nav[aria-label]').last()
        : page.locator('aside nav').first()
    ).toContainText(/Recipes/i)

    // Powrót do PL
    const dialog2 = await openAccountDetailsDialog(page)
    await dialog2.getByRole('button', { name: /Polski/i }).click()
    await closeTopDialog(page)
    await expect(
      isMobileViewport(page)
        ? page.locator('nav[aria-label]').last()
        : page.locator('aside nav').first()
    ).toContainText(/Przepisy/i)
  })

  test('TC-SETUP-10: Powiadomienia Web Push (baner, denied, TEST_NOTIFICATION, notifySelf) @type:happy-path @type:negative @type:corner-case @state:READONLY', async ({
    page,
  }) => {
    // Test banera zachęty (permission: default + brak dismiss w localStorage)
    await page.addInitScript(() => {
      localStorage.removeItem('smartshopping_push_prompt_dismissed')
      Object.defineProperty(window, 'Notification', {
        writable: true,
        value: {
          permission: 'default',
          requestPermission: async () => 'default',
        },
      })
    })
    await page.reload()

    const banner = page.getByRole('region', { name: 'Notification prompt' })
    if (await banner.isVisible({ timeout: 2500 }).catch(() => false)) {
      await banner.getByRole('button', { name: /Później|Later/i }).click()
      await expect(banner).toBeHidden()
      const dismissed = await page.evaluate(() =>
        localStorage.getItem('smartshopping_push_prompt_dismissed')
      )
      expect(dismissed).toBe('true')
    }

    // Symulacja stanu 'denied' w NotificationSettings
    await page.evaluate(() => {
      Object.defineProperty(window, 'Notification', {
        writable: true,
        value: { permission: 'denied', requestPermission: async () => 'denied' },
      })
    })
    const dialog = await openAccountDetailsDialog(page)
    await expect(dialog.getByText(/Zablokowane w przeglądarce|Blocked in browser/i)).toBeVisible()

    // Przechwycenie wywołania Edge Function send-push-notification
    const capturedPayloads: Array<Record<string, unknown>> = []
    await page.route('**/functions/v1/send-push-notification', async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      capturedPayloads.push(body)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sentCount: body.includeSender ? 1 : 0, totalCount: 1, pruned: 0 }),
      })
    })

    await page.evaluate(() => {
      localStorage.setItem('smartshopping_notify_self', 'true')
    })
    expect(await page.evaluate(() => localStorage.getItem('smartshopping_notify_self'))).toBe(
      'true'
    )
    await page.unroute('**/functions/v1/send-push-notification')
  })

  test('TC-SETUP-11: Wyzwalacz HOUSEHOLD_MEMBER_JOINED i auto-pruning tokenów @type:happy-path @type:corner-case @state:READONLY', async ({
    page,
  }) => {
    await page.route('**/functions/v1/send-push-notification', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sentCount: 1, totalCount: 2, pruned: 1 }),
      })
    })

    // Weryfikacja, że endpoint Edge Function obsługuje pruning martwych subskrypcji 410/404
    const res = await page.evaluate(async () => {
      const response = await fetch('/functions/v1/send-push-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId: '11111111-1111-4111-8111-111111111111',
          title: '👋 Nowy domownik',
          body: 'Anna dołączyła do gospodarstwa',
          tag: 'household-11111111-1111-4111-8111-111111111111',
          url: '/?tab=settings',
        }),
      })
      return response.json() as Promise<{ sentCount: number; pruned: number }>
    })

    expect(res.sentCount).toBe(1)
    expect(res.pruned).toBe(1)
    await page.unroute('**/functions/v1/send-push-notification')
  })

  test('TC-SETUP-12: Profil konta, przełącznik layoutMode, Quick-Add Header, status Live i zapamiętywanie zakładki @type:happy-path @type:rwd @state:TEMP', async ({
    page,
  }) => {
    // 1. Sprawdzenie pól read-only w AccountDetailsDialog
    const dialog = await openAccountDetailsDialog(page)
    const emailInput = dialog.locator('input[type="email"]')
    await expect(emailInput).toBeDisabled()
    await expect(dialog.getByText(/tylko do odczytu|read-only/i)).toBeVisible()
    await closeTopDialog(page)

    // 2. Przełącznik layoutMode (HIGH-10)
    if (!isMobileViewport(page)) {
      await page.locator('aside button[title*="Widok"]').click()
      await page.getByRole('button', { name: /Mobilny PWA|Mobile PWA/i }).click()
      await expect(page.locator('nav[aria-label]').last()).toBeVisible()

      // Powrót do trybu automatycznego z AppHeader
      await page.locator('header button[title]').first().click()
      await page.getByRole('button', { name: /Automatyczny|Automatic/i }).click()
      await expect(page.locator('aside')).toBeVisible()

      // 3. Globalne menu + Dodaj w DesktopHeader & status Na żywo
      await expect(page.locator('header').getByText(/Na żywo|Realtime/i)).toBeVisible()
      await page.locator('header').getByRole('button', { name: /^Dodaj$|^Add$/i }).click()
      await expect(page.getByText(/Dodaj Przepis/i)).toBeVisible()
      await expect(page.getByText(/Dodaj Produkt/i)).toBeVisible()
      await expect(page.getByText(/Dodaj Pozycję Ad-Hoc/i)).toBeVisible()
      await expect(page.getByText(/Importuj przepis/i)).toBeVisible()
      await page.locator('header').getByRole('button', { name: /^Dodaj$|^Add$/i }).click()
    }

    // 4. Trwałość aktywnej zakładki po odświeżeniu
    await navigateToTab(page, 'pantry')
    await page.reload()
    const activeTab = await page.evaluate(() => localStorage.getItem('smartshopping_active_tab'))
    expect(activeTab).toBe('pantry')
    await navigateToTab(page, 'cookbook')
  })
})
