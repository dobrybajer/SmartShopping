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

## 3. Reference Migration
Refer to [20260822000000_enable_rls_and_security_policies.sql](../../supabase/migrations/20260822000000_enable_rls_and_security_policies.sql) for the exact reference implementation across all core tables (`households`, `users`, `household_members`, `products`, `meals`, `meal_ingredients`, `shopping_lists`, `shopping_list_items`).
