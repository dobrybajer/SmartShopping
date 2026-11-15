-- ==============================================================================
-- Migracja: 20261116150000_weekly_templates_sync_archive_plan_id_and_check_constraints.sql
-- Cel (MED-16, MED-17, MED-18):
--   1. (MED-16) Zachowanie powiązania meal_plan_item_id dla niekupionych pozycji
--      zwracanych do draftu podczas archiwizacji listy w RPC archive_shopping_list.
--   2. (MED-17) Synchronizowana tabela public.weekly_meal_templates w Supabase
--      (z RLS multi-tenant, indeksami, triggerem updated_at oraz Realtime).
--   3. (MED-18) Idempotentne constrainty CHECK (liczby nieujemne / dodatnie ilości /
--      limity długości char_length) na tabelach domenowych.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. (MED-16) Aktualizacja RPC archive_shopping_list (zachowanie meal_plan_item_id)
-- ------------------------------------------------------------------------------
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

  -- 3. Pobranie niekupionych pozycji (is_checked = FALSE AND in_pantry = FALSE) z meal_plan_item_id
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
        'is_ad_hoc', COALESCE(sli.added_ad_hoc, FALSE),
        'meal_plan_item_id', sli.meal_plan_item_id
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

-- ------------------------------------------------------------------------------
-- 2. (MED-17) Tabela public.weekly_meal_templates (szablony tygodniowe w Supabase)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_meal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_weekly_meal_templates_name_length CHECK (char_length(TRIM(name)) >= 1 AND char_length(name) <= 120),
  CONSTRAINT chk_weekly_meal_templates_entries_array CHECK (jsonb_typeof(entries) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_weekly_meal_templates_household_id
  ON public.weekly_meal_templates (household_id);

CREATE INDEX IF NOT EXISTS idx_weekly_meal_templates_household_created
  ON public.weekly_meal_templates (household_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_weekly_meal_templates_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_weekly_meal_templates_updated_at ON public.weekly_meal_templates;
CREATE TRIGGER trg_weekly_meal_templates_updated_at
  BEFORE UPDATE ON public.weekly_meal_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_weekly_meal_templates_updated_at();

ALTER TABLE public.weekly_meal_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select household weekly templates" ON public.weekly_meal_templates;
CREATE POLICY "Users can select household weekly templates"
  ON public.weekly_meal_templates
  FOR SELECT
  TO authenticated
  USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can insert household weekly templates" ON public.weekly_meal_templates;
CREATE POLICY "Users can insert household weekly templates"
  ON public.weekly_meal_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can update household weekly templates" ON public.weekly_meal_templates;
CREATE POLICY "Users can update household weekly templates"
  ON public.weekly_meal_templates
  FOR UPDATE
  TO authenticated
  USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())))
  WITH CHECK (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can delete household weekly templates" ON public.weekly_meal_templates;
CREATE POLICY "Users can delete household weekly templates"
  ON public.weekly_meal_templates
  FOR DELETE
  TO authenticated
  USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'weekly_meal_templates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_meal_templates;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. (MED-18) Idempotentne constrainty CHECK dla spójności danych domenowych
-- ------------------------------------------------------------------------------

-- households
ALTER TABLE public.households
  DROP CONSTRAINT IF EXISTS chk_households_name_length;
ALTER TABLE public.households
  ADD CONSTRAINT chk_households_name_length
  CHECK (char_length(TRIM(name)) >= 1 AND char_length(name) <= 120);

-- products
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS chk_products_name_length;
ALTER TABLE public.products
  ADD CONSTRAINT chk_products_name_length
  CHECK (char_length(TRIM(name)) >= 1 AND char_length(name) <= 200);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS chk_products_macros_non_negative;
ALTER TABLE public.products
  ADD CONSTRAINT chk_products_macros_non_negative
  CHECK (
    (kcal_per_100 IS NULL OR kcal_per_100 >= 0)
    AND (protein_per_100 IS NULL OR protein_per_100 >= 0)
    AND (carbs_per_100 IS NULL OR carbs_per_100 >= 0)
    AND (fat_per_100 IS NULL OR fat_per_100 >= 0)
  );

-- meals
ALTER TABLE public.meals
  DROP CONSTRAINT IF EXISTS chk_meals_name_length;
ALTER TABLE public.meals
  ADD CONSTRAINT chk_meals_name_length
  CHECK (char_length(TRIM(name)) >= 1 AND char_length(name) <= 200);

ALTER TABLE public.meals
  DROP CONSTRAINT IF EXISTS chk_meals_description_length;
ALTER TABLE public.meals
  ADD CONSTRAINT chk_meals_description_length
  CHECK (description IS NULL OR char_length(description) <= 4000);

ALTER TABLE public.meals
  DROP CONSTRAINT IF EXISTS chk_meals_preparation_steps_length;
ALTER TABLE public.meals
  ADD CONSTRAINT chk_meals_preparation_steps_length
  CHECK (preparation_steps IS NULL OR char_length(preparation_steps) <= 10000);

ALTER TABLE public.meals
  DROP CONSTRAINT IF EXISTS chk_meals_comments_length;
ALTER TABLE public.meals
  ADD CONSTRAINT chk_meals_comments_length
  CHECK (comments IS NULL OR char_length(comments) <= 4000);

-- meal_ingredients
ALTER TABLE public.meal_ingredients
  DROP CONSTRAINT IF EXISTS chk_meal_ingredients_base_quantity_positive;
ALTER TABLE public.meal_ingredients
  ADD CONSTRAINT chk_meal_ingredients_base_quantity_positive
  CHECK (base_quantity > 0);

-- shopping_lists
ALTER TABLE public.shopping_lists
  DROP CONSTRAINT IF EXISTS chk_shopping_lists_name_length;
ALTER TABLE public.shopping_lists
  ADD CONSTRAINT chk_shopping_lists_name_length
  CHECK (name IS NULL OR char_length(name) <= 150);

ALTER TABLE public.shopping_lists
  DROP CONSTRAINT IF EXISTS chk_shopping_lists_original_name_length;
ALTER TABLE public.shopping_lists
  ADD CONSTRAINT chk_shopping_lists_original_name_length
  CHECK (original_name IS NULL OR char_length(original_name) <= 150);

-- shopping_list_items
ALTER TABLE public.shopping_list_items
  DROP CONSTRAINT IF EXISTS chk_shopping_list_items_total_quantity_positive;
ALTER TABLE public.shopping_list_items
  ADD CONSTRAINT chk_shopping_list_items_total_quantity_positive
  CHECK (total_quantity > 0);

-- pantry_items
ALTER TABLE public.pantry_items
  DROP CONSTRAINT IF EXISTS chk_pantry_items_quantity_non_negative;
ALTER TABLE public.pantry_items
  ADD CONSTRAINT chk_pantry_items_quantity_non_negative
  CHECK (quantity >= 0);

ALTER TABLE public.pantry_items
  DROP CONSTRAINT IF EXISTS chk_pantry_items_ad_hoc_name_length;
ALTER TABLE public.pantry_items
  ADD CONSTRAINT chk_pantry_items_ad_hoc_name_length
  CHECK (ad_hoc_name IS NULL OR char_length(ad_hoc_name) <= 200);

-- meal_plans
ALTER TABLE public.meal_plans
  DROP CONSTRAINT IF EXISTS chk_meal_plans_servings_positive;
ALTER TABLE public.meal_plans
  ADD CONSTRAINT chk_meal_plans_servings_positive
  CHECK (servings > 0);

ALTER TABLE public.meal_plans
  DROP CONSTRAINT IF EXISTS chk_meal_plans_target_kcal_non_negative;
ALTER TABLE public.meal_plans
  ADD CONSTRAINT chk_meal_plans_target_kcal_non_negative
  CHECK (target_kcal IS NULL OR target_kcal >= 0);

ALTER TABLE public.meal_plans
  DROP CONSTRAINT IF EXISTS chk_meal_plans_sort_order_non_negative;
ALTER TABLE public.meal_plans
  ADD CONSTRAINT chk_meal_plans_sort_order_non_negative
  CHECK (sort_order >= 0);

ALTER TABLE public.meal_plans
  DROP CONSTRAINT IF EXISTS chk_meal_plans_custom_name_length;
ALTER TABLE public.meal_plans
  ADD CONSTRAINT chk_meal_plans_custom_name_length
  CHECK (custom_name IS NULL OR char_length(custom_name) <= 200);

ALTER TABLE public.meal_plans
  DROP CONSTRAINT IF EXISTS chk_meal_plans_notes_length;
ALTER TABLE public.meal_plans
  ADD CONSTRAINT chk_meal_plans_notes_length
  CHECK (notes IS NULL OR char_length(notes) <= 2000);

-- product_categories
ALTER TABLE public.product_categories
  DROP CONSTRAINT IF EXISTS chk_product_categories_name_length;
ALTER TABLE public.product_categories
  ADD CONSTRAINT chk_product_categories_name_length
  CHECK (char_length(TRIM(name)) >= 1 AND char_length(name) <= 100);

ALTER TABLE public.product_categories
  DROP CONSTRAINT IF EXISTS chk_product_categories_sort_order_non_negative;
ALTER TABLE public.product_categories
  ADD CONSTRAINT chk_product_categories_sort_order_non_negative
  CHECK (sort_order >= 0);

-- household_category_settings
ALTER TABLE public.household_category_settings
  DROP CONSTRAINT IF EXISTS chk_household_category_settings_sort_order_non_negative;
ALTER TABLE public.household_category_settings
  ADD CONSTRAINT chk_household_category_settings_sort_order_non_negative
  CHECK (custom_sort_order >= 0);

ALTER TABLE public.household_category_settings
  DROP CONSTRAINT IF EXISTS chk_household_category_settings_custom_name_length;
ALTER TABLE public.household_category_settings
  ADD CONSTRAINT chk_household_category_settings_custom_name_length
  CHECK (custom_name IS NULL OR char_length(custom_name) <= 100);
