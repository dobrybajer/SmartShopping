-- ==============================================================================
-- Migracja: 20261115120000_harden_meals_ingredients_and_products_rls.sql
-- Cel (HIGH-08): Uszczelnienie polityk RLS INSERT/UPDATE dla tabel meals,
-- meal_ingredients oraz walidacji parent_id w products:
-- 1. meals INSERT/UPDATE - blokada wstrzykiwania przepisów globalnych
--    (household_id IS NULL) z poziomu klienta; wymagana jawna przynależność
--    household_id IN (SELECT public.get_user_household_ids(auth.uid())).
-- 2. meal_ingredients INSERT/UPDATE - blokada dopisywania/modyfikacji składników
--    w przepisach globalnych oraz weryfikacja spójności dzierżawcy (tenant isolation)
--    dla product_id i reference_product_id (wyłącznie produkt globalny lub należący
--    do tego samego gospodarstwa co przepis).
-- 3. products INSERT/UPDATE - weryfikacja spójności dzierżawcy dla parent_id
--    (wyłącznie produkt globalny lub należący do tego samego gospodarstwa).
-- ==============================================================================

-- 1. meals: blokada wstawiania/aktualizacji przepisów globalnych z poziomu klienta
DROP POLICY IF EXISTS "Authenticated users can insert meals" ON public.meals;
CREATE POLICY "Authenticated users can insert meals"
ON public.meals
FOR INSERT
TO authenticated
WITH CHECK (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Authenticated users can update own household meals" ON public.meals;
CREATE POLICY "Authenticated users can update own household meals"
ON public.meals
FOR UPDATE
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
)
WITH CHECK (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

-- 2. meal_ingredients: blokada modyfikacji składników dań globalnych oraz
--    weryfikacja tenant-isolation dla product_id i reference_product_id
DROP POLICY IF EXISTS "Authenticated users can insert meal ingredients" ON public.meal_ingredients;
CREATE POLICY "Authenticated users can insert meal ingredients"
ON public.meal_ingredients
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.meals m
    WHERE m.id = meal_id
      AND m.household_id IN (SELECT public.get_user_household_ids(auth.uid()))
      AND (
        product_id IS NULL
        OR product_id IN (
          SELECT p.id FROM public.products p
          WHERE p.household_id IS NULL
             OR p.type = 'Global'
             OR p.household_id = m.household_id
        )
      )
      AND (
        reference_product_id IS NULL
        OR reference_product_id IN (
          SELECT rp.id FROM public.products rp
          WHERE rp.household_id IS NULL
             OR rp.type = 'Global'
             OR rp.household_id = m.household_id
        )
      )
  )
);

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
  EXISTS (
    SELECT 1 FROM public.meals m
    WHERE m.id = meal_id
      AND m.household_id IN (SELECT public.get_user_household_ids(auth.uid()))
      AND (
        product_id IS NULL
        OR product_id IN (
          SELECT p.id FROM public.products p
          WHERE p.household_id IS NULL
             OR p.type = 'Global'
             OR p.household_id = m.household_id
        )
      )
      AND (
        reference_product_id IS NULL
        OR reference_product_id IN (
          SELECT rp.id FROM public.products rp
          WHERE rp.household_id IS NULL
             OR rp.type = 'Global'
             OR rp.household_id = m.household_id
        )
      )
  )
);

-- 3. products: weryfikacja tenant-isolation dla parent_id w INSERT oraz UPDATE
DROP POLICY IF EXISTS "Authenticated users can insert household products" ON public.products;
CREATE POLICY "Authenticated users can insert household products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  AND (
    parent_id IS NULL
    OR parent_id IN (
      SELECT p.id FROM public.products p
      WHERE p.household_id IS NULL
         OR p.type = 'Global'
         OR p.household_id = products.household_id
    )
  )
);

DROP POLICY IF EXISTS "Authenticated users can update own household products" ON public.products;
CREATE POLICY "Authenticated users can update own household products"
ON public.products
FOR UPDATE
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
)
WITH CHECK (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  AND (
    parent_id IS NULL
    OR parent_id IN (
      SELECT p.id FROM public.products p
      WHERE p.household_id IS NULL
         OR p.type = 'Global'
         OR p.household_id = products.household_id
    )
  )
);
