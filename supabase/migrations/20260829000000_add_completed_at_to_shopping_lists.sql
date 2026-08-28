-- Migration: Add completed_at column to shopping_lists
-- Tracks the exact timestamp when a shopping list was completed/closed and archived.

ALTER TABLE public.shopping_lists 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Backfill completed_at for existing archived lists using updated_at or created_at
UPDATE public.shopping_lists
SET completed_at = COALESCE(updated_at, created_at)
WHERE status = 'archived' AND completed_at IS NULL;

-- Performance index for household history sorting
CREATE INDEX IF NOT EXISTS idx_shopping_lists_completed_at 
ON public.shopping_lists(household_id, completed_at DESC);
