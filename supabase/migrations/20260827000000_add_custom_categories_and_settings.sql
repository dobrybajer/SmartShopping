-- 1. Rozszerzenie product_categories o household_id dla własnych kategorii gospodarstwa
ALTER TABLE public.product_categories
ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NULL;

-- Indeks wyszukiwania kategorii
CREATE INDEX IF NOT EXISTS idx_product_categories_household_id 
ON public.product_categories (household_id);

-- Włączenie / aktualizacja RLS na product_categories
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read product categories" ON public.product_categories;
DROP POLICY IF EXISTS "Users can read global and household product categories" ON public.product_categories;
CREATE POLICY "Users can read global and household product categories"
ON public.product_categories
FOR SELECT
TO authenticated
USING (
  household_id IS NULL 
  OR household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Users can insert household product categories" ON public.product_categories;
CREATE POLICY "Users can insert household product categories"
ON public.product_categories
FOR INSERT
TO authenticated
WITH CHECK (
  household_id IS NOT NULL 
  AND household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Users can update household product categories" ON public.product_categories;
CREATE POLICY "Users can update household product categories"
ON public.product_categories
FOR UPDATE
TO authenticated
USING (
  household_id IS NOT NULL 
  AND household_id IN (SELECT public.get_user_household_ids(auth.uid()))
)
WITH CHECK (
  household_id IS NOT NULL 
  AND household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Users can delete household product categories" ON public.product_categories;
CREATE POLICY "Users can delete household product categories"
ON public.product_categories
FOR DELETE
TO authenticated
USING (
  household_id IS NOT NULL 
  AND household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

-- 2. Tabela: household_category_settings (Kolejność alejek i ukrywanie per gospodarstwo)
CREATE TABLE IF NOT EXISTS public.household_category_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES public.product_categories(id) ON DELETE CASCADE,
  custom_sort_order INT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  custom_name TEXT NULL,
  store_profile_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_household_category UNIQUE (household_id, category_id)
);

-- Indeksy wydajnościowe
CREATE INDEX IF NOT EXISTS idx_household_category_settings_lookup 
ON public.household_category_settings (household_id, category_id);

CREATE INDEX IF NOT EXISTS idx_household_category_settings_order 
ON public.household_category_settings (household_id, custom_sort_order ASC);

-- RLS na household_category_settings
ALTER TABLE public.household_category_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view household category settings" ON public.household_category_settings;
CREATE POLICY "Users can view household category settings"
ON public.household_category_settings
FOR SELECT
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Users can insert household category settings" ON public.household_category_settings;
CREATE POLICY "Users can insert household category settings"
ON public.household_category_settings
FOR INSERT
TO authenticated
WITH CHECK (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Users can update household category settings" ON public.household_category_settings;
CREATE POLICY "Users can update household category settings"
ON public.household_category_settings
FOR UPDATE
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
)
WITH CHECK (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Users can delete household category settings" ON public.household_category_settings;
CREATE POLICY "Users can delete household category settings"
ON public.household_category_settings
FOR DELETE
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

-- 3. Replikacja Realtime dla synchronizacji urządzeń domowników
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'household_category_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.household_category_settings;
  END IF;
END $$;
