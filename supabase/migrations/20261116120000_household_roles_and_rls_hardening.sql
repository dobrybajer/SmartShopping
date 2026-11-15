-- ==============================================================================
-- Migracja: 20261116120000_household_roles_and_rls_hardening.sql
-- Cel (HIGH-13): Role właściciela gospodarstwa domowego oraz uszczelnienie
-- polityk RLS dla tabel households i household_members:
-- 1. Dodanie kolumny role ('owner' | 'member') w public.household_members
--    z CHECK constraintem oraz indeksem wspierającym RLS.
-- 2. Backfill najstarszego członka każdego gospodarstwa jako 'owner'.
-- 3. Funkcja pomocnicza public.is_household_owner(_household_id, _user_id).
-- 4. Aktualizacja RPC create_household_with_member nadająca twórcy rolę 'owner'
--    z walidacją długości nazwy gospodarstwa.
-- 5. Zaostrzenie polityk households (INSERT/DELETE tylko właściciel) oraz
--    household_members DELETE (samodzielne odejście lub usunięcie przez właściciela).
-- ==============================================================================

-- 1. Kolumna role w public.household_members
ALTER TABLE public.household_members
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member';

ALTER TABLE public.household_members
  DROP CONSTRAINT IF EXISTS chk_household_members_role;

ALTER TABLE public.household_members
  ADD CONSTRAINT chk_household_members_role
  CHECK (role IN ('owner', 'member'));

CREATE INDEX IF NOT EXISTS idx_household_members_household_role
  ON public.household_members (household_id, user_id, role);

-- 2. Backfill: najstarszy członek każdego gospodarstwa zostaje właścicielem ('owner'),
--    jeśli dane gospodarstwo nie ma jeszcze przypisanego właściciela.
WITH first_members AS (
  SELECT DISTINCT ON (household_id) id
  FROM public.household_members
  ORDER BY household_id, created_at ASC NULLS LAST, id ASC
)
UPDATE public.household_members hm
SET role = 'owner'
FROM first_members fm
WHERE hm.id = fm.id
  AND hm.role <> 'owner'
  AND NOT EXISTS (
    SELECT 1
    FROM public.household_members existing_owner
    WHERE existing_owner.household_id = hm.household_id
      AND existing_owner.role = 'owner'
  );

-- 3. Funkcja sprawdzająca uprawnienia właściciela gospodarstwa (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_household_owner(_household_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members
    WHERE household_id = _household_id
      AND user_id = _user_id
      AND role = 'owner'
  );
$$;

REVOKE ALL ON FUNCTION public.is_household_owner(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_household_owner(UUID, UUID) TO authenticated, service_role;

-- 4. Aktualizacja RPC create_household_with_member (twórca otrzymuje rolę 'owner')
CREATE OR REPLACE FUNCTION public.create_household_with_member(p_name TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_household_id UUID;
  v_household_name TEXT;
  v_created_at TIMESTAMPTZ;
  v_result jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User is not authenticated';
  END IF;

  v_household_name := TRIM(COALESCE(p_name, 'Moje Gospodarstwo'));
  IF v_household_name = '' THEN
    v_household_name := 'Moje Gospodarstwo';
  END IF;

  IF char_length(v_household_name) > 120 THEN
    RAISE EXCEPTION 'Household name too long (max 120 characters)';
  END IF;

  v_household_id := gen_random_uuid();
  v_created_at := NOW();

  INSERT INTO public.households (id, name, created_at)
  VALUES (v_household_id, v_household_name, v_created_at);

  INSERT INTO public.household_members (household_id, user_id, role, created_at)
  VALUES (v_household_id, v_user_id, 'owner', v_created_at);

  SELECT jsonb_build_object(
    'id', v_household_id,
    'name', v_household_name,
    'created_at', v_created_at
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.create_household_with_member(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_household_with_member(TEXT) TO authenticated, service_role;

-- 5. Zaostrzenie polityk RLS dla tabeli public.households
DROP POLICY IF EXISTS "Authenticated users can create households" ON public.households;
CREATE POLICY "Authenticated users can create households"
ON public.households
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Members can delete their household" ON public.households;
DROP POLICY IF EXISTS "Owners can delete their household" ON public.households;
CREATE POLICY "Owners can delete their household"
ON public.households
FOR DELETE
TO authenticated
USING (
  public.is_household_owner(id, auth.uid())
);

-- 6. Zaostrzenie polityki DELETE dla tabeli public.household_members
--    Użytkownik może usunąć sam siebie (opuścić gospodarstwo) lub właściciel może usunąć dowolnego członka.
DROP POLICY IF EXISTS "Users can leave or remove members from their households" ON public.household_members;
DROP POLICY IF EXISTS "Users can leave or owners can remove members from their households" ON public.household_members;
CREATE POLICY "Users can leave or owners can remove members from their households"
ON public.household_members
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_household_owner(household_id, auth.uid())
);
