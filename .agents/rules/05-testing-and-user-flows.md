# Rule 05: Automated Testing & UI User Flow Coverage

## Context & Objectives
To prevent regressions and ensure that complex UI flows remain reliable across continuous refactoring, SmartShopping uses **Vitest** and **React Testing Library**.

---

## 1. Test Architecture & Structure

- **Runner:** Vitest (`vitest run`).
- **Environment:** `jsdom` with `@testing-library/react` and `@testing-library/jest-dom`.
- **Test File Location:**
  - Pure calculation tests: `src/lib/calculations/__tests__/*.test.ts`
  - Service tests: `src/services/__tests__/*.test.ts`
  - View & Flow tests: `src/components/views/__tests__/*.test.tsx` or `src/components/layout/desktop/views/__tests__/*.test.tsx`

---

## 2. Mandatory UI User Flow Enumeration

When creating or significantly modifying a UI component/view:
1. **Brainstorm Comprehensive User Flows:**
   - Identify all distinct actions and states (e.g. empty state, adding items, editing quantity, deleting items, modal cancel vs confirm, filtering, sorting, optimistic checkoff, error rollback).
2. **Describe Flows in Test Method Summaries:**
   - Organize test suites using clear `describe` and `it` blocks that document the complete scenario being tested.
   - Example structure:
     ```typescript
     describe('ActiveListView - User Flows & Interactions', () => {
       it('Flow 01: renders empty state when active list has no items', () => { ... });
       it('Flow 02: groups items by store aisle category sort_order', () => { ... });
       it('Flow 03: optimistically strikes through item on check and updates store', () => { ... });
       it('Flow 04: triggers haptic feedback when item checkbox is toggled', () => { ... });
       it('Flow 05: preserves checked items in place without reordering list under finger', () => { ... });
       it('Flow 06: allows adding ad-hoc product directly to active list', () => { ... });
       it('Flow 07: opens confirmation dialog on archive and handles successful archiving', () => { ... });
     });
     ```

---

## 3. Pure Calculation & Algorithm Testing

All business-critical algorithms must maintain complete unit test coverage in `src/lib/calculations/__tests__/`:
1. **Calorie, Macro & Hierarchy Resolution (`macroCalculations.ts`):**
   - Base recipe grams * (Target calories / Base recipe calories) and hierarchical `resolveEffectiveIngredientMacros` (`ADR-010`).
2. **Kitchen Units Conversion (`kitchenUnits.ts`):**
   - Converting household measures (`tbsp`, `tsp`, `cup`, `pinch`, `dag`, `kg`, `l`) into base `g`/`ml`/`pcs`.
3. **Grocery Aggregation, Conflicts & Sorting (`mergeDraftItems.ts`, `shoppingItemConflict.ts`, `categorySorting.ts`):**
   - Combining identical `product_id` occurrences, resolving OCC conflicts, and sorting strictly by `product_categories.sort_order`.
4. **Calendar Status, Pantry Deduction & Weekly Templates (`calendarStatus.ts`, `pantryConsumption.ts`, `weeklyTemplateCalculations.ts`):**
   - Status resolution across pantry/draft/active/history, warning (`⚠️`) uncertainty triggers, pantry stock math, and Mon–Fri / Mon–Sun template building.

---

## 4. Cross-Cutting Compliance Suites, Dual-Layout Coverage & Hygiene

1. **Mandatory Architectural & Security Regression Suites:**
   - **Tenant & Query Security (`src/lib/__tests__/rlsSecurityAudit.test.ts`):** Verify no service leaks cross-tenant queries or bypasses `household_id` checks.
   - **Theme WCAG Contrast (`src/theme/__tests__/wcagContrast.test.ts`):** Ensure all 6 themes satisfy WCAG 2.1 AA contrast ratios.
   - **i18n Parity (`src/i18n/__tests__/i18n.test.ts`):** Guarantee 1:1 translation key symmetry between `pl.ts` and `en.ts`.
   - **Zustand Selector Stability (`src/store/__tests__/zustandSelectors.test.tsx`):** Prevent unstable object-literal selector re-render loops (`useShallow`).
2. **Co-Equal Dual-Layout Testing:**
   - Every UI change must be covered in both Mobile (`src/components/views/__tests__/`) and Desktop (`src/components/layout/desktop/views/__tests__/`) tests, plus Playwright E2E/visual regression checks (`e2e/visual-audit.spec.ts`) when layouts or themes change.
3. **Zero `act(...)` Warnings & Clean Test Hygiene (`HIGH-13`):**
   - Async state updates, debounces, and effects inside tests must be cleanly awaited or wrapped in `waitFor`/`act` so `npm run test` produces zero React `act(...)` console warnings.
   - Never weaken assertions, skip failing tests, or mock away broken contracts to make a suite pass.

---

## 5. Execution Workflow for Agents

- After making logical or UI changes, the agent must run:
  ```bash
  npm run test
  ```
- Before finishing any task, verify the full triad cleanly exits `0`:
  ```bash
  npm run lint && npx tsc -b && npm run test
  ```
- If only specific areas were touched during iterative development, targeted Vitest runs (e.g. `npx vitest run src/lib/calculations`) are fine, provided the full suite runs before completion.
