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
   * [ADR-004: Theme System & Visual Styling](./adr/ADR-004-theme-system-and-visual-styling.md)
   * [ADR-005: Multiple Concurrent Active Shopping Lists & Smart Cart Transfer](./adr/ADR-005-multiple-active-shopping-lists.md)
   * [ADR-006: Custom Product Categories & Store Aisle Sorting](./adr/ADR-006-custom-product-categories-and-aisle-sorting.md)
3. **Automatyczne Testy Jednostkowe & User Flow:**
   * Konfiguracja Vitest + React Testing Library (`jsdom`).
   * Testy czystych kalkulacji (`src/lib/calculations/__tests__/`).
   * Testy integracyjne formularzy i unikalnych flow w widokach (`src/components/**/__tests__/`).

## Faza 8: Internacjonalizacja (i18n) i Standaryzacja Językowa Kodu (Zakończona)
**Cel:** 100% czystości angielskiej w kodzie bazowym, centralny system tłumaczeń i wielojęzyczność (PL / EN).

1. **Fundament i Słowniki i18n:**
   * Utworzenie centralnego silnika tłumaczeń `src/i18n/` z dedykowanymi słownikami `en.ts` i `pl.ts` oraz wsparciem reguł gramatycznych słowiańskich form liczby mnogiej (`Intl.PluralRules`).
   * Wdrożenie hooka `useTranslation` oraz store'a Zustand `useI18nStore` z 3-stopniową hierarchią zapisu (Zustand -> Supabase `users.language` -> `localStorage`).
2. **Czystość Kodu i Standaryzacja Bazy Danych:**
   * Migracja PostgreSQL `supabase/migrations/20260824000000_i18n_and_english_standardization.sql`:
     * Zmiana typu enum z `'szt'` na `'pcs'`.
     * Dodanie kolumny `language VARCHAR(10) DEFAULT 'pl'` do tabeli `users`.
     * Ujednolicenie systemowych kategorii posiłków i produktów do angielskich slugów.
   * Eliminacja wszystkich polskich słów kluczowych, zmiennych, komentarzy i typów z kodu TypeScript.
3. **Komponenty i Dual Layout:**
   * Komponent `LanguageSwitcher` w wariantach: `pill`, `segmented`, `dropdown`.
   * Integracja we wszystkich widokach Desktop i Mobile (`BottomNavigation`, `DesktopSidebar`, `DesktopHeader`, `LoginScreen`, `AccountDetailsDialog`, itp.).
4. **Weryfikacja Jakości:**
   * Pokrycie testami jednostkowymi silnika i18n (`src/i18n/__tests__/i18n.test.ts`) oraz testami nawigacji (`BottomNavigation.test.tsx`).
   * Przejście testów Vitest (`npm run test`), lintera (`npm run lint`) oraz kompilatora TypeScript (`npx tsc -b`).

## Faza 9: System Szat Graficznych i Motywów (Zakończona)
**Cel:** Personalizacja wyglądu (6 motywów: OLED Black, Midnight Blue, Forest Sage, Warm Amber, Cyberpunk Violet, Clean Light), semantyczne tokeny CSS i wsparcie dla warunków oświetleniowych w markecie.

1. **Baza Danych & Typy:**
   * Migracja `supabase/migrations/20260825000000_add_theme_to_users.sql` (kolumna `theme VARCHAR(30) DEFAULT 'oled-black' NOT NULL` w tabeli `public.users` z RLS).
   * Typy TypeScript w `src/types/theme.ts` i aktualizacja `src/types/supabase.ts`.
2. **System Tokenów CSS & Anti-FOUC:**
   * Definicja zestawów HSL dla 6 motywów w `src/index.css` sterowanych atrybutem `data-theme` na `<html>`.
   * Anti-FOUC skrypt w `<head>` pliku `index.html`.
   * Kontekst/Store `ThemeContext` / `useTheme` z hierarchią (DOM -> `localStorage` -> debounced sync do Supabase).
3. **Komponenty i UX Duality:**
   * Komponent `ThemeSelector` z wizualnymi kartami próbek kolorów (Visual Theme Swatch Cards).
   * Integracja w `AccountDetailsDialog` (Desktop) i Settings Sheet (Mobile PWA) z haptyką (`navigator.vibrate(50)`).
   * Refaktoryzacja klas Tailwind w komponentach ze sztywnych `zinc-*` / `emerald-*` na semantyczne tokeny (`bg-background`, `bg-card`, `border-border`, `bg-primary`, `text-primary`).
