# ADR-008: Household Pantry Management, Real-Time Inventory Sync & Cross-List Freshness Intelligence

## 1. Metadata
- **Status:** Accepted
- **Date:** 2026-09-21
- **Decision Drivers:** Household Multi-Tenancy, Cross-List Inventory Synchronization, Intelligent Duplicate Purchase Prevention, Co-Equal Dual Layout UX, Real-Time Optimistic Updates
- **Scope:** Full-Stack (PostgreSQL Schema, Supabase RLS, Realtime WebSockets, Zustand State Management, React 19 Dual-Layout UI)

---

## 2. Context & Problem Statement

Modern household grocery management faces a chronic friction point: **unnecessary duplicate purchases and food waste caused by a lack of visibility into existing home stock while shopping or planning meals**. Household members frequently purchase items they already have in storage (or conversely, assume an item is stocked at home when it is already depleted).

Existing shopping list applications either:
1. Treat shopping lists in complete isolation from home inventory, requiring tedious manual cross-referencing.
2. Provide heavy, enterprise-grade inventory systems (requiring barcode scanning for every consumed item) that create prohibitive friction for household members and are quickly abandoned.

SmartShopping requires a **lightweight, friction-free household pantry module ("Spiżarnia")** that:
- Acts as a dedicated household inventory overview placed after the "History" tab (`'pantry'`).
- Automatically ingests purchased items upon shopping list completion/archival (`archiveActiveList`).
- Intelligently surfaces purchase recency directly within the active shopping list and draft cart using a 3-tier color heuristic (green/orange/red) based on product category (perishable food vs. durable household non-food/cleaning supplies).
- Provides an interactive decision modal ("Mam produkt" / "Nie mam produktu") that allows shoppers to instantly verify or update pantry quantities and resolve list items (removing from cart or marking as "W spiżarni" with distinct visual styling on the active list).
- Extends seamlessly across both Mobile PWA (one-handed thumb zone, haptic feedback, bottom navigation) and Desktop (sidebar navigation, dialog modals, multi-column layouts).
- Ensures multi-tenant isolation through Supabase Row Level Security (RLS) and real-time state synchronization via WebSockets across all household devices.

---

## 3. Market & Technology Benchmarks

| Solution | Inventory Tracking | Shopping List Integration | Freshness / Recency Heuristics | Realtime Family Collaboration | UX Friction |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AnyList** | Static "In Stock" / "Out of Stock" lists | Manual toggle between lists | None; static state only | Good (Cloud sync) | Moderate; requires manual restocking |
| **Paprika 3** | Dedicated pantry tab with quantity tracking | Ingredients can cross-check pantry | None; no automatic age alerts | Basic cloud sync, no real-time push | High friction; requires manual ingredient decrements |
| **Bring!** | Icon-based visual catalog | Single-state icons | None | Good | Low friction, but zero granular metric quantities (g, ml) |
| **Whisk / Samsung Food** | Full kitchen inventory tied to meal plans | Auto-deducts recipe ingredients | Basic shelf-life estimation | Moderate | High complexity, excessive onboarding curve |
| **SmartShopping (This ADR)** | **Reactive household pantry with metric quantities (g, ml, szt)** | **Two-way live integration (Cart + Active List + Pantry + Recipes + Products)** | **Intelligent category-aware purchase recency (3-7d food vs 2-4w non-food)** | **Supabase Realtime WebSockets + Optimistic UI rollback** | **Zero extra shopping steps: auto-ingests on archive, 1-tap in-aisle check** |

---

## 4. Considered Alternatives & Decision Matrix

### 4.1 Integration Scope & System Boundaries

| Evaluation Criteria | Option A: Standalone Inventory | Option B: Two-Way Shopping Sync | Option C: Full End-to-End Kitchen Sync (Selected) |
| :--- | :--- | :--- | :--- |
| **Shopping Duplicate Prevention** | Low (requires tab switching) | High (Cart & Active List badges) | **Maximum (Cart, Active List, Recipe Planner & Product Catalog)** |
| **Family Shopping Flow Speed** | Slow | Fast | **Instantaneous with 1-tap verification modals** |
| **Cross-Module Consistency** | Fragmented | Good | **Cohesive across all 5 navigation pillars** |
| **Implementation Complexity** | Low | Medium | **Balanced & strictly modular** |
| **Verdict** | Rejected | Viable fallback | **Adopted** |

### 4.2 Data Model for Active List Item Fulfillment & Category Freshness

