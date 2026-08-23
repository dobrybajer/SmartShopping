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

All business-critical algorithms must maintain complete test coverage:
1. **Calorie & Macro Proportional Scaling:**
   - Base recipe grams * (Target calories / Base recipe calories).
2. **Grocery Aggregation:**
   - Combining identical `product_id` occurrences from different meals into a single summed shopping item.
3. **Store Aisle Sorting:**
   - Ordering items strictly by `product_categories.sort_order`.

---

## 4. Execution Workflow for Agents

- After making logical or UI changes, the agent must run:
  ```bash
  npm run test
  ```
- If only specific areas were touched, run targeted tests (e.g. `npx vitest run src/lib/calculations`).