4. **Testy i Weryfikacja:**
   * Testy jednostkowe walidatora motywów i tokenów (`src/theme/__tests__/theme.test.ts`).
   * Testy integracyjne RTL dla Desktop i Mobile PWA (`AccountDetailsTheme.test.tsx`).

## Faza 10: Wielolistowość i Elastyczny Transfer z Koszyka (Zakończona)
**Cel:** Wsparcie wielu równorzędnych aktywnych list zakupowych (np. spożywcze vs dom), inteligentny transfer z koszyka oraz szybkie przełączanie. Zobacz [ADR-005](./adr/ADR-005-multiple-active-shopping-lists.md).

1. **Baza Danych & Schemat:**
   * Migracja PostgreSQL: dodanie kolumn `is_default BOOLEAN DEFAULT FALSE` i `updated_at TIMESTAMPTZ DEFAULT NOW()` do `shopping_lists`.
   * Indeksy wydajnościowe: `idx_shopping_lists_household_status` i `idx_shopping_list_items_list_checked`.
   * Backfill: oznaczenie istniejących aktywnych list jako `is_default = TRUE`.
2. **Warstwa Kalkulacji & Serwisów:**
   * Czysta funkcja agregacji i scalania `mergeDraftItemsIntoActiveList` z sumowaniem ilości i resetem `is_checked = false`.
   * Rozbudowa `shoppingListService` o `getActiveListsSummary`, `addItemsToActiveList`, `setDefaultActiveList`, `deleteShoppingList` bez mimowolnej archiwizacji.
3. **Zarządzanie Stanem (Zustand):**
   * Rozszerzenie `useShoppingStore` o `selectedActiveListId`, `activeListsSummary` z synchronizacją `localStorage`.
   * Podpięcie odsłuchu Realtime na poziomie gospodarstwa domowego.
4. **Komponenty i Dual Layout:**
   * Komponent modalu transferu: `TransferToActiveListSheet` (Mobile) oraz `TransferToActiveListDialog` (Desktop).
   * Nawigacja i przełączanie: poziome chipsy z badge'ami nieodhaczonych pozycji na Mobile (`ActiveListView`) oraz Segmented Tabs na Desktopie (`DesktopActiveListView`).
   * Zarządzanie listami: tworzenie nowej listy z palca, zmiana nazwy, oznaczanie jako domyślna, archiwizacja pojedynczej listy, usuwanie.
5. **Testy i Weryfikacja Jakości:**
   * Testy jednostkowe czystych funkcji kalkulacji i scalania (`mergeDraftItems.test.ts`).
   * Testy User Flow w Vitest i React Testing Library dla modalu transferu i przełączania list.

## Faza 11: Własne Kategorie Produktów, Nadpisywanie Ustawień i Układ Alejek Sklepowych (Zakończona)
**Cel:** Elastyczne zarządzanie kategoriami produktów per gospodarstwo domowe (tworzenie, edycja, usuwanie, ukrywanie) oraz personalizacja fizycznej kolejności alejek w sklepie (Store Aisle Sorting) z zachowaniem domyślnych kategorii globalnych. Zobacz [ADR-006](./adr/ADR-006-custom-product-categories-and-aisle-sorting.md).

1. **Baza Danych & RLS (Supabase):**
   * Migracja PostgreSQL: dodanie kolumny `household_id UUID NULL REFERENCES households(id)` do `product_categories`.
   * Nowa tabela `household_category_settings` (`household_id`, `category_id`, `custom_sort_order`, `is_hidden`, `custom_name`, `store_profile_id`).
   * Indeksy B-tree pod zapytania relacyjne i sortowanie.
   * Polityki RLS: kategorie globalne są niemodyfikowalne i nieusuwalne przez użytkowników (`household_id IS NULL`), własne kategorie i ustawienia są w pełni izolowane per gospodarstwo.
   * Włączenie replikacji Supabase Realtime dla `household_category_settings`.
