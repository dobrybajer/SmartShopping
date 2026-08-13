-- 1. Dodanie kolumn name i created_at do tabeli users (jeśli jeszcze nie istnieją)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'name'
  ) THEN
    ALTER TABLE users ADD COLUMN name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE users ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 2. Uzupełnienie domyślnych wartości dla istniejących użytkowników
UPDATE users
SET name = split_part(email, '@', 1)
WHERE name IS NULL OR name = '';

UPDATE users
SET created_at = NOW()
WHERE created_at IS NULL;

-- 3. Tabela powiązań użytkowników z gospodarstwami (wielu-do-wielu)
CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_household_member UNIQUE (household_id, user_id)
);

-- 4. Tabela zaproszeń do gospodarstw dla oczekujących adresów e-mail
CREATE TABLE IF NOT EXISTS household_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_household_invite UNIQUE (household_id, email)
);

-- 5. Migracja istniejących przypisań users.household_id do tabeli household_members
INSERT INTO household_members (household_id, user_id)
SELECT household_id, id FROM users
WHERE household_id IS NOT NULL
ON CONFLICT (household_id, user_id) DO NOTHING;

-- 6. Czyszczenie osieroconych pustych gospodarstw (które powstały w wyniku błędu synchronizacji i nie mają żadnych danych ani członków)
DELETE FROM households h
WHERE NOT EXISTS (SELECT 1 FROM household_members hm WHERE hm.household_id = h.id)
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.household_id = h.id)
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.household_id = h.id)
  AND NOT EXISTS (SELECT 1 FROM meals m WHERE m.household_id = h.id)
  AND NOT EXISTS (SELECT 1 FROM shopping_lists sl WHERE sl.household_id = h.id);
