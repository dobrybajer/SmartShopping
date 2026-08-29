# Product Requirements Document (PRD) - Smart Shopping App

## 1. Architektura (Podział na projekty)
Aplikacja oparta na architekturze Serverless (BaaS - Backend as a Service) oraz architekturze SPA (Single Page Application) typu Mobile-First.
*   **Frontend (Klient):** Odpowiada za UI/UX, wyliczanie makroskładników w locie (skalowanie porcji) oraz Optimistic UI (natychmiastowe zmiany stanu przed odpowiedzią z serwera). Posiada pełne mechanizmy PWA.
*   **Backend / Baza Danych:** Zewnętrzny projekt Supabase (BaaS). Dostarcza bazę PostgreSQL, API przez PostgREST, autoryzację GoTrue oraz mechanizm Realtime (WebSockets).
*   **Środowiska:** Wymagany podział na projekt `DEV` (lokalny rozwój) oraz `PROD` (Vercel).

## 2. Stos Technologiczny
*   **Język:** TypeScript (Strict Mode).
*   **Framework UI:** React 18.
*   **Build Tool:** Vite (z pluginem `vite-plugin-pwa`).
*   **Stylizacja:** Tailwind CSS (skonfigurowany pod True Black dla ekranów OLED).
*   **Biblioteka Komponentów:** shadcn/ui (Radix UI primitives).
*   **Zarządzanie Stanem:** Zustand (dla stanów lokalnych) + React Query (lub subskrypcje Supabase).
*   **Hosting:** Vercel (darmowy tier, CI/CD).
*   **Baza Danych i Auth:** Supabase.

## 3. Logowanie i Autoryzacja
*   **Mechanizm:** Supabase Auth skonfigurowany pod **Google OAuth (Logowanie Gmail)**. 
*   **Kontekst Gospodarstwa (Household):** Każdy zalogowany użytkownik `users` jest przypisany do tabeli `households`. Pozwala to na współdzielenie list zakupowych z innymi domownikami. Polityki RLS (Row Level Security) w PostgreSQL opierają się na `household_id`, gwarantując bezpieczeństwo i izolację danych.

## 4. Schemat Bazy Danych (PostgreSQL / Supabase DDL)