| Evaluation Criteria | Option A: Text Status Enum (`pending`, `bought`, `in_pantry`) | Option B: Dedicated `in_pantry` Boolean + Category `is_non_food` (Selected) | Option C: Pure Client-Side Inference |
| :--- | :--- | :--- | :--- |
| **Backward Compatibility** | Breaking schema change for existing list queries | **100% Non-breaking additive columns** | High risk of state drift across devices |
| **RLS & Query Simplicity** | Complex status migrations | **Trivial boolean filters (`is_checked`, `in_pantry`)** | Difficult to secure multi-tenant queries |
| **Category Freshness Rules** | Hardcoded category IDs in frontend | **Dynamic database attribute (`is_non_food`) editable per household** | Inflexible for custom categories |
| **Verdict** | Rejected | **Adopted** | Rejected |

---

## 5. Technical Decision & Deep Architecture

### 5.1 Architecture & Data Flow

```mermaid
flowchart TD
    subgraph UI_Layer ["UI Layer (Mobile PWA & Desktop)"]
        PV["PantryView / DesktopPantryView<br/>(6th Tab: 'pantry')"]
        DV["DraftView (Koszyk)<br/>+ Pantry Freshness Icon"]
        ALV["ActiveListView (Aktywna Lista)<br/>+ Pantry Freshness Icon + 'W spiżarni' Status"]
        PM["PantryConfirmModal / BottomSheet<br/>('Mam produkt' / 'Nie mam produkt')"]
        CV["CookbookView & ProductsView<br/>(Pantry Stock Badges & Quick Add)"]
    end

    subgraph State_Layer ["State Layer (Zustand)"]
        UPS["usePantryStore<br/>(items, itemsByProductId O(1), optimistic actions)"]
        USS["useShoppingStore<br/>(draftItems, activeListsSummary)"]
    end

    subgraph Service_Layer ["Service Layer"]
        PS["pantryService<br/>(CRUD, batchUpsertFromActiveList)"]
        SLS["shoppingListService<br/>(archiveActiveList, markItemInPantry)"]
    end

    subgraph Backend_Layer ["Supabase & PostgreSQL"]
        PI[("public.pantry_items<br/>(household_id, product_id, quantity, last_purchased_at)")]
        SLI[("public.shopping_list_items<br/>(in_pantry, is_checked)")]
        PC[("public.product_categories<br/>(is_non_food)")]
        RT["Supabase Realtime WebSockets<br/>(postgres_changes on pantry_items)"]
    end

    DV -->|Click Freshness Icon| PM
    ALV -->|Click Freshness Icon| PM
    PM -->|'Mam produkt' (adjust qty)| UPS
    PM -->|'Nie mam produktu'| UPS
    PM -->|'Mam produkt' in Cart| USS
    PM -->|'Mam produkt' in Active List| SLS

    UPS --> PS
    USS --> SLS
    PS --> PI
    SLS --> SLI
    SLS -->|archiveActiveList (auto-feed)| PS
    PI -.->|Realtime Broadcast| RT
    RT -.->|Auto-Sync| UPS
```

---

### 5.2 Schema & Database Changes

#### 5.2.1 Migration DDL (`supabase/migrations/20260901000000_add_pantry_module.sql`)

```sql
-- 1. Extend product_categories with is_non_food flag for freshness recency rules
ALTER TABLE public.product_categories 
ADD COLUMN IF NOT EXISTS is_non_food BOOLEAN NOT NULL DEFAULT FALSE;

-- Update seeded categories: 7 ('Chemia i Dom') and 8 ('Inne') are non-food
UPDATE public.product_categories
SET is_non_food = TRUE
WHERE id IN (7, 8) OR LOWER(name) LIKE '%chemia%' OR LOWER(name) LIKE '%dom%';

-- 2. Extend shopping_list_items with in_pantry status flag
ALTER TABLE public.shopping_list_items 
ADD COLUMN IF NOT EXISTS in_pantry BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Create pantry_items table with strict household multi-tenancy
CREATE TABLE IF NOT EXISTS public.pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  ad_hoc_name TEXT NULL,
  category_id INT REFERENCES public.product_categories(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit_type public.unit_enum NOT NULL DEFAULT 'szt',
  last_purchased_at TIMESTAMPTZ NULL,
  last_verified_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure a household has at most one pantry entry per catalog product
CREATE UNIQUE INDEX IF NOT EXISTS idx_pantry_items_household_product 
ON public.pantry_items (household_id, product_id)
WHERE product_id IS NOT NULL;

-- General query indexing
CREATE INDEX IF NOT EXISTS idx_pantry_items_household_id 
ON public.pantry_items (household_id);

CREATE INDEX IF NOT EXISTS idx_pantry_items_last_purchased 
ON public.pantry_items (household_id, last_purchased_at DESC);

-- 4. Enable Row Level Security (RLS) on pantry_items
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read household pantry items" ON public.pantry_items;
CREATE POLICY "Users can read household pantry items"
ON public.pantry_items
FOR SELECT
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Users can insert household pantry items" ON public.pantry_items;
CREATE POLICY "Users can insert household pantry items"
ON public.pantry_items
FOR INSERT
TO authenticated
WITH CHECK (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Users can update household pantry items" ON public.pantry_items;
CREATE POLICY "Users can update household pantry items"
ON public.pantry_items
FOR UPDATE
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
)
WITH CHECK (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Users can delete household pantry items" ON public.pantry_items;
CREATE POLICY "Users can delete household pantry items"
ON public.pantry_items
FOR DELETE
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

-- 5. Add pantry_items to Supabase Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'pantry_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pantry_items;
  END IF;
END $$;
```