2. **Czysta Warstwa Kalkulacji & Serwisów:**
   * Czysta funkcja `resolveCategoryList` i `calculateReorderedIntervals` w `src/lib/calculations/categorySorting.ts`.
   * Obsługa krytycznego fallbacku: ukryte kategorie z przypisanymi produktami na aktywnej liście pozostają widoczne w trybie bezpiecznym w markecie.
   * Dedykowany serwis `src/services/categoryService.ts` obsługujący pobieranie hybrydowe, CRUD własnych kategorii oraz debounced batch upsert kolejności.
3. **Zarządzanie Stanem (Zustand):**
   * Utworzenie `src/store/useCategoryStore.ts` z optymistycznym auto-save, natychmiastowym renderem nowej kolejności i rollbackiem przy błędzie sieci.
   * Subskrypcja Realtime synchronizująca kolejność alejek na żywo między domownikami.
4. **Komponenty i Dual Layout:**
   * Modale zarządzania kategoriami: `CategoryManagerSheet` (Mobile PWA) ze wsparciem Drag & Drop, przyciskami góra/dół (strefa kciuka min. 44x44px) i wibracją haptic (`navigator.vibrate(40)`) oraz `CategoryManagerDialog` (Desktop) z obsługą klawiatury.
   * Punkt wejścia: ikona konfiguracji w filtrze kategorii w widoku `ProductsView` oraz w oknie ustawień gospodarstwa `HouseholdsDialog`.
   * Widok `ActiveListView` / `DesktopActiveListView`: grupowanie i numerowanie alejek według resolved `custom_sort_order`.
5. **Testy Automatyczne i Weryfikacja:**
   * 100% pokrycia czystych funkcji kalkulacji `categorySorting.test.ts`.
   * Testy integracyjne serwisu i store'a (w tym obsługa błędów sieci i rollbacku).
   * Testy User Flow w Vitest i React Testing Library dla Mobile i Desktop.

## Faza 11.1: Udoskonalenia Historii List Zakupowych (Zakończona)
**Cel:** Pełne zachowanie wybranych kategorii pozycji (`category_id`) w historii, śledzenie i wyświetlanie oryginalnej nazwy listy po jej zmianie oraz symetryczny podział przycisków akcji (50/50) ze spójnym modalem potwierdzenia usunięcia.

1. **Baza Danych:**
   * Dodanie kolumny `original_name TEXT` do tabeli `shopping_lists` z migracją backfillującą snapshot dla zarchiwizowanych list.
2. **Warstwa Kalkulacji & Serwisów:**
   * `groupItemsByAisle`: uwzględnienie relacji `category` na poziomie pozycji listy (`item.category_id`) z wyższym priorytetem niż domyślna kategoria z katalogu produktów.
   * `shoppingListService`: pobieranie powiązanej kategorii `category:product_categories(*)` w `getListWithDetails`, snapshot oryginalnej nazwy przy archiwizacji i edycji, zachowanie `category_id` przy przywracaniu/przenoszeniu do koszyka (`AddToDraftPayload`).
3. **Komponenty i Dual Layout:**
   * Widok `DesktopHistoryView`: prezentacja oryginalnej nazwy (`text-xs text-muted-foreground font-mono`) poniżej zmienionego tytułu (w lewej kolumnie i panelu szczegółów), ukrywanie gdy nazwa nie uległa zmianie. Przyciski dolne w układzie `grid-cols-2`: "Dodaj do koszyka" i czerwony "Usuń listę" wyzwalający `<ConfirmDeleteDialog>`.
   * Widok mobilny `HistoryView` i arkusz `HistoryListDetailsSheet`: analogiczna prezentacja `original_name` pod tytułem, podział paska akcji na równe 50/50 ("Dodaj do koszyka" + czerwony "Usuń listę") ze spójnym oknem potwierdzenia `<ConfirmDeleteDialog>`.
4. **Testy Automatyczne:**
   * Pokrycie przepływów w `DesktopHistoryView.test.tsx`, `HistoryView.test.tsx` oraz dedykowany `HistoryListDetailsSheet.test.tsx`.

