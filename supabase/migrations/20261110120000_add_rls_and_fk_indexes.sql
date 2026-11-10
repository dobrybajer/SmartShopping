-- ==============================================================================
-- Migracja: 20261110120000_add_rls_and_fk_indexes.sql
-- Cel (HIGH-04): Indeksowanie B-tree pod funkcję RLS get_user_household_ids
-- oraz klucze obce w całej bazie danych dla eliminacji Sequential Scans.
-- ==============================================================================

-- 1. Krytyczny indeks pod funkcję pomocniczą RLS get_user_household_ids(auth.uid())
-- Zapytanie: SELECT household_id FROM public.household_members WHERE user_id = user_uuid
-- Dotychczasowy klucz UNIQUE(household_id, user_id) miał kolumnę wiodącą household_id.
CREATE INDEX IF NOT EXISTS idx_household_members_user_id
ON public.household_members(user_id);

-- 2. Indeksy kluczy obcych przepisów i składników
CREATE INDEX IF NOT EXISTS idx_meal_ingredients_meal_id
ON public.meal_ingredients(meal_id);

CREATE INDEX IF NOT EXISTS idx_meal_ingredients_product_id
ON public.meal_ingredients(product_id);

CREATE INDEX IF NOT EXISTS idx_meals_household_id
ON public.meals(household_id);

CREATE INDEX IF NOT EXISTS idx_meals_category_id
ON public.meals(category_id);

-- 3. Indeksy kluczy obcych katalogu produktów
CREATE INDEX IF NOT EXISTS idx_products_household_id
ON public.products(household_id);

CREATE INDEX IF NOT EXISTS idx_products_category_id
ON public.products(category_id);

-- 4. Pozostałe indeksy kluczy obcych i wyszukiwania multi-tenancy
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_product_id
ON public.shopping_list_items(product_id);

CREATE INDEX IF NOT EXISTS idx_pantry_items_product_id
ON public.pantry_items(product_id);

CREATE INDEX IF NOT EXISTS idx_users_household_id
ON public.users(household_id);

CREATE INDEX IF NOT EXISTS idx_household_invites_lower_email
ON public.household_invites(lower(email));

CREATE INDEX IF NOT EXISTS idx_meal_plans_meal_id
ON public.meal_plans(meal_id);

