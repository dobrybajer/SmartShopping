# Rule 01: Co-Equal Dual Layout & Responsive Design

## Context & Objectives
SmartShopping serves two distinct usage environments with equal priority:
1. **In-Store Shopping / Cooking (Mobile PWA):** Smartphone screen, single-handed operation, physical thumb-zone navigation, fast checkoffs.
2. **At-Desk Meal & Household Planning (Desktop Web):** Large screen, multi-column panels, keyboard navigation, wide tables, and rich detail dialogs.

---

## 1. Layout Routing & Structure

- Device layout routing is controlled by `useDeviceLayout` (`src/hooks/useDeviceLayout.ts`) and rendered through `AppLayoutRouter` (`src/components/layout/AppLayoutRouter.tsx`).
- Components are separated into:
  - Mobile Views: `src/components/views/*`
  - Desktop Views & Layout: `src/components/layout/desktop/*` and `src/components/layout/desktop/views/*`
- **Rule:** Any change to a view's functionality (e.g. adding a button, modal, or filter) **MUST** be implemented in both Mobile and Desktop versions.

---

## 2. Mobile PWA Requirements

- **Thumb-Zone Accessibility:** Interactive touch targets must be at least `44x44px` (`min-h-[44px] min-w-[44px]`).
- **Bottom Navigation & Sheets:**
  - Navigation happens via `BottomNavigation` (`src/components/layout/BottomNavigation.tsx`).
  - Forms, filters, and addition drawers use `Sheet` sliding up from the bottom (`side="bottom"`).
  - Actions like deleting items from drafts utilize `SwipeToDismiss` gestures.
- **Haptics:** Wrap `navigator.vibrate` calls safely with error checking (e.g., `navigator?.vibrate?.(50)`).
- **iOS Safari PWA Optimization:** Keep viewport meta tags in `index.html` with `apple-mobile-web-app-capable` and safe area insets padding (`pb-safe`).

---

## 3. Desktop Layout Requirements

- **Sidebar & Header:** Navigation via `DesktopSidebar` with quick stats, category filters, household switchers, and `DesktopHeader` with global search and actions.
- **Modals over Drawers:** Desktop uses centered Radix `Dialog` modals (`max-w-2xl` or `max-w-3xl`) instead of mobile bottom sheets.
- **Rich Data Layouts:** Multi-column grids (`grid-cols-2`, `grid-cols-3`, `grid-cols-4`), dense data tables, hover states for buttons and rows.
- **Keyboard Shortcuts:** Support Esc for dialog dismiss, Enter for form submissions, and shortcut hotkeys where appropriate.

---

## 4. Theme & Aesthetics

- **True Black OLED Theme:** Background must be pure black (`#000000` / `bg-black`).
- **Layering & Borders:**
  - Card & Container backgrounds: `bg-zinc-950` or `bg-zinc-900/60`.
  - Border accents: `border-zinc-800` or `border-zinc-800/60`.
  - Primary text: `text-white` or `text-zinc-100`.
  - Secondary/muted text: `text-zinc-400` or `text-zinc-500`.
- **Status Styles:** Checked shopping items MUST use `line-through text-zinc-500` and stay in place in the list to prevent jumping under the user's finger/cursor.