## Faza 12: Moduł Powiadomień Multiplatformowych (Web Push) i Rozszerzalny Rejestr Zdarzeń (Zakończona)
**Cel:** Natywne powiadomienia Web Push (VAPID) działające w tle na urządzeniach Mobile PWA i Desktop, scentralizowany i silnie typowany rejestr zdarzeń (`Notification Registry`) umożliwiający łatwe dodawanie nowych powiadomień oraz architektura przygotowana na bezszwowe dodanie trwałej historii w przyszłości. Zobacz [ADR-007](./adr/ADR-007-multiplatform-web-push-notifications.md).

1. **Baza Danych & RLS (Supabase):**
   * Migracja PostgreSQL `20260831000000_add_push_subscriptions.sql`: utworzenie tabeli `push_subscriptions` (`id`, `user_id`, `household_id`, `endpoint`, `p256dh`, `auth`, `user_agent`, `created_at`, `last_used_at`).
   * Indeksy B-tree na `household_id` i `user_id` oraz klucz unikalny `uq_push_subscriptions_endpoint`.
   * Kompletne polityki RLS (SELECT, INSERT, UPDATE, DELETE) ograniczone do domowników (`public.get_user_household_ids(auth.uid())`) i właściciela sesji (`auth.uid() = user_id`).
   * Aktualizacja typów TypeScript w `src/types/supabase.ts`.
2. **Supabase Edge Function (Backend Push Dispatch):**
   * Deno Edge Function `supabase/functions/send-push-notification/index.ts` korzystająca ze standardu RFC 8291/8292 (`esm.sh/web-push@3.6.7`).
   * Weryfikacja tokena autoryzacyjnego wywołującego (`userClient.auth.getUser()`).
   * Samotłumienie powiadomień (`.neq('user_id', user.id)`) - brak uciążliwych self-notifications.
   * Auto-pruning nieaktywnych tokenów (kody 410 Gone / 404 Not Found z bramek push FCM/APNS/Mozilla).
3. **Frontend & Rozszerzalny Rejestr Zdarzeń (Notification Registry):**
   * Silnie typowana mapa `NotificationPayloadMap` oraz katalog `NOTIFICATION_REGISTRY` w `src/lib/notifications/registry.ts` z obsługą wielojęzyczności (`pl` / `en`).
   * Zdarzenia: `LIST_ITEM_ADDED`, `LIST_COMPLETED`, `HOUSEHOLD_MEMBER_JOINED`, `LIST_CLEARED_OR_ARCHIVED`.
   * Serwis `notificationService` w `src/services/notificationService.ts` z cichym tłumieniem błędów sieciowych (`fail-safe`) oraz adapterem `NotificationStorageChannel` przygotowanym pod trwałą historię w bazie.
   * Reaktywny stan Zustand w `src/store/useNotificationStore.ts`.
4. **Service Worker & Integracja PWA:**
   * Dedykowany skrypt `public/sw-push.js` obsługujący zdarzenia `push` (zwijanie notyfikacji wg `tag`, wibracja haptic) oraz `notificationclick` (focus otwartej karty lub `openWindow`).
   * Konfiguracja `workbox: { importScripts: ['sw-push.js'] }` w `vite.config.ts`.
   * Czyste parsowanie ładunków w `src/lib/notifications/swHandler.ts`.
5. **Komponenty i Dual Layout:**
   * Komponent ustawień `NotificationSettings` osadzony w `AccountDetailsDialog` (dostępny na Desktopie i Mobile) z odznakami stanu (*Aktywne*, *Wymaga włączenia*, *Zablokowane*, *Nieobsługiwane*), przełącznikiem subskrypcji oraz przyciskiem wysyłki powiadomienia testowego.
   * Kontekstowy baner soft-prompt `NotificationPromptBanner` zintegrowany w `MobileLayout.tsx` i `DesktopLayout.tsx` z trwałym zapamiętywaniem odrzucenia w `localStorage`.
   * Dedykowany asystent instalacji na ekranie początkowym dla użytkowników iOS Safari (non-PWA).
6. **Integracja z Przepływami Biznesowymi:**
   * Zdarzenie `LIST_ITEM_ADDED` przy dodawaniu i transferze produktów do aktywnej listy.
   * Zdarzenie `LIST_COMPLETED` przy odhaczeniu ostatniego produktu z listy w `ActiveListView` i `DesktopActiveListView`.
   * Zdarzenie `LIST_CLEARED_OR_ARCHIVED` przy archiwizacji listy.
   * Zdarzenie `HOUSEHOLD_MEMBER_JOINED` przy dodaniu domownika lub akceptacji zaproszenia.
