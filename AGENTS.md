# SmartShopping Project Constitution & Agent Harness

Welcome to **SmartShopping**. This document serves as the **Single Source of Truth** and primary constitution for all AI agents (Antigravity/Gemini, Claude Code, Cursor, Copilot, Windsurf) and human contributors working on this codebase.

Every subsequent prompt and interaction MUST adhere to the principles, architectural decisions, coding standards, and security protocols outlined here and in the modular rules within `.agents/rules/`.

---

## 1. Project Overview & Core Vision

**SmartShopping** is a Progressive Web Application (PWA) designed for modern household meal planning, macro tracking, and real-time synchronized grocery shopping.

- **Stack:**
  - **Frontend:** React 19, TypeScript 6.0 (Strict Mode), Vite 8.2, Tailwind CSS (6 motywów opartych o semantyczne zmienne CSS z domyślnym True Black OLED `oled-black`), shadcn/ui (Radix UI primitives), Lucide React icons.
  - **State Management:** Zustand for global reactive state, local optimistic mutations, Offline Mutation Queue (`localStorage`), and real-time subscription synchronization.
  - **Backend & Auth:** Supabase (PostgreSQL, PostgREST API, GoTrue Google OAuth, Realtime WebSockets, Edge Functions).
  - **Testing:** Vitest + React Testing Library (`jsdom`) + Playwright (E2E Visual/RWD audit).
  - **Code Quality:** oxlint, TypeScript compiler (`tsc -b`).

---

## 2. Core Architectural Pillars

### 2.1 Co-Equal Dual Layout, RWD & 6-Theme Semantic Styling
- The application natively supports two first-class viewing modes across 3 validated viewport tiers (`360px` Mobile, `768px–1023px` Tablet, `1440px` Desktop):
  1. **Mobile PWA Mode:** Bottom navigation bar (`BottomNavigation`), bottom sheets (`Sheet`), swipe gestures (`SwipeToDismiss`), one-handed thumb-zone UX (min. `44x44px` touch targets on all action buttons, steppers, and modal/card icons), haptic feedback (`navigator?.vibrate?.(50)`).
  2. **Desktop Mode:** Left sidebar (`DesktopSidebar`), header (`DesktopHeader`), centered modal dialogs (`Dialog`), keyboard shortcuts (`Ctrl+Alt+P`, `Esc`, `Enter`), rich multi-column data views.
