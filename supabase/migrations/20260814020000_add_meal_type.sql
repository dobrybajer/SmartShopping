-- 1. Dodanie kolumny `type` do tabeli meals
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meals' AND column_name = 'type'
  ) THEN
    ALTER TABLE meals ADD COLUMN type TEXT NOT NULL DEFAULT 'Household';
    ALTER TABLE meals ADD CONSTRAINT meals_type_check CHECK (type IN ('Global', 'Household'));
  END IF;
END $$;

-- 2. Aktualizacja istniejących przepisów bez przypisanego gospodarstwa do typu Global
UPDATE meals
SET type = 'Global'
WHERE household_id IS NULL;