7. **Testy Automatyczne i Jakość:**
   * Mocki `Notification`, `PushManager` i `ServiceWorker` w `src/test/setup.ts`.
   * 6 nowych pakietów testowych: `registry.test.ts`, `webPush.test.ts`, `notificationService.test.ts`, `useNotificationStore.test.ts`, `NotificationSettings.test.tsx`, `NotificationPromptBanner.test.tsx`.
   * Wszystkie testy (34 pliki, 215 testów) zakończone wynikiem 100% pass, zero błędów oxlint, czysty build produkcyjny i kompilacja `tsc -b`.

## Faza 13: Wielkoformatowy Import Przepisów z JSON pod Skrótem CTRL+ALT+P (Zakończona)
**Cel:** Błyskawiczny import przepisów (pojedynczych lub wsadowych) w widoku Desktop za pomocą globalnego skrótu klawiszowego `Ctrl+Alt+P` (lub `Cmd+Option+P` na macOS), natychmiastowa walidacja składni i schematu encji, inteligentna normalizacja jednostek oraz automatyczne dopasowywanie i tworzenie brakujących produktów w bazie danych.

1. **Czyste Funkcje i Walidator Schemy (`src/lib/recipeJsonImport.ts`):**
   * Funkcja `validateRecipeJson`: parsowanie JSON w czasie rzeczywistym, weryfikacja wymaganych pól (`name`, `ingredients`), normalizacja kroków przygotowania i tagów.
   * Funkcja `normalizeUnitAndQuantity`: inteligentne przeliczanie jednostek (`kg` -> 1000 `g`, `dag` -> 10 `g`, `l` -> 1000 `ml`, `szt`/`pcs` -> `pcs`, łyżki/szklanki).
   * Szablon wzorcowy `EXAMPLE_RECIPE_JSON_TEMPLATE` do natychmiastowego wklejenia lub skopiowania.
2. **Komponent UI Modalu (`JsonRecipeImportDialog.tsx`):**
   * Wielkoformatowy dialog `Dialog` (`max-w-4xl`) z edytorem tekstowym o stałej szerokości znaków (`font-mono`).
   * Dynamiczny panel stanu: błędy składni JSON (czerwony baner), błędy schematu encji z listą brakujących pól (bursztynowy baner) oraz zielony stan gotowości do zapisu.
   * Akcje: "Kopiuj szablon JSON", "Wyczyść", "Odrzuć" (anulowanie i zamknięcie) oraz "Zapisz przepis(y)".
   * Logika zapisu: pobranie istniejącego katalogu produktów, automatyczne utworzenie brakujących pozycji w `products` (z zachowaniem makroskładników jeśli podano w JSON), wstawienie posiłku do `meals` i `meal_ingredients`, odświeżenie danych i przekierowanie do Przepiśnika (`cookbook`).
3. **Integracja z Desktop Layout i Nagłówkiem:**
   * Globalny nasłuchiwacz `keydown` (`Ctrl+Alt+P` / `Cmd+Option+P`) w `DesktopLayout.tsx`.
   * Przycisk ze skrótem oraz opcja w menu szybkiego dodawania w `DesktopHeader.tsx`.
   * Pełna lokalizacja i18n (`pl` i `en`) w `src/i18n/locales/`.
4. **Testy Jednostkowe i Jakość:**
   * 14 testów silnika walidacji i normalizacji jednostek w `recipeJsonImport.test.ts`.
   * 7 testów komponentowych dialogu w `JsonRecipeImportDialog.test.tsx`.
   * 2 testy integracji skrótu i nagłówka w `DesktopLayoutShortcut.test.tsx`.
   * Komplet testów zielony (183 passed), zero błędów oxlint i zero błędów `tsc -b`.

## Faza 14: Moduł Spiżarnia i Inteligentna Synchronizacja Zapasów (ADR-008) (Zakończona w całości)
**Cel:** Zapobieganie dublowaniu zakupów oraz marnowaniu żywności poprzez dedykowany moduł inwentarza domowego (Spiżarnia), automatyczne zasilanie z archiwizowanych list zakupów, wskaźniki świeżości (3-7 dni dla żywności, 2-4 tyg dla chemii) z modalem weryfikacji w Koszyku i na Aktywnej Liście oraz synchronizację Realtime. Zobacz [ADR-008](./adr/ADR-008-pantry-management-and-inventory-sync.md).

