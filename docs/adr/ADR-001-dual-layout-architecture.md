# ADR-001: Dual Layout Architecture (Desktop Split & Mobile PWA)

## 1. Metadata
- **Status:** Implemented
- **Date:** 2026-08-23
- **Decision Drivers:** Ergonomic in-store mobile usage, high-efficiency desktop meal planning, zero business logic duplication.
- **Scope:** Full-Stack Frontend & UX

## 2. Context & Problem Statement
SmartShopping was originally conceptualized as a mobile-only PWA with a centered `max-w-md` fallback for desktop screens. In practice, users have two completely distinct mental models when using the app:
1. **In-Store Grocery Shopping (Mobile):** One-handed operation, walking through physical aisles, rapid item checking, haptic feedback, and vertical thumb-zone ergonomics.
2. **Weekly Meal Planning & Household Inventory (Desktop):** Sitting at a desk with a large display, editing ingredients, bulk-adding recipes, viewing wide macro distribution charts, and utilizing multi-column tables and keyboard shortcuts.

A single centered mobile column on a 27" or 32" monitor creates massive wasted whitespace, poor data density, and frustrating desktop usability. Conversely, a responsive desktop UI squished onto a smartphone degrades mobile touch targets and shopping speed.

## 3. Market & Technology Benchmarks
- **AnyList / Paprika 3:** Provide dedicated native apps for iPad/macOS with full sidebars and multi-column recipe grids, while their iOS/Android mobile apps focus on sticky bottom bars and large grocery check items.
- **Linear / Notion:** Use a single web codebase that dynamically serves distinct navigation systems (collapsible sidebar + command palette on desktop vs bottom tabs + sheets on mobile).

## 4. Considered Alternatives & Decision Matrix

| Evaluation Criteria | Option A: Centered Mobile Column (`max-w-md`) | Option B: Pure CSS Media Queries in Single Component | Option C: Co-Equal Dual Layout Router (Selected) |
| :--- | :--- | :--- | :--- |
| **Desktop Ergonomics & Screen Real Estate** | Poor (wasted space) | Moderate (messy DOM with many `hidden md:block`) | **High (dedicated desktop layout & multi-column views)** |
| **Mobile Performance & Clean Code** | High | Low (heavy DOM overhead) | **High (focused, lightweight presentation components)** |
| **Maintainability & Separation of Concerns** | High | Low (spaghetti CSS) | **High (shared Zustand hooks + clean view layers)** |
| **Verdict** | Rejected | Rejected | **Adopted** |

## 5. Technical Decision & Deep Architecture

### 5.1 System Flow & Layout Routing
The application uses a layout router (`AppLayoutRouter`) that listens to viewport breakpoint changes (`window.innerWidth >= 1024px`) via a custom hook (`useDeviceLayout`):

```
                     +---------------------------------------+
                     |         useDeviceLayout Hook          |
                     |     (Breakpoint: lg / >= 1024px)      |
                     +-------------------+-------------------+
                                         |
                        +----------------+----------------+
                        |                                 |
                        v                                 v
        +-------------------------------+ +-------------------------------+
        |         MobileLayout          | |         DesktopLayout         |
        |  - BottomNavigation           | |  - DesktopSidebar             |
        |  - Bottom Sheets (`Sheet`)    | |  - DesktopHeader              |
        |  - SwipeToDismiss Gestures    | |  - Centered Modals (`Dialog`) |
        |  - 44x44px Touch Targets      | |  - Multi-Column Data Grids    |
        +---------------+---------------+ +---------------+---------------+
                        |                                 |
                        +----------------+----------------+
                                         |
                                         v
                     +---------------------------------------+
                     |    Shared Business Logic & Stores     |
                     |  - `useShoppingStore` (Zustand)       |
                     |  - Pure Calculations (`src/lib/`)     |
                     |  - Services (`src/services/`)         |
                     +---------------------------------------+
```

### 5.2 Component Structure
- **Mobile Presentation Layer:** `src/components/views/*`
- **Desktop Presentation Layer:** `src/components/layout/desktop/*` and `src/components/layout/desktop/views/*`
- **Shared State & Logic:** Both layouts subscribe to the same Zustand store actions and Supabase real-time channels.

## 6. Comprehensive Edge Cases & Mitigation Matrix

| # | Edge Case / Scenario | Risk | Mitigation |
| :- | :--- | :--- | :--- |
| 1 | Window resized dynamically between mobile and desktop | State reset or broken modals | `useDeviceLayout` updates state reactively; Zustand store retains draft/active selection across layout swaps. |
| 2 | Desktop browser on tablet touch screen (e.g. iPad in landscape) | Missing touch targets or hover locks | `useDeviceLayout` checks breakpoint while all buttons maintain accessible touch padding (`p-2` or `min-h-[38px]`). |
| 3 | Non-supported vibration API on desktop | JavaScript runtime exceptions | Safe invocation wrapper: `navigator?.vibrate?.(50)`. |
| 4 | Dialog open when layout switches | Orphaned backdrop or DOM lock | Radix UI primitives cleanly unmount and clear body scroll locks on component tear-down. |

## 7. Security, Privacy & Multi-Tenancy
Both layouts query through the identical `src/services/` layer, guaranteeing that PostgreSQL RLS policies (`public.get_user_household_ids(auth.uid())`) are uniformly enforced regardless of client form factor.

## 8. Testing & Verification Strategy
- **Layout Selection Unit Tests:** Mock `window.matchMedia` and `window.innerWidth` in Vitest to verify correct layout component rendering.
- **User Flow Parity Tests:** Verify all view actions (create meal, toggle shopping item, empty draft) function identically in both mobile and desktop views.

## 9. Rollout, Migration & Rollback Plan
- Implemented and active in production. If a client device misidentifies the breakpoint, fallback defaults safely to `MobileLayout`.

## 10. Consequences
### Positive
- Exceptional UX tailored specifically for either physical store shopping (mobile) or desk meal planning (desktop).
- Zero duplicated business logic: stores, services, calculations, and real-time subscriptions are 100% reused.
- Modern visual presentation with True Black OLED theme on mobile and Slate/OLED layered panels on desktop.

### Negative / Accepted Trade-offs
- Adding new views or modal features requires authoring both mobile (`Sheet`) and desktop (`Dialog`) presentation wrappers.
