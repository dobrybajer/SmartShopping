# Rule 06: Living Documentation & Architecture Decision Records (ADRs)

## Context & Objectives
To prevent architectural drift and knowledge loss, documentation in SmartShopping is treated as living code.

---

## 1. Documentation Synchronization

1. **Continuous Updates:**
   - Whenever an architectural change or significant feature is added, the agent **MUST** update:
     - `docs/PRD.md` (Product Requirements Document)
     - `docs/plan.md` (Implementation roadmap and completion status)
2. **No Monolithic Bloat:**
   - Instead of continuously bloating single documents with non-standard patterns, create dedicated Architectural Decision Records in `docs/adr/`.

---

## 2. Deep-Dive ADR Authoring Methodology

When drafting new ADRs, execute the exhaustive deep-dive framework defined in [.agents/skills/deep-dive-adr/SKILL.md](../skills/deep-dive-adr/SKILL.md).

### 2.1 The 8-Dimension Probing Process
Before finalizing any ADR, the agent and contributor must rigorously probe:
1. **User Flows & UX Duality:** Full alignment between Mobile PWA (one-handed thumb zone, 44x44px, bottom sheets, swipe gestures, haptics) and Desktop (sidebar, header, centered dialogs, keyboard shortcuts, multi-column tables).
2. **Edge Cases & Corner Scenarios:** Offline behavior in supermarket aisles, simultaneous multi-device family edits, boundary limits, and network drop recovery.
3. **Data Model & Supabase RLS:** Schema structure, foreign key cascading, and strict household multi-tenancy policies via `public.get_user_household_ids(auth.uid())`.
4. **State Management & Optimistic UI:** Zustand state transitions, background PostgREST updates, and automatic rollback on network failure.
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