-- Migration: 20261026000000_add_product_hierarchy.sql
-- Description: ADR-010 Two-Level Hierarchical Product Catalog, Dynamic Nutrition Routing & Multi-Tier Pantry Intelligence
-- Non-breaking, additive migration. Idempotent guards included.

-- 1. Extend products table with hierarchy columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'is_general'
  ) THEN
    ALTER TABLE public.products ADD COLUMN is_general BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE public.products ADD COLUMN parent_id UUID NULL REFERENCES public.products(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- 2. Guard: General products cannot have a parent (strictly 2-level hierarchy)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_parent_general'
  ) THEN
    ALTER TABLE public.products
    ADD CONSTRAINT chk_products_parent_general
    CHECK (NOT (is_general = TRUE AND parent_id IS NOT NULL));
  END IF;
END $$;

-- 3. Extend meal_ingredients with reference_product_id for macro calculation routing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_ingredients' AND column_name = 'reference_product_id'
  ) THEN
    ALTER TABLE public.meal_ingredients
    ADD COLUMN reference_product_id UUID NULL REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. High-performance B-tree Indexes
CREATE INDEX IF NOT EXISTS idx_products_parent_id
ON public.products (parent_id);

CREATE INDEX IF NOT EXISTS idx_products_is_general
ON public.products (household_id, is_general);

CREATE INDEX IF NOT EXISTS idx_meal_ingredients_reference_product
ON public.meal_ingredients (reference_product_id);

-- 5. AI-Assisted Smart Catalog Grouping (Global Parent Products Creation & Linking)
-- We insert global parent products if they do not already exist, and link corresponding child products.
DO $$
DECLARE
  v_parent_id UUID;
