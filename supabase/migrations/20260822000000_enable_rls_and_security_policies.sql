-- ==============================================================================
-- MIGRACJA: Włączenie Row Level Security (RLS) oraz polityk bezpieczeństwa
-- Zasada najmniejszych uprawnień (Least Privilege) dla roli 'authenticated'
-- ==============================================================================

-- 1. Funkcja pomocnicza SECURITY DEFINER zapobiegająca nieskończonej rekurencji RLS
--    i optymalizująca sprawdzanie przynależności użytkownika do gospodarstw.
CREATE OR REPLACE FUNCTION public.get_user_household_ids(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT household_id FROM public.household_members WHERE user_id = user_uuid;
$$;

-- ==============================================================================
-- 2. Tabela: product_categories (Kategorie produktów - słownik globalny)
-- ==============================================================================
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read product categories" ON public.product_categories;
CREATE POLICY "Authenticated users can read product categories"
ON public.product_categories
FOR SELECT
TO authenticated
USING (true);

-- ==============================================================================
-- 3. Tabela: meal_categories (Kategorie posiłków - słownik globalny)
-- ==============================================================================
ALTER TABLE public.meal_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read meal categories" ON public.meal_categories;
CREATE POLICY "Authenticated users can read meal categories"
ON public.meal_categories
FOR SELECT
TO authenticated
USING (true);

-- ==============================================================================
-- 4. Tabela: households (Gospodarstwa domowe)
-- ==============================================================================
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read their households" ON public.households;
CREATE POLICY "Authenticated users can read their households"
ON public.households
FOR SELECT
TO authenticated
USING (
  id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Authenticated users can create households" ON public.households;
CREATE POLICY "Authenticated users can create households"
ON public.households
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Members can update their household" ON public.households;
CREATE POLICY "Members can update their household"
ON public.households
FOR UPDATE
TO authenticated
USING (
  id IN (SELECT public.get_user_household_ids(auth.uid()))
)
WITH CHECK (
  id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Members can delete their household" ON public.households;
CREATE POLICY "Members can delete their household"
ON public.households
FOR DELETE
TO authenticated
USING (
  id IN (SELECT public.get_user_household_ids(auth.uid()))
);

-- ==============================================================================
-- 5. Tabela: users (Profile użytkowników)
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read self and household members" ON public.users;
CREATE POLICY "Users can read self and household members"
ON public.users
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  OR id IN (
    SELECT user_id FROM public.household_members
    WHERE household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  id = auth.uid()
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
)
WITH CHECK (
  id = auth.uid()
);

-- ==============================================================================
-- 6. Tabela: household_members (Przynależność do gospodarstw)
-- ==============================================================================
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view members of their households" ON public.household_members;
CREATE POLICY "Users can view members of their households"
ON public.household_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Users can join or add members to their households" ON public.household_members;
CREATE POLICY "Users can join or add members to their households"
ON public.household_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Users can leave or remove members from their households" ON public.household_members;
CREATE POLICY "Users can leave or remove members from their households"
ON public.household_members
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

-- ==============================================================================
-- 7. Tabela: household_invites (Zaproszenia do gospodarstw)
-- ==============================================================================
ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read relevant invites" ON public.household_invites;
CREATE POLICY "Users can read relevant invites"
ON public.household_invites
FOR SELECT
TO authenticated
USING (
  lower(email) = lower(auth.jwt() ->> 'email')
  OR household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Members can create invites for their households" ON public.household_invites;
CREATE POLICY "Members can create invites for their households"
ON public.household_invites
FOR INSERT
TO authenticated
WITH CHECK (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Users can delete relevant invites" ON public.household_invites;
CREATE POLICY "Users can delete relevant invites"
ON public.household_invites
FOR DELETE
TO authenticated
USING (
  lower(email) = lower(auth.jwt() ->> 'email')
  OR household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

-- ==============================================================================
-- 8. Tabela: products (Baza produktów - Globalne i Gospodarstwa)
-- ==============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read products" ON public.products;
CREATE POLICY "Authenticated users can read products"
ON public.products
FOR SELECT
TO authenticated
USING (
  household_id IS NULL
  OR type = 'Global'
  OR household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Authenticated users can insert household products" ON public.products;
CREATE POLICY "Authenticated users can insert household products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
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
);

DROP POLICY IF EXISTS "Authenticated users can delete own household products" ON public.products;
CREATE POLICY "Authenticated users can delete own household products"
ON public.products
FOR DELETE
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

-- ==============================================================================
-- 9. Tabela: meals (Książka kucharska - Przepisy)
-- ==============================================================================
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read meals" ON public.meals;
CREATE POLICY "Authenticated users can read meals"
ON public.meals
FOR SELECT
TO authenticated
USING (
  household_id IS NULL
  OR type = 'Global'
  OR household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Authenticated users can insert meals" ON public.meals;
CREATE POLICY "Authenticated users can insert meals"
ON public.meals
FOR INSERT
TO authenticated
WITH CHECK (
  household_id IS NULL
  OR household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Authenticated users can update own household meals" ON public.meals;
CREATE POLICY "Authenticated users can update own household meals"
ON public.meals
FOR UPDATE
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
)
WITH CHECK (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Authenticated users can delete own household meals" ON public.meals;
CREATE POLICY "Authenticated users can delete own household meals"
ON public.meals
FOR DELETE
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

-- ==============================================================================
-- 10. Tabela: meal_ingredients (Składniki potraw)
-- ==============================================================================
ALTER TABLE public.meal_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read meal ingredients" ON public.meal_ingredients;
CREATE POLICY "Authenticated users can read meal ingredients"
ON public.meal_ingredients
FOR SELECT
TO authenticated
USING (
  meal_id IN (
    SELECT id FROM public.meals
    WHERE household_id IS NULL
       OR type = 'Global'
       OR household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Authenticated users can insert meal ingredients" ON public.meal_ingredients;
CREATE POLICY "Authenticated users can insert meal ingredients"
ON public.meal_ingredients
FOR INSERT
TO authenticated
WITH CHECK (
  meal_id IN (
    SELECT id FROM public.meals
    WHERE household_id IS NULL
       OR household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Authenticated users can update meal ingredients" ON public.meal_ingredients;
CREATE POLICY "Authenticated users can update meal ingredients"
ON public.meal_ingredients
FOR UPDATE
TO authenticated
USING (
  meal_id IN (
    SELECT id FROM public.meals
    WHERE household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Authenticated users can delete meal ingredients" ON public.meal_ingredients;
CREATE POLICY "Authenticated users can delete meal ingredients"
ON public.meal_ingredients
FOR DELETE
TO authenticated
USING (
  meal_id IN (
    SELECT id FROM public.meals
    WHERE household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  )
);

-- ==============================================================================
-- 11. Tabela: shopping_lists (Listy zakupów)
-- ==============================================================================
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read household shopping lists" ON public.shopping_lists;
CREATE POLICY "Authenticated users can read household shopping lists"
ON public.shopping_lists
FOR SELECT
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Authenticated users can insert household shopping lists" ON public.shopping_lists;
CREATE POLICY "Authenticated users can insert household shopping lists"
ON public.shopping_lists
FOR INSERT
TO authenticated
WITH CHECK (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Authenticated users can update household shopping lists" ON public.shopping_lists;
CREATE POLICY "Authenticated users can update household shopping lists"
ON public.shopping_lists
FOR UPDATE
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
)
WITH CHECK (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Authenticated users can delete household shopping lists" ON public.shopping_lists;
CREATE POLICY "Authenticated users can delete household shopping lists"
ON public.shopping_lists
FOR DELETE
TO authenticated
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

-- ==============================================================================
-- 12. Tabela: shopping_list_items (Pozycje na liście zakupów)
-- ==============================================================================
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read household shopping list items" ON public.shopping_list_items;
CREATE POLICY "Authenticated users can read household shopping list items"
ON public.shopping_list_items
FOR SELECT
TO authenticated
USING (
  shopping_list_id IN (
    SELECT id FROM public.shopping_lists
    WHERE household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Authenticated users can insert household shopping list items" ON public.shopping_list_items;
CREATE POLICY "Authenticated users can insert household shopping list items"
ON public.shopping_list_items
FOR INSERT
TO authenticated
WITH CHECK (
  shopping_list_id IN (
    SELECT id FROM public.shopping_lists
    WHERE household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Authenticated users can update household shopping list items" ON public.shopping_list_items;
CREATE POLICY "Authenticated users can update household shopping list items"
ON public.shopping_list_items
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

DROP POLICY IF EXISTS "Authenticated users can delete household shopping list items" ON public.shopping_list_items;
CREATE POLICY "Authenticated users can delete household shopping list items"
ON public.shopping_list_items
FOR DELETE
TO authenticated
USING (
  shopping_list_id IN (
    SELECT id FROM public.shopping_lists
    WHERE household_id IN (SELECT public.get_user_household_ids(auth.uid()))
  )
);
