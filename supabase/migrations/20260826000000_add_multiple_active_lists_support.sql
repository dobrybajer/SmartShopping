-- Migration: Add Multiple Concurrent Active Shopping Lists Support
-- ADR-005: Multiple Active Shopping Lists & Smart Cart Transfer

-- 1. Add 'is_default' and 'updated_at' columns to shopping_lists
ALTER TABLE shopping_lists 
ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Performance Composite Indexes
CREATE INDEX IF NOT EXISTS idx_shopping_lists_household_status 
ON shopping_lists (household_id, status, is_default DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list_checked 
ON shopping_list_items (shopping_list_id, is_checked);

-- 3. Trigger to automatically bump updated_at on list updates
CREATE OR REPLACE FUNCTION public.handle_shopping_list_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_shopping_lists_updated_at ON shopping_lists;
CREATE TRIGGER trigger_shopping_lists_updated_at
BEFORE UPDATE ON shopping_lists
FOR EACH ROW
EXECUTE FUNCTION public.handle_shopping_list_updated_at();

-- 4. Backfill existing active lists: mark the newest active list for each household with is_default = true
WITH ranked_lists AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY household_id ORDER BY created_at DESC) as rn
  FROM shopping_lists
  WHERE status = 'active'
)
UPDATE shopping_lists
SET is_default = TRUE
WHERE id IN (SELECT id FROM ranked_lists WHERE rn = 1);
