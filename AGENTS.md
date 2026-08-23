# SmartShopping Project Constitution & Agent Harness

Welcome to **SmartShopping**. This document serves as the **Single Source of Truth** and primary constitution for all AI agents (Antigravity/Gemini, Claude Code, Cursor, Copilot, Windsurf) and human contributors working on this codebase.

Every subsequent prompt and interaction MUST adhere to the principles, architectural decisions, coding standards, and security protocols outlined here and in the modular rules within `.agents/rules/`.

---

## 1. Project Overview & Core Vision

**SmartShopping** is a Progressive Web Application (PWA) designed for modern household meal planning, macro tracking, and real-time synchronized grocery shopping.

- **Stack:**
  - **Frontend:** React 19, TypeScript (Strict Mode), Vite, Tailwind CSS (True Black `#000000` OLED optimized), shadcn/ui (Radix UI primitives), Lucide React icons.
  - **State Management:** Zustand for global reactive state, local optimistic mutations, and real-time subscription synchronization.
  - **Backend & Auth:** Supabase (PostgreSQL, PostgREST API, GoTrue Google OAuth, Realtime WebSockets).
  - **Testing:** Vitest + React Testing Library (`jsdom`).
  - **Code Quality:** oxlint, TypeScript compiler (`tsc -b`).

---

## 2. Core Architectural Pillars

### 2.1 Co-Equal Dual Layout (Desktop & Mobile)
- The application natively supports two first-class viewing modes:
  1. **Mobile PWA Mode:** Bottom navigation bar, bottom sheets (`Sheet`), swipe gestures (`SwipeToDismiss`), one-handed thumb-zone UX (min. 44x44px touch targets), haptic feedback (`navigator.vibrate(50)`).
  2. **Desktop Mode:** Left sidebar (`DesktopSidebar`), header (`DesktopHeader`), centered modal dialogs (`Dialog`), keyboard shortcuts, rich multi-column data views.
- **Rule:** Every new feature, screen, or modification **MUST** be implemented and tested across BOTH Mobile and Desktop layouts simultaneously. See [.agents/rules/01-architecture-dual-layout.md](./.agents/rules/01-architecture-dual-layout.md).

### 2.2 State, Services & Realtime Optimistic UI
- **Strict Data Flow:** `UI Component` -> `Zustand Store / Service` -> `Supabase API` + `Realtime WebSockets`.
- **Forbidden:** UI components must **NEVER** import the Supabase client directly to execute CRUD queries.
- **Optimistic UI:** Checkbox toggle in active grocery list immediately updates UI visually (`line-through text-gray-500`) and dispatches async update in the background with automatic rollback on network failure.
- See [.agents/rules/02-state-services-realtime.md](./.agents/rules/02-state-services-realtime.md).

### 2.3 Row Level Security (RLS) & Multi-Tenant Household Isolation
- Every database table in Supabase MUST have `ENABLE ROW LEVEL SECURITY` active with dedicated SELECT, INSERT, UPDATE, and DELETE policies scoped via `public.get_user_household_ids(auth.uid())`.
- Never execute unsecured table creation or bypass household filtering.
- See [.agents/rules/03-supabase-rls-security.md](./.agents/rules/03-supabase-rls-security.md).

### 2.4 Strict TypeScript & Modular Code Quality
- **Zero Tolerance for `any`:** All database models must reference `src/types/supabase.ts`. Domain view models are typed by extending database types.
- **Modular Component Limit:** Keep components focused and avoid monolithic files (guideline: <250-300 lines). Extract custom hooks (`src/hooks/`) and subcomponents (`src/components/ui/` or view subcomponents).
- See [.agents/rules/04-typescript-code-quality.md](./.agents/rules/04-typescript-code-quality.md).

### 2.5 Comprehensive User Flow Testing & Verification
- When introducing or modifying features, agents must brainstorm and cover all realistic **User Flows** with unit/integration tests using Vitest and React Testing Library.
- Calculations (macro scaling, grocery list item aggregation, store aisle sorting) must be implemented as pure functions in `src/lib/calculations/` and thoroughly unit-tested.
- See [.agents/rules/05-testing-and-user-flows.md](./.agents/rules/05-testing-and-user-flows.md).

### 2.6 Living Documentation & Deep-Dive ADRs
- Documentation in `docs/PRD.md` and `docs/plan.md` must be kept up to date after every significant architectural change.
- New architectural patterns must be drafted using the interactive, edge-case probing methodology defined in [.agents/skills/deep-dive-adr/SKILL.md](./.agents/skills/deep-dive-adr/SKILL.md) and recorded in `docs/adr/ADR-XXX-<name>.md`.
- See [.agents/rules/06-documentation-and-adrs.md](./.agents/rules/06-documentation-and-adrs.md).

---

## 3. Mandatory AI Agent Workflow & Guardrails

When executing tasks on this repository, all AI agents must follow this standard operating procedure:

1. **Planning First:** For any task spanning more than a single trivial fix or touching multiple files, propose a clear, concise implementation plan before making modifications.
2. **Quality Gates Check:** Before concluding any task, run:
   - `npm run test` (Vitest unit & flow test suites)
   - `npm run lint` (oxlint)
   - `npx tsc -b` (TypeScript strict typecheck)
3. **Transparent Reporting:** If any automatic code simplification, refactoring, or cleanup was performed, explicitly document it in a dedicated summary section entitled `### AUTOMATIC IMPROVEMENTS` (`USPRAWNIENIA AUTOMATYCZNE`).
4. **Preserve Business Logic:** Never silently delete or simplify existing business rules (macro math, RLS queries, optimistic rollback handling) without explicit confirmation.

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