---

### 5.3 Pure Calculation Engine: Freshness & Age Heuristics

All freshness calculations are isolated in `src/lib/calculations/pantryCalculations.ts` as deterministic pure functions:

```typescript
export type FreshnessLevel = 'fresh' | 'medium' | 'old' | 'unknown'

export interface FreshnessCalculationResult {
  level: FreshnessLevel
  colorClass: string // 'text-emerald-500', 'text-amber-500', 'text-rose-500'
  badgeBgClass: string
  daysSincePurchase: number | null
  messageKey: string
  formattedMessage: string
}

/**
 * Evaluates purchase recency against category threshold rules:
 * - Food: <3 days (Green), 3-7 days (Orange), >7 days (Red)
 * - Non-Food / Chemistry: <14 days (Green), 14-28 days (Orange), >28 days (Red)
 */
export function calculatePantryFreshness(
  lastPurchasedAt: string | null | undefined,
  isNonFood: boolean,
  productName: string,
  quantityStr: string,
  lastVerifiedAt?: string | null,
  now: Date = new Date()
): FreshnessCalculationResult {
  if (!lastPurchasedAt) {
    return {
      level: 'unknown',
      colorClass: 'text-muted-foreground',
      badgeBgClass: 'bg-muted',
      daysSincePurchase: null,
      messageKey: 'pantry.statusUnknown',
      formattedMessage: `Produkt ${productName} znajduje się w spiżarni.`
    }
  }

  const purchaseDate = new Date(lastPurchasedAt)
  const diffMs = now.getTime() - purchaseDate.getTime()
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  const formattedDate = purchaseDate.toLocaleDateString('pl-PL')

  let level: FreshnessLevel = 'fresh'

  if (isNonFood) {
    if (diffDays < 14) {
      level = 'fresh'
    } else if (diffDays <= 28) {
      level = 'medium'
    } else {
      level = 'old'
    }
  } else {
    if (diffDays < 3) {
      level = 'fresh'
    } else if (diffDays <= 7) {
      level = 'medium'
    } else {
      level = 'old'
    }
  }

  const colorClass =
    level === 'fresh'
      ? 'text-emerald-500'
      : level === 'medium'
      ? 'text-amber-500'
      : 'text-rose-500'

  const badgeBgClass =
    level === 'fresh'
      ? 'bg-emerald-500/10 border-emerald-500/30'
      : level === 'medium'
      ? 'bg-amber-500/10 border-amber-500/30'
      : 'bg-rose-500/10 border-rose-500/30'

  let text = ''
  if (level === 'fresh') {
    text = `Dnia ${formattedDate} zakupiono ${productName} (${quantityStr}), sprawdź czy przypadkiem nie masz jeszcze tego produktu`
  } else if (level === 'medium') {
    text = `Dnia ${formattedDate} zakupiono ${productName} (${quantityStr}), możliwe że masz jeszcze ten produkt`
  } else {
    text = `Dnia ${formattedDate} zakupiono ${productName} (${quantityStr}), prawdopodobnie nie masz jeszcze tego produktu`
  }

  if (lastVerifiedAt) {
    const verifiedDate = new Date(lastVerifiedAt).toLocaleDateString('pl-PL')
    text += ` (Aktualizacja: ${verifiedDate})`
  }

  return {
    level,
    colorClass,
    badgeBgClass,
    daysSincePurchase: diffDays,
    messageKey: `pantry.freshness.${level}`,
    formattedMessage: text
  }
}
```

