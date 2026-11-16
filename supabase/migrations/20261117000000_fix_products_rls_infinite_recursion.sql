-- ==============================================================================
-- Migracja: 20261117000000_fix_products_rls_infinite_recursion.sql
-- Cel: Usunięcie błędu PostgreSQL 42P17 ("infinite recursion detected in policy
-- for relation products") z migracji 20261115120000.
-- Przyczyna: Bezpośrednie podzapytanie SELECT ... FROM public.products w klauzuli
-- WITH CHECK polityki INSERT/UPDATE tabeli public.products powoduje rekurencję
-- podczas planowania zapytania przez PostgreSQL.
-- Rozwiązanie: Wydzielenie walidacji spójności dzierżawcy parent_id do funkcji
-- SECURITY DEFINER (z SET search_path = public), analogicznie do
-- get_user_household_ids(auth.uid()).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.can_link_parent_product(
  p_parent_id UUID,
  p_household_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_parent_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = p_parent_id
        AND (
          p.household_id IS NULL
          OR p.type = 'Global'
          OR p.household_id = p_household_id
        )
    );
$$;

REVOKE ALL ON FUNCTION public.can_link_parent_product(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_link_parent_product(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can insert household products" ON public.products;
CREATE POLICY "Authenticated users can insert household products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  AND public.can_link_parent_product(parent_id, household_id)
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
  AND public.can_link_parent_product(parent_id, household_id)
);
