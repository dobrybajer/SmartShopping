# Rule 02: State Management, Services & Realtime Sync

## Context & Objectives
SmartShopping relies on real-time multi-user synchronization (household members shopping simultaneously) combined with instant local feedback (optimistic UI) and offline resilience.

---

## 1. Architectural Data Flow

```
+----------------------------------------------------------------+
|                        UI Components                          |
|             (Mobile Views & Desktop Views)                     |
+-------------------------------+--------------------------------+
                                | Calls store actions or services
                                v
+----------------------------------------------------------------+
|                    Zustand Store (`src/store/`)                |
|  - Immediate Optimistic State Update                           |
|  - Error Rollback on Failure                                   |
|  - State Cache (Draft, Active List, Meals, Products)           |
+-------------------------------+--------------------------------+
                                | Invokes Service Layer
                                v
+----------------------------------------------------------------+
|                  Service Layer (`src/services/`)               |
|  - `householdService.ts`      - `mealService.ts`               |
|  - `productService.ts`        - `shoppingListService.ts`       |
|  - Formats payloads, injects household context, handles errors |
+-------------------------------+--------------------------------+
                                | PostgREST & WebSocket Channel
                                v
+----------------------------------------------------------------+
|                    Supabase Backend (BaaS)                     |
|  - PostgreSQL Database with Row Level Security (RLS)           |
|  - Realtime WebSocket Channel (`shopping_list_items`)          |
+----------------------------------------------------------------+
```

---

## 2. Core Rules & Guidelines

1. **No Direct Supabase in UI or React Contexts (`NORM-07`):**
   - UI components, custom controller hooks, and React Contexts (`AuthContext`, `ThemeContext`) must **NEVER** import `@/lib/supabase` directly to execute `.from('...').select/insert/update/delete` or `.rpc()`.
   - All backend calls must live in domain service modules under `src/services/` (sub-modules under `src/services/<domain>/` for complex domains like `shoppingList/`) and be invoked via Zustand stores or service facades.

2. **Optimistic Updates, Offline Queue (`CRIT-01`), & OCC (`CRIT-02`):**
   - For high-frequency user actions (toggling `is_checked`, inline/stepper quantity edits on active lists):
     1. Register local mutation echo (`trackLocalItemMutation` / `trackLocalListMutation`) and update Zustand state instantly (`line-through`).
     2. If offline (`!navigator.onLine`) or a network request fails, **DO NOT roll back checkoffs** — enqueue into `offlineMutationQueue` (`src/lib/offline/offlineMutationQueue.ts`) so `useOfflineSync` flushes sequentially on `'online'` and displays the Offline pending indicator (`pendingCount`) instead of a false Realtime badge.
     3. Include client `updated_at` in `toggleItemChecked` and resolve conflicts via `shoppingItemConflict.ts` (`is_checked = true` wins over stale payloads).
   - For non-offline CRUD operations (recipe creation/editing, meal planning, pantry verification), catch errors, roll back optimistic state, and surface a clear Toast error (never swallow errors silently).

3. **Realtime WebSocket Subscriptions & Echo Suppression (`HIGH-06`, `NORM-09`):**
   - Active lists, pantry items, meal plans, and household category settings subscribe to Supabase Realtime updates so partners stay synchronized in real time.
   - Apply targeted incremental diff updates where available and check `isLocalMutationTracked()` before accepting self-triggered WebSocket echoes so phones never refetch full lists unnecessarily or vibrate twice.

4. **Zustand Selectors (`HIGH-05`) & O(1) Render Lookups (`MED-15`):**
   - Always use atomic Zustand selectors or wrap multi-field selectors in `useShallow` (`zustand/react/shallow`):
     ```typescript
     const { activeList, isLoading } = useShoppingStore(
       useShallow((state) => ({ activeList: state.activeList, isLoading: state.isLoading }))
     );
     ```
   - Never run nested `array.find()` or `array.filter()` inside component render loops (such as `DayCalendarView` ingredients or `MonthCalendarGrid` cells). Use O(1) pre-indexed store maps (`pantryMapByProductId`, `pantryItemsByParentId`) and `useMemo(() => new Map(...))`.

5. **Zero Sequential N+1 Loops, Bounded Fetches & Transactional RPCs (`MED-06`, `MED-14`):**
   - **FORBIDDEN:** Calling `await supabase...` or `await someService.create...()` sequentially inside a `for (...)` loop (e.g., applying weekly templates, JSON recipe batch import, pantry batch ingest, transferring items). Use single batch `.insert(rows)` / `.upsert(rows)` queries, bounded `Promise.all` batches, or atomic PostgreSQL `SECURITY DEFINER` RPCs (`archive_shopping_list`).
   - **Bounded Queries:** Calendar fetches (`mealPlanService.getMealPlans`) and Realtime reloads MUST pass `startDate` and `endDate` windows matching the active range, and archive/history fetches (`getHistoryLists`) MUST paginate with `.limit()`.

6. **Multi-Device Persistence (`MED-17`):**
   - Features scoped to a household (e.g., weekly meal templates, category aisle order, active lists) MUST be stored in Supabase with RLS and Realtime sync. `localStorage` may be used only as an offline read/write cache or for explicit device-local UI state, with graceful handling of `QuotaExceededError`.

7. **Cross-Store Domain Invariants (`HIGH-09`, `HIGH-11`, `MED-16`):**
   - **`in_pantry` Parity:** Active list items with `in_pantry = true` count as already satisfied alongside `is_checked = true` in active list counters, `LIST_COMPLETED` push notification checks (`i.is_checked || i.in_pantry`), archiving, and calendar status evaluation.
   - **Draft Cart Aggregation & Pipeline Links:** Any bulk insertion into Draft (from Cookbook, Calendar Day/Week transfers, or unchecked items returned from `archiveActiveList`) MUST route through `addMultipleToDraft` (never raw array concatenation) and preserve `meal_plan_item_id`.
   - **Complete Calendar Pipeline Inputs:** All views calling `calculateMealPlanStatus` (`DayCalendarView`, `WeekCalendarView`, `MonthCalendarGrid`) MUST supply `{ pantryItems, draftItems, activeListItems, archivedListItems, isPastDate }` and use cumulative pantry reservation across the displayed day/week where stock is limited.
