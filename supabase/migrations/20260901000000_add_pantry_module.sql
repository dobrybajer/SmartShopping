-- ADR-008: Household Pantry Management, Real-Time Inventory Sync & Cross-List Freshness Intelligence
-- Non-breaking, additive migration. Safe to re-run (idempotent guards everywhere).

-- 1. Extend product_categories with is_non_food flag for freshness recency rules
ALTER TABLE public.product_categories
ADD COLUMN IF NOT EXISTS is_non_food BOOLEAN NOT NULL DEFAULT FALSE;

-- Update seeded categories: 7 ('household') and 8 ('other') are non-food
UPDATE public.product_categories
SET is_non_food = TRUE
WHERE id IN (7, 8) OR LOWER(name) IN ('household', 'other');

-- 2. Extend shopping_list_items with in_pantry status flag
ALTER TABLE public.shopping_list_items
ADD COLUMN IF NOT EXISTS in_pantry BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Create pantry_items table with strict household multi-tenancy
CREATE TABLE IF NOT EXISTS public.pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  ad_hoc_name TEXT NULL,
  category_id INT REFERENCES public.product_categories(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit_type public.unit_enum NOT NULL DEFAULT 'pcs',
  last_purchased_at TIMESTAMPTZ NULL,
  last_verified_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure a household has at most one pantry entry per catalog product
CREATE UNIQUE INDEX IF NOT EXISTS idx_pantry_items_household_product
ON public.pantry_items (household_id, product_id)
WHERE product_id IS NOT NULL;

-- General query indexing
CREATE INDEX IF NOT EXISTS idx_pantry_items_household_id
ON public.pantry_items (household_id);

CREATE INDEX IF NOT EXISTS idx_pantry_items_last_purchased
ON public.pantry_items (household_id, last_purchased_at DESC);

-- Keep updated_at fresh on every UPDATE
CREATE OR REPLACE FUNCTION public.set_pantry_items_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pantry_items_updated_at ON public.pantry_items;
CREATE TRIGGER trg_pantry_items_updated_at
BEFORE UPDATE ON public.pantry_items
FOR EACH ROW
EXECUTE FUNCTION public.set_pantry_items_updated_at();

-- 4. Enable Row Level Security (RLS) on pantry_items
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read household pantry items" ON public.pantry_items;
CREATE POLICY "Users can read household pantry items"
ON public.pantry_items
FOR SELECT
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Users can insert household pantry items" ON public.pantry_items;
CREATE POLICY "Users can insert household pantry items"
ON public.pantry_items
FOR INSERT
TO authenticated
WITH CHECK (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Users can update household pantry items" ON public.pantry_items;
CREATE POLICY "Users can update household pantry items"
ON public.pantry_items
FOR UPDATE
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
)
WITH CHECK (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Users can delete household pantry items" ON public.pantry_items;
CREATE POLICY "Users can delete household pantry items"
ON public.pantry_items
FOR DELETE
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

-- 5. Add pantry_items to Supabase Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'pantry_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pantry_items;
  END IF;
END $$;
