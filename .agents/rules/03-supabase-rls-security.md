# Rule 03: Supabase Schema & Row Level Security (RLS) Standards

## Context & Objectives
SmartShopping uses a multi-tenant architecture where users belong to one or more `households`. To protect privacy and prevent data leaks across households, strict Row Level Security (RLS) is enforced at the database level.

---

## 1. Security Foundation: `public.get_user_household_ids`

All RLS policies use a security-definer helper function to avoid infinite recursion and optimize performance:

```sql
CREATE OR REPLACE FUNCTION public.get_user_household_ids(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT household_id FROM public.household_members WHERE user_id = user_uuid;
$$;
```

---

## 2. Mandatory RLS Policy Template for New Tables

Whenever a new table is introduced, the migration script **MUST** enable RLS and provide four explicit policies (SELECT, INSERT, UPDATE, DELETE) for role `authenticated`:

```sql
-- 1. Enable RLS
ALTER TABLE public.<new_table_name> ENABLE ROW LEVEL SECURITY;

-- 2. SELECT Policy
DROP POLICY IF EXISTS "Authenticated users can read household <new_table_name>" ON public.<new_table_name>;
CREATE POLICY "Authenticated users can read household <new_table_name>"
ON public.<new_table_name>
FOR SELECT
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

-- 3. INSERT Policy
DROP POLICY IF EXISTS "Authenticated users can insert household <new_table_name>" ON public.<new_table_name>;
CREATE POLICY "Authenticated users can insert household <new_table_name>"
ON public.<new_table_name>
FOR INSERT
TO authenticated
WITH CHECK (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

-- 4. UPDATE Policy
DROP POLICY IF EXISTS "Authenticated users can update household <new_table_name>" ON public.<new_table_name>;
CREATE POLICY "Authenticated users can update household <new_table_name>"
ON public.<new_table_name>
FOR UPDATE
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
)
WITH CHECK (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

-- 5. DELETE Policy
DROP POLICY IF EXISTS "Authenticated users can delete household <new_table_name>" ON public.<new_table_name>;
CREATE POLICY "Authenticated users can delete household <new_table_name>"
ON public.<new_table_name>
FOR DELETE
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);
```

For child tables linked to parent tables (e.g. `items` linked to `shopping_lists`), join through the parent table's `household_id`:
```sql
USING (
  shopping_list_id IN (
    SELECT id FROM public.shopping_lists
    WHERE household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  )
)
```

---

## 3. Mandatory Security, PostgREST & Integrity Guardrails

Whenever creating migrations, services, or Edge Functions, adhere strictly to these rules:

1. **Global Record Protection & UI Parity (`HIGH-08`, `HIGH-12`):**
   - `Global` recipes (`meals`) and products (`products`) with `household_id IS NULL` are read-only for `authenticated` clients.
   - `INSERT`, `UPDATE`, and `DELETE` policies on `meals`, `meal_ingredients`, and `products` MUST require `household_id IN (SELECT public.get_user_household_ids(auth.uid()))`.
   - **UI Parity Rule:** Never show client-side toggles (e.g., `Global` vs `Household` buttons or `type: 'Global'` in recipe forms/imports) to ordinary users when RLS rejects `household_id IS NULL`.

2. **Cross-Row Tenant Isolation on Foreign Keys (`HIGH-08`):**
   - Any table referencing another domain row (`products.parent_id`, `meal_ingredients.product_id`, `meal_ingredients.reference_product_id`, `shopping_list_items.meal_plan_item_id`) MUST enforce in `WITH CHECK` that the referenced row is either global (`household_id IS NULL` / `type = 'Global'`) or belongs to the **same** `household_id`. Never let a user attach another household's private product ID to their own meal or list.

3. **Household Ownership & Least-Privilege `DELETE`/`INSERT` (`CRIT-04`, `HIGH-13`):**
   - Creating households should happen via `SECURITY DEFINER` RPC (`create_household_with_member`), not permissive `WITH CHECK (true)` `INSERT` policies.
   - Destructive household operations (`DELETE` on `households` or removing other users from `household_members`) should distinguish owner/creator privileges once household roles are active.

4. **PostgREST Filter Safety (`isUuid()`) & Explicit FK Disambiguation (`CRIT-05`, `HIGH-13`):**
   - Always validate IDs with `isUuid(id)` BEFORE interpolating them into PostgREST `.or(\`...\`)` filter strings (`categoryService`, `productService`, `mealService`). Never pass `''` into `.or(...)`.
   - When a child table has two foreign keys to the same parent table (e.g., `meal_ingredients.product_id` and `meal_ingredients.reference_product_id` both referencing `products`), ALWAYS specify the exact constraint name in `.select(...)`:
     `product:products!meal_ingredients_product_id_fkey(*)` and `reference_product:products!meal_ingredients_reference_product_id_fkey(*)`.

5. **Hardened `SECURITY DEFINER` RPCs & Edge Functions (`CRIT-03`, `MED-06`, `HIGH-13`):**
   - Every PostgreSQL `SECURITY DEFINER` function (e.g., `archive_shopping_list`) and Supabase Edge Function (`send-push-notification`) MUST:
     1. Authenticate the caller (`auth.uid()` / `userClient.auth.getUser()`).
     2. Explicitly verify membership in `public.household_members` before touching or broadcasting any `household_id` data.
     3. Include `SET search_path = public` in SQL and restrict grants (`REVOKE ALL FROM PUBLIC, anon; GRANT EXECUTE ... TO authenticated;`).
     4. Validate input lengths (`title`/`body`) and enforce relative navigation paths (`/^\/(?!\/)/`) for notification `url` fields.

6. **Indexes & Database `CHECK` Constraints (`HIGH-04`, `MED-18`):**
   - Add B-tree indexes on all foreign keys (`household_members(user_id)`, `meal_plans(household_id, date)`, `products(parent_id)`, etc.) and RLS filter columns.
   - Define SQL `CHECK` constraints for numeric invariants (`quantity >= 0`, `total_quantity > 0`, `servings > 0`, macro fields `>= 0`) and sensible `char_length(...)` limits on text fields.

7. **Automated Verification:**
   - Run `src/lib/__tests__/rlsSecurityAudit.test.ts` after adding or modifying any file in `supabase/migrations/`.

---

## 4. Reference Migrations
- Core RLS policies: [20260822000000_enable_rls_and_security_policies.sql](../../supabase/migrations/20260822000000_enable_rls_and_security_policies.sql)
- Household membership hardening (`CRIT-04`): [20261026150000_secure_household_members_rls.sql](../../supabase/migrations/20261026150000_secure_household_members_rls.sql)
- Multi-tenancy & FK hardening (`HIGH-03`, `HIGH-08`): [20261110121000_rls_security_audit_hardening.sql](../../supabase/migrations/20261110121000_rls_security_audit_hardening.sql), [20261115120000_harden_meals_ingredients_and_products_rls.sql](../../supabase/migrations/20261115120000_harden_meals_ingredients_and_products_rls.sql)
- Atomic archival RPC (`MED-06`): [20261110131000_archive_shopping_list_rpc.sql](../../supabase/migrations/20261110131000_archive_shopping_list_rpc.sql)
