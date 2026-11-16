# Rule 06: Living Documentation & Architecture Decision Records (ADRs)

## Context & Objectives
To prevent architectural drift and knowledge loss, documentation in SmartShopping is treated as living code.

---

## 1. Documentation Synchronization

1. **Continuous Updates & Drift Prevention (Same-Turn Rule):**
   - Documentation updates MUST happen in the **same task/turn** as code or database schema changes — never deferred "for later".
   - Whenever an architectural pattern, schema migration, UI module, or significant feature is added or changed, the agent **MUST** synchronize:
     - `docs/PRD.md` — functional requirements, exact SQL DDL (`CREATE TABLE` / `ALTER TABLE` / constraints matching `supabase/migrations/`), and user flows.
     - `docs/plan.md` — implementation phase status, components, stores, and verification outcomes.
     - `docs/Roadmap.md` — mark completed backlog items (`✅ Zrealizowane`), add verification file/test links, update Section 7 Gantt + summary table, and register any newly deferred technical debt without duplicate IDs.
     - `docs/testing.md` — keep all 10+ module test specs (`TC-...`), `[BASE]`/`[TEMP]` data matrix, `[Playwright: E2E]`/`[Playwright: Mock/Route]`/`[Manual]` annotations, Happy Path / Corner Case / Negative / Dual Layout / `PL`&`EN` expectations, and Section 3.2 selective regression table synchronized with every modified module or new feature.
     - `README.md` — feature overview, current tech stack versions matching `package.json`, and valid links to every file in `docs/adr/`.
2. **Mandatory Documentation Sync Checklist:**
   - Schema changed (`supabase/migrations/*` or `src/types/supabase.ts`)? -> Verify `docs/PRD.md` DDL and Section 3 (`RLS`) match 1:1.
   - New or modified feature / module? -> Verify `docs/PRD.md` functional specs, `docs/plan.md` phase checklist, `docs/testing.md` (`TC-...` test cases, `[BASE]`/`[TEMP]` state, Playwright annotations, and Section 3.2 selective regression mapping), and `README.md` features list match implementation.
   - New ADR authored? -> Verify `README.md` ADR registry link points to the exact filename in `docs/adr/` and follows `.agents/skills/deep-dive-adr/SKILL.md`.
   - New rule or invariant discovered? -> Verify `AGENTS.md` (including its 10-Point Pre-Completion Self-Audit Checklist) and the relevant `.agents/rules/01..06` stay consistent without contradictions.
3. **No Monolithic Bloat:**
   - Instead of continuously bloating single documents with non-standard patterns, create dedicated Architectural Decision Records in `docs/adr/`.

---

## 2. Deep-Dive ADR Authoring Methodology

When drafting new ADRs, execute the exhaustive deep-dive framework defined in [.agents/skills/deep-dive-adr/SKILL.md](../skills/deep-dive-adr/SKILL.md).

### 2.1 The 8-Dimension Probing Process
Before finalizing any ADR, the agent and contributor must rigorously probe:
1. **User Flows & UX Duality:** Full alignment between Mobile PWA (one-handed thumb zone, 44x44px, bottom sheets, swipe gestures, haptics) and Desktop (sidebar, header, centered dialogs, keyboard shortcuts, multi-column tables).
2. **Edge Cases & Corner Scenarios:** Offline behavior in supermarket aisles, simultaneous multi-device family edits, boundary limits, and network drop recovery.
3. **Data Model & Supabase RLS:** Schema structure, foreign key cascading, and strict household multi-tenancy policies via `public.get_user_household_ids(auth.uid())`.
4. **State Management & Optimistic UI:** Zustand state transitions, background PostgREST updates, offline queuing (`offlineMutationQueue`), and error rollback with Toast feedback on failure.
5. **Performance & Latency:** Indexing strategy, query optimization, and bundle impact.
6. **Industry & Market Standards:** Benchmarks against market leaders (AnyList, Paprika, Whisk, Todoist, Cronometer).
7. **Failure Modes & Telemetry:** User-facing notifications (Toasts/Alerts) and error recovery.
8. **Business Intent:** Make sure user intent is fully understood and make sense compared to whole application.

### 2.2 ADR File Naming & Location
- Location: `docs/adr/ADR-XXX-<short-name>.md` (e.g. `ADR-001-dual-layout-architecture.md`).
- Language: **English**.

---

## 3. ADR Registry

| ADR | Title | Status |
| :--- | :--- | :--- |
| [ADR-001](../../docs/adr/ADR-001-dual-layout-architecture.md) | Dual Layout Architecture (Desktop Split & Mobile PWA) | Accepted |
| [ADR-002](../../docs/adr/ADR-002-state-and-realtime-architecture.md) | State Management, Services & Realtime Optimistic UI | Accepted |
| [ADR-003](../../docs/adr/ADR-003-internationalization-i18n.md) | Internationalization (i18n) Strategy, Codebase English Purity & Multi-Tier Persistence | Accepted |
| [ADR-004](../../docs/adr/ADR-004-theme-system-and-visual-styling.md) | Theme System, Semantic Design Tokens & Multi-Tier Visual Customization | Accepted |
| [ADR-005](../../docs/adr/ADR-005-multiple-active-shopping-lists.md) | Multiple Concurrent Active Shopping Lists & Smart Cart Transfer Architecture | Accepted |
| [ADR-006](../../docs/adr/ADR-006-custom-product-categories-and-aisle-sorting.md) | Custom Product Categories, Household Overrides & Store Aisle Sorting | Accepted |
| [ADR-007](../../docs/adr/ADR-007-multiplatform-web-push-notifications.md) | Multiplatform Web Push Notifications & Extensible Event Registry | Accepted |
| [ADR-008](../../docs/adr/ADR-008-pantry-management-and-inventory-sync.md) | Household Pantry Management, Real-Time Inventory Sync & Cross-List Freshness Intelligence | Accepted |
| [ADR-009](../../docs/adr/ADR-009-meal-planning-and-calendar-module.md) | Meal Planning & Calendar Module (Multi-View Scheduling & Shopping Pipeline Synchronization) | Accepted |
| [ADR-010](../../docs/adr/ADR-010-hierarchical-product-catalog-and-smart-nutrition-routing.md) | Two-Level Hierarchical Product Catalog, Dynamic Nutrition Routing & Multi-Tier Pantry Intelligence | Accepted |