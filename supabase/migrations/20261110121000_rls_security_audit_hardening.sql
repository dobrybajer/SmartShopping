-- ==============================================================================
-- Migracja: 20261110121000_rls_security_audit_hardening.sql
-- Cel (HIGH-03): Uszczelnienie luk multi-tenancy wykrytych podczas audytu RLS:
-- 1. push_subscriptions UPDATE WITH CHECK - blokada przeniesienia subskrypcji
--    do obcego gospodarstwa (wyciek powiadomień push między gospodarstwami).
-- 2. meal_ingredients UPDATE - jawna klauzula WITH CHECK zapobiegająca
--    przypisaniu składnika do posiłku z obcego gospodarstwa.
-- 3. meal_plans - wymuszenie roli TO authenticated oraz walidacja własności
--    referencji meal_id w klauzulach WITH CHECK (blokada cross-tenant FK probing).
-- 4. shopping_list_items - walidacja referencji meal_plan_item_id w WITH CHECK.
-- 5. users SELECT - oparcie widoczności domowników wyłącznie o household_members.
-- ==============================================================================

-- 1. push_subscriptions: naprawa polityki UPDATE (brakujący warunek household_id)
DROP POLICY IF EXISTS "Users can update their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can update their own push subscriptions"
ON public.push_subscriptions
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND household_id IN (SELECT public.get_user_household_ids(auth.uid()))
)
WITH CHECK (
  auth.uid() = user_id
  AND household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

-- 2. meal_ingredients: jawna klauzula WITH CHECK dla UPDATE
DROP POLICY IF EXISTS "Authenticated users can update meal ingredients" ON public.meal_ingredients;
CREATE POLICY "Authenticated users can update meal ingredients"
ON public.meal_ingredients
FOR UPDATE
TO authenticated
USING (
  meal_id IN (
    SELECT id FROM public.meals
    WHERE household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  )
)
WITH CHECK (
  meal_id IN (
    SELECT id FROM public.meals
    WHERE household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  )
);

-- 3. meal_plans: wymuszenie TO authenticated i weryfikacja własności meal_id
DROP POLICY IF EXISTS "Household members can select meal plans" ON public.meal_plans;
CREATE POLICY "Household members can select meal plans"
ON public.meal_plans
FOR SELECT
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Household members can insert meal plans" ON public.meal_plans;
CREATE POLICY "Household members can insert meal plans"
ON public.meal_plans
FOR INSERT
TO authenticated
WITH CHECK (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  AND (
    meal_id IS NULL
    OR meal_id IN (
      SELECT id FROM public.meals
      WHERE household_id IS NULL
         OR type = 'Global'
         OR household_id IN (SELECT public.get_user_household_ids(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "Household members can update meal plans" ON public.meal_plans;
CREATE POLICY "Household members can update meal plans"
ON public.meal_plans
FOR UPDATE
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
)
WITH CHECK (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  AND (
    meal_id IS NULL
    OR meal_id IN (
      SELECT id FROM public.meals
      WHERE household_id IS NULL
         OR type = 'Global'
         OR household_id IN (SELECT public.get_user_household_ids(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "Household members can delete meal plans" ON public.meal_plans;
CREATE POLICY "Household members can delete meal plans"
ON public.meal_plans
FOR DELETE
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

-- 4. shopping_list_items: weryfikacja meal_plan_item_id w klauzulach WITH CHECK
DROP POLICY IF EXISTS "Authenticated users can insert household shopping list items" ON public.shopping_list_items;
CREATE POLICY "Authenticated users can insert household shopping list items"
ON public.shopping_list_items
FOR INSERT
TO authenticated
WITH CHECK (
  shopping_list_id IN (
    SELECT id FROM public.shopping_lists
    WHERE household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  )
  AND (
    meal_plan_item_id IS NULL
    OR meal_plan_item_id IN (
      SELECT id FROM public.meal_plans
      WHERE household_id IN (SELECT public.get_user_household_ids(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "Authenticated users can update household shopping list items" ON public.shopping_list_items;
CREATE POLICY "Authenticated users can update household shopping list items"
ON public.shopping_list_items
FOR UPDATE
TO authenticated
USING (
  shopping_list_id IN (
    SELECT id FROM public.shopping_lists
    WHERE household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  )
)
WITH CHECK (
  shopping_list_id IN (
    SELECT id FROM public.shopping_lists
    WHERE household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  )
  AND (
    meal_plan_item_id IS NULL
    OR meal_plan_item_id IN (
      SELECT id FROM public.meal_plans
      WHERE household_id IN (SELECT public.get_user_household_ids(auth.uid()))
    )
  )
);

-- 5. users: usunięcie podatności na odczyt byłego domownika przez nieaktualne users.household_id
DROP POLICY IF EXISTS "Users can read self and household members" ON public.users;
CREATE POLICY "Users can read self and household members"
ON public.users
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR id IN (
    SELECT user_id FROM public.household_members
    WHERE household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  )
);

