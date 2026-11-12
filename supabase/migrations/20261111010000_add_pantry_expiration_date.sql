-- ==============================================================================
-- Migracja: 20261111010000_add_pantry_expiration_date.sql
-- Cel (NORM-04): Opcjonalne daty ważności produktów w module Spiżarnia (ADR-008)
-- oraz indeks B-tree wspomagający sortowanie po najszybciej wygasających zapasach.
-- ==============================================================================

ALTER TABLE public.pantry_items
ADD COLUMN IF NOT EXISTS expiration_date DATE NULL;

CREATE INDEX IF NOT EXISTS idx_pantry_items_expiration_date
ON public.pantry_items (household_id, expiration_date ASC)
WHERE expiration_date IS NOT NULL;

