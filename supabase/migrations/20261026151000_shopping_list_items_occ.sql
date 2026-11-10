-- ==============================================================================
-- Migracja: 20261026151000_shopping_list_items_occ.sql
-- Cel: Dodanie kolumny updated_at oraz mechanizmu kontroli współbieżności (OCC)
-- dla tabeli shopping_list_items (CRIT-02)
-- ==============================================================================

-- 1. Dodanie kolumny updated_at z wartością domyślną NOW()
ALTER TABLE public.shopping_list_items
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Uzupełnienie istniejących wierszy aktualnym znacznikiem czasu
UPDATE public.shopping_list_items
SET updated_at = NOW()
WHERE updated_at IS NULL;

-- 3. Funkcja wyzwalacza aktualizująca updated_at przy każdej modyfikacji rekordu
CREATE OR REPLACE FUNCTION public.set_shopping_list_item_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_shopping_list_item_updated_at ON public.shopping_list_items;
CREATE TRIGGER trigger_set_shopping_list_item_updated_at
BEFORE UPDATE ON public.shopping_list_items
FOR EACH ROW
EXECUTE FUNCTION public.set_shopping_list_item_updated_at();

-- 4. Indeks na kolumnie updated_at dla szybkiej weryfikacji OCC i delty realtime
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_updated_at
ON public.shopping_list_items(id, updated_at);