1. **Baza Danych & RLS (Supabase):**
   * Migracja PostgreSQL `supabase/migrations/20260901000000_add_pantry_module.sql`:
     * Dodanie kolumny `is_non_food BOOLEAN DEFAULT FALSE` do `product_categories` (kategorie 7 'household' i 8 'other' domyślnie oznaczone jako `true`).
     * Dodanie kolumny `in_pantry BOOLEAN DEFAULT FALSE` do `shopping_list_items`.
     * Utworzenie tabeli `pantry_items` (`id`, `household_id`, `product_id`, `ad_hoc_name`, `category_id`, `quantity`, `unit_type`, `last_purchased_at`, `last_verified_at`, `created_at`, `updated_at`).
     * Indeksy B-tree: `idx_pantry_items_household_product`, `idx_pantry_items_household`, `idx_pantry_items_last_purchased`.
     * Kompletne polityki RLS (SELECT, INSERT, UPDATE, DELETE) powiązane z `get_user_household_ids(auth.uid())`.
     * Publikacja tabeli `pantry_items` w `supabase_realtime`.
   * Aktualizacja definicji TypeScript w `src/types/supabase.ts` oraz view modeli domenowych w `src/types/pantry.ts`.
2. **Czyste Funkcje Kalkulacji (`src/lib/calculations/pantryCalculations.ts`):**
   * Funkcja `calculatePantryFreshness`: rygorystyczne reguły świeżości (<3 dni, 3-7 dni, >7 dni dla żywności; <14 dni, 14-28 dni, >28 dni dla chemii/non-food) z uwzględnieniem `last_verified_at`.
   * Funkcja `calculatePantryQuantityDelta` do obsługi weryfikacji cząstkowych i pomniejszania ilości na liście.
   * 11 testów jednostkowych pokrywających 100% przypadków brzegowych w `pantryCalculations.test.ts`.
3. **Zarządzanie Stanem & Serwisy (`usePantryStore.ts` & `pantryService.ts`):**
   * Serwis `pantryService.ts` obsługujący CRUD, weryfikację stanu (`verifyItem`), usuwanie według produktu lub nazwy ad-hoc (`removeByProductOrName`) oraz inteligentne dodawanie ze scalaniem (`addOrIncrementItem`).
   * Zasilanie inwentarza przy archiwizacji listy w `shoppingListService.archiveActiveList`: automatyczny batch upsert ze scalaniem ilości, eliminacja duplikatów i wyłączenie pozycji `in_pantry = true` ze zwrotu do draftu.
   * Zustand store `usePantryStore.ts` z natychmiastowym Optimistic UI, automatycznym rollbackiem przy błędzie sieci oraz szybkimi indeksami wyszukiwania O(1) (`pantryMapByProductId`, `pantryMapByAdHocName`).
4. **Interaktywny Modal / Sheet Weryfikacji (`PantryConfirmModal`):**
   * Responsywny komponent: `Sheet` (Mobile PWA) i `Dialog` (Desktop).
   * 4 akcje użytkownika:
     * *"Mam całość"*: usunięcie pozycji z koszyka lub oznaczenie `in_pantry = true` na aktywnej liście + aktualizacja daty `last_verified_at`.
     * *"Mam częściowo"*: redukcja ilości na liście do kupienia o ilość posiadaną w domu + aktualizacja stanu spiżarni.
     * *"Nie mam produktu"*: wyzerowanie stanu w spiżarni z zachowaniem pozycji na liście.
     * *"Przywróć do kupienia"*: pełna odwracalność - ponowne otwarcie wiersza z `in_pantry = true` umożliwia powrót do stanu zakupu.
5. **Integracja z Widokami Koszyka i Aktywnej Listy:**
   * W widokach `DraftView` i `DesktopDraftView`: ikona `Warehouse` obok stepera ze wskaźnikiem świeżości (zielony/pomarańczowy/czerwony dot).
   * W widokach `ActiveListView` i `DesktopActiveListView`:
     * Wyróżniający styl dla pozycji `in_pantry = true` (bursztynowa przerywana ramka, bursztynowe przekreślenie, odznaka *"W spiżarni"*, zablokowany steper).
     * Kliknięcie pozycji lub badge'a otwiera modal z możliwością przywrócenia do listy.
     * Pasek postępu listy zakupowej uwzględnia pozycje pokryte spiżarnią w kalkulacji ukończenia (np. "3/3").
