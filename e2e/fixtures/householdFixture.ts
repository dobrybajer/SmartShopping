import { test as base, expect } from '@playwright/test'
import { TEST_HOUSEHOLD_NAME } from './baseDataset'
import {
  assertAuthenticated,
  ensurePolishLanguage,
  switchOrCreateTestHousehold,
} from '../helpers/uiHelpers'

export interface HouseholdTestOptions {
  skipHouseholdGuard: boolean
}

export const test = base.extend<HouseholdTestOptions & { ensureTestHousehold: void }>({
  skipHouseholdGuard: [false, { option: true }],

  ensureTestHousehold: [
    async ({ page, skipHouseholdGuard }, use) => {
      const runtimeErrors: string[] = []
      const onPageError = (err: Error) => {
        runtimeErrors.push(err.message || String(err))
      }
      page.on('pageerror', onPageError)

      if (skipHouseholdGuard) {
        await use()
        page.off('pageerror', onPageError)
        expect(runtimeErrors, 'Uncaught runtime pageerror detected').toEqual([])
        return
      }

      await page.goto('/')
      await assertAuthenticated(page)
      await ensurePolishLanguage(page)
      await switchOrCreateTestHousehold(page, TEST_HOUSEHOLD_NAME)

      await use()
      page.off('pageerror', onPageError)
      expect(runtimeErrors, 'Uncaught runtime pageerror detected').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
