-- ADR-009: Meal Planning & Calendar Module (Multi-View Scheduling & Shopping Pipeline Synchronization)
-- Non-breaking, additive migration. Safe to re-run (idempotent guards everywhere).

-- 1. Create public.meal_plans table
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_id UUID REFERENCES public.meals(id) ON DELETE CASCADE,
  meal_category_id INT REFERENCES public.meal_categories(id) ON DELETE SET NULL,
  custom_name TEXT NULL,
  is_ad_hoc BOOLEAN NOT NULL DEFAULT FALSE,
  servings NUMERIC NOT NULL DEFAULT 1 CHECK (servings > 0),
  target_kcal NUMERIC NULL,
  notes TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Extend shopping_list_items with meal_plan_item_id reference
ALTER TABLE public.shopping_list_items
ADD COLUMN IF NOT EXISTS meal_plan_item_id UUID REFERENCES public.meal_plans(id) ON DELETE SET NULL;

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_meal_plans_household_date
ON public.meal_plans (household_id, date);

CREATE INDEX IF NOT EXISTS idx_meal_plans_household_meal
ON public.meal_plans (household_id, meal_id);

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_meal_plan
ON public.shopping_list_items (meal_plan_item_id);

-- 4. Trigger to maintain updated_at on meal_plans
CREATE OR REPLACE FUNCTION public.set_meal_plans_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meal_plans_updated_at ON public.meal_plans;
CREATE TRIGGER trg_meal_plans_updated_at
BEFORE UPDATE ON public.meal_plans
FOR EACH ROW
EXECUTE FUNCTION public.set_meal_plans_updated_at();

-- 5. Row Level Security (RLS)
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members can select meal plans" ON public.meal_plans;
CREATE POLICY "Household members can select meal plans"
ON public.meal_plans FOR SELECT
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Household members can insert meal plans" ON public.meal_plans;
CREATE POLICY "Household members can insert meal plans"
ON public.meal_plans FOR INSERT
WITH CHECK (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Household members can update meal plans" ON public.meal_plans;
CREATE POLICY "Household members can update meal plans"
ON public.meal_plans FOR UPDATE
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())))
WITH CHECK (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Household members can delete meal plans" ON public.meal_plans;
CREATE POLICY "Household members can delete meal plans"
ON public.meal_plans FOR DELETE
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

-- 6. Add to Supabase Realtime publication if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'meal_plans'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_plans;
  END IF;
END $$;
