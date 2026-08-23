# Rule 04: TypeScript & Code Quality Standards

## Context & Objectives
To ensure long-term stability and prevent runtime failures, SmartShopping enforces strict typing and modular architecture across all frontend code.

---

## 1. Strict Typing Principles

1. **Zero `any` Policy:**
   - The use of `any` is strictly prohibited.
   - Use `unknown` with type guards if dealing with untyped external data.
2. **Supabase Schema Source of Truth:**
   - All database entity models must derive from `src/types/supabase.ts`.
   - Use Supabase helper types:
     ```typescript
     import { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';

     export type Product = Tables<'products'>;
     export type Meal = Tables<'meals'>;
     export type ShoppingListItem = Tables<'shopping_list_items'>;
     ```
3. **UI / Domain View Models:**
   - Extend base table types when creating joined or extended representations:
     ```typescript
     export interface ProductWithCategory extends Product {
       category?: Tables<'product_categories'> | null;
     }
     ```

---

## 2. Code Modularity & File Organization

1. **File Size Guidelines:**
   - Keep files focused and readable (guideline: < 250–300 lines).
   - If a view or component grows too large, break it down:
     - Extract reusable UI elements into `src/components/ui/` or dedicated sub-folders.
     - Extract custom hook logic into `src/hooks/`.
     - Extract math or pure transformations into `src/lib/calculations/`.
2. **Pure Functions for Business Logic:**
   - Math and algorithms (e.g. macro scaling, aggregation, grocery store sorting) must be implemented as stateless pure functions that take inputs and return results without side effects. This guarantees 100% testability.

---

## 3. Error Handling & User Feedback

1. **No Silent Failures:**
   - Catch blocks must handle errors properly: log for debugging and show user-friendly notifications (Toasts/Alerts).
2. **Graceful Loading & Empty States:**
   - Every view must provide clean skeleton loaders or spinners during initial load and empty state illustrations/prompts when lists have no items.
3. **Quality Gates:**
   - Before completing tasks, verify:
     - `npm run lint` (oxlint)
     - `npx tsc -b` (strict compiler check)
