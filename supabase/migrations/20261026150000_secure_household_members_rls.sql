-- ==============================================================================
-- Migracja: 20261026150000_secure_household_members_rls.sql
-- Cel: Załatanie luki bezpieczeństwa CRIT-04 w tabeli household_members
-- 1. Zastąpienie otwartej polityki INSERT polityką weryfikującą członkostwo lub aktywne zaproszenie
-- 2. Utworzenie bezpiecznej funkcji RPC create_household_with_member (SECURITY DEFINER)
-- ==============================================================================

-- 1. Usunięcie niebezpiecznej polityki INSERT
DROP POLICY IF EXISTS "Users can join or add members to their households" ON public.household_members;

-- 2. Utworzenie szczelnej polityki INSERT
-- Pozwala dodać rekord do household_members TYLKO gdy:
-- a) Użytkownik wykonujący zapytanie jest już członkiem tego gospodarstwa (dodaje domownika)
-- b) Użytkownik wstawia sam siebie (user_id = auth.uid()) i posiada aktywne zaproszenie w household_invites dopasowane do swojego emaila
CREATE POLICY "Users can add members to their households or accept invites"
ON public.household_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Wariant a: Istniejący członek gospodarstwa
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  -- Wariant b: Samodzielne dołączenie wyłącznie z aktywnym zaproszeniem
  OR (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.household_invites
      WHERE public.household_invites.household_id = public.household_members.household_id
        AND lower(public.household_invites.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    )
  )
);

-- 3. Bezpieczna funkcja RPC do tworzenia nowego gospodarstwa domowego (SECURITY DEFINER)
-- Umożliwia zalogowanemu użytkownikowi utworzenie nowego gospodarstwa i atomowe dodanie siebie
-- jako pierwszego członka bez naruszania uszczelnionej polityki RLS.
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

  v_household_id := gen_random_uuid();
  v_created_at := NOW();

  -- Tworzymy gospodarstwo domowe
  INSERT INTO public.households (id, name, created_at)
  VALUES (v_household_id, v_household_name, v_created_at);

  -- Dodajemy twórcę jako pierwszego członka
  INSERT INTO public.household_members (household_id, user_id, created_at)
  VALUES (v_household_id, v_user_id, v_created_at);

  -- Zwracamy utworzone gospodarstwo
  SELECT jsonb_build_object(
    'id', v_household_id,
    'name', v_household_name,
    'created_at', v_created_at
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_household_with_member(TEXT) TO authenticated;
