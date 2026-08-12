-- 1. Rozszerzenia (Extensions)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Typy Wyliczeniowe (Enums)
DO $$ BEGIN
    CREATE TYPE unit_enum AS ENUM ('g', 'ml', 'szt');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE list_status_enum AS ENUM ('draft', 'active', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Tabele
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  email TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS product_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit_type unit_enum NOT NULL,
  category_id INT REFERENCES product_categories(id) ON DELETE SET NULL,
  kcal_per_100 NUMERIC DEFAULT 0,
  protein_per_100 NUMERIC DEFAULT 0,
  carbs_per_100 NUMERIC DEFAULT 0,
  fat_per_100 NUMERIC DEFAULT 0,
  is_ad_hoc BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS meal_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  preparation_steps TEXT,
  comments TEXT,
  category_id INT REFERENCES meal_categories(id) ON DELETE SET NULL,
  tags TEXT[]
);

CREATE TABLE IF NOT EXISTS meal_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  base_quantity NUMERIC NOT NULL,
  is_pantry_item BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  name TEXT,
  status list_status_enum DEFAULT 'draft',
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  preset_tags TEXT[]
);

CREATE TABLE IF NOT EXISTS shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  total_quantity NUMERIC NOT NULL,
  is_checked BOOLEAN DEFAULT FALSE,
  added_ad_hoc BOOLEAN DEFAULT FALSE
);

-- 4. Replikacja Realtime dla shopping_list_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'shopping_list_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE shopping_list_items;
  END IF;
END $$;

-- 5. Seed Danych (Kategorie)
INSERT INTO product_categories (name, sort_order) VALUES
  ('Owoce i Warzywa', 1),
  ('Pieczywo', 2),
  ('Nabiał i Jaja', 3),
  ('Mięso i Ryby', 4),
  ('Sypkie i Przyprawy', 5),
  ('Napoje', 6),
  ('Chemia i Dom', 7),
  ('Inne', 8)
ON CONFLICT DO NOTHING;

INSERT INTO meal_categories (name) VALUES
  ('Śniadanie'),
  ('Obiad'),
  ('Kolacja'),
  ('Przekąska'),
  ('Deser')
ON CONFLICT DO NOTHING;
