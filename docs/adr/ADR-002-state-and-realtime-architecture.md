# ADR-002: State Management, Services & Realtime Optimistic UI

## Status
Implemented

## Context
SmartShopping requires instantaneous UI feedback when checking off items in a physical grocery aisle (low/spotty connectivity) alongside real-time synchronization across multiple household members shopping concurrently.

## Decision
We adopted a three-tiered architecture:
1. **Service Layer (`src/services/`):** Pure asynchronous functions wrapping PostgREST queries, handling error reporting, and injecting multi-tenant household contexts (`household_id`). UI components never call `supabase` directly.
2. **Global Reactive Store (`src/store/useShoppingStore.ts`):** Implemented with Zustand. Manages active lists, draft shopping cart, cookbook meals, and products.
3. **Optimistic Updates & Automatic Rollback:** Checkbox mutations immediately update local state and render visual cues (`line-through`). If background Supabase synchronization fails, state rolls back and notifies the user via Toast.
4. **WebSocket Realtime Subscriptions:** Active shopping lists subscribe to Supabase channels on `shopping_list_items`, directly ingesting remote updates into the Zustand store.

## Consequences
### Positive
- Sub-millisecond perceived latency when checking items in stores.
- Instant synchronization across all household devices.
- High testability: pure services and isolated Zustand actions.

### Negative / Trade-offs
- Requires careful handling of conflicting simultaneous edits and rollback mechanics on network timeouts.
