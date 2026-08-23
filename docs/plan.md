# Plan Implementacji i Wdrożenia - Smart Shopping App

Ten dokument definiuje krok po kroku proces budowy i wdrażania aplikacji. Należy realizować fazy sekwencyjnie.

## Faza 1: Inicjalizacja Infrastruktury i Repozytorium
**Cel:** Gotowe środowisko deweloperskie i produkcyjne.

1. **Supabase (Backend):**
   * Utworzenie projektu: `SmartShopping`
   * Skonfigurowanie autoryzacji: Włączenie Google OAuth (wymaga wygenerowania Client ID w Google Cloud Console).
2. **Repozytorium (GitHub):**
   * Utworzenie pustego repozytorium `SmartShopping`.
3. **Frontend Scaffold (Vite):**
   * Inicjalizacja projektu: `npm create vite@latest . -- --template react-ts`.
   * Instalacja i inicjalizacja Tailwind CSS (konfiguracja palety na "True Black" `#000000`).
   * Konfiguracja absolutnych ścieżek importu (alias `@/`).
   * Inicjalizacja `shadcn/ui` (`npx shadcn-ui@latest init`).
4. **Zmienne środowiskowe:**
   * Utworzenie pliku `.env.local` z kluczami z projektu `SmartShopping` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

## Faza 2: Baza Danych i Autoryzacja
**Cel:** Gotowy schemat danych i zabezpieczenie dostępu.

1. **Schemat Bazy:**
   * Wykonanie skryptu SQL z PRD (zakładka SQL Editor w Supabase).
   * Włączenie replikacji (Realtime) dla tabeli `shopping_list_items`.
2. **Generowanie Typów:**
   * Wygenerowanie i pobranie typów TypeScript z bazy: `npx supabase gen types typescript --project-id <dev-project-id> > src/types/supabase.ts`.
3. **Konfiguracja Klienta:**
   * Stworzenie singletonu klienta Supabase (`src/lib/supabase.ts`).
4. **Autoryzacja (UI/Logika):**
   * Budowa ekranu logowania (przycisk "Zaloguj przez Google").
   * Stworzenie kontekstu React (`AuthProvider`), który nasłuchuje zmian stanu sesji (`onAuthStateChange`).
   * Logika pierwszego logowania: automatyczne utworzenie rekordu `household` dla nowego użytkownika.

## Faza 3: Fundamenty Nawigacji i UI (Mobile-First)
**Cel:** Zbudowanie makiety nawigacyjnej i przygotowanie podstawowych komponentów.

1. **Layout Główny:**
   * Stworzenie kontenera aplikacji (`max-w-md mx-auto min-h-screen bg-black text-white`).
   * Budowa dolnego paska nawigacyjnego (Bottom Navigation: Książka Kucharska, Draft/Koszyk, Aktywna Lista, Historia).
2. **Komponenty Współdzielone:**
   * Wygenerowanie komponentów z `shadcn/ui`: `button`, `input`, `sheet` (dla Bottom Sheets), `checkbox`/`radio`.
   * Utworzenie uniwersalnego komponentu do gestów (`SwipeToDismiss`).

## Faza 4: Główne Funkcjonalności Biznesowe (CRUD)
**Cel:** Aplikacja posiada działającą logikę zarządzania potrawami i listami.

1. **Zarządzanie Potrawami (Książka Kucharska):**
   * Widok listy potraw z wyszukiwarką.
   * Widok szczegółów potrawy (makro, kroki przygotowania, komentarze).
   * Formularz dodawania/edycji (z Bottom Sheet do dodawania składników).
2. **Logika Koszyka (Draft):**
   * Budowa globalnego stanu koszyka (Zustand).
   * Algorytm dodawania potrawy z uwzględnieniem skalowania porcji (mnożnik docelowych kalorii).
   * Funkcjonalność szybkiego dodawania produktów ad-hoc spoza bazy.
   * Przycisk "Wyczyść koszyk".
3. **Generowanie i Agregacja Listy (Active List):**
   * Algorytm sumowania ilości dla powtarzających się `product_id`.
   * Zapis agregowanej listy do bazy (tabele `shopping_lists` i `shopping_list_items`).
   * Widok `Active List` z grupowaniem produktów według `product_categories.sort_order`.

## Faza 5: UX, Realtime i PWA
**Cel:** Przekształcenie aplikacji webowej w natywne doświadczenie.

1. **Synchronizacja Czasu Rzeczywistego:**
   * Podpięcie nasłuchiwania WebSocket dla tabeli `shopping_list_items`.
   * Wdrożenie Optimistic UI dla odhaczania produktów (natychmiastowe przekreślenie na froncie, asynchroniczny update w tle z wykorzystaniem wibracji `navigator.vibrate(50)`).
2. **Progresywna Aplikacja Webowa (PWA):**
   * Konfiguracja `vite-plugin-pwa` z plikiem manifestu (ikony, nazwa, kolory).
   * Dodanie tagów meta dla Apple iOS w `index.html`.
3. **Eksport Listy (Opcjonalnie w MVP):**
   * Implementacja Edge Function w Supabase generującej maila z podsumowaniem (integracja np. z Resend) i wysyłającej go na adres zalogowanego użytkownika.

## Faza 6: Wdrożenie i Testy (Deployment)
**Cel:** Aplikacja jest dostępna publicznie i działa bezbłędnie.

1. **Przygotowanie Produkcyjne (Supabase PROD):**
   * Skopiowanie schematu bazy danych do projektu produkcyjnego.
   * Ustawienie polityk RLS (upewnienie się, że domownicy widzą tylko dane w ramach swojego `household_id`).
2. **Publikacja w Vercel:**
   * Integracja Vercel z repozytorium GitHub.
   * Wprowadzenie zmiennych środowiskowych produkcyjnych z `SmartShopping-PROD`.
   * Pierwszy deployment.
3. **Testy Końcowe:**
   * Instalacja PWA na iPhonie z poziomu przeglądarki Safari.
   * Weryfikacja działania mechanizmów Realtime na dwóch urządzeniach jednocześnie z użyciem tego samego konta gospodarstwa domowego (household).

## Faza 7: Inżynieria Jakości, Testy i AI Harness
**Cel:** Trwałe zabezpieczenie jakości, pełne pokrycie User Flows i spójność wszystkich kolejnych promptów.

1. **AI Agent Harness:**
   * Nadrzędna konstytucja [AGENTS.md](../AGENTS.md) i modularne reguły w `.agents/rules/`.
   * Pointers dla Antigravity (`GEMINI.md`), Claude Code (`CLAUDE.md`) i Cursor (`.cursorrules`).
2. **Rejestr Decyzji Architektonicznych (ADR):**
   * [ADR-001: Dual Layout Architecture](./adr/ADR-001-dual-layout-architecture.md)
   * [ADR-002: State & Realtime Optimistic UI](./adr/ADR-002-state-and-realtime-architecture.md)
   * [ADR-003: Internationalization (i18n) Strategy](./adr/ADR-003-internationalization-i18n.md)
3. **Automatyczne Testy Jednostkowe & User Flow:**
   * Konfiguracja Vitest + React Testing Library (`jsdom`).
   * Testy czystych kalkulacji (`src/lib/calculations/__tests__/`).
   * Testy integracyjne formularzy i unikalnych flow w widokach (`src/components/**/__tests__/`).