```sql
-- Schemat dla asystenta AI do zainicjowania bazy

CREATE TYPE unit_enum AS ENUM ('g', 'ml', 'pcs');
CREATE TYPE list_status_enum AS ENUM ('draft', 'active', 'archived');

CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID REFERENCES auth.users PRIMARY KEY,
  household_id UUID REFERENCES households(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  language VARCHAR(10) DEFAULT 'pl' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_categories (
  id SERIAL PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE, -- NULL dla kategorii globalnych
  name TEXT NOT NULL,
  sort_order INT NOT NULL -- domyślne ułożenie alejek w sklepie (np. 1-Warzywa, 2-Nabiał)
);

CREATE TABLE household_category_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  custom_sort_order INT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  custom_name TEXT,
  store_profile_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_household_category UNIQUE (household_id, category_id)
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id),
  name TEXT NOT NULL,
  unit_type unit_enum NOT NULL,
  category_id INT REFERENCES product_categories(id),
  kcal_per_100 NUMERIC DEFAULT 0,
  protein_per_100 NUMERIC DEFAULT 0,
  carbs_per_100 NUMERIC DEFAULT 0,
  fat_per_100 NUMERIC DEFAULT 0,
  is_ad_hoc BOOLEAN DEFAULT FALSE -- np. chemia, papier toaletowy
);

CREATE TABLE meal_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL -- np. Śniadanie, Przekąska
);

CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id),
  name TEXT NOT NULL,
  description TEXT,
  preparation_steps TEXT,
  comments TEXT, -- dodatkowe notatki i uwagi do przepisu
  category_id INT REFERENCES meal_categories(id),
  tags TEXT[] -- np. ['WOD', 'Rest Day', 'Redukcja']
);

CREATE TABLE meal_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  base_quantity NUMERIC NOT NULL,
  is_pantry_item BOOLEAN DEFAULT FALSE -- np. sól, pieprz
);

CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id),
  name TEXT,
  original_name TEXT, -- nazwa z momentu zamknięcia/archiwizacji listy
  status list_status_enum DEFAULT 'draft',
  is_default BOOLEAN DEFAULT FALSE,
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  preset_tags TEXT[]
);

CREATE TABLE shopping_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopping_list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  category_id INT REFERENCES product_categories(id), -- nadpisana kategoria pozycji
  total_quantity NUMERIC NOT NULL,
  is_checked BOOLEAN DEFAULT FALSE,
  added_ad_hoc BOOLEAN DEFAULT FALSE
);

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 5. Opis Biznesowy Funkcjonalności
*   **Baza Potraw (CRUD):** Aplikacja posiada widok biblioteki posiłków. Umożliwia przeglądanie potraw, wchodzenie w szczegóły (opis, kroki przygotowania, makro, komentarze) oraz zawiera formularz do dodawania i edytowania istniejących potraw.
*   **Zarządzanie Makro i Skalowanie:** Produkty definiują makro na 100g/100ml lub 1 sztukę. Przy dodawaniu posiłku użytkownik określa docelową kaloryczność, co automatycznie wylicza mnożnik dla proporcjonalnej ilości składników.
*   **Wiele Aktywnych List Zakupowych i Elastyczny Transfer z Koszyka (ADR-005):**
    *   Gospodarstwo domowe może posiadać jednocześnie wiele aktywnych list zakupowych (np. *"Bieżące spożywcze"*, *"Dom / Majsterkowanie"*, *"Apteka"*).
    *   W Koszyku (Draft) użytkownik może przenieść zaznaczone pozycje do istniejącej aktywnej listy (z automatycznym sumowaniem ilości i resetem stanu odhaczenia) LUB utworzyć zupełnie nową aktywną listę bez archiwizowania pozostałych.
    *   Na ekranie Aktywnej Listy użytkownik błyskawicznie przełącza się między listami za pomocą horyzontalnych pigułek/chipsów z licznikami nieodhaczonych pozycji (Mobile PWA) lub Segmented Tabs (Desktop).
    *   Możliwość oznaczania listy domyślnej, zmiany nazwy, archiwizacji pojedynczej listy oraz usuwania. Zobacz [ADR-005: Multiple Active Shopping Lists Architecture](./adr/ADR-005-multiple-active-shopping-lists.md).
*   **Cykl Życia Listy i Historia:** 
    *   `Draft` (Koszyk roboczy, z możliwością całkowitego **wyczyszczenia/opróżnienia** jednym kliknięciem lub selektywnego transferu).
    *   `Active` (Równorzędne aktywne listy gospodarstwa domowego z licznikami nieodhaczonych pozycji i synchronizacją Realtime).
    *   `Archived` (Historia). Podczas zamykania listy aktywnej zapisywany jest znacznik czasu zakończenia (`completed_at`) oraz snapshot nazwy (`original_name`). Główna lista historii prezentuje datę zakończenia i jest według niej sortowana malejąco. Szczegóły zarchiwizowanej listy prezentują zarówno datę zakończenia, jak i datę utworzenia listy (`created_at`).
    *   **Śledzenie i Edycja Nazwy w Historii:** Użytkownik może zmienić nazwę zarchiwizowanej listy. W takim wypadku oryginalna nazwa z momentu zamykania jest prezentowana linijkę niżej drobną czcionką (`text-xs text-muted-foreground font-mono`) w widoku głównym i w szczegółach. Jeśli nazwa nie była zmieniana – linijka jest ukrywana.
    *   **Zachowanie Wybranych Kategorii:** Przy pozycjach listy zachowywana jest kategoria wybrana przez użytkownika (`shopping_list_items.category_id`), a grupowanie w historii i transfer z powrotem do koszyka respektuje ten wybór zamiast domyślnej kategorii katalogowej produktu.
    *   **Pasek Akcji w Szczegółach (Dual Layout):** Przyciski akcji na dole (zarówno Mobile, jak i Desktop) są podzielone symetrycznie po 50% szerokości: "Dodaj do koszyka" oraz czerwony przycisk "Usuń listę" wyzwalający modal potwierdzenia usunięcia (`ConfirmDeleteDialog`).
*   **Agregacja, Własne Kategorie i Układ Alejek Sklepowych (ADR-006):** 
    *   Frontend sumuje takie same produkty ze wszystkich potraw (np. pomidor do śniadania i kolacji to jedna pozycja). 
    *   Na widoku listy `Active`, produkty są obligatoryjnie grupowane i sortowane według zdefiniowanego układu alejek gospodarstwa.
    *   **Model Hybrydowy:** Domyślne kategorie systemowe (globalne) są wspólne, przetłumaczone i chronione przed modyfikacją/usunięciem (użytkownik może je wyłącznie ukryć lub zmienić ich kolejność).
    *   Gospodarstwo może swobodnie tworzyć własne kategorie (`household_id`), edytować je, usuwać oraz ustalać własną kolejność alejek sklepowych w dedykowanej tabeli `household_category_settings`.
    *   Zarządzanie kategoriami odbywa się w modalach dopasowanych do Dual Layout (`CategoryManagerSheet` na Mobile PWA ze strefą kciuka i wibracją haptic, `CategoryManagerDialog` na Desktopie). Zobacz [ADR-006: Custom Product Categories & Aisle Sorting](./adr/ADR-006-custom-product-categories-and-aisle-sorting.md).
*   **Produkty Ad-hoc:** Możliwość szybkiego wrzucenia na listę produktów spoza przepisów (np. chemia domowa, wpisy z palca bez bazy makro).

*   **Powiadomienia Web Push & Extensible Event Registry (ADR-007):**
    *   Natywne powiadomienia Web Push (VAPID) przez Service Worker działające w tle na urządzeniach Mobile PWA (Android, iOS Home Screen PWA) oraz Desktop (Chrome, Safari macOS, Firefox, Edge).
    *   Wysyłka przez Supabase Edge Function z automatycznym auto-pruningiem unieważnionych tokenów (410/404) oraz wykluczeniem nadawcy (self-notification suppression).
    *   Inteligentne grupowanie na ekranie blokady (`tag` collapsing) oraz debouncing seryjnych akcji w sklepie.
    *   Rozszerzalny rejestr zdarzeń (Notification Registry) z silnym typowaniem TypeScript – dodanie nowego typu powiadomienia to dopisanie definicji i szablonu i18n.
    *   Architektura z interfejsem adaptera (`NotificationStorageChannel`) przygotowana na bezszwowe podpięcie tabeli historii i Centrum Powiadomień (In-App Bell) w przyszłości. Zobacz [ADR-007: Multiplatform Web Push Notifications](./adr/ADR-007-multiplatform-web-push-notifications.md).
*   **Realtime Sync (Współdzielenie):** Odsłuch WebSocket na tabeli `shopping_list_items` i `shopping_lists`. Odhaczenie produktu lub zmiana listy natychmiast synchronizuje stan na urządzeniach innych domowników (household).
*   **Eksport na e-mail:** Możliwość wygenerowania i wysłania aktywnej/zarchwizowanej listy zakupowej na połączony z kontem adres Gmail.


## 6. PWA, UX & Interfejs (Dual Layout)
*   **Równorzędny Dual Layout (Mobile PWA & Desktop):** 
    *   **Mobile PWA:** Optymalizacja pod ekrany smartfonów (strefa kciuka min. 44x44px, `BottomNavigation`, gesty `SwipeToDismiss`, wysuwane `Sheet` od dołu).
    *   **Desktop:** Dedykowany, pełny split layout (`DesktopSidebar`, `DesktopHeader`, modale dialogowe, wielokolumnowe siatki, skróty klawiszowe). Zobacz [ADR-001: Dual Layout Architecture](./adr/ADR-001-dual-layout-architecture.md).
*   **Mechanika Odhaczania:** Oparta o element typu `checkbox`. Kliknięcie natychmiast wyszarza tekst i dodaje przekreślenie (`line-through text-zinc-500` w Optimistic UI), a element pozostaje na swoim miejscu.
*   **PWA dla iOS:** Plik `index.html` zawiera tagi: `<meta name="apple-mobile-web-app-capable" content="yes">` oraz `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`. Detekcja trybu standalone i asystent instalacji na ekranie początkowym dla Web Push.
*   **Powiadomienia Push & Realtime:** Odsłuch WebSocket na tabeli `shopping_list_items` oraz natywne powiadomienia Web Push (VAPID) w tle.
*   **Haptic Feedback & True Black:** Wibracje (`navigator.vibrate`) przy zaznaczaniu checkboxów oraz idealna czerń (`#000000`) dla oszczędności baterii i estetyki OLED.
*   **Internacjonalizacja (i18n) i Pełny Angielski w Kodzie:** 100% kodu TypeScript, bazy danych i typów w języku angielskim (`unit_enum: 'g', 'ml', 'pcs'`). Domyślny język UI: Polski (`pl`), z obsługą Angielskiego (`en`). Słownik w jednym typowanym miejscu (`src/i18n/`), obsługa pluralizacji przez natywne `Intl.PluralRules`, synchroniczny cache w `localStorage` (dla działania 100% offline w sklepie) oraz asynchroniczny sync z profilem użytkownika `users.language`. Zobacz [ADR-003: Internationalization Strategy](./adr/ADR-003-internationalization-i18n.md).
*   **System Szat Graficznych i Motywów (Themes):** Silnik 6 starannie dobranych szat graficznych (5 ciemnych/OLED: OLED Emerald [domyślny], Midnight Blue, Forest Sage, Warm Amber, Cyberpunk Violet oraz 1 jasny Clean Light) oparty o semantyczne tokeny CSS variables (`--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--accent`, etc.) z przełączaniem <1ms bez reflow. Interaktywny selektor z kartami barw (Visual Swatch Cards) w dialogu konta na Desktopie i wysuwanym arkuszu (Bottom Sheet) z haptyką (`navigator.vibrate(50)`) na Mobile PWA, anti-FOUC skrypt w `index.html`, multi-tier persistence (`localStorage` + `public.users.theme` z izolacją per-user i RLS). Zobacz [ADR-004: Theme System & Visual Styling](./adr/ADR-004-theme-system-and-visual-styling.md).
*   **Import Przepisów z JSON (Desktop Shortcut `Ctrl+Alt+P`):** Dedykowany, wielkoformatowy edytor modalny (`JsonRecipeImportDialog`) uruchamiany globalnym skrótem klawiszowym `Ctrl+Alt+P` (lub `Cmd+Option+P` na macOS) wyłącznie na Desktopie. Posiada walidację składni i schematu encji w locie (Real-Time Validation), inteligentną normalizację jednostek (`kg` -> `g`, `dag` -> `g`, `l` -> `ml`, `szt`/`pcs` -> `pcs`), wsparcie importu pojedynczego i wsadowego, automatyczne tworzenie brakujących produktów w katalogu oraz natychmiastowy zapis do bazy danych i przekierowanie do Przepiśnika.