---

### 5.4 Frontend & State Architecture

#### 5.4.1 `usePantryStore` (Zustand Store Slice)
- **State:**
  - `pantryItems: PantryItemWithDetails[]`
  - `pantryMapByProductId: Record<string, PantryItemWithDetails>` (O(1) in-memory lookup)
  - `pantryMapByAdHocName: Record<string, PantryItemWithDetails>` (case-insensitive fallback)
  - `isLoading: boolean`
- **Actions:**
  - `loadPantryItems: (householdId: string) => Promise<void>`
  - `updatePantryQuantity: (itemId: string, newQuantity: number) => Promise<boolean>`
  - `verifyPantryItem: (itemId: string, newQuantity: number) => Promise<boolean>` (updates quantity & sets `last_verified_at = NOW()`)
  - `deletePantryItem: (itemId: string) => Promise<boolean>`
  - `addOrIncrementItem: (item: CreatePantryItemPayload) => Promise<boolean>`
  - `syncFromRealtime: (payload: RealtimePostgresChangesPayload<PantryItem>) => void`

#### 5.4.2 Active List & Cart Modal Interaction Flow
1. **Trigger:** The shopper clicks the `Warehouse` icon (rendered with `text-emerald-500`, `text-amber-500`, or `text-rose-500`) located to the right of the quantity stepper on a product card.
2. **Modal Presentation:**
   - On Mobile PWA: Native swipe-down bottom sheet (`Sheet`).
   - On Desktop: Centered dialog modal (`Dialog`).
3. **Modal Contents:**
   - Informative recency text according to the category rules.
   - Stepper / input prefilled with current pantry quantity.
   - Button **"Mam produkt"**:
     - Updates pantry stock with the input quantity and stamps `last_verified_at = NOW()`.
     - In Cart (`DraftView`): Completely removes the product from draft cart.
     - In Active List (`ActiveListView`): Sets `in_pantry = true` on the item. The item transforms visually to a distinctive state (amber/cyan dashed strikethrough, badge `W spiżarni`, opacity 55%, quantity stepper locked).
     - Updates the modal text with `Aktualizacja: dd.mm.yyyy`.
   - Button **"Nie mam produktu"**:
     - Deletes the product entry from `pantry_items`.
     - The `Warehouse` icon disappears immediately from Cart / Active List.

#### 5.4.3 Auto-Ingestion on Active List Archive (`archiveActiveList`)
When `shoppingListService.archiveActiveList(listId, householdId)` is invoked:
1. Active list items with `is_checked = true` AND `in_pantry = false` are identified as **actually purchased in-store**.
2. Items with `in_pantry = true` are **excluded** from auto-ingestion (preventing duplicate stock inflation).
3. The purchased items are batch-upserted into `pantry_items` via `pantryService.batchIngestPurchasedItems(householdId, items)`:
   - If the product already exists: `quantity = existing_quantity + purchased_quantity`, `last_purchased_at = NOW()`.
   - If the product is new: inserted with `quantity = purchased_quantity`, `last_purchased_at = NOW()`.

---

## 6. Comprehensive Edge Cases & Mitigation Matrix

| # | Scenario / Edge Case | Risk | Architectural Mitigation |
| :- | :--- | :--- | :--- |
| **1** | **Accidental "Mam produkt" click on active list** | Shopper marked item as "in pantry" by mistake and might forget to buy it. | **Full reversibility:** Clicking the item row or pantry badge re-opens the modal with an option: "Przywróć do kupienia" (sets `in_pantry = false`). |
| **2** | **Ad-Hoc items without `product_id`** | Items added manually in the aisle (e.g. "Specjalny pędzel malarski"). | `pantry_items` supports `ad_hoc_name` and `category_id`. Deduplication and lookups match on normalized `LOWER(TRIM(ad_hoc_name))`. |
| **3** | **Spotty supermarket cellular network (3G/Drop)** | User clicks "Mam produkt" while entering a cold-storage aisle with zero signal. | **Optimistic mutation:** Item is immediately updated in local Zustand state. The request is dispatched asynchronously. If it fails, toast notification triggers and state rolls back safely. |
| **4** | **Simultaneous multi-family edits** | User A at home reduces milk in pantry to 0 while User B in store checks the active list. | Supabase Realtime channel broadcasts table changes; `usePantryStore.syncFromRealtime` updates `pantryMapByProductId` instantly. User B's icon updates live. |
| **5** | **6 tabs in mobile bottom navigation** | Ergonomic crowding and text truncation on compact mobile screens (360px–375px). | Mobile bar applies compact layout: concise labels (`Przepisy`, `Produkty`, `Koszyk`, `Lista`, `Historia`, `Spiżarnia`), 10px typography, 48px touch targets, and icons only if screen width < 360px. |
| **6** | **Unit mismatch between recipe/list and pantry** | Product in pantry is stored in pieces ('szt'), but list item is in grams ('g'). | Units are anchored to catalog product master `unit_type`. For ad-hoc items, the unit is preserved from the original shopping list entry. |
| **7** | **Zero or negative quantity input** | User sets pantry quantity to `0` in the "Mam produkt" input. | Submitting `0` automatically triggers the "Nie mam produktu" flow (removes from pantry and clears icon). |

