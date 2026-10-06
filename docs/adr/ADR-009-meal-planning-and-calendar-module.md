# ADR-009: Meal Planning & Calendar Module (Multi-View Scheduling & Shopping Pipeline Synchronization)

## 1. Metadata
- **Status:** Accepted
- **Date:** 2026-10-07
- **Decision Drivers:** Multi-View Meal Scheduling (Month/Week/Day), Shopping Lifecycle Synchronization (Draft / Active / Bought / Uncertainty), Dual Layout Ergonomics (Mobile PWA & Desktop), Strict Multi-Tenant Isolation (Supabase RLS), Pantry Inventory Integration (ADR-008)
- **Scope:** Full-Stack (PostgreSQL Schema, RLS, Realtime, Zustand State, Calculations, Mobile PWA & Desktop UI)

---

## 2. Context & Problem Statement

SmartShopping provides advanced capabilities for cookbook recipe management, household pantry tracking ([ADR-008](file:///d:/08_Git/SmartShopping/SmartShopping/docs/adr/ADR-008-pantry-management-and-inventory-sync.md)), multi-list shopping management ([ADR-005](file:///d:/08_Git/SmartShopping/SmartShopping/docs/adr/ADR-005-multiple-active-shopping-lists.md)), and aisle-sorted purchasing ([ADR-006](file:///d:/08_Git/SmartShopping/SmartShopping/docs/adr/ADR-006-custom-product-categories-and-aisle-sorting.md)). 

However, users previously lacked a dedicated scheduling tool to answer the fundamental daily question: *"What are we eating this week, and what do we need to buy for it?"*. Users had to manually remember which meals to cook on which days, manually push recipes from the Cookbook into the Draft cart without a temporal roadmap, and could not easily detect whether planned dinners were already bought, still in the cart, or missing key ingredients because someone accidentally removed them during grocery shopping.

The goal of this module is to introduce an intuitive, highly visual **Meal Planner & Calendar Module** that:
1. Gives households a temporal schedule across 3 viewing resolutions: **Month View**, **Week View** (with Workweek Pn-Pt vs Full Week Pn-Nd toggle), and **Day View** (with categorized meal slots, macros, and ingredient checklists).
2. Connects meal schedules directly to the shopping pipeline (`Draft` -> `Active List` -> `Purchased`).
3. Tracks real-time ingredient coverage and flags **Uncertainty (`⚠️`/`❓`)** if ingredients are removed or modified before purchasing.
4. Integrates seamlessly with the domestic **Pantry (Spiżarnia)** so ingredients already in stock don't trigger unnecessary purchases or uncertainty flags.
5. Provides a read-only historical archive for past days while keeping today and future days editable.
6. Seamlessly integrates into both **Mobile PWA** (7th bottom navigation tab with thumb-friendly controls) and **Desktop** (Sidebar entry and spacious multi-column layouts).

---

## 3. Market & Technology Benchmarks

| Feature / Pattern | Paprika 3 | Whisk (Samsung Food) | AnyList | SmartShopping ADR-009 |
| :--- | :--- | :--- | :--- | :--- |
| **View Granularity** | Month, Week, Day | Week, Day | Day, Week list | **Month (heat/dots), Week (Workweek / Full toggle), Day (Macro & Ingredients)** |
| **Shopping Pipeline Link** | One-way dump to list without tracking | Adds all to list, no status sync | Adds to list, loses meal link | **Bi-directional lifecycle tracking via explicit `meal_plan_item_id`** |
| **Missing Item Detection** | None (static dump) | None | None | **Dynamic Uncertainty (`⚠️`) with 1-click restore** |
| **Pantry Integration** | Manual pantry checklist | None | Basic pantry deduction | **Native ADR-008 check (Pantry-stocked items count as fulfilled)** |
| **Historical Archive** | Editable past dates | Editable past dates | Simple list history | **Read-only historical archive with frozen completion badges** |
| **Realtime Family Sync** | Cloud sync on pull | Account sync with lag | Realtime list sync | **Instant Supabase Realtime WebSockets across household** |

---

## 4. Considered Alternatives & Decision Matrix

| Evaluation Criteria | Option A: Loose Loose-Coupled Tagging (Date tags in Draft) | Option B: Static Calendar with One-way Export | Option C: Explicit Relational Scheduling & Lifecycle Sync (Adopted) |
| :--- | :--- | :--- | :--- |
| **Data Integrity & Traceability** | Low (fragile string tags, easily lost during merge) | Medium (calendar separate, disconnected from cart) | **High (Foreign keys, explicit `meal_plan_item_id`, full auditability)** |
| **Uncertainty Detection (`⚠️`)** | Impossible (no reverse link from list to calendar) | Impossible (no tracking after initial export) | **Instant & deterministic (detects deletions & partial quantities)** |
| **Mobile PWA Ergonomics** | Cluttered shopping lists | Requires multi-step manual exports | **Fluid zoom hierarchy: Month -> Week -> Day with haptic feedback** |
| **Pantry Awareness** | None | None | **Automatic coverage check against `pantry_items`** |
| **Multi-tenant RLS Isolation** | Medium | Medium | **High (Strict household RLS isolation on `meal_plans`)** |
| **Verdict** | Rejected | Rejected | **Adopted** |

---

## 5. Technical Decision & Deep Architecture

### 5.1 System & Data Flow

```mermaid
flowchart TD
    subgraph UI ["Calendar UI (Dual Layout)"]
        MonthView["Month View\n(7 cols, dots, kcal summary)"]
        WeekView["Week View\n(Workweek vs Full week toggle)"]
        DayView["Day View\n(Meal categories, macro totals, ingredients)"]
    end

    subgraph Actions ["User Actions"]
        AddMeal["Add Recipe / Ad-Hoc Item"]
        TransferToDraft["Add to Draft (Day or Week)"]
        RestoreMissing["One-Click Restore Missing Item"]
    end

    subgraph StoreLayer ["State & Service Layer"]
        useMealPlanStore["useMealPlanStore (Zustand)"]
        mealPlanService["mealPlanService (Supabase Client)"]
        calcEngine["calendarStatus.ts (Pure Calculations)"]
    end

    subgraph Database ["Supabase PostgreSQL + Realtime"]
        mealPlansTable[("public.meal_plans")]
        shoppingItemsTable[("public.shopping_list_items\n(+ meal_plan_item_id)")]
        pantryItemsTable[("public.pantry_items")]
    end

    MonthView -->|Click day| DayView
    WeekView -->|Select day| DayView
    DayView --> AddMeal
    DayView --> TransferToDraft
    DayView --> RestoreMissing

    AddMeal --> useMealPlanStore
    TransferToDraft --> useMealPlanStore
    RestoreMissing --> useMealPlanStore

    useMealPlanStore --> mealPlanService
    useMealPlanStore --> calcEngine
    mealPlanService --> mealPlansTable
    mealPlanService --> shoppingItemsTable

    pantryItemsTable -.->|Pantry check| calcEngine
    shoppingItemsTable -.->|Checklist status| calcEngine
    calcEngine -->|Status: in_draft | in_list | bought | uncertain| DayView
```

### 5.2 Schema & Database Changes

#### 5.2.1 Migration SQL
```sql
-- Migration: 20261007000000_add_calendar_meal_plans.sql

-- 1. Create table public.meal_plans
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_id UUID REFERENCES public.meals(id) ON DELETE CASCADE,
  meal_category_id INT REFERENCES public.meal_categories(id) ON DELETE SET NULL,
  custom_name TEXT,
  is_ad_hoc BOOLEAN NOT NULL DEFAULT FALSE,
  servings NUMERIC NOT NULL DEFAULT 1 CHECK (servings > 0),
  target_kcal NUMERIC NULL,
  notes TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add foreign key link in public.shopping_list_items
ALTER TABLE public.shopping_list_items
  ADD COLUMN IF NOT EXISTS meal_plan_item_id UUID REFERENCES public.meal_plans(id) ON DELETE SET NULL;

-- 3. Indexes for fast query lookup
CREATE INDEX IF NOT EXISTS idx_meal_plans_household_date 
  ON public.meal_plans(household_id, date);

CREATE INDEX IF NOT EXISTS idx_meal_plans_household_meal 
  ON public.meal_plans(household_id, meal_id);

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_meal_plan 
  ON public.shopping_list_items(meal_plan_item_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies scoped to household members
CREATE POLICY "Household members can select meal plans"
  ON public.meal_plans FOR SELECT
  USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

CREATE POLICY "Household members can insert meal plans"
  ON public.meal_plans FOR INSERT
  WITH CHECK (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

CREATE POLICY "Household members can update meal plans"
  ON public.meal_plans FOR UPDATE
  USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())))
  WITH CHECK (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

CREATE POLICY "Household members can delete meal plans"
  ON public.meal_plans FOR DELETE
  USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

-- 6. Publish to Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_plans;
```

### 5.3 Types & Data Structures

```typescript
export type MealPlanStatus = 
  | 'planned'      // In calendar, not yet in draft/list
  | 'in_draft'     // Ingredients are in shopping cart (Draft)
  | 'in_list'      // Ingredients are on active shopping list
  | 'bought'       // All ingredients checked off or in pantry
  | 'uncertain'    // ⚠️ One or more ingredients deleted or quantity altered before buying

export interface MealPlanItem {
  id: string
  household_id: string
  date: string // YYYY-MM-DD
  meal_id: string | null
  meal_category_id: number | null
  custom_name: string | null
  is_ad_hoc: boolean
  servings: number
  target_kcal: number | null
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
  // Joined meal details
  meal?: MealWithIngredients | null
}

export interface DayMacroSummary {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface MealStatusDetails {
  status: MealPlanStatus
  totalIngredients: number
  boughtCount: number
  inListCount: number
  inDraftCount: number
  pantryCoveredCount: number
  missingIngredients: Array<{
    productId: string
    productName: string
    requiredQuantity: number
    unitType: UnitEnum
  }>
}
```

### 5.4 Pure Calculation Engine (`src/lib/calculations/calendarStatus.ts`)

1. **`calculateMealPlanStatus`**: Evaluates all ingredients of a planned meal against:
   - Domestic Pantry (`pantry_items` or `in_pantry = true`) -> counts as secured.
   - Current Draft items matching `meal_plan_item_id`.
   - Current Active List items matching `meal_plan_item_id` (checking `is_checked`).
   - If expected ingredients are missing from draft/list/pantry: status evaluates to `'uncertain'`.
2. **`calculateDayMacros`**: Sums energy (kcal), protein (g), carbohydrates (g), and fat (g) across all planned dishes for a given day, taking into account `servings` scaling.
3. **`generateDraftItemsFromMealPlan`**: Creates `AddToDraftPayload` items with `meal_plan_item_id` and formatted source tag (e.g., `"Śr · Spaghetti Bolognese"`).

### 5.5 Dual Layout Presentation

#### 5.5.1 Mobile PWA Layout
- **7th Bottom Navigation Tab:** `Calendar` icon with label `Kalendarz` (`t('navigation.calendar')`), touch target $\ge 44\text{px}$, haptic pulse on switch (`navigator.vibrate(20)`).
- **Month View:** Compact calendar grid; status dots on each day (gray, blue, amber, green, red-amber `⚠️`); tap navigates to Day View.
- **Week View:** Workweek (Pn-Pt) vs Full week (Pn-Nd) segmented toggle; vertical scrollable day cards with quick actions.
- **Day View:** Day carousel header, macro badge bar, categorized meal sections, recipe ingredients sheet, 1-click restore popup.
- **Past Days:** Locked to read-only; displays a subtle archive padlock with completion status badges.

#### 5.5.2 Desktop Layout
- **Desktop Sidebar:** Added 7th primary navigation item with keyboard shortcut.
- **Month View:** Spacious grid cells with full meal chips, mini macro counts, and instant hover previews.
- **Week View:** 5 or 7 column board layout with meal cards, macros, and drag/copy options.
- **Day View:** Multi-column layout with ingredient status breakdown and pantry stock badges.

---

## 6. Comprehensive Edge Cases & Mitigation Matrix

| # | Scenario / Edge Case | Failure Risk | Architectural Mitigation |
| :- | :--- | :--- | :--- |
| 1 | User deletes 1 ingredient of 4 from Active List while shopping | Meal is incomplete, user arrives home without critical food | Calendar detects missing item for `meal_plan_item_id`, triggers **Uncertainty (`⚠️`)** and shows 1-click restore modal. |
| 2 | Ingredient is already stocked in the Pantry | Unnecessary duplicate purchase in grocery list | `calculateMealPlanStatus` checks domestic pantry inventory (`ADR-008`); stocked items are flagged as secured and excluded from draft transfer. |
| 3 | Past calendar days are accessed | Accidental editing of completed meal history | Past dates (`date < today`) are strictly read-only; edit and delete actions are disabled; historical completion badges are frozen. |
| 4 | Ad-Hoc meal planned ("Dinner out") | Attempting to fetch ingredients fails or crashes shopping transfer | `is_ad_hoc = true` entries require no ingredients; shopping transfer skips empty ingredient meals cleanly. |
| 5 | Multiple family members edit calendar simultaneously | Stale or overwritten meal plans | Supabase Realtime channel on `meal_plans` syncs updates instantly across household devices; Zustand store updates optimistically with rollback on network failure. |
| 6 | Duplicating meal to next day ("Cook once, eat twice") | Tedious re-entry of recipe details | Dedicated "Duplikuj na jutro" button clones the `meal_plans` record to `date + 1` with default 1-click execution. |
| 7 | Shopping list is completed and archived | Active list items disappear, breaking calendar status | Status checks archived shopping lists for `meal_plan_item_id` with `completed_at NOT NULL`, preserving permanent `'bought'` status. |

---

## 7. Security, Privacy & Multi-Tenancy

1. **PostgreSQL RLS:** All operations on `meal_plans` are governed by `household_id IN (SELECT public.get_user_household_ids(auth.uid()))`. Users from Household A cannot view, insert, modify, or delete meal plans from Household B.
2. **Foreign Key Protection:** `meal_id` deletion cascades cleanly, while removing a shopping list item cleanly sets `meal_plan_item_id` to NULL without deleting the calendar plan.
3. **No Direct Supabase in UI:** All UI interactions route strictly through `useMealPlanStore` and `mealPlanService`.

---

## 8. Testing & Verification Strategy

- **Pure Calculation Tests:**
  - `src/lib/calculations/__tests__/calendarStatus.test.ts`:
    - All status permutations (`planned`, `in_draft`, `in_list`, `bought`, `uncertain`).
    - Partial ingredient deletion triggering uncertainty.
    - Pantry items bypassing purchase requirement.
    - Daily macro calculations with fractional servings.
- **Store & Service Tests:**
  - `src/store/__tests__/useMealPlanStore.test.ts`: Optimistic add, update, delete, duplicate, and transfer to draft.
  - `src/services/__tests__/mealPlanService.test.ts`: Supabase query mocking and error handling.
- **Component & User Flow Integration Tests:**
  - `src/components/views/__tests__/CalendarView.test.tsx` (Mobile PWA).
  - `src/components/layout/desktop/views/__tests__/DesktopCalendarView.test.tsx` (Desktop).
  - Bottom navigation 7th tab verification.

---

## 9. Rollout, Migration & Rollback Plan

1. **Migration Execution:** Run `supabase/migrations/20261007000000_add_calendar_meal_plans.sql` on DEV and PROD databases.
2. **Backward Compatibility:** `shopping_list_items.meal_plan_item_id` is nullable; existing shopping lists and draft items function without modification.
3. **Rollback Plan:** Dropping the column and `meal_plans` table restores the previous state without data loss to recipes or existing shopping lists.

---

## 10. Consequences

### Positive
- Complete temporal meal planning integrated into SmartShopping.
- Elimination of forgotten ingredients through real-time shopping lifecycle tracking.
- Zero food waste by coordinating with domestic pantry stocks ([ADR-008](file:///d:/08_Git/SmartShopping/SmartShopping/docs/adr/ADR-008-pantry-management-and-inventory-sync.md)).
- Co-equal Dual Layout experience across Mobile PWA and Desktop.

### Negative / Accepted Trade-offs
- Adding a 7th tab to Mobile PWA bottom bar requires careful font sizing and compact spacing on $\le 360\text{px}$ viewports.
- Tracking uncertainty requires querying both `shopping_list_items` and `draftItems` to detect deleted ingredient references.