## 7. Instrukcja Konfiguracji (DEV & Vercel)
*   **Google Console:** Wygenerować OAuth Client ID dla logowania Gmail i podpiąć w panelu Auth w Supabase.
*   **Supabase:** Wykonać migrację RLS z [20260822000000_enable_rls_and_security_policies.sql](../supabase/migrations/20260822000000_enable_rls_and_security_policies.sql) w SQL Editorze i włączyć replikację (Realtime) dla tabeli `shopping_list_items`.
*   **Vercel:** Zaimportować repozytorium GitHub i ustawić zmienne środowiskowe `VITE_SUPABASE_URL` oraz `VITE_SUPABASE_ANON_KEY`.

## 8. Wytyczne dla Asystentów AI i Kontrybutorów
Wszystkie reguły architektoniczne, standardy kodowania, procedury testowe oraz wytyczne dla asystentów AI zostały skodyfikowane w:
👉 **[AGENTS.md](../AGENTS.md)** oraz w katalogu **[.agents/rules/](../.agents/rules/)**.
*   **Modułowość:** Wydzielanie komponentów UI, custom hooków (`src/hooks/`) i czystych funkcji kalkulacji (`src/lib/calculations/`).
*   **Strict Service Layer:** Komponenty UI nie odpytują Supabase bezpośrednio – zawsze przez Zustand Store i warstwę `src/services/`.
*   **Testy Automatyczne:** Pokrycie logiki biznesowej i kluczowych User Flows za pomocą Vitest (`npm run test`).
*   **ADR:** Wszystkie kluczowe decyzje architektoniczne dokumentowane w `docs/adr/`.