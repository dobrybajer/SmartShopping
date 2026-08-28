-- Migration: Add optional category_id override per shopping list item
-- Allows temporary category overrides (e.g. from draft / ad-hoc items) on active shopping lists.

ALTER TABLE public.shopping_list_items 
ADD COLUMN IF NOT EXISTS category_id INT REFERENCES public.product_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_category_id 
ON public.shopping_list_items(category_id);
