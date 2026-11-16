# Rule 04: TypeScript & Code Quality Standards

## Context & Objectives
To ensure long-term stability and prevent runtime failures, SmartShopping enforces strict typing and modular architecture across all frontend code.

---

## 1. Strict Typing Principles

1. **Zero `any` Policy (`HIGH-04`):**
   - The use of `any` is strictly prohibited across source and test files.
   - All `catch` blocks must type errors as `catch (err: unknown)` and narrow safely (`err instanceof Error`) instead of `catch (err: any)`.
   - Use `unknown` with explicit type guards when dealing with untyped external data or JSON imports.
2. **Supabase Schema Source of Truth:**
   - All database entity models must derive from `src/types/supabase.ts`.
   - Use Supabase helper types:
     ```typescript
     import { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';

     export type Product = Tables<'products'>;
     export type Meal = Tables<'meals'>;
     export type ShoppingListItem = Tables<'shopping_list_items'>;
     ```
3. **UI / Domain View Models:**
   - Extend base table types when creating joined or extended representations:
     ```typescript
     export interface ProductWithCategory extends Product {
       category?: Tables<'product_categories'> | null;
     }
     ```
4. **React Fast Refresh Export Discipline:**
   - Never export non-component values (CVA variants, React `createContext` instances, constants, hooks, or helper functions) from `.tsx` component files. Keep them in dedicated `.ts` modules (e.g., `badge.variants.ts`, `ThemeContextInstance.ts`, `authContextDef.ts`).

---

## 2. Code Modularity, i18n & Domain Calculation Invariants

1. **Cohesive File Size & Single Responsibility (Soft Guideline ~300–550 lines):**
   - Keep components and modules focused on a single cohesive domain responsibility (`HIGH-12`, `NORM-17`).
   - Do NOT split a clean, single-responsibility module artificially just to satisfy an arbitrary line count; treat `~450–550` lines as a soft signal to evaluate decomposition when a file mixes distinct concerns:
     - Extract presentational subcomponents into `src/components/<domain>/` or `src/components/ui/`.
     - Extract view state and side effects into custom controller hooks (`src/hooks/use*Controller.ts`).
     - Extract pure math, validation, or transformations into `src/lib/calculations/`.
   - **DRY Across Dual Layouts:** Mobile (`src/components/views/`) and Desktop (`src/components/layout/desktop/views/`) counterparts must share controller hooks and domain subcomponents rather than duplicating business logic.
2. **Pure Functions for Business Logic & Safe Precision:**
   - Algorithms (macro scaling, aggregation, store sorting, calendar statuses, pantry deduction, kitchen units, weekly templates) must be pure, stateless functions in `src/lib/calculations/` with 100% unit test coverage.
   - **Hierarchical Macros (`ADR-010`):** Always resolve ingredient macros via `resolveEffectiveIngredientMacros` (`src/lib/calculations/macroCalculations.ts`) so general (`is_general`) products route nutrition through their reference variant.
   - **Kitchen Units (`LOW-11`):** Convert household units (`tbsp`, `tsp`, `cup`, `pinch`, `dag`, `kg`, `l`) to canonical base units (`g`, `ml`, `pcs`) via `convertKitchenUnitToBaseQuantity` (`src/lib/calculations/kitchenUnits.ts`).
   - **Decimal Editing (`LOW-04`):** Use `parseFloat` (never `parseInt`) for quantities so fractional amounts remain valid.
   - **Local Timezone Date Math (`NORM-11`):** **FORBIDDEN** to call `new Date().toISOString().split('T')[0]` for calendar dates (UTC drift causes off-by-one day bugs near midnight). Always use `getLocalDateISOString`, `formatLocalDateISO`, and `addDaysISO` from `src/lib/utils.ts`.
3. **100% i18n Purity (`PL` & `EN`):**
   - **Zero hardcoded UI strings** in components, dialogs, error toasts, or validation helpers.
   - Every new translation key must be added symmetrically to both `src/i18n/locales/pl.ts` and `src/i18n/locales/en.ts`.
   - Seeded/global DB categories or slugs displayed in the UI must be mapped through `t(...)` localization helpers rather than rendered as raw English/internal slugs.

---

## 3. Error Handling & User Feedback

1. **No Silent Failures:**
   - Catch blocks must handle errors properly: log for debugging (`console.error` / service error helper) and display user-friendly localized notifications (`useToastStore`).
2. **Graceful Loading & Empty States:**
   - Every view must provide clean skeleton loaders or spinners during initial load and localized empty state illustrations/prompts when lists have no items.
3. **Quality Gates:**
   - Before completing any task, verify:
     - `npm run lint` (`oxlint` — 0 errors, 0 warnings)
     - `npx tsc -b` (strict TypeScript compiler check — 0 errors)
     - `npm run test` (Vitest unit & integration suites — 100% pass)