6. **Nowe Widoki i Nawigacja (Dual Layout):**
   * Responsywne okno dodawania artykułów `AddPantryItemDialog` (Mobile Sheet / Desktop Dialog) z wyszukiwarką katalogową `ProductAutocomplete`, automatycznym wykrywaniem duplikatów (*"Zwiększ stan (+X)"* vs *"Ustaw dokładnie (X)"*) oraz auto-rejestracją w katalogu.
   * Widoki magazynu domowego `PantryView.tsx` (Mobile) oraz `DesktopPantryView.tsx` (Desktop) z podziałem na alejki sklepowe (`groupItemsByAisle`), filtrem kategorii, wyszukiwarką, inline steperami ilości i statystykami świeżości.
   * Nowa, 6. zakładka w dolnym pasku nawigacyjnym `BottomNavigation.tsx` (Mobile PWA) zoptymalizowana pod ekrany 360px (etykiety 10px, strefa dotyku 48px) oraz 6. pozycja w bocznym menu `DesktopSidebar.tsx` (Desktop).
7. **Integracja z Przepisami i Produktami (Faza 4 z ADR-008):**
   * **Katalog Produktów (`ProductsView.tsx` i `DesktopProductsView.tsx`):**
     * Odznaka stanu magazynowego przy każdym produkcie w katalogu: wyświetlanie aktualnego stanu w spiżarni z kolorowym indykatorem świeżości (zielony/pomarańczowy/czerwony dot zależny od daty weryfikacji i typu kategorii food/non-food).
     * Przycisk szybkiej akcji `Warehouse` na karcie produktu: otwiera `AddPantryItemDialog` z wstępnie wybranym produktem (`initialProduct`), umożliwiając błyskawiczne zasilenie stanu magazynowego z poziomu bazy artykułów.
   * **Przepiśnik i Posiłki (`CookbookView.tsx` i `DesktopCookbookView.tsx`):**
     * Analiza dostępności składników w spiżarni w czasie rzeczywistym dla każdego przepisu: porównanie `meal_ingredients` ze stanem w `pantryMapByProductId`.
     * Odznaki dostępności: zielona *"Wszystkie składniki w spiżarni"* (100% pokrycia) lub bursztynowa *"{count}/{total} składników w spiżarni"*.
   * **Szczegóły Przepisu (`MealDetailsSheet.tsx`):**
     * Dynamiczne badże dostępności przy każdym składniku przepisu: zielona odznaka *"Dostępne w spiżarni: {qty} {unit}"* (przy pełnym pokryciu) lub bursztynowa *"Częściowo w spiżarni: {qty} {unit}"* (przy częściowym pokryciu).
   * **Globalna Synchronizacja Realtime (`App.tsx`):**
     * Podpięcie hooka `usePantryRealtime(household?.id ?? null, () => usePantryStore.getState().syncFromRealtime())` w głównym drzewie aplikacji – natychmiastowe odzwierciedlanie zmian w stanach spiżarni na wszystkich sparowanych urządzeniach we wszystkich widokach bez dublowania subskrypcji WebSocket.
8. **Testy i Jakość:**
   * 39 pakietów testowych Vitest (245 testów) zakończonych wynikiem 100% pass (w tym `pantryCalculations.test.ts`, `usePantryStore.test.ts`, `PantryView.test.tsx`, `CookbookView.test.tsx` oraz `ProductsView.test.tsx`).
   * Czysty build i linter `oxlint` (0 błędów).
   * Rygorystyczny typecheck TypeScript `tsc -b` bez żadnych błędów ani użycia typu `any`.