BEGIN
  -- Helper macro-like block for creating a parent and linking children

  -- 1. Awokado
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Awokado' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Awokado', 'pcs', 1, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Awokado' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE name ILIKE 'Awokado %' AND id <> v_parent_id AND household_id IS NULL;

  -- 2. Pomidory
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Pomidory' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Pomidory', 'g', 1, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Pomidory' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE (name ILIKE 'Pomidory %' OR name = 'Pomidor') AND id <> v_parent_id AND household_id IS NULL;

  -- 3. Ogórki
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Ogórki' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Ogórki', 'g', 1, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Ogórki' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE (name ILIKE 'Ogórk%' OR name ILIKE 'Ogórek %') AND id <> v_parent_id AND household_id IS NULL;

  -- 4. Cebula
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Cebula' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Cebula', 'g', 1, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Cebula' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE name ILIKE 'Cebula %' AND id <> v_parent_id AND household_id IS NULL;

  -- 5. Papryka
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Papryka' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Papryka', 'pcs', 1, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Papryka' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE name ILIKE 'Papryka %' AND id <> v_parent_id AND household_id IS NULL;

  -- 6. Chleb
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Chleb' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Chleb', 'pcs', 2, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Chleb' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE (name ILIKE 'Chleb %' OR name ILIKE 'Chlebek %') AND id <> v_parent_id AND household_id IS NULL;

  -- 7. Bagietka
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Bagietka' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Bagietka', 'pcs', 2, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Bagietka' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE name ILIKE 'Bagietka %' AND id <> v_parent_id AND household_id IS NULL;

  -- 8. Tortilla
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Tortilla' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Tortilla', 'pcs', 2, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Tortilla' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE name ILIKE 'Tortilla %' AND id <> v_parent_id AND household_id IS NULL;

  -- 9. Jajka
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Jajka' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Jajka', 'pcs', 3, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Jajka' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE (name ILIKE 'Jajka %' OR name ILIKE 'Jaja %') AND id <> v_parent_id AND household_id IS NULL;

  -- 10. Mleko
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Mleko' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Mleko', 'ml', 3, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Mleko' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE name ILIKE 'Mleko %' AND id <> v_parent_id AND household_id IS NULL;

  -- 11. Twaróg
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Twaróg' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Twaróg', 'g', 3, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Twaróg' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE name ILIKE 'Twaróg %' AND id <> v_parent_id AND household_id IS NULL;

  -- 12. Ser Mozzarella
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Ser Mozzarella' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Ser Mozzarella', 'g', 3, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Ser Mozzarella' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE name ILIKE 'Ser Mozzarella %' AND id <> v_parent_id AND household_id IS NULL;

  -- 13. Mięso mielone
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Mięso mielone' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Mięso mielone', 'g', 4, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Mięso mielone' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE name ILIKE 'Mięso mielone %' AND id <> v_parent_id AND household_id IS NULL;

  -- 14. Ryż
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Ryż' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Ryż', 'g', 5, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Ryż' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE name ILIKE 'Ryż %' AND id <> v_parent_id AND household_id IS NULL;

  -- 15. Kasza
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Kasza' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Kasza', 'g', 5, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Kasza' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE name ILIKE 'Kasza %' AND id <> v_parent_id AND household_id IS NULL;

  -- 16. Makaron
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Makaron' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Makaron', 'g', 5, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Makaron' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE name ILIKE 'Makaron %' AND id <> v_parent_id AND household_id IS NULL;

  -- 17. Mąka pszenna
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Mąka pszenna' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Mąka pszenna', 'g', 5, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Mąka pszenna' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE name ILIKE 'Mąka pszenna %' AND id <> v_parent_id AND household_id IS NULL;

  -- 18. Woda
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Woda' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Woda', 'pcs', 6, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Woda' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE name ILIKE 'Woda %' AND id <> v_parent_id AND household_id IS NULL;

  -- 19. Kawa
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Kawa' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Kawa', 'pcs', 6, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Kawa' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE name ILIKE 'Kawa %' AND id <> v_parent_id AND household_id IS NULL;

  -- 20. Herbata
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Herbata' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Herbata', 'pcs', 6, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Herbata' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE name ILIKE 'Herbata %' AND id <> v_parent_id AND household_id IS NULL;

  -- 21. Papier toaletowy
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Papier toaletowy' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Papier toaletowy', 'pcs', 7, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Papier toaletowy' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE name ILIKE 'Papier toaletowy %' AND id <> v_parent_id AND household_id IS NULL;

  -- 22. Ręcznik papierowy
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Ręcznik papierowy' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Ręcznik papierowy', 'pcs', 7, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Ręcznik papierowy' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE name ILIKE 'Ręcznik papierowy %' AND id <> v_parent_id AND household_id IS NULL;

  -- 23. Kapsułki do prania
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Kapsułki do prania' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Kapsułki do prania', 'pcs', 7, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Kapsułki do prania' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE name ILIKE 'Kapsułki do prania %' AND id <> v_parent_id AND household_id IS NULL;

  -- 24. Worki na śmieci
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Worki na śmieci' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Worki na śmieci', 'pcs', 7, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Worki na śmieci' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE name ILIKE 'Worki na śmieci %' AND id <> v_parent_id AND household_id IS NULL;

  -- 25. Baterie alkaliczne
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Baterie alkaliczne' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Baterie alkaliczne', 'pcs', 8, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Baterie alkaliczne' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE name ILIKE 'Baterie alkaliczne %' AND id <> v_parent_id AND household_id IS NULL;

  -- 26. Czekolada
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Czekolada' AND household_id IS NULL) THEN
    INSERT INTO public.products (name, unit_type, category_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, is_general, parent_id, type, household_id)
    VALUES ('Czekolada', 'pcs', 8, NULL, NULL, NULL, NULL, TRUE, NULL, 'Global', NULL)
    RETURNING id INTO v_parent_id;
  ELSE
    SELECT id INTO v_parent_id FROM public.products WHERE name = 'Czekolada' AND household_id IS NULL LIMIT 1;
    UPDATE public.products SET is_general = TRUE WHERE id = v_parent_id;
  END IF;
  UPDATE public.products SET parent_id = v_parent_id WHERE name ILIKE 'Czekolada %' AND id <> v_parent_id AND household_id IS NULL;

END $$;
