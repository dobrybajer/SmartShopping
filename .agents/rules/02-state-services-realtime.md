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

1. **No Direct Supabase in UI:**
   - UI components must **NEVER** import `supabase` directly to execute `.from('...').select/insert/update/delete`.
   - All mutations and data fetches must go through dedicated methods in `src/services/` or actions in `src/store/useShoppingStore.ts`.

2. **Optimistic Updates & Rollbacks:**
   - For high-frequency user actions (e.g. toggling `is_checked` on a shopping list item):
     1. Store updates local state instantly.
     2. UI updates styles immediately (`line-through`).
     3. Service dispatches async network request to Supabase.
     4. If network fails or throws an error, store rolls back to the previous state and displays a Toast notification to the user.

3. **Realtime WebSocket Subscriptions:**
   - The active shopping list listens to Supabase broadcast/postgres_changes on `shopping_list_items`.
   - Incoming remote changes update the Zustand store directly so that all devices within the household stay in sync in real time without a full page refresh.

4. **Performance & Selectors:**
   - Use fine-grained Zustand selectors to prevent unnecessary re-renders:
     ```typescript
     // Good: Select only needed slice
     const activeList = useShoppingStore((state) => state.activeList);
     const toggleItem = useShoppingStore((state) => state.toggleItem);
     ```