- **Rules:**
  - Every new feature, screen, or modification **MUST** be implemented and tested across BOTH Mobile and Desktop layouts simultaneously (including Tablet breakpoints).
  - Use **ONLY semantic CSS design tokens** (`bg-background`, `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `bg-primary`) and adaptive badge pairs (`text-*-600 dark:text-*-400`) — NEVER hardcode `bg-black`/`bg-zinc-*`/`text-zinc-*` (which break `clean-light` contrast).
  - Every destructive action (deleting a meal, planned meal, weekly template, shopping list, or item) MUST require confirmation via `ConfirmDeleteDialog` / dedicated delete modal.
  - Keep a single `<h1>` per view and avoid duplicating `<main>` container padding inside view components.
- See [.agents/rules/01-architecture-dual-layout.md](./.agents/rules/01-architecture-dual-layout.md).

### 2.2 State, Services, Offline Queue, OCC & Realtime Sync
- **Strict Data Flow:** `UI Component` -> `Controller Hook` -> `Zustand Store / Service` -> `Supabase API` + `Realtime WebSockets`.
- **Forbidden:** UI components and React Contexts must **NEVER** import the Supabase client directly to execute CRUD queries.
- **Optimistic UI, Offline & Concurrency:**
  - High-frequency mutations (toggling `is_checked`, quantity edits) update UI immediately (`line-through text-muted-foreground`), record local mutation echo (`trackLocalItemMutation` / `trackLocalListMutation`), include OCC `updated_at` verification, and enqueue into `offlineMutationQueue` on network loss instead of rolling back ticks.
- **Query & Render Performance:**
  - Always select Zustand slices with `useShallow`; use O(1) lookup maps (`pantryMapByProductId`, `pantryItemsByParentId`, `useMemo` `Map`) instead of `.find()`/`.filter()` inside render loops.
  - **Zero N+1 & Bounded Fetches:** Never loop `for (...) { await supabase... }` — use batch `.insert(rows)` / `.upsert()` or transactional RPCs (`archive_shopping_list`). Calendar and history queries MUST use `startDate`/`endDate` windows or `.limit()`.
  - Shared household data (recipes, plans, lists, pantry, aisle order, weekly templates) MUST persist in Supabase (with `localStorage` only as an offline cache), never `localStorage`-only.
- **Domain Pipeline Invariants:**
  - Treat `in_pantry = true` consistently as satisfied across list counters, `LIST_COMPLETED` notifications, archiving, and calendar tracking.
  - Adding multiple items back to Draft (including unchecked items returned from archiving and batch week transfers) MUST use `addMultipleToDraft` and preserve `meal_plan_item_id`.
  - All calendar views (`DayCalendarView`, `WeekCalendarView`, `MonthCalendarGrid`) MUST pass `{ pantryItems, draftItems, activeListItems, archivedListItems, isPastDate }` to `calculateMealPlanStatus`.
- See [.agents/rules/02-state-services-realtime.md](./.agents/rules/02-state-services-realtime.md).

### 2.3 Row Level Security (RLS), PostgREST & Multi-Tenant Isolation
- Every database table in Supabase MUST have `ENABLE ROW LEVEL SECURITY` active with explicit `SELECT`, `INSERT`, `UPDATE`, `DELETE` policies scoped via `public.get_user_household_ids(auth.uid())`, plus B-tree indexes on FK/RLS columns and `CHECK` constraints for non-negative numbers and bounded text lengths.
- **UI ↔ RLS Parity (`HIGH-08`):** Ordinary `authenticated` users cannot create or modify `Global` (`household_id IS NULL`) meals/products. Never expose broken `Global` creation toggles in user forms unless backed by trusted admin roles.
- **Cross-Row FK Tenant Isolation & PostgREST Safety:** Validate `parent_id` / `reference_product_id` in SQL `WITH CHECK`; always run `isUuid()` before interpolating any ID into `.or(...)`; always use explicit FK disambiguation (`table!fkey_name(*)`) when multiple FKs connect the same two tables.
- Every `SECURITY DEFINER` RPC and Edge Function MUST explicitly verify `auth.uid()` membership in `household_members`, set `SET search_path = public`, `REVOKE ALL FROM PUBLIC, anon`, and validate input bounds / relative URLs. Every SQL migration must pass `src/lib/__tests__/rlsSecurityAudit.test.ts`.
- See [.agents/rules/03-supabase-rls-security.md](./.agents/rules/03-supabase-rls-security.md).

### 2.4 Strict TypeScript, i18n Purity & Modular Code Quality
- **Zero Tolerance for `any` & Unwrapped Exports:** Never use `any` (use `unknown` in `catch` blocks and type guards for JSON/PostgREST rows). Component files must only export React components to keep Vite Fast Refresh intact.
- **Complete i18n Purity (`ADR-003`):** Zero hardcoded Polish or English strings in JSX, hooks, or `src/lib/calculations/`. Update BOTH `pl.ts` and `en.ts` symmetrically (`i18n.test.ts`), and translate all DB category/meal slugs via `t(...)`.
- **Correct Domain Math & Local Dates:** Always use local calendar helpers (`getLocalDateISOString`, `formatLocalDateISO`, `addDaysISO` in `src/lib/utils.ts` — never `toISOString().split('T')[0]`), hierarchical/reference nutrition (`resolveEffectiveIngredientMacros`), kitchen unit conversion (`kitchenUnits.ts`, `convertKitchenUnitToBaseQuantity`), and allow decimals (`parseFloat`) where recipes/units produce fractional amounts.
- **Modular File Size Limit (< 250–300 lines):** Before extending any file near 250–300 lines, proactively extract controller hooks (`src/hooks/`), pure functions (`src/lib/calculations/`), domain service sub-modules (`src/services/<domain>/`), and subcomponents.
- See [.agents/rules/04-typescript-code-quality.md](./.agents/rules/04-typescript-code-quality.md).

### 2.5 Comprehensive User Flow Testing & Verification
- Cover both **Mobile** (`src/components/views/__tests__/`) and **Desktop** (`src/components/layout/desktop/views/__tests__/`) User Flows in Vitest + React Testing Library with **zero `act(...)` warnings**.
- Pure calculations live in `src/lib/calculations/` with exhaustive unit tests.
- All cross-cutting regression suites (`rlsSecurityAudit.test.ts`, `wcagContrast.test.ts`, `i18n.test.ts`, `zustandSelectors.test.tsx`) must remain green.
- See [.agents/rules/05-testing-and-user-flows.md](./.agents/rules/05-testing-and-user-flows.md).

### 2.6 Living Documentation & Deep-Dive ADRs
- Documentation in `docs/PRD.md`, `docs/plan.md`, `docs/Roadmap.md`, and `README.md` must stay synchronized with every feature, fix, table, or column change.
- New architectural patterns must be drafted using [.agents/skills/deep-dive-adr/SKILL.md](./.agents/skills/deep-dive-adr/SKILL.md) and recorded in `docs/adr/ADR-XXX-<name>.md`.
- See [.agents/rules/06-documentation-and-adrs.md](./.agents/rules/06-documentation-and-adrs.md).

---

## 3. Mandatory AI Agent Workflow & Guardrails

When executing tasks on this repository, all AI agents must follow this standard operating procedure:

1. **Planning First:** For any task spanning more than a single trivial fix or touching multiple files, propose a clear, concise implementation plan before making modifications.
2. **Pre-Completion Self-Audit Checklist (10-Point Definition of Done):**
   Before marking ANY feature or fix complete, verify every point below against your diff:
   1. **Dual Layout & Touch/RWD:** Implemented identically for Mobile (`<1024px`), Tablet (`768px–1023px`), and Desktop (`>=1024px`); buttons >= `44x44px`; destructive actions use `ConfirmDeleteDialog`.
   2. **6-Theme Semantic Contrast:** Uses CSS variables + `dark:` adaptive classes only (tested in `wcagContrast.test.ts`); no hardcoded `zinc-*` or `#000000` classes.
   3. **100% i18n Symmetry:** Zero hardcoded Polish/English copy in components, hooks, or calculations; `pl.ts` and `en.ts` match; DB slugs translated via `t(...)`.
   4. **Domain Pipeline Parity:** `in_pantry`, `meal_plan_item_id`, `addMultipleToDraft`, calendar statuses (`activeListItems` / `archivedListItems`), hierarchical pantry (`ADR-010`), fractional quantities, and `kitchenUnits.ts` preserved cleanly end-to-end.
   5. **Offline, Realtime & Concurrency:** Optimistic updates keep offline resilience (`offlineMutationQueue`), echo tracking, OCC (`updated_at`), and user-visible error Toasts (no silent catch/if failures).
   6. **Performance & Scalability:** `useShallow` Zustand selectors, O(1) maps in render loops, zero `for ... await` N+1 DB loops, bounded date windows / `.limit()`.
   7. **Security, RLS & UI Parity:** RLS on new tables (`rlsSecurityAudit.test.ts`), `isUuid()` before `.or()`, explicit PostgREST FK joins, `CHECK` constraints, Edge Function input validation, and no client UI toggles that attempt RLS-forbidden `Global` writes.
   8. **Strict Typing & Modularity:** Zero `any` (use `unknown`), Fast Refresh compliant exports, local date math (`getLocalDateISOString` / `formatLocalDateISO`), and edited files kept `< 250–300` lines.
   9. **Documentation Sync:** Updated `docs/PRD.md` (DDL + business spec), `docs/plan.md`, `docs/Roadmap.md` (status + links), and `README.md` when affected.
   10. **Quality Gates:** Run `npm run test`, `npm run lint`, and `npx tsc -b` cleanly with `0` failures, `0` warnings, and `0` `act(...)` noise.
3. **Quality Gates Check:** Before concluding any task, run:
   - `npm run test` (Vitest unit & flow test suites)
   - `npm run lint` (oxlint)
   - `npx tsc -b` (TypeScript strict typecheck)
4. **Transparent Reporting:** If any automatic code simplification, refactoring, or cleanup was performed, explicitly document it in a dedicated summary section entitled `### AUTOMATIC IMPROVEMENTS` (`USPRAWNIENIA AUTOMATYCZNE`).
5. **Preserve Business Logic:** Never silently delete or simplify existing business rules (macro math, RLS queries, optimistic rollback handling) without explicit confirmation.

---

## 4. Quick Rule & Skill Index

| Resource File | Type | Scope |
| :--- | :--- | :--- |
| [.agents/rules/01-architecture-dual-layout.md](./.agents/rules/01-architecture-dual-layout.md) | Rule | Mobile PWA, Desktop Layout, Tailwind True Black, Breakpoints |
| [.agents/rules/02-state-services-realtime.md](./.agents/rules/02-state-services-realtime.md) | Rule | Zustand stores, Service layer, Optimistic UI & WebSockets |
| [.agents/rules/03-supabase-rls-security.md](./.agents/rules/03-supabase-rls-security.md) | Rule | PostgreSQL schemas, RLS policies, household multi-tenancy |
| [.agents/rules/04-typescript-code-quality.md](./.agents/rules/04-typescript-code-quality.md) | Rule | Strict typing, code modularity, error handling & toasts |
| [.agents/rules/05-testing-and-user-flows.md](./.agents/rules/05-testing-and-user-flows.md) | Rule | Vitest, React Testing Library, complete UI User Flows |
| [.agents/rules/06-documentation-and-adrs.md](./.agents/rules/06-documentation-and-adrs.md) | Rule | PRD sync, implementation plan updates, Deep-Dive ADR drafting |
| [.agents/skills/deep-dive-adr/SKILL.md](./.agents/skills/deep-dive-adr/SKILL.md) | Skill | Interactive 8-Dimension ADR probing & exhaustive authoring |

