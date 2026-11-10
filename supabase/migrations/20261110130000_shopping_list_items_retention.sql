-- ==============================================================================
-- Migracja: 20261110130000_shopping_list_items_retention.sql
-- Cel (MED-02): Mechanizm ręcznej retencji i archiwizacji starych pozycji list zakupowych
-- Bez harmonogramu CRON - procedura uruchamiana ręcznie w razie potrzeby.
-- ==============================================================================

-- 1. Dodanie kolumny snapshotu JSON na nagłówkach list zakupowych dla szybkich statystyk
ALTER TABLE public.shopping_lists
ADD COLUMN IF NOT EXISTS archived_items_snapshot JSONB NULL;

-- 2. Utworzenie tabeli archiwalnej dla pozycji ze starych zarchiwizowanych list
CREATE TABLE IF NOT EXISTS public.shopping_list_items_archive (
  id UUID PRIMARY KEY,
  shopping_list_id UUID NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  category_id INT REFERENCES public.product_categories(id) ON DELETE SET NULL,
  total_quantity NUMERIC NOT NULL,
  is_checked BOOLEAN DEFAULT FALSE,
  in_pantry BOOLEAN DEFAULT FALSE,
  added_ad_hoc BOOLEAN DEFAULT FALSE,
  meal_plan_item_id UUID NULL,
  updated_at TIMESTAMPTZ NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_archive_list_id
ON public.shopping_list_items_archive(shopping_list_id);

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_archive_archived_at
ON public.shopping_list_items_archive(archived_at DESC);

-- 3. Włączenie RLS na tabeli archiwalnej i przypisanie izolacji multi-tenancy
ALTER TABLE public.shopping_list_items_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read household archived items" ON public.shopping_list_items_archive;
CREATE POLICY "Authenticated users can read household archived items"
ON public.shopping_list_items_archive
FOR SELECT
TO authenticated
USING (
  shopping_list_id IN (
    SELECT id FROM public.shopping_lists
    WHERE household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Authenticated users can insert household archived items" ON public.shopping_list_items_archive;
CREATE POLICY "Authenticated users can insert household archived items"
ON public.shopping_list_items_archive
FOR INSERT
TO authenticated
WITH CHECK (
  shopping_list_id IN (
    SELECT id FROM public.shopping_lists
    WHERE household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Authenticated users can update household archived items" ON public.shopping_list_items_archive;
CREATE POLICY "Authenticated users can update household archived items"
ON public.shopping_list_items_archive
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
);

DROP POLICY IF EXISTS "Authenticated users can delete household archived items" ON public.shopping_list_items_archive;
CREATE POLICY "Authenticated users can delete household archived items"
ON public.shopping_list_items_archive
FOR DELETE
TO authenticated
USING (
  shopping_list_id IN (
    SELECT id FROM public.shopping_lists
    WHERE household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  )
);

-- 4. Procedura do ręcznej archiwizacji starych pozycji (brak harmonogramu CRON)
-- Przenosi pozycje z list o statusie 'archived' starszych niż p_retention_months miesięcy
-- do tabeli shopping_list_items_archive i zapisuje podsumowanie JSON w nagłówku listy.
CREATE OR REPLACE FUNCTION public.archive_old_shopping_list_items(p_retention_months INT DEFAULT 12)
RETURNS TABLE(archived_lists_count INT, archived_items_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_target_list_ids UUID[];
  v_lists_count INT := 0;
  v_items_count INT := 0;
BEGIN
  IF p_retention_months < 1 THEN
    RAISE EXCEPTION 'p_retention_months must be at least 1';
  END IF;

  v_cutoff := NOW() - make_interval(months => p_retention_months);

  -- Lista kwalifikujących się zarchiwizowanych list posiadających jeszcze aktywne wiersze w shopping_list_items
  SELECT ARRAY_AGG(sl.id)
  INTO v_target_list_ids
  FROM public.shopping_lists sl
  WHERE sl.status = 'archived'
    AND COALESCE(sl.completed_at, sl.updated_at, sl.created_at) < v_cutoff
    AND EXISTS (
      SELECT 1 FROM public.shopping_list_items sli
      WHERE sli.shopping_list_id = sl.id
    );

  IF v_target_list_ids IS NULL OR array_length(v_target_list_ids, 1) IS NULL THEN
    RETURN QUERY SELECT 0, 0;
    RETURN;
  END IF;

  -- 1. Zapis podsumowania JSON w nagłówkach zarchiwizowanych list
  WITH snapshots AS (
    SELECT
      sli.shopping_list_id,
      jsonb_build_object(
        'archived_at', NOW(),
        'retention_months', p_retention_months,
        'total_items', COUNT(*),
        'checked_items', COUNT(*) FILTER (WHERE sli.is_checked = TRUE),
        'items', jsonb_agg(
          jsonb_build_object(
            'product_id', sli.product_id,
            'total_quantity', sli.total_quantity,
            'is_checked', sli.is_checked
          )
        )
      ) AS snapshot_json
    FROM public.shopping_list_items sli
    WHERE sli.shopping_list_id = ANY(v_target_list_ids)
    GROUP BY sli.shopping_list_id
  )
  UPDATE public.shopping_lists sl
  SET archived_items_snapshot = s.snapshot_json
  FROM snapshots s
  WHERE sl.id = s.shopping_list_id;

  GET DIAGNOSTICS v_lists_count = ROW_COUNT;

  -- 2. Przeniesienie pozycji do tabeli archiwalnej
  INSERT INTO public.shopping_list_items_archive (
    id,
    shopping_list_id,
    product_id,
    category_id,
    total_quantity,
    is_checked,
    in_pantry,
    added_ad_hoc,
    meal_plan_item_id,
    updated_at,
    archived_at
  )
  SELECT
    sli.id,
    sli.shopping_list_id,
    sli.product_id,
    sli.category_id,
    sli.total_quantity,
    sli.is_checked,
    COALESCE(sli.in_pantry, FALSE),
    COALESCE(sli.added_ad_hoc, FALSE),
    sli.meal_plan_item_id,
    sli.updated_at,
    NOW()
  FROM public.shopping_list_items sli
  WHERE sli.shopping_list_id = ANY(v_target_list_ids)
  ON CONFLICT (id) DO NOTHING;

  -- 3. Usunięcie przeniesionych pozycji z aktywnej tabeli roboczej
  DELETE FROM public.shopping_list_items sli
  WHERE sli.shopping_list_id = ANY(v_target_list_ids);

  GET DIAGNOSTICS v_items_count = ROW_COUNT;

  RETURN QUERY SELECT v_lists_count, v_items_count;
END;
$$;

-- Ograniczenie wykonania wyłącznie do roli administracyjnej / SQL Editor (brak dostępu dla zwykłych klientów API)
REVOKE ALL ON FUNCTION public.archive_old_shopping_list_items(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.archive_old_shopping_list_items(INT) FROM anon;
REVOKE ALL ON FUNCTION public.archive_old_shopping_list_items(INT) FROM authenticated;

