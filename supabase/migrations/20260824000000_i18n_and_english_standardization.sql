-- Migration: Internationalization, English Standardization & Category Slugs
-- 1. Safely rename 'szt' to 'pcs' in unit_enum type
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON e.enumtypid = t.oid 
    WHERE t.typname = 'unit_enum' AND e.enumlabel = 'szt'
  ) THEN
    ALTER TYPE public.unit_enum RENAME VALUE 'szt' TO 'pcs';
  END IF;
END $$;

-- 2. Add language preference column to public.users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'pl' NOT NULL;

-- 3. Standardize default product category system keys / slugs (1:1 with DB IDs & sort_order)
UPDATE public.product_categories SET name = 'fruits_vegetables' WHERE id = 1;
UPDATE public.product_categories SET name = 'bakery'            WHERE id = 2;
UPDATE public.product_categories SET name = 'dairy'             WHERE id = 3;
UPDATE public.product_categories SET name = 'meat_fish'         WHERE id = 4;
UPDATE public.product_categories SET name = 'pantry'            WHERE id = 5;
UPDATE public.product_categories SET name = 'beverages'         WHERE id = 6;
UPDATE public.product_categories SET name = 'household'         WHERE id = 7;
UPDATE public.product_categories SET name = 'other'             WHERE id = 8;

-- 4. Standardize default meal category system keys / slugs (1:1 with DB IDs)
UPDATE public.meal_categories SET name = 'breakfast' WHERE id = 1;
UPDATE public.meal_categories SET name = 'lunch'     WHERE id = 2;
UPDATE public.meal_categories SET name = 'dinner'    WHERE id = 3;
UPDATE public.meal_categories SET name = 'snack'     WHERE id = 4;
UPDATE public.meal_categories SET name = 'dessert'   WHERE id = 5;
