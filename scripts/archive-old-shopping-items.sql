-- ==============================================================================
-- MED-02: Ręczny skrypt retencji i archiwizacji starych pozycji list zakupowych
-- ==============================================================================
-- Uruchamiany wyłącznie ręcznie w razie potrzeby (brak zadania CRON).
-- Sposób użycia:
--   1. Otwórz Supabase Studio -> SQL Editor (lub połącz się przez psql).
--   2. Opcjonalnie uruchom KROK 1 (Dry-Run), aby sprawdzić liczbę list i pozycji.
--   3. Uruchom KROK 2, aby przenieść pozycje ze zarchiwizowanych list starszych niż
--      12 miesięcy do tabeli public.shopping_list_items_archive oraz zapisać
--      zagregowany snapshot JSON w kolumnie shopping_lists.archived_items_snapshot.
-- ==============================================================================

-- KROK 1: Podgląd (Dry-Run) - bez modyfikacji danych
SELECT
  COUNT(DISTINCT sl.id) AS candidate_lists,
  COUNT(sli.id) AS candidate_items,
  MIN(COALESCE(sl.completed_at, sl.updated_at, sl.created_at)) AS oldest_list_date
FROM public.shopping_lists sl
INNER JOIN public.shopping_list_items sli ON sli.shopping_list_id = sl.id
WHERE sl.status = 'archived'
  AND COALESCE(sl.completed_at, sl.updated_at, sl.created_at) < NOW() - INTERVAL '12 months';

-- KROK 2: Wykonanie archiwizacji (domyślnie 12 miesięcy retencji)
-- Odkomentuj poniższą linię przy ręcznym uruchomieniu:
-- SELECT * FROM public.archive_old_shopping_list_items(12);

