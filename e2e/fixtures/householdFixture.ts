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
      if (skipHouseholdGuard) {
        await use()
        return
      }

      await page.goto('/')
      await assertAuthenticated(page)
      await ensurePolishLanguage(page)
      await switchOrCreateTestHousehold(page, TEST_HOUSEHOLD_NAME)

      await use()
    },
    { auto: true },
  ],
})

export { expect }
