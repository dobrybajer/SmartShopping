-- Migration: Add original_name column to shopping_lists
-- Preserves the name of the list at the time it was closed/archived, even if renamed later in History.

ALTER TABLE public.shopping_lists 
ADD COLUMN IF NOT EXISTS original_name TEXT;

-- For existing archived lists, backfill original_name with their current name
UPDATE public.shopping_lists
SET original_name = name
WHERE status = 'archived' AND original_name IS NULL;