---

## 7. Security, Privacy & Multi-Tenancy

- **Row Level Security (RLS):** All CRUD operations on `public.pantry_items` are guarded by the canonical SmartShopping security function:
  ```sql
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  ```
- **Tenant Isolation:** No user can read, create, modify, or delete pantry items belonging to households they are not an active member of.
- **Service Layer Guard:** UI components never access Supabase directly; all mutations flow through `pantryService` with explicit `household_id` validation.

---

## 8. Testing & Verification Strategy

### 8.1 Pure Calculation Unit Tests (`src/lib/calculations/__tests__/pantryCalculations.test.ts`)
- `calculatePantryFreshness` for food (<3d, 3-7d, >7d).
- `calculatePantryFreshness` for non-food/cleaning (<14d, 14-28d, >28d).
- Handling of null dates, unknown products, and future-dated edge cases.
- Verification date formatting and Polish string localization.

### 8.2 Component & User Flow Integration Tests (`src/components/views/__tests__/`)
- **Flow 1 (Pantry CRUD):** Add product to pantry, increment/decrement quantity, delete product via swipe/stepper.
- **Flow 2 (Draft Cart Flow):** Render cart item with green/orange/red `Warehouse` icon -> click icon -> click "Mam produkt" -> assert item removed from draft and pantry quantity updated.
- **Flow 3 (Active List Flow):** Render active item -> click "Mam produkt" -> assert item marked with `in_pantry` strikethrough styling and excluded from checked counter.
- **Flow 4 (Archive Auto-Feed):** Complete active list -> verify checked items (`in_pantry = false`) are upserted to pantry, while `in_pantry = true` items are not re-added.
- **Flow 5 (Dual Layout):** Verify Desktop navigation tab switching and sidebar badge counts vs Mobile bottom navigation.

---

## 9. Rollout, Migration & Rollback Plan

1. **Phase 1: Database Migration**
   - Apply `20260901000000_add_pantry_module.sql` to Supabase.
   - Non-breaking: existing active lists and categories continue functioning without downtime.
2. **Phase 2: Service & Store Deployment**
   - Deploy `pantryService.ts` and `usePantryStore.ts` with comprehensive unit tests.
3. **Phase 3: UI Integration**
   - Add the 6th navigation tab to `BottomNavigation.tsx` and `DesktopSidebar.tsx`.
   - Update `DraftView` and `ActiveListView` with the `Warehouse` freshness indicator and `PantryConfirmModal`.
4. **Phase 4: Recipe & Product Integration**
   - Add pantry status indicators to `ProductsView` and `CookbookView`.
5. **Rollback Strategy:**
   - If unforeseen client issues occur, the feature flag or routing can gracefully fall back to 5-tab navigation without data loss in `shopping_lists`.

---

## 10. Consequences

### Positive
- **Drastic Reduction in Duplicate Shopping:** Shoppers immediately see if a product was recently bought and can verify quantities in 1 tap.
- **Zero-Friction Ingestion:** Pantry builds itself automatically whenever shopping trips are archived.
- **Crystal-Clear In-Store Visuals:** Distinct "W spiżarni" visual styling eliminates confusion between items bought in-store vs. found at home.
- **Family Harmony:** Real-time WebSocket synchronization ensures all household members share a single live view of supplies.

### Negative / Accepted Trade-offs
- **Bottom Navigation Density:** 6 tabs in mobile bottom navigation require tighter typography (10px) on small smartphone screens. Mitigated via responsive styling.
- **Heuristic Nature of Freshness:** Days since purchase is a proxy for stock level, not a physical sensor. Mitigated by allowing 1-tap manual quantity adjustment directly in the modal.
