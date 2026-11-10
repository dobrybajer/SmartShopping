-- ==============================================================================
-- Migracja: 20261110131000_archive_shopping_list_rpc.sql
-- Cel (MED-06): Atomowa funkcja RPC do archiwizacji aktywnej listy zakupowej.
-- W jednej transakcji:
--   1. Weryfikuje członkostwo użytkownika w gospodarstwie domowym.
--   2. Zamyka listę zakupową (status = 'archived', completed_at = NOW()).
--   3. Zasysa zakupione pozycje (is_checked = TRUE, in_pantry = FALSE) do pantry_items.
--   4. Zwraca nazwę listy oraz niekupione pozycje do przeniesienia do draftu.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.archive_shopping_list(
  p_list_id UUID,
  p_household_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_list RECORD;
  v_original_name TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_unchecked_items jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User is not authenticated';
  END IF;

  IF p_list_id IS NULL OR p_household_id IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments: list_id and household_id are required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.household_members hm
    WHERE hm.household_id = p_household_id
      AND hm.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Forbidden: User is not a member of household';
  END IF;

  SELECT sl.id, sl.name, sl.original_name
  INTO v_list
  FROM public.shopping_lists sl
  WHERE sl.id = p_list_id
    AND sl.household_id = p_household_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shopping list not found in household';
  END IF;

  v_original_name := COALESCE(v_list.original_name, v_list.name);

  -- 1. Archiwizacja nagłówka listy zakupowej
  UPDATE public.shopping_lists
  SET
    status = 'archived',
    is_default = FALSE,
    completed_at = v_now,
    updated_at = v_now,
    original_name = v_original_name
  WHERE id = p_list_id;

  -- 2. Atomowe zasilenie spiżarni zakupionymi pozycjami (is_checked = TRUE AND in_pantry = FALSE)
  INSERT INTO public.pantry_items (
    household_id,
    product_id,
    ad_hoc_name,
    category_id,
    quantity,
    unit_type,
    last_purchased_at,
    last_verified_at,
    updated_at
  )
  SELECT
    p_household_id,
    sli.product_id,
    NULL,
    MAX(COALESCE(sli.category_id, p.category_id)),
    ROUND(SUM(sli.total_quantity)::numeric, 1),
    COALESCE((ARRAY_AGG(p.unit_type) FILTER (WHERE p.unit_type IS NOT NULL))[1], 'pcs'::public.unit_enum),
    v_now,
    v_now,
    v_now
  FROM public.shopping_list_items sli
  LEFT JOIN public.products p ON p.id = sli.product_id
  WHERE sli.shopping_list_id = p_list_id
    AND sli.is_checked = TRUE
    AND COALESCE(sli.in_pantry, FALSE) = FALSE
    AND sli.product_id IS NOT NULL
    AND sli.total_quantity > 0
  GROUP BY sli.product_id
  ON CONFLICT (household_id, product_id) WHERE product_id IS NOT NULL
  DO UPDATE SET
    quantity = ROUND((public.pantry_items.quantity + EXCLUDED.quantity)::numeric, 1),
    category_id = COALESCE(EXCLUDED.category_id, public.pantry_items.category_id),
    unit_type = COALESCE(EXCLUDED.unit_type, public.pantry_items.unit_type),
    last_purchased_at = v_now,
    last_verified_at = v_now,
    updated_at = v_now;

  -- 3. Pobranie niekupionych pozycji (is_checked = FALSE AND in_pantry = FALSE)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', 'archived_rem_' || sli.id::text,
        'product_id', p.id,
        'name', p.name,
        'unit_type', p.unit_type,
        'category_id', COALESCE(sli.category_id, item_cat.id, p.category_id, prod_cat.id),
        'category_name', COALESCE(item_cat.name, prod_cat.name, 'other'),
        'sort_order', COALESCE(item_cat.sort_order, prod_cat.sort_order, 99),
        'quantity', sli.total_quantity,
        'is_ad_hoc', COALESCE(sli.added_ad_hoc, FALSE)
      )
      ORDER BY COALESCE(item_cat.sort_order, prod_cat.sort_order, 99), p.name
    ),
    '[]'::jsonb
  )
  INTO v_unchecked_items
  FROM public.shopping_list_items sli
  INNER JOIN public.products p ON p.id = sli.product_id
  LEFT JOIN public.product_categories item_cat ON item_cat.id = sli.category_id
  LEFT JOIN public.product_categories prod_cat ON prod_cat.id = p.category_id
  WHERE sli.shopping_list_id = p_list_id
    AND COALESCE(sli.is_checked, FALSE) = FALSE
    AND COALESCE(sli.in_pantry, FALSE) = FALSE;

  RETURN jsonb_build_object(
    'list_name', COALESCE(v_list.name, v_original_name),
    'unchecked_items', COALESCE(v_unchecked_items, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.archive_shopping_list(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_shopping_list(UUID, UUID) TO authenticated;