## Faza 15: Moduł Kalendarza i Planowania Posiłków (ADR-009)
**Cel:** Pełnowymiarowy kalendarz planowania posiłków z trzema perspektywami (Miesiąc, Tydzień roboczy/pełny, Dzień z podziałem na kategorie i makro), bezpośrednią synchronizacją z procesem zakupowym (Koszyk -> Aktywna lista -> Kupione), wykrywaniem niepewności (⚠️) przy brakujących składnikach, uwzględnianiem zapasów ze Spiżarni oraz zablokowanym trybem archiwalnym dla przeszłości. Zobacz [ADR-009](./adr/ADR-009-meal-planning-and-calendar-module.md).

1. **Baza Danych & RLS (Supabase):**
   * Migracja PostgreSQL `supabase/migrations/20261007000000_add_calendar_meal_plans.sql`:
     * Tabela `public.meal_plans` (`id`, `household_id`, `date`, `meal_id`, `meal_category_id`, `custom_name`, `is_ad_hoc`, `servings`, `target_kcal`, `notes`, `sort_order`, `created_at`, `updated_at`).
     * Dodanie kolumny `meal_plan_item_id UUID REFERENCES meal_plans(id) ON DELETE SET NULL` do `shopping_list_items`.
     * Indeksy B-tree na `(household_id, date)`, `(household_id, meal_id)` oraz `meal_plan_item_id`.
     * Kompletne polityki RLS (SELECT, INSERT, UPDATE, DELETE) ograniczone do domowników (`public.get_user_household_ids(auth.uid())`).
     * Włączenie replikacji Supabase Realtime dla `meal_plans`.
   * Aktualizacja typów TypeScript w `src/types/supabase.ts` oraz view modeli domenowych w `src/types/calendar.ts`.
2. **Czyste Funkcje Kalkulacji (`src/lib/calculations/calendarStatus.ts`):**
   * Funkcja `calculateMealPlanStatus`: wyliczenie statusu (`planned`, `in_draft`, `in_list`, `bought`, `uncertain`) na podstawie obecności składników w Spiżarni, Koszyku oraz Aktywnej Liście.
   * Funkcja `calculateDayMacros`: sumowanie kalorii, białka, węglowodanów i tłuszczów w danym dniu ze skalowaniem porcji.
   * Funkcja `generateDraftItemsFromMealPlan`: generowanie pozycji `AddToDraftPayload` z referencją do kalendarza.
3. **Warstwa Serwisów & Stanu (Zustand):**
   * Serwis `mealPlanService.ts` obsługujący CRUD posiłków w kalendarzu, pobieranie zakresu dat, duplikację na kolejny dzień oraz transfer składników do koszyka.
   * Store `useMealPlanStore.ts` z Optimistic UI, auto-rollbackiem przy błędzie sieci oraz subskrypcją Realtime dla domowników.
4. **Komponenty i Dual Layout:**
   * Nawigacja: 7. zakładka w `BottomNavigation.tsx` (Mobile) z dopasowaniem pod ekrany 360px+ oraz 7. pozycja w `DesktopSidebar.tsx` (Desktop).
   * Widoki kalendarza:
     * **Miesiąc:** siatka 7 kolumn (Pn-Nd) z kropkami statusów, zwięzłą liczbą kalorii i płynnym przejściem do dnia po kliknięciu.
     * **Tydzień:** przełącznik Pn-Pt (roboczy) vs Pn-Nd (pełny); na mobile wertykalna lista kart dni z nagłówkami; na desktopie siatka kolumnowa.
     * **Dzień:** pasek makroskładników (kcal, B/W/T), sekcje kategorii posiłków, składniki, integracja ze spiżarnią, przycisk transferu do koszyka oraz popup/sheet "Niepewność" (⚠️) z przywróceniem brakujących produktów.
     * **Archiwum:** przeszłe dni zablokowane do edycji (tylko do odczytu) z trwałymi oznaczeniami ukończenia.
   * Dialogi / Sheety: `AddCalendarMealDialog` / `AddCalendarMealSheet` (wybór z Przepiśnika lub Ad-Hoc, skalowanie porcji).
5. **Testy i Weryfikacja Jakości:**
   * 100% pokrycia testami czystych funkcji kalkulacji statusów i makro (`calendarStatus.test.ts`).
   * Testy integracyjne serwisu i store'a (`mealPlanService.test.ts`, `useMealPlanStore.test.ts`).
   * Testy User Flow w Vitest i React Testing Library dla widoków `CalendarView.test.tsx` i `DesktopCalendarView.test.tsx`.