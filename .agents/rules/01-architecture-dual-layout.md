# Rule 01: Co-Equal Dual Layout & Responsive Design

## Context & Objectives
SmartShopping serves two distinct usage environments with equal priority:
1. **In-Store Shopping / Cooking (Mobile PWA):** Smartphone screen, single-handed operation, physical thumb-zone navigation, fast checkoffs.
2. **At-Desk Meal & Household Planning (Desktop Web):** Large screen, multi-column panels, keyboard navigation, wide tables, and rich detail dialogs.

---

## 1. Layout Routing & Responsive Breakpoints

- Device layout routing is controlled by `useDeviceLayout` (`src/hooks/useDeviceLayout.ts`) and rendered through `AppLayoutRouter` (`src/components/layout/AppLayoutRouter.tsx`).
- Components are separated into:
  - Mobile Views: `src/components/views/*`
  - Desktop Views & Layout: `src/components/layout/desktop/*` and `src/components/layout/desktop/views/*`
  - Shared Dual-Layout Dialogs/Sheets: render `Dialog` when `isDesktop` is true and bottom `Sheet` otherwise.
- **Rules:**
  - Any change to a view's functionality (e.g., adding a button, modal, filter, or edit action) **MUST** be implemented and tested in both Mobile and Desktop versions.
  - **Tablet RWD (`768px–1023px`):** Use responsive container widths (`w-full max-w-md sm:max-w-xl md:max-w-3xl mx-auto`) in `MobileLayout` and `LoginScreen` rather than locking tablets to `448px` (`max-w-md`).
  - **Toolbar Search Inputs:** Never squeeze `<Input>` search bars beside sort/filter pills; allocate full width on Mobile (`w-full`) and sufficient width on Desktop (`sm:w-64 lg:w-72 min-w-[220px]`).
  - **Text Wrapping & Overflow:** Prefer `line-clamp-2` on meal titles, product titles, and sidebar descriptions instead of single-line `truncate`. Ensure `0` horizontal overflow at `360px`, `768px`, and `1440px`.
  - **Heading Hierarchy & Container Padding:** Render strictly one `<h1>` per active view (use `<h2>`/`<h3>` for sub-sections) and never duplicate `<main>` outer padding inside child views.

---

## 2. Mobile PWA Requirements & Touch Safety

- **Thumb-Zone Accessibility (WCAG 2.5.5):** Interactive touch targets (including `+`/`-` steppers in dialogs/rows, edit/delete icon buttons on cards, header profile button, and calendar arrows) **MUST** be at least `44x44px` (`min-h-[44px] min-w-[44px]`) on touch/mobile screens.
- **Destructive Action Confirmation:** Never trigger immediate destructive deletion of user data (meals, planned calendar meals, weekly templates, shopping lists, pantry items) on a single tap — always route through `ConfirmDeleteDialog` or a dedicated confirmation dialog.
- **Bottom Navigation & Sheets:**
  - Navigation happens via `BottomNavigation` (`src/components/layout/BottomNavigation.tsx`) with safe-area padding (`env(safe-area-inset-bottom)`), non-truncating concise labels (`activeListShort`), and `aria-current="page"`.
  - Forms, filters, and addition drawers use `Sheet` sliding up from the bottom (`side="bottom"`).
  - Actions like deleting items from drafts utilize `SwipeToDismiss` gestures.
- **Haptics:** Wrap `navigator.vibrate` calls safely with error checking (e.g., `navigator?.vibrate?.(50)`). Never vibrate twice for a single user tap (suppress Realtime echo first).
- **iOS Safari PWA Optimization:** Keep viewport meta tags in `index.html` with `apple-mobile-web-app-capable` and safe area insets padding.

---

## 3. Desktop Layout Requirements

- **Sidebar & Header:** Navigation via `DesktopSidebar` with quick stats, category filters, household switchers, and `DesktopHeader` with global search and actions. Allow switching `LayoutMode` (`Auto / Desktop / Mobile`) in both `AppHeader` (Mobile) and Desktop so users cannot get trapped in Mobile mode.
- **Modals over Drawers:** Desktop uses centered Radix `Dialog` modals (`max-w-2xl` or `max-w-3xl`) instead of mobile bottom sheets.
- **Rich Data Layouts:** Multi-column grids (`grid-cols-2`, `grid-cols-3`, `grid-cols-4`), dense data tables, hover states for buttons and rows.
- **Keyboard Shortcuts & WAI-ARIA:** Support `Esc` for dialog dismiss, `Enter` for form submissions, shortcut hotkeys (`Ctrl+Alt+P`), and WAI-ARIA grid/arrow navigation (`MonthCalendarGrid`).

---

## 4. 6-Theme Semantic Tokens & WCAG 2.1 AA Contrast

- **6 Curated Themes (`src/theme/themes.ts`):** `oled-black` (default True Black `#000000`), `midnight-blue`, `forest-sage`, `warm-amber`, `cyberpunk-violet`, and light theme `clean-light`. All styling MUST preserve WCAG 2.1 AA contrast (`>= 4.5:1` for text) verified by `src/theme/__tests__/wcagContrast.test.ts`.
- **Forbidden Hardcoded Palette Classes:** NEVER use hardcoded dark-only background, border, or text classes such as `bg-black`, `bg-zinc-950`, `bg-zinc-900`, `border-zinc-800`, `text-white`, or `text-zinc-400` in views, cards, or dialogs.
- **Mandatory Semantic Tokens:**
  - Page & Container Surfaces: `bg-background`, `bg-card`, `bg-muted/40`, `bg-popover`.
  - Borders & Dividers: `border-border`.
  - Typography: `text-foreground` (primary), `text-muted-foreground` (secondary/muted), `text-primary`, `text-destructive`.
  - **Semantic Status Badges (`emerald`, `amber`, `sky`, `rose`, `blue`):** Always pair darker light-mode shades with lighter dark-mode overrides (e.g., `text-emerald-600 dark:text-emerald-400`, `text-amber-600 dark:text-amber-400`, `text-sky-600 dark:text-sky-400`), because raw `-400` shades fail contrast (`1.92:1`) on `clean-light`.
- **Status Styles:** Checked shopping items MUST use `line-through text-muted-foreground` (plus `in_pantry` badge styling when satisfied from pantry) and stay in place in the list to prevent jumping under the user's finger/cursor.
