# SmartShopping - Kompleksowa Mapa Drogowa (Roadmap & Backlog)

> **Status dokumentu:** Aktywny / Żywy backlog techniczno-biznesowy  
> **Data utworzenia:** Październik 2026  
> **Źródło:** Audyt całościowy kodu, architektury, testów, bezpieczeństwa oraz spójności z [PRD](./PRD.md) i [plan.md](./plan.md)  
> **Konstytucja projektu:** [AGENTS.md](../AGENTS.md) | [.agents/rules/](../.agents/rules/)

---

## 1. Wstęp i Metodologia Kategoryzacji

Niniejszy dokument stanowi jednolity rejestr zadań naprawczych, optymalizacyjnych oraz rozwojowych dla aplikacji **SmartShopping**. Zgłoszenia zostały podzielone na 5 ustandaryzowanych kategorii priorytetu:

| Poziom Priorytetu | Znaczenie i Kryteria Kwalifikacji |
| :--- | :--- |
| 🔴 **Critical** | Błędy krytyczne, ryzyko utraty danych (np. utrata odhaczeń w markecie offline), dziury w bezpieczeństwie, awarie blokujące kluczowe procesy użytkownika. |
| 🟠 **High** | Istotne długi techniczne, błędy lintera psujące dewelopment (Fast Refresh), wycieki w testach (`act(...)`), weryfikacja szczelności RLS i multi-tenancy. |
| 🟡 **Medium** | Optymalizacje wydajności (Bundle Size / Code Splitting), higiena bazy danych (retencja danych w Supabase), istotne usprawnienia UX/biznesowe (np. wyciszanie niepewności w kalendarzu). |
| 🟢 **Normal** | Standardowe ulepszenia jakościowe: czyszczenie dokumentacji, dbałość o rozmiar komponentów (<250-300 linii), podstawy dostępności cyfrowej (a11y/WCAG), rozszerzenia spiżarni. |
| 🔵 **Low** | Nowe innowacyjne moduły i funkcjonalności (Skaner kodów kreskowych, śledzenie cen i budżetu, AI OCR paragonów, tryb gościa, aplikacje na zegarki). |

---

## 2. 🔴 Kategoria CRITICAL (Najwyższy Priorytet)

### CRIT-01: Offline Mutation Queue & Background Sync w Markecie (Zero-Connectivity Resilience)
* **Status:** ✅ **Zrealizowane (Październik 2026)**
* **Obszar:** Frontend / State Management (`Zustand`, `localStorage`, `PWA Background Sync`)
* **Pliki implementacji:** [offlineMutationQueue.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/offline/offlineMutationQueue.ts), [useOfflineSync.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useOfflineSync.ts), [ActiveListView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/ActiveListView.tsx), [DesktopActiveListView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/views/DesktopActiveListView.tsx), [AppLayoutRouter.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/AppLayoutRouter.tsx)
* **Pliki testów:** [offlineMutationQueue.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/offline/__tests__/offlineMutationQueue.test.ts), [ActiveListView.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/__tests__/ActiveListView.test.tsx)
* **Problem / Uzasadnienie:**
  * W supermarketach i podziemnych halach zasięg sieci komórkowej ulega częstemu zerwaniu.
  * Dotychczasowy mechanizm przy odhaczaniu (`toggleItemChecked`) przy błędzie sieciowym natychmiast wywoływał `rollbackState()`.
  * Skutek: Użytkownik odhacza 5-10 kupionych artykułów, po czym z powodu utraty łączności aplikacja cofała zaznaczenia, wywołując dezorientację i powtórne zakupy.
* **Wdrożone Rozwiązanie:**
  1. Wprowadzono moduł kolejki mutacji offline ([offlineMutationQueue.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/offline/offlineMutationQueue.ts)) oparty o `localStorage` z odpornością na restarty przeglądarki.
  2. W przypadku braku połączenia lub błędu zapytania sieciowego stan w UI **nie jest cofany** (brak rollbacku) – mutacja trafia do kolejki ze statusem oczekiwania na synchronizację.
  3. Zarejestrowano nasłuchiwanie zdarzenia `window.addEventListener('online')` w hooku [useOfflineSync.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useOfflineSync.ts) podpiętym w głównym routerze aplikacji ([AppLayoutRouter.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/AppLayoutRouter.tsx)).
  4. Po powrocie połączenia kolejka jest sekwencyjnie opróżniana z mechanizmem retry i aktualizacją bazodanową w Supabase.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Wyłączenie sieci (Chrome DevTools: Offline / `navigator.onLine = false`) i odhaczenie pozycji nie wywołuje rollbacku.
  - ✅ Włączenie sieci automatycznie przesyła mutacje do Supabase bez konieczności odświeżania strony.
  - ✅ Pełne pokrycie testami jednostkowymi i integracyjnymi w `offlineMutationQueue.test.ts` oraz `ActiveListView.test.tsx`.

---

### CRIT-02: Optymistyczna Kontrola Współbieżności i Rozwiązywanie Konfliktów Realtime (OCC)
* **Status:** ✅ **Zrealizowane (Październik 2026)**
* **Obszar:** Backend / Baza Danych / Realtime
* **Pliki implementacji:** [20261026151000_shopping_list_items_occ.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261026151000_shopping_list_items_occ.sql), [shoppingItemConflict.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/shoppingItemConflict.ts), [shoppingListService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/shoppingListService.ts), [supabase.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/types/supabase.ts)
* **Pliki testów:** [shoppingItemConflict.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/__tests__/shoppingItemConflict.test.ts)
* **Problem / Uzasadnienie:**
  * Gdy dwóch domowników robi zakupy jednocześnie w różnych alejkach, może dojść do sytuacji Last-Write-Wins bez walidacji znacznika czasu.
  * Zdarzenie WebSocket z opóźnionego telefonu mogło nadpisać nowszy stan pozycji na serwerze i odznaczyć kupiony produkt.
* **Wdrożone Rozwiązanie:**
  1. Dodano kolumnę `updated_at TIMESTAMPTZ DEFAULT NOW()` oraz automatyczny trigger aktualizujący `set_shopping_list_item_updated_at` w migracji [20261026151000_shopping_list_items_occ.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261026151000_shopping_list_items_occ.sql).
  2. Wdrożono algorytm scalania konfliktów ([shoppingItemConflict.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/shoppingItemConflict.ts)) z kluczową regułą biznesową: jeśli którykolwiek z partnerów oznaczył produkt jako kupiony (`is_checked = true`), stan ten pozostaje nadrzędny i nie ulega cofnięciu przez opóźniony pakiet.
  3. Zaktualizowano metodę `toggleItemChecked` w [shoppingListService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/shoppingListService.ts) o weryfikację współbieżną `clientTimestamp`.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Brak utraty stanu odhaczenia przy symulacji opóźnionego pakietu WebSocket / sieciowego z drugiego urządzenia.
  - ✅ Zestaw testów jednostkowych w `shoppingItemConflict.test.ts` weryfikujący wszystkie warianty współbieżnych edycji.

---

### CRIT-03: Zabezpieczenie Edge Function Powiadomień Push (Weryfikacja Przynależności do Household)
* **Status:** ✅ **Zrealizowane (Październik 2026)**
* **Obszar:** Backend / Bezpieczeństwo / Supabase Edge Functions
* **Pliki implementacji:** [send-push-notification/index.ts](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/functions/send-push-notification/index.ts)
* **Pliki testów:** [notificationService.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/__tests__/notificationService.test.ts)
* **Problem / Uzasadnienie:**
  * W funkcji [send-push-notification/index.ts](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/functions/send-push-notification/index.ts) weryfikowany był jedynie ogólny token użytkownika (`userClient.auth.getUser()`), po czym pobierano subskrypcje z tabeli `push_subscriptions` kluczem `service_role` omijającym RLS wyłącznie po `householdId` z payloadu JSON.
  * **Luka:** Zalogowany użytkownik mógł wysłać POST z cudzym `householdId` i rozsyłać powiadomienia push na obce urządzenia.
* **Wdrożone Rozwiązanie:**
  1. Wprowadzono weryfikację przynależności użytkownika do wnioskowanego gospodarstwa domowego w tabeli `household_members` przed pobraniem subskrypcji urządzeń:
     ```typescript
     const { data: member, error: memberError } = await supabaseClient
       .from('household_members')
       .select('id')
       .eq('household_id', householdId)
       .eq('user_id', user.id)
       .maybeSingle();

     if (memberError || !member) {
       return new Response(JSON.stringify({ error: "Forbidden: You are not a member of this household" }), {
         status: 403,
         headers: { ...corsHeaders, "Content-Type": "application/json" }
       });
     }
     ```
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Próba wysłania powiadomienia do gospodarstwa, do którego wywołujący użytkownik nie należy, zostaje zablokowana statusem HTTP 403 Forbidden.

---

### CRIT-04: Uszczelnienie Polityki RLS w `household_members` (Blokada Samowolnego Dołączania do Gospodarstw)
* **Status:** ✅ **Zrealizowane (Październik 2026)**
* **Obszar:** Baza Danych / Bezpieczeństwo / Supabase RLS & RPC
* **Pliki implementacji:** [20261026150000_secure_household_members_rls.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261026150000_secure_household_members_rls.sql), [householdService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/householdService.ts), [supabase.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/types/supabase.ts)
* **Pliki testów:** [householdService.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/__tests__/householdService.test.ts)
* **Problem / Uzasadnienie:**
  * W pierwotnej migracji polityka `INSERT` dla tabeli `household_members` zawierała warunek `WITH CHECK (user_id = auth.uid() OR ...)`.
  * Ponieważ warunek `user_id = auth.uid()` był zawsze spełniony przy wstawianiu własnego ID, **użytkownik znający UUID obcego gospodarstwa mógł samodzielnie dopisać się do niego bez zaproszenia**, zyskując natychmiastowy dostęp do wszystkich danych.
* **Wdrożone Rozwiązanie:**
  1. Usunięto podatną politykę `INSERT` i wdrożono nową, bezpieczną politykę w migracji [20261026150000_secure_household_members_rls.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261026150000_secure_household_members_rls.sql):
     - Dopisanie do gospodarstwa dozwolone jest wyłącznie przez istniejącego członka gospodarstwa LUB przez użytkownika posiadającego aktywne zaproszenie w `household_invites` powiązane z jego adresem e-mail.
  2. Dodano procedurę składowaną `public.create_household_with_member(p_name TEXT)` z klauzulą `SECURITY DEFINER`, umożliwiającą bezpieczne tworzenie nowego gospodarstwa i atomowe przypisanie twórcy jako pierwszego członka.
  3. Zintegrowano [householdService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/householdService.ts) z funkcją RPC `create_household_with_member`.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Próba bezpośredniego dodania rekordu do `household_members` bez zaproszenia jest blokowana przez PostgreSQL RLS.
  - ✅ Tworzenie nowego gospodarstwa oraz dołączanie przez zaproszenia e-mail działają bez zakłóceń. Pokryte testami jednostkowymi w `householdService.test.ts`.

---

### CRIT-05: Naprawa Niejednoznacznej Relacji PostgREST (`PGRST201`) i Brakującego `reference_product` w `mealPlanService.ts` (ADR-010)
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Backend / PostgREST / Kalendarz Posiłków & Produkty Ogólne (ADR-009, ADR-010)
* **Pliki implementacji:** [mealPlanService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/mealPlanService.ts)
* **Pliki testów:** [mealPlanService.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/__tests__/mealPlanService.test.ts)
* **Problem / Uzasadnienie:**
  * W migracji [20261026000000_add_product_hierarchy.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261026000000_add_product_hierarchy.sql) (ADR-010) tabela `meal_ingredients` otrzymała drugi klucz obcy wskazujący na tabelę `products` (`reference_product_id` obok `product_id`).
  * W [mealService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/mealService.ts#L55-L56) zapytanie PostgREST zostało poprawnie ujednoznacznione (`product:products!meal_ingredients_product_id_fkey(*), reference_product:products!meal_ingredients_reference_product_id_fkey(*)`), natomiast w [mealPlanService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/mealPlanService.ts) w metodach `getMealPlans` oraz `createMealPlan` pozostało niejednoznaczne `product:products(*)` bez pobrania `reference_product_id` i `reference_product`.
  * **Skutek:** Na instancji Supabase z obiema relacjami FK zapytanie zwracało błąd `PGRST201` (*Could not embed because more than one relationship was found for 'meal_ingredients' and 'products'*), a funkcja `calculateDayMacros` w [calendarStatus.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/calendarStatus.ts#L223) wyliczała `0 kcal` dla wszystkich produktów ogólnych (`is_general = true`) w Kalendarzu.
* **Wdrożone Rozwiązanie:**
  1. Wydzielono współdzieloną projekcję `MEAL_PLAN_SELECT_QUERY` w [mealPlanService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/mealPlanService.ts) dla `getMealPlans` oraz `createMealPlan` z jawnymi wskazówkami FK: `product:products!meal_ingredients_product_id_fkey(*)` oraz `reference_product:products!meal_ingredients_reference_product_id_fkey(*)` wraz z polem `reference_product_id`.
  2. Rozszerzono typ `RawMealPlanIngredientRow` oraz funkcję `mapMealPlanRow` o `reference_product_id` i `reference_product`.
  3. Dodano test regresyjny w [mealPlanService.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/__tests__/mealPlanService.test.ts) weryfikujący obecność obu jawnych wskazówek FK oraz wyliczanie makroskładników z `reference_product` przez `calculateDayMacros`.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Wyeliminowano błąd PostgREST `PGRST201` w `getMealPlans` i `createMealPlan`.
  - ✅ Kalorie i makroskładniki produktów ogólnych (`is_general = true`) w Kalendarzu są poprawnie wyliczane z `reference_product`.

---

## 3. 🟠 Kategoria HIGH (Wysoki Priorytet)

### HIGH-01: Likwidacja Ostrzeżeń Fast Refresh w Linterze (`oxlint`)
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Frontend / Tooling / Developer Experience
* **Pliki implementacji:** [button.variants.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/ui/button.variants.ts), [button.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/ui/button.tsx), [badge.variants.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/ui/badge.variants.ts), [badge.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/ui/badge.tsx), [authContextDef.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/context/authContextDef.ts), [AuthContext.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/context/AuthContext.tsx), [useAuth.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useAuth.ts)
* **Problem / Uzasadnienie:**
  * Linter `oxlint` zwracał 3 ostrzeżenia reguły `react(only-export-components)` dla `button.tsx`, `badge.tsx` i `AuthContext.tsx`.
  * Skutek: Naruszenie mechanizmu React Hot Module Replacement (HMR) i reset stanu aplikacji przy edycji plików.
* **Wdrożone Rozwiązanie:**
  1. Wydzielono warianty CVA do plików [button.variants.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/ui/button.variants.ts) oraz [badge.variants.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/ui/badge.variants.ts).
  2. Wydzielono definicję kontekstu do [authContextDef.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/context/authContextDef.ts) oraz hooka `useAuth` do [useAuth.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useAuth.ts), aktualizując importy i mocki w całym repozytorium.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Polecenie `npm run lint` wykonuje się z wynikiem `0 warnings and 0 errors`.

---

### HIGH-02: Eliminacja Ostrzeżeń `act(...)` w Środowisku Testowym Vitest
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Testy Automatyczne / Vitest
* **Pliki:** [NotificationSettings.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/settings/__tests__/NotificationSettings.test.tsx), [AccountDetailsTheme.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/dialogs/__tests__/AccountDetailsTheme.test.tsx), [HouseholdsDialog.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/dialogs/__tests__/HouseholdsDialog.test.tsx), [ActiveListView.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/__tests__/ActiveListView.test.tsx)
* **Problem / Uzasadnienie:**
  * Podczas uruchamiania `npm run test` w strumieniu `stderr` pojawiały się ostrzeżenia `An update to ... inside a test was not wrapped in act(...)` (z nieoczekiwanych efektów montowania `checkStatus()`, `getHouseholdMembers()` oraz `getActiveListsSummary()` / realnego `notificationService.notify()`).
* **Wdrożone Rozwiązanie:**
  1. W testach `NotificationSettings.test.tsx` i `AccountDetailsTheme.test.tsx` zabezpieczono i spłukano wywołanie `checkStatus()` z `useEffect`.
  2. W `HouseholdsDialog.test.tsx` dodano oczekiwanie na rozwiązanie asynchronicznego `getHouseholdMembers()` przez `await waitFor(...)`.
  3. W `ActiveListView.test.tsx` zamockowano `notificationService.notify` i zaczekano na odświeżenie podsumowania po przełączeniu checkboxa.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Uruchomienie `npm run test` przechodzi całkowicie czysto bez ostrzeżeń `act(...)` na strumieniu `stderr`.

---

### HIGH-03: RLS Security Audit & Household Multi-Tenancy Cross-Leakage Tests
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Bezpieczeństwo / Supabase RLS
* **Pliki implementacji:** [20261110121000_rls_security_audit_hardening.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261110121000_rls_security_audit_hardening.sql)
* **Pliki testów:** [rlsSecurityAudit.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/__tests__/rlsSecurityAudit.test.ts)
* **Problem / Uzasadnienie:**
  * Audyt wszystkich 18 migracji wykrył luki i braki w klauzulach RLS:
    - `push_subscriptions` UPDATE `WITH CHECK` sprawdzał wyłącznie `auth.uid() = user_id` bez weryfikacji `household_id`, umożliwiając przeniesienie własnej subskrypcji na cudze gospodarstwo i podsłuch powiadomień push.
    - `meal_ingredients` UPDATE nie posiadał jawnej klauzuli `WITH CHECK`.
    - `meal_plans` nie zawierał roli `TO authenticated` ani walidacji własności `meal_id` w `WITH CHECK`.
    - `shopping_list_items` nie weryfikował własności `meal_plan_item_id` w `WITH CHECK`.
    - `users` SELECT pozwalał na odczyt profilu przez nieaktualne pole `users.household_id` po usunięciu z `household_members`.
* **Wdrożone Rozwiązanie:**
  1. Wdrożono migrację uszczelniającą [20261110121000_rls_security_audit_hardening.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261110121000_rls_security_audit_hardening.sql).
  2. Utworzono zautomatyzowany audyt migracji i symulację izolacji multi-tenancy w [rlsSecurityAudit.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/__tests__/rlsSecurityAudit.test.ts).
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Wszystkie tabele `public` posiadają aktywne RLS, jawne polityki `TO authenticated` oraz walidację `WITH CHECK`, a testy cross-leakage przechodzą w 100%.

---

### HIGH-04: Indeksowanie Bazy Danych pod Funkcję RLS `get_user_household_ids` i Klucze Obce
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Baza Danych / Wydajność / Indeksy PostgreSQL
* **Pliki implementacji:** [20261110120000_add_rls_and_fk_indexes.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261110120000_add_rls_and_fk_indexes.sql)
* **Pliki testów:** [rlsSecurityAudit.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/__tests__/rlsSecurityAudit.test.ts)
* **Problem / Uzasadnienie:**
  * Indeks unikalny `(household_id, user_id)` na `household_members` nie był optymalny dla `WHERE user_id = user_uuid` w funkcji `get_user_household_ids`, a klucze obce w `meal_ingredients`, `meals`, `products`, `shopping_list_items` i `pantry_items` nie miały dedykowanych indeksów B-tree.
* **Wdrożone Rozwiązanie:**
  1. Utworzono migrację [20261110120000_add_rls_and_fk_indexes.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261110120000_add_rls_and_fk_indexes.sql) dodającą `idx_household_members_user_id`, `idx_meal_ingredients_meal_id`, `idx_meal_ingredients_product_id`, `idx_meals_household_id`, `idx_products_household_id` oraz indeksy pozostałych kluczy obcych.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Migracja SQL wdrożona i zweryfikowana automatycznie w `rlsSecurityAudit.test.ts`.

---

### HIGH-05: Eliminacja Kaskadowych Przerenderowań Zustand (Selektory i `useShallow`)
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Frontend / Wydajność / React Rendering
* **Pliki implementacji:** Wszystkie widoki Mobile i Desktop, `App.tsx`, `AppLayoutRouter.tsx`, `src/i18n/index.ts`, dialogi, komponenty kalendarza oraz `Toast.tsx`
* **Pliki testów:** [zustandSelectors.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/__tests__/zustandSelectors.test.tsx)
* **Problem / Uzasadnienie:**
  * Komponenty pobierały stan ze sklepów Zustand bez selektorów (`useShoppingStore()`, `usePantryStore()`, itd.), powodując kaskadowe przerenderowania widoków przy każdej zmianie dowolnego pola w store.
* **Wdrożone Rozwiązanie:**
  1. Zastąpiono wszystkie wywołania bez selektorów w całej warstwie UI selektorami atomowymi oraz `useShallow` z `zustand/react/shallow`.
  2. Dodano testy izolacji renderowania i automatyczną straż statyczną w [zustandSelectors.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/__tests__/zustandSelectors.test.tsx).
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Zero wywołań `use*Store()` bez selektora w całym katalogu `src/` i potwierdzony brak kaskadowych przerenderowań w testach.

---

### HIGH-06: Eliminacja Realtime Echo i Podwójnej Wibracji przy Odhaczaniu Pozycji
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Frontend / Realtime / UX
* **Pliki implementacji:** [localMutationTracker.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/realtime/localMutationTracker.ts), [activeListDiff.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/realtime/activeListDiff.ts), [useActiveListRealtime.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useActiveListRealtime.ts), [shoppingListService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/shoppingListService.ts), [ActiveListView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/ActiveListView.tsx), [DesktopActiveListView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/views/DesktopActiveListView.tsx)
* **Pliki testów:** [realtimeEchoAndDiff.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/realtime/__tests__/realtimeEchoAndDiff.test.ts)
* **Problem / Uzasadnienie:**
  * Powracające zdarzenie WebSocket `UPDATE on shopping_list_items` dla lokalnie odhaczonej pozycji wyzwalało drugą wibrację telefonu i dwa pełne zapytania `getActiveListsSummary` + `getListWithDetails`.
* **Wdrożone Rozwiązanie:**
  1. Utworzono tracker lokalnych mutacji ([localMutationTracker.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/realtime/localMutationTracker.ts)) z oknem czasowym TTL 2500ms i weryfikacją zgodności zmienionych pól (aby nie tłumić równoległej zmiany partnera na tym samym produkcie).
  2. Zaktualizowano [useActiveListRealtime.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useActiveListRealtime.ts), aby tłumił wibrację i pełne refetchowanie dla echa nadawcy, oraz wdrożono współdzielony mechanizm pojedynczego diffa w pamięci ([activeListDiff.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/realtime/activeListDiff.ts)) z poszanowaniem reguł OCC (`resolveShoppingItemConflict`).
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Kliknięcie checkboxa wywołuje dokładnie 1 impuls wibracyjny i 0 ponownych pobrań `getListWithDetails` na urządzeniu nadawcy.
  - ✅ Zdalne aktualizacje partnera aplikują pojedynczy diff w locie, pokryte w `realtimeEchoAndDiff.test.ts`.

---

### HIGH-07: Naprawa Błędnego Skalowania Kalorii (`targetKcal`) dla Sztuk (`pcs`) i Produktów Ogólnych w `useShoppingStore.addMealToDraft`
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Logika Biznesowa / Kalkulacje Makroskładników / Koszyk Roboczy
* **Pliki implementacji:** [useShoppingStore.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/useShoppingStore.ts)
* **Pliki testów:** [useShoppingStore.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/__tests__/useShoppingStore.test.ts)
* **Problem / Uzasadnienie:**
  * W metodzie `addMealToDraft` w [useShoppingStore.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/useShoppingStore.ts) bazowa suma kalorii posiłku (`baseKcalTotal`) wyliczana była bezpośrednio ze wzoru `(ing.base_quantity / 100) * (ing.product.kcal_per_100 || 0)`.
  * Prowadziło to do dwóch błędów biznesowych:
    1. Dla jednostek sztukowych (`unit_type === 'pcs'`) wartości odżywcze zdefiniowane są **na 1 sztukę**, a nie na 100 jednostek. Dzielenie przez 100 zaniżało kalorie składników sztukowych 100-krotnie i zawyżało wyliczony mnożnik `multiplier = targetKcal / baseKcalTotal`.
    2. Dla produktów ogólnych (`is_general = true`, ADR-010) makroskładniki znajdują się w `ing.reference_product`, a `ing.product.kcal_per_100` wynosi `null`/`0`. Pominięcie `resolveEffectiveIngredientMacros(ing.product, ing.reference_product)` powodowało błędne skalowanie gramatur przy dodawaniu przepisu z docelową kalorycznością do koszyka.
* **Wdrożone Rozwiązanie:**
  1. Zastąpiono ręczną pętlę w `useShoppingStore.addMealToDraft` wywołaniem czystych funkcji `resolveEffectiveIngredientMacros` oraz `calculateIngredientMacros` z [macroCalculations.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/macroCalculations.ts).
  2. Dodano test jednostkowy w [useShoppingStore.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/__tests__/useShoppingStore.test.ts) weryfikujący skalowanie `targetKcal` posiłków zawierających produkty sztukowe (`pcs`) oraz produkty ogólne z `reference_product`.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Skalowanie `targetKcal` w `addMealToDraft` poprawnie uwzględnia przelicznik `1 szt.` dla `pcs` oraz wartości odżywcze z `reference_product`.

---

### HIGH-08: Uszczelnienie Polityk RLS `INSERT`/`UPDATE` dla Tabel `meals`, `meal_ingredients` oraz Walidacji `parent_id` w `products`
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Bezpieczeństwo / Baza Danych / Supabase RLS Multi-Tenancy
* **Pliki implementacji:** [20261115120000_harden_meals_ingredients_and_products_rls.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261115120000_harden_meals_ingredients_and_products_rls.sql), [20261117000000_fix_products_rls_infinite_recursion.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261117000000_fix_products_rls_infinite_recursion.sql)
* **Pliki testów:** [rlsSecurityAudit.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/__tests__/rlsSecurityAudit.test.ts)
* **Problem / Uzasadnienie:**
  * W migracji [20260822000000_enable_rls_and_security_policies.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20260822000000_enable_rls_and_security_policies.sql#L256-L263) polityka `"Authenticated users can insert meals"` zawierała warunek `WITH CHECK (household_id IS NULL OR household_id IN (SELECT public.get_user_household_ids(auth.uid())))`, a polityka `"Authenticated users can insert meal ingredients"` pozwalała dodawać składniki do dań z `household_id IS NULL`.
  * Ponadto w `meal_ingredients` (`INSERT`/`UPDATE`) brakowało sprawdzenia, czy `product_id` i `reference_product_id` należą do katalogu globalnego lub gospodarstwa danego przepisu, a w `products` (`INSERT`/`UPDATE`) czy `parent_id` wskazuje na produkt globalny bądź należący do tego samego gospodarstwa.
* **Wdrożone Rozwiązanie:**
  1. Wdrożono migrację [20261115120000_harden_meals_ingredients_and_products_rls.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261115120000_harden_meals_ingredients_and_products_rls.sql) zastępującą polityki `INSERT`/`UPDATE` na `meals` oraz `meal_ingredients` warunkiem wymagającym jawnej przynależności `household_id IN (SELECT public.get_user_household_ids(auth.uid()))`.
  2. Dodano weryfikację spójności dzierżawcy (tenant isolation) dla `parent_id` w `products` oraz `product_id`/`reference_product_id` w `meal_ingredients`, a w migracji uzupełniającej [20261117000000_fix_products_rls_infinite_recursion.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261117000000_fix_products_rls_infinite_recursion.sql) wydzielono walidację `parent_id` do funkcji `SECURITY DEFINER` `public.can_link_parent_product(UUID, UUID)` (eliminując błąd PostgreSQL `42P17` *infinite recursion detected in policy for relation "products"*).
  3. Rozszerzono statyczny audyt bezpieczeństwa o `Audit 08 (HIGH-08)` oraz `Audit 11 (42P17 Prevention)` w [rlsSecurityAudit.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/__tests__/rlsSecurityAudit.test.ts).
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Klient API nie może wstrzykiwać globalnych przepisów (`household_id IS NULL`) ani dowiązywać składników/produktów nadrzędnych z obcych gospodarstw.

---

### HIGH-09: Spójność Liczników i Paska Postępu dla Pozycji `in_pantry` oraz Obsługa Snapshotu Retencji (`MED-02`) w Historii
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Logika Biznesowa / Aktywna Lista Zakupów & Historia (`shoppingListService.ts`)
* **Pliki implementacji:** [shoppingListService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/shoppingListService.ts), [activeListCalculations.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/activeListCalculations.ts), [activeListDiff.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/realtime/activeListDiff.ts), [ActiveListView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/ActiveListView.tsx)
* **Pliki testów:** [activeListCalculations.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/__tests__/activeListCalculations.test.ts), [shoppingListService.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/__tests__/shoppingListService.test.ts)
* **Problem / Uzasadnienie:**
  * **Niespójność `in_pantry`:** W `DesktopActiveListView.tsx` oraz w nagłówkach kategorii obu layoutów pozycje oznaczone jako `in_pantry = true` były wliczane do zrealizowanych (`i.is_checked || i.in_pantry`), natomiast w `shoppingListService.getActiveListsSummary`, `activeListDiff.recalculateSummaries`, `calculateActiveListMetrics` oraz w nagłówku mobilnym `ActiveListView.tsx` uwzględniane było wyłącznie `i.is_checked`.
  * **Odczyt zarchiwizowanych pozycji po retencji (`MED-02`):** Po wykonaniu procedury `archive_old_shopping_list_items` metody `getHistoryLists` oraz `getListWithDetails` odpytywały wyłącznie `shopping_list_items`, pomijając `archived_items_snapshot` i `shopping_list_items_archive`.
* **Wdrożone Rozwiązanie:**
  1. Ujednolicono liczenie pozycji zrealizowanych na aktywnej liście (`is_checked || in_pantry`) w `getActiveListsSummary`, `recalculateSummaries`, `calculateActiveListMetrics` oraz mobilnym `ActiveListView.tsx`.
  2. W `getHistoryLists` oraz `getListWithDetails` dodano fallback do `archived_items_snapshot` oraz tabeli `shopping_list_items_archive`, gdy `shopping_list_items` dla zarchiwizowanej listy jest puste.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Liczniki niekupionych pozycji i paski postępu są w 100% spójne dla pozycji `in_pantry`, a zarchiwizowane listy po retencji zachowują status i szczegóły pozycji.

---

### HIGH-10: Optymalizacja Ergonomii Mobilnej Nawigacji Dolnej (`BottomNavigation` – 7 Zakładek), Licznika `activeCount` oraz Przełącznika Układu w `AppHeader`
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** UI/UX / Responsywność Mobile / Nawigacja (`BottomNavigation.tsx`, `AppLayoutRouter.tsx`, `AppHeader.tsx`)
* **Pliki implementacji:** [BottomNavigation.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/BottomNavigation.tsx), [AppLayoutRouter.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/AppLayoutRouter.tsx), [MobileLayout.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/MobileLayout.tsx), [AppHeader.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/AppHeader.tsx), [pl.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/i18n/locales/pl.ts), [en.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/i18n/locales/en.ts)
* **Pliki testów:** [BottomNavigation.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/__tests__/BottomNavigation.test.tsx)
* **Problem / Uzasadnienie:**
  * **Zatłoczenie `BottomNavigation`:** Sztywne ograniczenie `max-w-[56px]` oraz długa etykieta *„Aktywna Lista"* powodowały ucinanie tekstu (`truncate`) na ekranach `360px` i `768px`.
  * **Brak przekazania `activeCount` z `AppLayoutRouter.tsx`:** `AppLayoutRouter.tsx` przekazywał wyłącznie `draftCount`, pomijając `activeCount`.
  * **Jednokierunkowa pułapka przełącznika `LayoutMode` w trybie Mobile:** W menu profilu [AppHeader.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/AppHeader.tsx) brakowało przełącznika `LayoutMode` oraz języka.
* **Wdrożone Rozwiązanie:**
  1. W [BottomNavigation.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/BottomNavigation.tsx) usunięto sztuczny limit `max-w-[56px]`, wprowadzono zwięzłą etykietę mobilną `Lista` / `List` (`navigation.activeListShort`, przy zachowaniu pełnego `aria-label="Aktywna Lista"`) oraz dodano obsługę `pb-[max(0.375rem,env(safe-area-inset-bottom))]`.
  2. Wyliczono `activeCount` z `activeListsSummary` w [AppLayoutRouter.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/AppLayoutRouter.tsx) i przekazano go do `DesktopLayout` oraz `MobileLayout`.
  3. Dodano przełącznik trybu układu (`Auto / Desktop / Mobile`) oraz przełącznik języka (`LanguageSwitcher`) w menu profilu mobilnego [AppHeader.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/AppHeader.tsx).
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Etykiety w `BottomNavigation` mieszczą się bez ucinania, badge `activeCount` wyświetla liczbę pozycji do kupienia na obu układach, a z poziomu `AppHeader` można swobodnie przełączyć język oraz tryb układu (`Auto / Desktop / Mobile`).

---

### HIGH-11: Domknięcie Śledzenia Pełnego Pipeline'u Zakupowego w Kalendarzu (`activeListItems` & `archivedListItems`) oraz Grupowania Kategorii Dnia (`DayCalendarView`)
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Logika Biznesowa / Kalendarz Posiłków (ADR-009) / Spójność z `PRD.md`
* **Pliki implementacji:** [DayCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/DayCalendarView.tsx), [DayMealPlanCard.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/DayMealPlanCard.tsx), [WeekCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/WeekCalendarView.tsx), [MonthCalendarGrid.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/MonthCalendarGrid.tsx), [mealPlanService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/mealPlanService.ts), [shoppingListPipeline.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/shoppingList/shoppingListPipeline.ts), [useShoppingStore.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/useShoppingStore.ts), [calendarStatus.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/calendarStatus.ts)
* **Pliki testów:** [CalendarView.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/__tests__/CalendarView.test.tsx), [useMealPlanStore.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/__tests__/useMealPlanStore.test.ts), [calendarStatus.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/__tests__/calendarStatus.test.ts)
* **Problem / Uzasadnienie:**
  * Funkcja `calculateMealPlanStatus` w [calendarStatus.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/calendarStatus.ts) obsługuje parametry `activeListItems` oraz `archivedListItems`, jednak widoki Kalendarza przekazywały wyłącznie `{ pantryItems, draftItems, isPastDate }`. Po przeniesieniu składników z Koszyka (`draftItems`) na Aktywną Listę Zakupów status posiłku cofał się do `Zaplanowane` (`planned`) zamiast przejść do `Na liście` (`in_list`) lub wykryć usunięcia z aktywnej listy (`⚠️ Niepewny`).
  * Ponadto `DayCalendarView.tsx` renderował płaską listę posiłków bez grupowania w sekcje kategorii (`meal_categories`: Śniadanie, Obiad, Kolacja) i bez odznaki kategorii, a zapytanie w `mealPlanService.ts` nie dołączało relacji `meal_category:meal_categories(*)`.
* **Wdrożone Rozwiązanie:**
  1. Wdrożono pobieranie pozycji pipeline'u zakupowego (`getCalendarPipelineItems` w `shoppingListPipeline.ts`) oraz synchronizację `activeListItems` / `archivedListItems` w `useShoppingStore.ts` (`syncListItemsToPipeline`), zasilającą `calculateMealPlanStatus` we wszystkich widokach (`DayCalendarView`, `WeekCalendarView`, `MonthCalendarGrid`).
  2. Rozszerzono zapytanie `mealPlanService.ts` o relację `meal_category:meal_categories(*)` oraz wydzielono komponent `DayMealPlanCard.tsx`, grupując posiłki w `DayCalendarView.tsx` pod zlokalizowanymi nagłówkami kategorii z odznakami kategorii.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Przeniesienie składników z Koszyka na Aktywną Listę zmienia status posiłku na `in_list`, odhaczenie/archiwizacja na `bought`, usunięcie z aktywnej listy na `uncertain`, a Widok Dnia prezentuje czytelne sekcje kategorii posiłków.

---

### HIGH-12: Pełny Cykl Edycji Przepisu (`updateMeal`), Wybór Kategorii Posiłku w Formularzu Dania oraz Usunięcie Martwego Przełącznika `Global` Blokowanego przez RLS (`HIGH-08`)
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Przepiśnik (Cookbook) / Spójność UI z RLS (`HIGH-08`) i `PRD.md`
* **Pliki implementacji:** [mealService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/mealService.ts), [useMealForm.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useMealForm.ts), [AddMealSheet.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/dialogs/AddMealSheet.tsx), [useJsonRecipeImport.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useJsonRecipeImport.ts), [useCookbookController.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useCookbookController.ts), [CookbookMealActions.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/cookbook/CookbookMealActions.tsx), [CookbookMealCard.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/cookbook/CookbookMealCard.tsx), [MealDetailsIngredientsSection.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/dialogs/MealDetailsIngredientsSection.tsx), [MealDetailsSheet.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/dialogs/MealDetailsSheet.tsx), [CookbookView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/CookbookView.tsx), [DesktopCookbookView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/views/DesktopCookbookView.tsx)
* **Pliki testów:** [mealService.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/__tests__/mealService.test.ts), [AddMealSheet.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/dialogs/__tests__/AddMealSheet.test.tsx), [JsonRecipeImportDialog.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/dialogs/__tests__/JsonRecipeImportDialog.test.tsx), [CookbookView.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/__tests__/CookbookView.test.tsx)
* **Problem / Uzasadnienie:**
  * [PRD.md](file:///d:/08_Git/SmartShopping/SmartShopping/docs/PRD.md) oraz [plan.md](file:///d:/08_Git/SmartShopping/SmartShopping/docs/plan.md) specyfikowały pełny CRUD z formularzem dodawania i edycji potraw, lecz `mealService.ts` nie posiadał metody `updateMeal`, a `AddMealSheet.tsx` i `useMealForm.ts` wspierały wyłącznie tworzenie przepisów.
  * Formularz `AddMealSheet.tsx` nie pobierał `meal_categories`, a po `HIGH-08` blokującym użytkownikom `INSERT` z `household_id IS NULL` w bazie w UI pozostawał martwy przełącznik `Global` kończący się błędem bez komunikatu `toast.error`.
* **Wdrożone Rozwiązanie:**
  1. Zaimplementowano `mealService.getMealById` i `mealService.updateMeal` (aktualizacja metadanych, `category_id`, tagów i wymiana `meal_ingredients`) oraz wsparcie trybu tworzenia/edycji w `useMealForm.ts` i `AddMealSheet.tsx` z obsługą błędów przez `toast.error`.
  2. Dodano w formularzu wybór kategorii `meal_categories` (`category_id`), podłączono akcję edycji (ikona ołówka min. 44x44px w `CookbookMealActions.tsx` i `MealDetailsSheet.tsx`) wyłącznie dla przepisów gospodarstwa na Mobile i Desktopie, oraz usunięto opcję tworzenia rekordów `Global` po stronie klienta (również w `useJsonRecipeImport.ts`).
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Użytkownik może edytować przepisy gospodarstwa na Mobile i Desktopie, przypisać kategorię posiłku, a UI nie wystawia opcji odrzucanych przez RLS (wraz z testami User Flow).

---

### HIGH-13: Utwardzenie Walidacji UUID w Filtrach `.or()` PostgREST, Ról Właściciela Gospodarstwa (`households` / `household_members` RLS), Edge Function Push oraz Reguły Lintera `no-explicit-any`
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Bezpieczeństwo / Supabase RLS / Edge Functions / Jakość Kodu
* **Pliki implementacji:** [utils.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/utils.ts), [productService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/productService.ts), [mealService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/mealService.ts), [20261116120000_household_roles_and_rls_hardening.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261116120000_household_roles_and_rls_hardening.sql), [supabase.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/types/supabase.ts), [send-push-notification/index.ts](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/functions/send-push-notification/index.ts), [.oxlintrc.json](file:///d:/08_Git/SmartShopping/SmartShopping/.oxlintrc.json)
* **Pliki testów:** [rlsSecurityAudit.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/__tests__/rlsSecurityAudit.test.ts) (`Audit 09`), [householdService.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/__tests__/householdService.test.ts)
* **Problem / Uzasadnienie:**
  * `productService.ts` i `mealService.ts` interpolowały `householdId` w `.or(...)` bez walidacji UUID.
  * Polityki `DELETE` na `households` i `household_members` nie rozróżniały właściciela od zwykłego członka, a `INSERT` na `households` miał `WITH CHECK (true)`.
  * Edge Function `send-push-notification` nie walidowała ścieżki względnej `url` ani długości pól oraz dopuszczała `any`, a `.oxlintrc.json` nie egzekwował `typescript/no-explicit-any`.
* **Wdrożone Rozwiązanie:**
  1. Wyeksportowano wspólną funkcję `isUuid()` w `utils.ts` i zastosowano ją przed każdym filtrem `.or(...)` w `productService.ts` i `mealService.ts`.
  2. Dodano migrację [20261116120000_household_roles_and_rls_hardening.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261116120000_household_roles_and_rls_hardening.sql) wprowadzającą `household_members.role` (`'owner' | 'member'`), funkcję `public.is_household_owner`, zaostrzenie `create_household_with_member` i polityki RLS dla `households`/`household_members` (zweryfikowane w `Audit 09` testu `rlsSecurityAudit.test.ts`).
  3. Utwardzono `send-push-notification/index.ts` (walidacja UUID, limitów `title`/`body`, ścieżek względnych `/^\/(?!\/)/` dla `url`/`icon`/`badge`, `ALLOWED_ORIGIN` CORS), wyeliminowano wszystkie wystąpienia `any` w kodzie i testach oraz włączono `"typescript/no-explicit-any": "error"` w `.oxlintrc.json`.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Wszystkie filtry PostgREST są chronione walidacją UUID, tylko właściciel może usunąć gospodarstwo, Edge Function waliduje payload, a `oxlint` blokuje jawny typ `any`.

---

## 4. 🟡 Kategoria MEDIUM (Średni Priorytet)

### MED-01: Optymalizacja Wielkości Paczki (Bundle Size) i Lazy Loading Ciężkich Modułów
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Frontend / Wydajność / PWA
* **Pliki implementacji:** [AppLayoutRouter.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/AppLayoutRouter.tsx), [DesktopLayout.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/DesktopLayout.tsx), [ProductsView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/ProductsView.tsx), [HouseholdsDialog.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/dialogs/HouseholdsDialog.tsx), [CalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/CalendarView.tsx), [DesktopCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/views/DesktopCalendarView.tsx), [vite.config.ts](file:///d:/08_Git/SmartShopping/SmartShopping/vite.config.ts)
* **Pliki testów:** [DesktopLayoutShortcut.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/__tests__/DesktopLayoutShortcut.test.tsx), [CalendarView.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/__tests__/CalendarView.test.tsx), [DesktopCalendarView.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/views/__tests__/DesktopCalendarView.test.tsx)
* **Problem / Uzasadnienie:**
  * Moduły takie jak `JsonRecipeImportDialog` (skrót Ctrl+Alt+P), rozbudowany kalendarz (`DesktopCalendarView`, `CalendarView`) oraz wszystkie 14 widoków Mobile/Desktop i edytor alejek były kompilowane w jednym głównym bundle startowym (`1,035.90 kB`).
* **Wdrożone Rozwiązanie:**
  1. Wdrożono `React.lazy()` + `Suspense` w [AppLayoutRouter.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/AppLayoutRouter.tsx) dla `DesktopLayout` oraz wszystkich 14 widoków Mobile i Desktop.
  2. Przeniesiono ciężkie modale i podwidoki do ładowanych warunkowo na żądanie chunków: `JsonRecipeImportDialog`, `CategoryManagerDialog`/`Sheet`, `MonthCalendarGrid`, `WeekCalendarView`, `DayCalendarView` oraz `AddCalendarMealDialog`.
  3. Skonfigurowano grupowanie vendorowe Rolldown (`output.codeSplitting`) w [vite.config.ts](file:///d:/08_Git/SmartShopping/SmartShopping/vite.config.ts) (`react-vendor`, `supabase-vendor`, `ui-vendor`).
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Główny chunk wejściowy spadł z `1,035.90 kB` (`264.85 kB` gzip) do `134.02 kB` (`35.34 kB` gzip) – redukcja >87%, przy izolacji ciężkich dialogów i widoków do dedykowanych asynchronicznych paczek (0 ostrzeżeń rozmiaru paczki w `vite build`).

---

### MED-02: Mechanizm Retencji i Archiwizacji Starych Pozycji List Zakupowych
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Baza Danych / Supabase Performance (bez CRON — uruchamiane ręcznie)
* **Pliki implementacji:** [20261110130000_shopping_list_items_retention.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261110130000_shopping_list_items_retention.sql), [archive-old-shopping-items.sql](file:///d:/08_Git/SmartShopping/SmartShopping/scripts/archive-old-shopping-items.sql), [supabase.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/types/supabase.ts)
* **Pliki testów:** [rlsSecurityAudit.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/__tests__/rlsSecurityAudit.test.ts)
* **Problem / Uzasadnienie:**
  * Zarchiwizowane listy zakupów pozostawiają w tabeli `shopping_list_items` historyczne rekordy, które po wielu miesiącach obciążają zapytania i limity bazy.
* **Wdrożone Rozwiązanie:**
  1. Wdrożono migrację [20261110130000_shopping_list_items_retention.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261110130000_shopping_list_items_retention.sql) dodającą `shopping_lists.archived_items_snapshot` (JSONB), tabelę archiwalną `shopping_list_items_archive` (z pełną izolacją RLS multi-tenant) oraz procedurę `public.archive_old_shopping_list_items(p_retention_months INT DEFAULT 12)` dostępną wyłącznie dla roli serwisowej (`REVOKE ALL FROM PUBLIC, anon, authenticated`).
  2. Utworzono ręcznie uruchamiany skrypt SQL [archive-old-shopping-items.sql](file:///d:/08_Git/SmartShopping/SmartShopping/scripts/archive-old-shopping-items.sql) (z podglądem *dry-run* i instrukcją wywołania), **celowo bez harmonogramu CRON**.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Migracja i ręczny skrypt archiwizujący gotowe do wykonania w Supabase SQL Editor, a tabela `shopping_list_items_archive` zweryfikowana przez audyt RLS w `rlsSecurityAudit.test.ts`.

---

### MED-03: Opcja Ignorowania / Wyciszania Niepewności w Kalendarzu (Acknowledge Uncertainty ⚠️)
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Biznes / UX / Kalendarz Posiłków (ADR-009)
* **Pliki implementacji:** [20261110132000_add_uncertainty_dismissed_to_meal_plans.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261110132000_add_uncertainty_dismissed_to_meal_plans.sql), [supabase.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/types/supabase.ts), [calendar.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/types/calendar.ts), [mealPlanService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/mealPlanService.ts), [useMealPlanStore.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/useMealPlanStore.ts), [calendarStatus.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/calendarStatus.ts), [UncertaintyWarningModal.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/UncertaintyWarningModal.tsx)
* **Pliki testów:** [calendarStatus.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/__tests__/calendarStatus.test.ts), [useMealPlanStore.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/__tests__/useMealPlanStore.test.ts), [UncertaintyWarningModal.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/__tests__/UncertaintyWarningModal.test.tsx)
* **Wdrożone Rozwiązanie:**
  1. Dodano kolumnę `is_uncertainty_dismissed BOOLEAN NOT NULL DEFAULT FALSE` w `meal_plans` oraz akcję `dismissUncertainty(planId)` w [useMealPlanStore.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/useMealPlanStore.ts).
  2. Zaktualizowano [calendarStatus.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/calendarStatus.ts) tak, aby zaakceptowane braki nie blokowały statusu posiłku alertem `uncertain`.
  3. W [UncertaintyWarningModal.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/UncertaintyWarningModal.tsx) (zarówno Desktop Dialog, jak i Mobile Sheet) dodano przycisk *"Zrozumiałem / Ignoruj brak"*.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Użytkownik wycisza alert ⚠️ jednym kliknięciem na Desktopie i Mobile, a testy logiki, store i UI przechodzą w 100%.

---

### MED-04: Inteligentne Przeliczanie Jednostek przy Częściowym Pokryciu ze Spiżarni
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Czyste Kalkulacje / Logika Biznesowa
* **Pliki implementacji:** [pantryCalculations.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/pantryCalculations.ts), [calendarStatus.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/calendarStatus.ts), [PantryConfirmModal.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/dialogs/PantryConfirmModal.tsx)
* **Pliki testów:** [pantryCalculations.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/__tests__/pantryCalculations.test.ts)
* **Wdrożone Rozwiązanie:**
  1. Dodano funkcje `areUnitsCompatible` i `convertQuantity` (obsługujące rodziny wagowe `g`/`dag`/`kg`, objętościowe `ml`/`l` oraz sztukowe `pcs`/`szt`) i rozszerzono `calculatePartialDelta` oraz `matchHierarchicalPantry` w [pantryCalculations.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/pantryCalculations.ts).
  2. Podpięto konwersję jednostek w [PantryConfirmModal.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/dialogs/PantryConfirmModal.tsx) i [calendarStatus.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/calendarStatus.ts), zabezpieczając odejmowanie przed jednostkami niezgodnymi typologicznie.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Kalkulator obsługuje wszystkie rodziny kompatybilnych jednostek i blokuje niespójne konwersje; 19 testów jednostkowych w `pantryCalculations.test.ts` przechodzi pomyślnie.

---

### MED-05: Półautomatyczny / Automatyczny Rozchód Spiżarni po Realizacji Posiłku (Pantry Consumption)
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Logika Biznesowa / Spiżarnia & Kalendarz (ADR-008 & ADR-009)
* **Pliki implementacji:** [pantryConsumption.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/pantryConsumption.ts), [pantryService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/pantryService.ts), [usePantryStore.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/usePantryStore.ts), [CookMealDeductModal.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/dialogs/CookMealDeductModal.tsx), [DayCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/DayCalendarView.tsx), [MealDetailsSheet.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/dialogs/MealDetailsSheet.tsx)
* **Pliki testów:** [pantryConsumption.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/__tests__/pantryConsumption.test.ts), [usePantryStore.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/__tests__/usePantryStore.test.ts), [CookMealDeductModal.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/dialogs/__tests__/CookMealDeductModal.test.tsx)
* **Wdrożone Rozwiązanie:**
  1. Wdrożono czystą logikę kalkulacji rozchodu w [pantryConsumption.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/pantryConsumption.ts) (z konwersją jednostek i zużyciem FIFO wariantów produktów ogólnych).
  2. Dodano `pantryService.deductMealIngredients` oraz optymistyczną akcję z rollbackiem w [usePantryStore.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/usePantryStore.ts), usuwającą wyczerpane produkty (`<= 0`).
  3. Utworzono Dual-Layout modal/sheet [CookMealDeductModal.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/dialogs/CookMealDeductModal.tsx) (checkboxy wyboru składników), wywoływany zarówno z [DayCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/DayCalendarView.tsx), jak i [MealDetailsSheet.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/dialogs/MealDetailsSheet.tsx).
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Pełny przepływ rozchodu ze spiżarni dostępny w Kalendarzu i Przepiśniku (Mobile & Desktop) z kompletem testów jednostkowych, store i UI.

---

### MED-06: Transakcyjna Archiwizacja Listy w Bazie PostgreSQL (Procedura RPC)
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Backend / Spójność Danych / PostgreSQL
* **Pliki implementacji:** [20261110131000_archive_shopping_list_rpc.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261110131000_archive_shopping_list_rpc.sql), [supabase.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/types/supabase.ts), [shoppingListService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/shoppingListService.ts)
* **Pliki testów:** [shoppingListService.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/__tests__/shoppingListService.test.ts)
* **Wdrożone Rozwiązanie:**
  1. Utworzono atomową funkcję `SECURITY DEFINER` PostgreSQL `public.archive_shopping_list(p_list_id, p_household_id)` weryfikującą członkostwo `auth.uid()` w gospodarstwie, zamykającą listę z blokadą `FOR UPDATE`, agregującą i zasilającą `pantry_items` (`ON CONFLICT ... DO UPDATE`) oraz zwracającą niekupione pozycje w jednym zapytaniu.
  2. Zrefaktoryzowano `shoppingListService.archiveActiveList` w [shoppingListService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/shoppingListService.ts) do wywołania `supabase.rpc('archive_shopping_list', ...)` z bezpiecznym fallbackiem wyłącznie przy braku funkcji RPC (`PGRST202`/`42883`).
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Transakcyjna archiwizacja w jednym wywołaniu sieciowym zweryfikowana testami jednostkowymi w `shoppingListService.test.ts`.

---

### MED-07: Zautomatyzowany Pipeline CI/CD (GitHub Actions)
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Narzędzia / DevOps / Jakość Kodu
* **Pliki implementacji:** [ci.yml](file:///d:/08_Git/SmartShopping/SmartShopping/.github/workflows/ci.yml)
* **Wdrożone Rozwiązanie:**
  1. Utworzono workflow GitHub Actions [ci.yml](file:///d:/08_Git/SmartShopping/SmartShopping/.github/workflows/ci.yml) uruchamiany na `push` i `pull_request` dla gałęzi `main` z krokami: `npm ci`, `npm run lint`, `npx tsc -b`, `npm run test` oraz `npm run build`.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Pełny pipeline bramy jakości gotowy do automatycznej weryfikacji każdego PR i pusha na `main`.

---

### MED-08: Obsługa Produktów Ogólnych (ADR-010) i Skalowania `target_kcal` w Podglądzie Dnia Kalendarza (`DayCalendarView`) oraz Kartach Przepiśnika (`CookbookMealCard`)
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** UX / Logika Biznesowa / Kalendarz & Przepiśnik
* **Pliki implementacji:** [CookbookMealCard.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/cookbook/CookbookMealCard.tsx), [useCookbookController.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useCookbookController.ts), [CookbookView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/CookbookView.tsx), [DesktopCookbookView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/views/DesktopCookbookView.tsx), [calendarStatus.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/calendarStatus.ts), [DayCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/DayCalendarView.tsx)
* **Pliki testów:** [CookbookView.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/__tests__/CookbookView.test.tsx), [calendarStatus.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/__tests__/calendarStatus.test.ts)
* **Problem / Uzasadnienie:**
  * **Karty Przepiśnika (`CookbookMealCard.tsx`):** Licznik `pantryIngredientsCount` sprawdzał wyłącznie bezpośrednie dopasowanie `pantryMapByProductId[ing.product_id]`, ignorując `pantryItemsByParentId` (warianty produktów ogólnych z ADR-010) oraz `ing.is_pantry_item`. Przez to na liście przepisów dania korzystające z produktów ogólnych nie wyświetlały badge'a dostępności w spiżarni, podczas gdy po otwarciu szczegółów (`MealDetailsSheet.tsx`) składniki były poprawnie oznaczane jako dostępne przez `matchHierarchicalPantry`.
  * **Widok Dnia w Kalendarzu (`DayCalendarView.tsx`):** Podgląd składników na karcie zaplanowanego posiłku oraz lista składników przekazywana do `CookMealDeductModal` mnożyły `base_quantity` jedynie przez `plan.servings`, pomijając mnożnik `target_kcal` (`getEffectiveMultiplier`), a sprawdzenie `inPantry` na pigułce składnika nie uwzględniało produktów podrzędnych (`parent_id`).
* **Wdrożone Rozwiązanie:**
  1. W `useCookbookController.ts`, `CookbookView.tsx`, `DesktopCookbookView.tsx` i `CookbookMealCard.tsx` zastosowano `matchHierarchicalPantry(ing.product, pantryMapByProductId, pantryItemsByParentId)` oraz flagę `ing.is_pantry_item` do wyznaczania dostępności składników na kartach przepisów.
  2. W `calendarStatus.ts` wyekstrahowano `getEffectiveMultiplier(planItem)` i użyto go w `calculateMealPlanStatus`, `calculateDayMacros`, `generateDraftItemsFromMealPlan` oraz `DayCalendarView.tsx` (zarówno na pigułkach składników z obsługą produktów podrzędnych `parent_id`, jak i w `buildCookableIngredientsFromMeal`).
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Karty przepisów i widok dnia kalendarza obsługują hierarchiczne stany spiżarni (ADR-010) oraz skalowanie `target_kcal`, co zostało zweryfikowane testami jednostkowymi i integracyjnymi.

---

### MED-09: Uzupełnienie Pól `is_general`, `parent_id` w `pantryService.addOrIncrementItem` oraz Obsługi Offline/Echo w `handleCommitEdit` Aktywnej Listy
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** State Management / Spiżarnia & Offline PWA
* **Pliki implementacji:** [pantryService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/pantryService.ts), [useActiveListController.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useActiveListController.ts)
* **Problem / Uzasadnienie:**
  * W [pantryService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/pantryService.ts) metoda `getPantryItems` pobierała pełne metadane hierarchii produktu (`id, name, unit_type, category_id, is_general, parent_id`), natomiast `addOrIncrementItem` w `.select()` po `UPDATE` i `INSERT` pomijała `is_general` oraz `parent_id`. Skutkowało to tym, że nowo dodany do spiżarni wariant produktu nie trafiał od razu do słownika `pantryItemsByParentId` w `usePantryStore`.
  * W [useActiveListController.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useActiveListController.ts) metoda `handleCommitEdit` (ręczne wpisanie ilości z klawiatury na aktywnej liście) nie korzystała z `applyQuantityChange`, przez co nie rejestrowała mutacji w `trackLocalItemMutation` (powodując wibrację od własnego echa Realtime) i nie kolejkowała zmiany w `enqueueMutation` podczas pracy offline.
* **Wdrożone Rozwiązanie:**
  1. Dodano `is_general, parent_id` do projekcji `.select()` po `UPDATE` i `INSERT` w `pantryService.addOrIncrementItem`.
  2. Zrefaktoryzowano `handleCommitEdit` w `useActiveListController.ts`, delegując zapis do `applyQuantityChange(item, parsed)`.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Nowo dodane lub zaktualizowane pozycje spiżarni zawierają pełne metadane hierarchii, a ręczna edycja ilości na aktywnej liście jest objęta ochroną przed echem Realtime i kolejką offline.

---

### MED-10: Eliminacja Błędów Strefy Czasowej UTC (`toISOString`) przy Nawigacji Datami w Kalendarzu (`DayCalendarView`, `WeekCalendarView`)
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Logika Dat / Kalendarz Posiłków (ADR-009)
* **Pliki implementacji:** [utils.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/utils.ts), [DayCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/DayCalendarView.tsx), [WeekCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/WeekCalendarView.tsx), [MonthCalendarGrid.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/MonthCalendarGrid.tsx)
* **Pliki testów:** [calendarStatus.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/__tests__/calendarStatus.test.ts)
* **Problem / Uzasadnienie:**
  * W `DayCalendarView.tsx`, `WeekCalendarView.tsx` oraz `MonthCalendarGrid.tsx` bieżąca data wyznaczana była przez `new Date().toISOString().split('T')[0]` (czas UTC), a przesuwanie dni (`shiftDay` oraz duplikacja na następny dzień) parsowało `new Date(selectedDate)` (północ UTC), modyfikowało dzień w strefie lokalnej (`setDate`) i ponownie konwertowało do UTC (`toISOString()`).
  * W polskim czasie lokalnym (CET UTC+1 / CEST UTC+2) między 00:00 a 01:00/02:00 w nocy `todayStr` zwracało datę dnia poprzedniego, a w dniach zmiany czasu (DST) operacja `shiftDay` mogła przeskoczyć lub powtórzyć ten sam dzień.
* **Wdrożone Rozwiązanie:**
  1. W [utils.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/utils.ts) wyeksportowano czyste funkcje pomocnicze operujące na lokalnych składowych daty (`formatLocalDateISO`, `addDaysISO`) i zastąpiono wywołania `.toISOString().split('T')[0]` w komponentach kalendarza.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Nawigacja po dniach, tygodniach i miesiącach w Kalendarzu działa deterministycznie w lokalnej strefie czasowej bez dryfu UTC o północy.

---

### MED-11: Wizualny Wskaźnik Pracy Offline (`isOnline` / `pendingCount`) zamiast Stałego Statusu „Realtime" oraz Stylizacja `isSelected` w `MonthCalendarGrid`
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** UI/UX / Feedback Stanu Aplikacji / Kalendarz & Offline PWA
* **Pliki implementacji:** [DesktopHeader.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/DesktopHeader.tsx), [ActiveListView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/ActiveListView.tsx), [DesktopActiveListView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/views/DesktopActiveListView.tsx), [MonthCalendarGrid.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/MonthCalendarGrid.tsx)
* **Pliki testów:** [MonthCalendarGrid.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/__tests__/MonthCalendarGrid.test.tsx)
* **Problem / Uzasadnienie:**
  * **Brak wizualnego wskaźnika Offline / Pending Sync:** W `DesktopHeader.tsx`, `ActiveListView.tsx` i `DesktopActiveListView.tsx` aplikacja nieprzerwanie wyświetlała zielony wskaźnik *„Realtime"* nawet wtedy, gdy użytkownik stracił zasięg w markecie (`!isOnline`) lub posiadał oczekujące mutacje w kolejce `offlineMutationQueue` (`pendingCount > 0`).
  * **Brak wyróżnienia zaznaczonego dnia (`isSelected`) w siatce miesiąca:** W [MonthCalendarGrid.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/MonthCalendarGrid.tsx) zmienna `isSelected` ustawiała `aria-selected={isSelected}`, ale przycisk dnia nie posiadał dla `isSelected && !isToday` żadnej klasy wizualnej.
* **Wdrożone Rozwiązanie:**
  1. Powiązano wskaźnik statusu w `DesktopHeader`, `ActiveListView` i `DesktopActiveListView` z hookiem `useOfflineSync()` — wyświetlając bursztynowy wskaźnik `Offline` / `Sync (X)` przy `!isOnline` lub `pendingCount > 0`.
  2. Dodano wyraźne obramowanie i tło dla `isSelected && !isToday` (`ring-2 ring-primary/60 border-primary/60 bg-primary/5`) w `MonthCalendarGrid.tsx`.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Status synchronizacji dynamicznie odzwierciedla stan sieci i kolejki offline, a zaznaczony dzień w widoku miesiąca posiada wyraźne wyróżnienie wizualne.

---

### MED-12: Poprawa Kontrastu Odznak Semantycznych (`-400` / `zinc-*`) w Jasnym Motywie `clean-light` oraz Usunięcie Podwójnych Paddingów w Kalendarzu
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Design System / Motywy Kolorystyczne / Layout (`clean-light`, `CalendarView`, `DesktopCalendarView`)
* **Pliki implementacji:** [CookbookView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/CookbookView.tsx), [LoginScreen.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/LoginScreen.tsx), [CookbookMealCard.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/cookbook/CookbookMealCard.tsx), [ProductCatalogCard.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/products/ProductCatalogCard.tsx), [CalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/CalendarView.tsx), [DesktopCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/views/DesktopCalendarView.tsx)
* **Problem / Uzasadnienie:**
  * **Twardo zakodowane klasy ciemnego motywu psujące czytelność w `clean-light`:** W `CookbookView.tsx` i `LoginScreen.tsx` występowały twardo zakodowane klasy `zinc-800`/`zinc-400`/`zinc-600`, a w `CookbookMealCard.tsx` i `ProductCatalogCard.tsx` odznaki używały wyłącznie jasnych klas `-400` o niskim kontraście na białym tle.
  * **Podwójne paddingi i zdublowany nagłówek `<h1>` w Kalendarzu:** `CalendarView.tsx` nakładał redundantne `min-h-screen px-3.5 pt-3` wewnątrz `<main className="p-4">`, a `DesktopCalendarView.tsx` dokładał `p-6` wewnątrz `p-8` i renderował w DOM drugi nagłówek `<h1>`.
* **Wdrożone Rozwiązanie:**
  1. Zastąpiono klasy `zinc-*` tokenami semantycznymi (`border-border`, `text-muted-foreground`) oraz zastosowano adaptacyjne warianty kolorystyczne (`text-*-600 dark:text-*-400`) dla odznak semantycznych w `CookbookMealCard.tsx`, `ProductCatalogCard.tsx` i `DayCalendarView.tsx`.
  2. Usunięto redundantne `min-h-screen px-3.5 pt-3` z `CalendarView.tsx` oraz `p-6` i zdublowane `<h1>` (zamienione na `<h2>`) z `DesktopCalendarView.tsx`.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Odznaki i filtry zachowują wysoki kontrast w jasnym motywie `clean-light` oraz w 5 ciemnych motywach, a widoki Kalendarza nie duplikują paddingów ani nagłówka `<h1>`.

---

### MED-13: Naprawa Ściśniętego Pola Wyszukiwania w Spiżarni (`88.5px` na Desktopie / `101.1px` na Mobile) oraz Nadmiernego Ucinania Tekstów (`truncate`) w `DesktopSidebar` i Kartach
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** UI/UX / Layout Flexbox & Grid / Czytelność (`DesktopPantryView.tsx`, `PantryView.tsx`, `DesktopSidebar.tsx`, `ProductCatalogCard.tsx`)
* **Pliki implementacji:** [DesktopPantryView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/views/DesktopPantryView.tsx), [PantryView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/PantryView.tsx), [DesktopSidebar.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/DesktopSidebar.tsx), [ProductCatalogCard.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/products/ProductCatalogCard.tsx), [CookbookMealCard.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/cookbook/CookbookMealCard.tsx)
* **Problem / Uzasadnienie (Wykryte w inspekcji na żywo w Microsoft Edge):**
  * **Ściśnięte pole wyszukiwania w Spiżarni:** W `DesktopPantryView.tsx` oraz `PantryView.tsx` pole `<Input>` wyszukiwarki dzieliło wąską przestrzeń z przełącznikiem sortowania (`Wg alejek` / `Wg daty ważności`), przez co ulegało ściśnięciu do `88.5px` na Desktopie i `101.1px` na Mobile.
  * **Nadmierne ucinanie opisów i tytułów (`truncate`):** W `DesktopSidebar.tsx` opisy zakładek oraz w `ProductCatalogCard.tsx` i `CookbookMealCard.tsx` nazwy produktów i przepisów były jednowierszowo ucinane przez `truncate`.
* **Wdrożone Rozwiązanie:**
  1. W `DesktopPantryView.tsx` oraz `PantryView.tsx` przebudowano układ paska narzędzi tak, aby pole wyszukiwania miało pełną szerokość na Mobile (`w-full`) oraz dedykowaną przestrzeń na Desktopie (`sm:w-64 lg:w-72 min-w-[220px]`).
  2. Zastąpiono `truncate` klasą `line-clamp-2` na opisach zakładek w `DesktopSidebar.tsx` oraz na tytułach w `ProductCatalogCard.tsx` i `CookbookMealCard.tsx`.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Wyszukiwarka w Spiżarni ma wygodną szerokość na obu układach (Mobile i Desktop), a długie nazwy produktów/przepisów i opisy w pasku bocznym zawijają się czytelnie do 2 wierszy.

---

### MED-14: Okno Dat (`startDate` / `endDate`) dla `meal_plans`, Paginacja Historii List oraz Eliminacja Pętli N+1 Zapytań (`applyWeeklyTemplate`, `shoppingListTransfer`, `pantryService`, `useJsonRecipeImport`)
* **Status:** ✅ **Zrealizowane (2026-11-16)**
* **Obszar:** Wydajność / Zapytania Supabase / Skalowalność
* **Pliki zmodyfikowane:** [CalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/CalendarView.tsx), [DesktopCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/views/DesktopCalendarView.tsx), [MonthCalendarGrid.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/MonthCalendarGrid.tsx), [useMealPlanStore.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/useMealPlanStore.ts), [mealPlanService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/mealPlanService.ts), [shoppingListArchive.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/shoppingList/shoppingListArchive.ts), [HistoryView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/HistoryView.tsx), [DesktopHistoryView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/views/DesktopHistoryView.tsx), [shoppingListTransfer.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/shoppingList/shoppingListTransfer.ts), [pantryService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/pantryService.ts), [useJsonRecipeImport.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useJsonRecipeImport.ts)
* **Rozwiązanie Wdrożeniowe:**
  1. Dodano funkcję `getCalendarFetchWindow` (okno bieżącego miesiąca ± 7 dni) oraz stan `loadedWindow` w `useMealPlanStore`, `CalendarView`, `DesktopCalendarView`, `MonthCalendarGrid` i `syncFromRealtime` — ładowanie nowych danych odbywa się wyłącznie przy przekroczeniu aktywnego okna czasowego.
  2. Dodano paginację opartą o `.range(offset, offset + limit - 1)` w `getHistoryLists` (`HISTORY_PAGE_SIZE = 30`) oraz przycisk **„Pokaż starsze listy”** (`history.loadMore`) w `HistoryView` i `DesktopHistoryView`.
  3. Wyeliminowano sekwencyjne pętle N+1 `for ... await`: wdrożono wsadowe `createMealPlansBatch` (`applyWeeklyTemplate`), `createProductsBatch` / `createMealsBatch` (`useJsonRecipeImport`), `batchResolveAdHocProductIds` + równoległe `Promise.all` (`shoppingListTransfer`) oraz pojedyncze pobranie + batch `.insert` / równoległe aktualizacje w `pantryService.batchIngestPurchasedItems`.
* **Definition of Done (DoD):**
  - ✅ Kalendarz i Realtime pobierają wyłącznie bieżące okno czasowe, Historia wspiera paginację, a aplikowanie szablonu tygodniowego / import / zasilanie spiżarni wykonuje minimalną liczbę zapytań wsadowych.

---

### MED-15: Optymalizacja Złożoności Renderowania Widoków Kalendarza (`DayCalendarView` & `MonthCalendarGrid`) przez Mapy O(1) ze Store'u Spiżarni i Memoizację
* **Status:** ✅ **Zrealizowane (2026-11-16)**
* **Obszar:** Wydajność React / Kalendarz Posiłków
* **Pliki zmodyfikowane:** [calendarStatus.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/calendarStatus.ts), [DayCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/DayCalendarView.tsx), [MonthCalendarGrid.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/MonthCalendarGrid.tsx), [WeekCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/WeekCalendarView.tsx)
* **Rozwiązanie Wdrożeniowe:**
  1. Rozszerzono silnik `calendarStatus.ts` o O(1) lookup (`pantryMapByProductId`, `pantryItemsByParentId`) oraz pojedynczy przebieg `calculateMealPlanStatusesMap(plans, options, todayISO)` z grupowaniem powiązań pipeline'u `meal_plan_item_id` w `Map`.
  2. W `MonthCalendarGrid.tsx` i `WeekCalendarView.tsx` wprowadzono `plansByDate` i `statusByPlanId` w `useMemo`, eliminując wielokrotne liniowe filtrowanie per komórka/kolumna, a `DayCalendarView.tsx` przekazuje mapy O(1) z `usePantryStore` bezpośrednio do statusów i kart dnia.
* **Definition of Done (DoD):**
  - ✅ Widoki Kalendarza używają struktur O(1) z memoizacją `useMemo` bez wielokrotnych liniowych skanów w pętli renderowania.

---

### MED-16: Naprawa Błędów Logiki Biznesowej: Powiadomienie `LIST_COMPLETED` z Pozycjami `in_pantry`, Scalanie Niekupionych Pozycji po Archiwizacji, Zbiorczy Transfer Tygodnia i Edycja Ułamkowa Ilości
* **Status:** ✅ **Zrealizowane (2026-11-16)**
* **Obszar:** Logika Biznesowa / Lista Zakupów, Koszyk i Kalendarz
* **Pliki zmodyfikowane:** [useActiveListController.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useActiveListController.ts), [useDraftViewController.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useDraftViewController.ts), [ActiveListItemRow.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/shopping/ActiveListItemRow.tsx), [DraftItemRow.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/shopping/DraftItemRow.tsx), [utils.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/utils.ts), [20261116150000_weekly_templates_sync_archive_plan_id_and_check_constraints.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261116150000_weekly_templates_sync_archive_plan_id_and_check_constraints.sql), [useMealPlanStore.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/useMealPlanStore.ts), [WeekCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/WeekCalendarView.tsx), [calendarStatus.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/calendarStatus.ts)
* **Rozwiązanie Wdrożeniowe:**
  1. W `useActiveListController.ts` warunek `allDone` dla powiadomienia `LIST_COMPLETED` uwzględnia pozycje `Boolean(i.is_checked || i.in_pantry)` (z zachowaniem `addMultipleToDraft` przy archiwizacji).
  2. Zaktualizowano funkcję SQL `archive_shopping_list` w migracji `20261116150000`, aby zwracała `'meal_plan_item_id', sli.meal_plan_item_id` dla niekupionych pozycji (zachowując powiązanie w Kalendarzu).
  3. Zaimplementowano zbiorcze `transferWeekToDraft(dates)` + `generateDraftItemsFromMealPlans` emitujące 1 komunikat Toast oraz współdzieloną kumulatywną rezerwację zapasu spiżarni (`availablePantryStock`) w `calculateMealPlanStatusesMap` i transferach.
  4. Dodano wsparcie liczb dziesiętnych (`sanitizePositiveDecimalInput` / `parsePositiveDecimalQuantity` z `parseFloat` oraz `inputMode="decimal"`) w `ActiveListItemRow`, `DraftItemRow`, `useActiveListController` i `useDraftViewController`.
* **Definition of Done (DoD):**
  - ✅ Wszystkie 4 luki logiki biznesowej pokryte nowymi testami jednostkowymi i integracyjnymi w Vitest (`ActiveListView.test.tsx`, `calendarStatus.test.ts`, `useMealPlanStore.test.ts`, `shoppingListService.test.ts`, `rlsSecurityAudit.test.ts`).

---

### MED-17: Synchronizacja Szablonów Tygodniowych Posiłków (`LOW-08`) w Bazie Supabase w Ramach Gospodarstwa Domowego (Zamiast Wyłącznie `localStorage`)
* **Status:** ✅ **Zrealizowane (2026-11-16)**
* **Obszar:** Backend / Multi-Device Sync / Kalendarz Posiłków (`LOW-08`)
* **Pliki zmodyfikowane:** [weeklyTemplateCalculations.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/weeklyTemplateCalculations.ts), [weeklyTemplateService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/weeklyTemplateService.ts), [useMealPlanStore.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/useMealPlanStore.ts), [supabase.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/types/supabase.ts), [20261116150000_weekly_templates_sync_archive_plan_id_and_check_constraints.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261116150000_weekly_templates_sync_archive_plan_id_and_check_constraints.sql)
* **Rozwiązanie Wdrożeniowe:**
  1. Utworzono tabelę `public.weekly_meal_templates` (UUID PK, `household_id` FK CASCADE, `entries JSONB`, indeksy, trigger `updated_at`, pełne polityki RLS oparte o `public.get_user_household_ids(auth.uid())` oraz publikację `supabase_realtime`).
  2. Dodano serwis `weeklyTemplateService.ts` synchronizujący szablony z `localStorage` jako buforem offline oraz jednorazową migracją starszych lokalnych szablonów niebędących UUID, a `useMealPlanStore` subskrybuje zdarzenia Realtime tabeli `weekly_meal_templates`.
* **Definition of Done (DoD):**
  - ✅ Szablony zapisane na jednym urządzeniu są współdzielone w bazie Supabase i synchronizowane pomiędzy domownikami z zachowaniem cache offline.

---

### MED-18: Ograniczenia Integralności Danych `CHECK` w Bazie PostgreSQL (Nieujemne Ilości/Makro oraz Limity Długości Tekstów)
* **Status:** ✅ **Zrealizowane (2026-11-16)**
* **Obszar:** Baza Danych / Integralność i Bezpieczeństwo PostgreSQL
* **Pliki zmodyfikowane:** [20261116150000_weekly_templates_sync_archive_plan_id_and_check_constraints.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261116150000_weekly_templates_sync_archive_plan_id_and_check_constraints.sql), [rlsSecurityAudit.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/__tests__/rlsSecurityAudit.test.ts)
* **Rozwiązanie Wdrożeniowe:**
  1. Wdrożono idempotentną migrację dodającą nazwane ograniczenia `CHECK` (`> 0` dla `base_quantity`, `total_quantity`, `servings`; `>= 0` dla makro, `pantry_items.quantity`, `target_kcal`, `sort_order`; oraz limity `char_length(...)` dla pól tekstowych w `households`, `products`, `meals`, `shopping_lists`, `pantry_items`, `meal_plans`, `product_categories`, `household_category_settings` i `weekly_meal_templates`), zweryfikowane w `Audit 10` (`rlsSecurityAudit.test.ts`).
* **Definition of Done (DoD):**
  - ✅ Migracja wdrożona w `supabase/migrations/`, a próba zapisu ujemnej ilości/kalorii lub nadmiarowego tekstu zostaje odrzucona przez PostgreSQL.

---

## 5. 🟢 Kategoria NORMAL (Standardowy Priorytet)

### NORM-01: Aktualizacja Dokumentacji Statusu Fazy 15 w `docs/plan.md`
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Dokumentacja / Spójność Projektu
* **Pliki implementacji:** [plan.md](file:///d:/08_Git/SmartShopping/SmartShopping/docs/plan.md#L319)
* **Problem / Uzasadnienie:**
  * Nagłówek Fazy 15 w `docs/plan.md` nie posiadał oznaczenia `(Zakończona w całości)`, w przeciwieństwie do pozostałych ukończonych faz, mimo że cały moduł kalendarza wraz z testami i widokami został wdrożony.
* **Wdrożone Rozwiązanie:**
  - Oznaczono Fazę 15 jako `(Zakończona w całości)` w [plan.md](file:///d:/08_Git/SmartShopping/SmartShopping/docs/plan.md#L319).
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Pełna spójność statusu Fazy 15 między `docs/PRD.md`, `docs/plan.md` a kodem źródłowym.

---

### NORM-02: Weryfikacja i Refaktoryzacja Modułowości Komponentów (< 250-300 Linii)
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Frontend / Czystość Kodu (Zasada 2.4 z `AGENTS.md`)
* **Pliki implementacji:** [useActiveListController.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useActiveListController.ts), [useProductsViewController.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useProductsViewController.ts), [usePantryViewController.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/usePantryViewController.ts), [useProductForm.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useProductForm.ts), [useMealForm.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useMealForm.ts), [useHouseholdsDialogController.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useHouseholdsDialogController.ts), [useCategoryManagerController.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useCategoryManagerController.ts), [useJsonRecipeImport.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useJsonRecipeImport.ts), [useHistoryDetailsController.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useHistoryDetailsController.ts), [useDraftViewController.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useDraftViewController.ts), [useTransferToActiveList.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useTransferToActiveList.ts), [useCookbookController.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useCookbookController.ts), [usePantryConfirmController.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/usePantryConfirmController.ts), [useAddPantryItemForm.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useAddPantryItemForm.ts), [ActiveListItemRow.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/shopping/ActiveListItemRow.tsx), [DraftItemRow.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/shopping/DraftItemRow.tsx), [TransferToActiveListForm.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/shopping/TransferToActiveListForm.tsx), [ProductCatalogCard.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/products/ProductCatalogCard.tsx), [ProductMacroFields.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/products/ProductMacroFields.tsx), [PantryItemRow.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/pantry/PantryItemRow.tsx), [MealIngredientsSection.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/meals/MealIngredientsSection.tsx), [HouseholdListSection.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/households/HouseholdListSection.tsx), [HouseholdMembersPanel.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/households/HouseholdMembersPanel.tsx), [CategoryRowCard.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/categories/CategoryRowCard.tsx), [HistoryListItemsBreakdown.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/history/HistoryListItemsBreakdown.tsx), [CookbookMealCard.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/cookbook/CookbookMealCard.tsx)
* **Problem / Uzasadnienie:**
  * Monolityczne widoki i dialogi (`ActiveListView` 939L, `DesktopActiveListView` 926L, `ProductsView` 632L, `ProductFormSheet` 627L, `HouseholdsDialog` 622L, `DesktopHistoryView` 561L, `DesktopProductsView` 534L, `DesktopDraftView` 529L, `AddMealSheet` 528L, `HistoryListDetailsSheet` 521L, `CategoryManagerContent` 520L) dublowały logikę między Mobile a Desktopem.
* **Wdrożone Rozwiązanie:**
  1. Wydzielono 14 dedykowanych hooków kontrolerów i formularzy (`src/hooks/`) współdzielonych między parami Mobile/Desktop.
  2. Wydzielono 12 spójnych subkomponentów UI (wiersze list, karty przepisów i produktów, sekcje formularzy i dialogów) z zachowaniem pragmatycznego balansu czytelności (bez sztucznego rozdrabniania spójnych widoków 304–421 linii).
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Usunięto wszystkie monolity > 430 linii z `src/components/` i wyeliminowano duplikację logiki biznesowej w parach Mobile/Desktop; całość pokryta testami User Flows (57 plików / 339 testów Vitest).

---

### NORM-03: Dostępność Cyfrowa (a11y / WCAG 2.1 AA) i Nawigacja Klawiaturą
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Frontend / Dostępność / UX
* **Pliki implementacji:** [MonthCalendarGrid.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/MonthCalendarGrid.tsx), [BottomNavigation.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/BottomNavigation.tsx), [index.css](file:///d:/08_Git/SmartShopping/SmartShopping/src/index.css), [themes.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/theme/themes.ts), [pl.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/i18n/locales/pl.ts), [en.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/i18n/locales/en.ts)
* **Pliki testów:** [wcagContrast.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/theme/__tests__/wcagContrast.test.ts), [MonthCalendarGrid.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/__tests__/MonthCalendarGrid.test.tsx), [BottomNavigation.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/__tests__/BottomNavigation.test.tsx)
* **Problem / Uzasadnienie:**
  * Siatka kalendarza wymagała semantycznych ról WAI-ARIA i obsługi strzałek/Home/End, nawigacja mobilna atrybutów `aria-current="page"` oraz minimalnych stref dotyku `>= 44px`, a motyw `clean-light` miał zbyt niski kontrast tekstu na białym tle w tokenach `--primary`, `--destructive` i `--muted-foreground`.
* **Wdrożone Rozwiązanie:**
  1. W [MonthCalendarGrid.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/MonthCalendarGrid.tsx) wdrożono `role="grid"`, `role="row"`, `role="columnheader"`, `role="gridcell"`, `aria-selected`, `aria-current="date"`, strefy dotyku `44px` na nawigacji miesięcznej oraz nawigację klawiaturą (`ArrowLeft`/`ArrowRight`/`ArrowUp`/`ArrowDown`/`Home`/`End`).
  2. W [BottomNavigation.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/BottomNavigation.tsx) dodano `aria-label` (z i18n), `aria-current="page"` i wymóg `min-h-[44px]`.
  3. Skorygowano tokeny motywu `clean-light` w [index.css](file:///d:/08_Git/SmartShopping/SmartShopping/src/index.css) i [themes.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/theme/themes.ts) do spełnienia wymogu WCAG 2.1 AA (`>= 4.5:1`) we wszystkich 6 motywach.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Automatyczne testy kontrastu WCAG 2.1 AA (`wcagContrast.test.ts`), ról ARIA i nawigacji klawiaturą (`MonthCalendarGrid.test.tsx`, `BottomNavigation.test.tsx`) przechodzą w 100%.

---

### NORM-04: Opcjonalne Daty Ważności w Module Spiżarni (Expiry Date Tracking)
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Baza Danych / Spiżarnia (ADR-008)
* **Pliki implementacji:** [20261111010000_add_pantry_expiration_date.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20261111010000_add_pantry_expiration_date.sql), [supabase.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/types/supabase.ts), [pantry.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/types/pantry.ts), [pantryCalculations.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/pantryCalculations.ts), [pantryService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/pantryService.ts), [usePantryStore.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/usePantryStore.ts), [usePantryViewController.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/usePantryViewController.ts), [PantryItemRow.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/pantry/PantryItemRow.tsx), [AddPantryItemDialog.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/dialogs/AddPantryItemDialog.tsx), [PantryView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/PantryView.tsx), [DesktopPantryView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/views/DesktopPantryView.tsx)
* **Pliki testów:** [pantryCalculations.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/__tests__/pantryCalculations.test.ts), [usePantryStore.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/__tests__/usePantryStore.test.ts), [PantryView.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/__tests__/PantryView.test.tsx)
* **Problem / Uzasadnienie:**
  * Świeżość była dotychczas szacowana wyłącznie po dacie zakupu/weryfikacji bez opcjonalnej daty ważności z opakowania.
* **Wdrożone Rozwiązanie:**
  1. Dodano kolumnę `expiration_date DATE NULL` + indeks cząstkowy w migracji PostgreSQL, zaktualizowano typy Supabase/domenowe, serwis oraz store (`updateExpirationDate` z optymistycznym UI i rollbackiem).
  2. Zaimplementowano czyste funkcje `calculateExpiryStatus` i `sortPantryItemsByExpiry`, czerwony badge *"Kończy się termin"* (`< 48h`), edycję daty inline, przełącznik sortowania (`alejkami` / `wg terminu`) w obu layoutach Mobile & Desktop oraz pole daty w `AddPantryItemDialog`.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Pełne wsparcie `expiration_date` od bazy PostgreSQL po Dual Layout UI potwierdzone testami jednostkowymi i User Flow.

---

### NORM-05: Likwidacja Typu `any` w Warstwie Serwisów Supabase (Strict Typing)
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** TypeScript / Jakość Kodu (Zasada 2.4 z `AGENTS.md`)
* **Pliki implementacji:** [householdService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/householdService.ts), [mealPlanService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/mealPlanService.ts), [mealService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/mealService.ts), [notificationService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/notificationService.ts), [shoppingListService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/shoppingListService.ts)
* **Pliki testów:** [householdService.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/__tests__/householdService.test.ts), [mealPlanService.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/__tests__/mealPlanService.test.ts), [notificationService.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/__tests__/notificationService.test.ts), [shoppingListService.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/__tests__/shoppingListService.test.ts)
* **Problem / Uzasadnienie:**
  * W warstwie serwisów występowały rzutowania `any` przy mapowaniu relacyjnych odpowiedzi PostgREST oraz w testach.
* **Wdrożone Rozwiązanie:**
  1. Zdefiniowano silne interfejsy wierszy relacyjnych (w tym współdzielony `mapMealPlanRow`) oraz wyeliminowano wszystkie wystąpienia `any` w kodzie produkcyjnym i testach katalogu `src/services/`.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Przeszukanie `src/services/` pod kątem `: any` oraz użycia typu `any` w kodzie zwraca 0 wyników; `tsc -b` i `oxlint` przechodzą z wynikiem 0 błędów.

---

### NORM-06: Usunięcie Driftu Dokumentacji w `docs/PRD.md` (React 19, Schemat DDL, Eksport E-mail)
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Dokumentacja / Spójność Projektu
* **Pliki implementacji:** [PRD.md](file:///d:/08_Git/SmartShopping/SmartShopping/docs/PRD.md)
* **Problem / Uzasadnienie:**
  * Sekcja 2 `PRD.md` wskazywała przestarzały stack (`React 18`, `React Query`), DDL w sekcji 4 nie uwzględniał kolumn i tabel dodanych w kolejnych fazach (`theme`, `meal_plan_item_id`, `updated_at`, `archived_items_snapshot`, `shopping_list_items_archive`, `expiration_date`, `is_uncertainty_dismissed`), a eksport e-mail nie był oznaczony jako funkcja planowana (`LOW-09`).
* **Wdrożone Rozwiązanie:**
  1. Zaktualizowano stack do `React 19` i `Zustand + Supabase Realtime`.
  2. Zsynchronizowano schemat DDL z rzeczywistymi migracjami w `supabase/migrations/`.
  3. Oznaczono eksport e-mail jako planowany (`Roadmap: LOW-09`) i dopisano śledzenie terminów ważności w spiżarni.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Dokument [PRD.md](file:///d:/08_Git/SmartShopping/SmartShopping/docs/PRD.md) odzwierciedla w 100% stan faktyczny bazy danych i stosu technologicznego.

---

### NORM-07: Wydzielenie Zapytań Supabase z `AuthContext` i `ThemeContext` do Warstwy Serwisów
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Architektura / Separacja Warstw (Reguła 02 z `AGENTS.md`)
* **Pliki implementacji:** [userService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/userService.ts), [AuthContext.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/context/AuthContext.tsx), [ThemeContext.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/theme/ThemeContext.tsx)
* **Pliki testów:** [userService.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/__tests__/userService.test.ts), [theme.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/theme/__tests__/theme.test.tsx), [AccountDetailsTheme.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/dialogs/__tests__/AccountDetailsTheme.test.tsx)
* **Problem / Uzasadnienie:**
  * `AuthContext.tsx` (480 linii) i `ThemeContext.tsx` bezpośrednio importowały `@/lib/supabase` i wykonywały zapytania do bazy danych.
* **Wdrożone Rozwiązanie:**
  1. Utworzono dedykowany serwis [userService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/userService.ts) dla sesji OAuth, synchronizacji profilu/zaproszeń/gospodarstw (`refreshUserContext`, `deleteHouseholdAndResolveNext`) oraz zapisu motywu (`syncThemeForCurrentUser`).
  2. Odchudzono [AuthContext.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/context/AuthContext.tsx) do 222 linii i usunięto bezpośrednie importy `@/lib/supabase` z obu kontekstów.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Pliki `AuthContext.tsx` i `ThemeContext.tsx` mają 0 importów `@/lib/supabase`, `AuthContext.tsx` ma 222 linii (`< 250`), a pełny pakiet testów serwisu i motywów przechodzi.

---

### NORM-08: Konfiguracja Caching Offline w Service Workerze (Workbox PWA)
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** PWA / Wydajność / Offline First
* **Pliki implementacji:** [vite.config.ts](file:///d:/08_Git/SmartShopping/SmartShopping/vite.config.ts), [public/sw-push.js](file:///d:/08_Git/SmartShopping/SmartShopping/public/sw-push.js)
* **Problem / Uzasadnienie:**
  * Konfiguracja `VitePWA` w `vite.config.ts` zawierała wyłącznie `importScripts: ["sw-push.js"]` bez reguł `runtimeCaching` dla zasobów statycznych, fontów i skryptów.
* **Wdrożone Rozwiązanie:**
  1. W [vite.config.ts](file:///d:/08_Git/SmartShopping/SmartShopping/vite.config.ts) skonfigurowano `cleanupOutdatedCaches`, `clientsClaim`, `skipWaiting`, `globPatterns` (`**/*.{js,css,html,ico,png,svg,woff2}`) oraz reguły `runtimeCaching`: `CacheFirst` dla `google-fonts-stylesheets`, `google-fonts-webfonts` i `static-icons-and-media`, oraz `StaleWhileRevalidate` dla `assets-stale-while-revalidate`.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Build produkcyjny (`npm run build`) generuje `dist/sw.js` z 65 wpisami precache oraz wszystkimi zdefiniowanymi trasami `CacheFirst`/`StaleWhileRevalidate` i importem `sw-push.js`.

---

### NORM-09: Synchronizacja Realtime Układu Alejek w Widoku Aktywnej Listy
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Realtime / UX / Zakupy w Gospodarstwie
* **Pliki implementacji:** [useActiveListController.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useActiveListController.ts), [ActiveListView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/ActiveListView.tsx), [DesktopActiveListView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/views/DesktopActiveListView.tsx)
* **Pliki testów:** [ActiveListView.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/__tests__/ActiveListView.test.tsx), [DesktopActiveListView.test.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/views/__tests__/DesktopActiveListView.test.tsx)
* **Problem / Uzasadnienie:**
  * Metoda `useCategoryStore.subscribeRealtime` była wywoływana jedynie wewnątrz modalu zarządzania kategoriami, przez co otwarty widok zakupów nie reagował na bieżąco na zmiany kolejności alejek przez innych domowników.
* **Wdrożone Rozwiązanie:**
  1. Wspólny kontroler [useActiveListController.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useActiveListController.ts) używany w obu layoutach (`ActiveListView` i `DesktopActiveListView`) automatycznie uruchamia `subscribeRealtime(householdId)` w cyklu życia widoku i sprząta subskrypcję przy odmontowaniu.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Zmiany kolejności alejek w czasie rzeczywistym natychmiast aktualizują grupowanie pozycji na obu układach (Mobile i Desktop), co zostało pokryte testami.

---

### NORM-10: Pełna Internacjonalizacja (i18n) Pozostałych Twardo Zakodowanych Tekstów Polskich oraz Ujednolicenie Dialogu Usuwania w Przepiśniku (ADR-003)
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Internacjonalizacja (i18n) / UX / Jakość Kodu (ADR-003)
* **Pliki implementacji:** [DesktopPantryView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/views/DesktopPantryView.tsx), [DesktopCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/views/DesktopCalendarView.tsx), [DayCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/DayCalendarView.tsx), [WeekCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/WeekCalendarView.tsx), [MonthCalendarGrid.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/MonthCalendarGrid.tsx), [mealPlanService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/mealPlanService.ts), [useMealPlanStore.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/useMealPlanStore.ts), [useActiveListController.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useActiveListController.ts), [useCookbookController.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useCookbookController.ts), [CookbookView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/CookbookView.tsx), [DesktopCookbookView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/views/DesktopCookbookView.tsx), [pl.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/i18n/locales/pl.ts), [en.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/i18n/locales/en.ts)
* **Problem / Uzasadnienie:**
  * W kilku miejscach pozostały twardo zakodowane polskie etykiety pomijające słowniki `src/i18n/locales/{pl,en}.ts`:
    - [DesktopPantryView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/views/DesktopPantryView.tsx): `'Świeże / niedawno:'`, `'Weryfikacja:'`, `'Dawno / uzupełnij:'`.
    - [WeekCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/WeekCalendarView.tsx) & [DayCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/DayCalendarView.tsx): `'Tydzień do koszyka'`, `'Wyślij tydzień do koszyka'`, `'Poprzedni tydzień'`, `'Następny tydzień'`, `'Poprzedni dzień'`, `'Następny dzień'`, `'Dodaj'`, `'porcji'`, `'Składniki'`, `'Posiłek'` oraz wywołania `toLocaleDateString(undefined, ...)` zamiast aktywnego języka `language === 'pl' ? 'pl-PL' : 'en-US'`.
    - [mealPlanService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/mealPlanService.ts): `'Posiłek'`, `'(Przywrócono)'`.
    - [useActiveListController.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useActiveListController.ts): `'Domownik'`, `'Lista zakupów'`.
  * Dodatkowo w [useCookbookController.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useCookbookController.ts) usuwanie przepisu wywoływało natywne okno przeglądarki `window.confirm(...)` zamiast spójnego wizualnie komponentu `ConfirmDeleteDialog`.
* **Wdrożone Rozwiązanie:**
  1. Przeniesiono wszystkie powyższe ciągi znaków do słowników `pl.ts` i `en.ts` oraz przekazano aktywne `locale` (`language === 'pl' ? 'pl-PL' : 'en-US'`) do wszystkich wywołań `toLocaleDateString` w Kalendarzu.
  2. Zastąpiono `window.confirm(...)` w `useCookbookController.ts` stanem modala (`mealToDelete`, `isDeleteModalOpen`, `handleConfirmDeleteMeal`) i komponentem `ConfirmDeleteDialog` w `CookbookView.tsx` oraz `DesktopCookbookView.tsx`.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Pełna lokalizacja PL/EN bez twardo zakodowanych ciągów znaków oraz spójny modal potwierdzenia usunięcia przepisu w obu layoutach.

---

### NORM-11: Dalsza Dekompozycja Warstwy Serwisów (`shoppingListService.ts` – 1012 linii) i Store (`useShoppingStore.ts` – 468 linii)
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Architektura / Modułowość Kodu (Zasada 2.4 z `AGENTS.md`)
* **Pliki implementacji:** [shoppingListService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/shoppingListService.ts), [shoppingListTypes.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/shoppingList/shoppingListTypes.ts), [shoppingListArchive.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/shoppingList/shoppingListArchive.ts), [shoppingListTransfer.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/shoppingList/shoppingListTransfer.ts), [shoppingListItems.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/shoppingList/shoppingListItems.ts), [useShoppingStore.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/useShoppingStore.ts), [draftCalculations.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/draftCalculations.ts)
* **Problem / Uzasadnienie:**
  * Po dekompozycji widoków UI w zadaniu `NORM-02`, w warstwie serwisów i store pozostały pliki przekraczające wytyczną `< 250-300` linii z `AGENTS.md`:
    - [shoppingListService.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/services/shoppingListService.ts) liczył ponad **1,000 linii**, łącząc w jednym pliku zarządzanie listami, operacje na pozycjach i OCC, transfer z koszyka roboczego, transakcyjną archiwizację z fallbackiem oraz obsługę historii.
    - [useShoppingStore.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/useShoppingStore.ts) liczył **477 linii** z zduplikowaną logiką scalania pozycji w `addItemToDraft` i `addMultipleToDraft`.
* **Wdrożone Rozwiązanie:**
  1. Podzielono `shoppingListService.ts` na wyspecjalizowane moduły w `src/services/shoppingList/` (`shoppingListTypes.ts`, `shoppingListArchive.ts`, `shoppingListTransfer.ts`, `shoppingListItems.ts`), redukując plik główny do **298 linii** przy 100% kompatybilności wstecznej fasady `shoppingListService`.
  2. Wydzielono czyste funkcje transformacji koszyka roboczego (`appendMealToDraftItems`, `appendSingleItemToDraftItems`, `appendMultipleItemsToDraftItems`) z `useShoppingStore.ts` do [draftCalculations.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/draftCalculations.ts), redukując `useShoppingStore.ts` do **284 linii**.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Wszystkie wydzielone moduły mieszczą się poniżej progu `300` linii, zlikwidowano duplikację logiki tworzenia produktów ad-hoc oraz scalania koszyka.

---

### NORM-12: Zastąpienie Domyślnego Szablonu Vite w `README.md` Dokumentacją Projektu oraz Drobna Synchronizacja `PRD.md` i `.agents/rules/`
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Dokumentacja Projektowa (Zasada 2.6 z `AGENTS.md`)
* **Pliki implementacji:** [README.md](file:///d:/08_Git/SmartShopping/SmartShopping/README.md), [PRD.md](file:///d:/08_Git/SmartShopping/SmartShopping/docs/PRD.md#L43), [06-documentation-and-adrs.md](file:///d:/08_Git/SmartShopping/SmartShopping/.agents/rules/06-documentation-and-adrs.md)
* **Problem / Uzasadnienie:**
  * Plik [README.md](file:///d:/08_Git/SmartShopping/SmartShopping/README.md) w głównym katalogu repozytorium zawierał generyczny boilerplate Vite (`# React + TypeScript + Vite`) zamiast opisu architektury SmartShopping, zmiennych `.env`, komend deweloperskich oraz spisu dokumentacji.
  * W [PRD.md](file:///d:/08_Git/SmartShopping/SmartShopping/docs/PRD.md#L43) w sekcji DDL widniało `theme VARCHAR(32) DEFAULT 'oled-emerald' NOT NULL`, podczas gdy migracja [20260825000000_add_theme_to_users.sql](file:///d:/08_Git/SmartShopping/SmartShopping/supabase/migrations/20260825000000_add_theme_to_users.sql) oraz kod (`DEFAULT_THEME`) używają `'oled-black'`.
* **Wdrożone Rozwiązanie:**
  1. Zastąpiono szablon Vite w [README.md](file:///d:/08_Git/SmartShopping/SmartShopping/README.md) kompletną dokumentacją projektu SmartShopping (architektura Dual Layout, stos technologiczny, konfiguracja `.env`, bramki jakości, struktura katalogów i indeks ADR-001..ADR-010).
  2. Skorygowano domyślny motyw w DDL [PRD.md](file:///d:/08_Git/SmartShopping/SmartShopping/docs/PRD.md#L43) na `'oled-black'`.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Pełna spójność dokumentacji wejściowej repozytorium (`README.md`), specyfikacji `PRD.md` i indeksu ADR.

---

### NORM-13: Powiększenie Mobilnych Stref Dotyku (`>= 44x44px`) dla Przycisków Ilości (`+`/`-`) oraz Responsywność na Tabletach (`768px–1023px`) i Desktopowym `LoginScreen`
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** UX / Dostępność Dotykowa (WCAG 2.5.5) / Responsywność (RWD)
* **Pliki implementacji:** [ActiveListItemRow.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/shopping/ActiveListItemRow.tsx), [DraftItemRow.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/shopping/DraftItemRow.tsx), [PantryItemRow.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/pantry/PantryItemRow.tsx), [ProductCatalogCard.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/products/ProductCatalogCard.tsx), [AppHeader.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/AppHeader.tsx), [DayCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/DayCalendarView.tsx), [WeekCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/WeekCalendarView.tsx), [MobileLayout.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/MobileLayout.tsx), [LoginScreen.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/LoginScreen.tsx)
* **Problem / Uzasadnienie (Potwierdzone pomiarami `getBoundingClientRect()` w Microsoft Edge):**
  * **Zbyt małe strefy dotyku na Mobile (`20–38px` zamiast `>= 44x44px`):** Przyciski `-` i `+`, przycisk edycji ilości oraz ikona spiżarni w `ActiveListItemRow.tsx`, `DraftItemRow.tsx` i `PantryItemRow.tsx`, ikony akcji w `ProductCatalogCard.tsx`, strzałki zmiany daty w `DayCalendarView` i `WeekCalendarView` oraz przycisk `Profil` w `AppHeader` miały zbyt małe wymiary dotykowe na smartfonach.
  * **Wąski kontener `max-w-md` (`448px`) na tabletach i ekranie logowania:** `MobileLayout.tsx` oraz `LoginScreen.tsx` miały sztywne ograniczenie `max-w-md mx-auto`.
* **Wdrożone Rozwiązanie:**
  1. Powiększono mobilne przyciski `+`/`-`, edycji ilości i ikony spiżarni w `ActiveListItemRow.tsx`, `DraftItemRow.tsx` i `PantryItemRow.tsx`, ikony akcji w `ProductCatalogCard.tsx`, przycisk `Profil` w `AppHeader.tsx` (`min-h-[44px] min-w-[44px]`) oraz strzałki dat w `DayCalendarView.tsx` i `WeekCalendarView.tsx` (`min-w-[44px] min-h-[44px] w-11 h-11`).
  2. Rozszerzono kontener `MobileLayout.tsx` na breakpointach tabletowych (`w-full max-w-md sm:max-w-xl md:max-w-3xl mx-auto`) oraz wycentrowano kartę logowania w `LoginScreen.tsx` na pełnym tle ekranu dla tabletów i Desktopu.
* **Definition of Done (DoD) - Rezultat:**
  - ✅ Ergonomiczne strefy dotyku na Mobile PWA oraz pełne wykorzystanie przestrzeni na tabletach (`768px–1023px`) i ekranie logowania Desktop.

---

### NORM-14: Lokalizacja (i18n) Twardo Zakodowanych Napisów i Surowych Slugów `meal_categories` w `AddCalendarMealDialog.tsx` oraz Czystych Kalkulacjach (`calendarStatus.ts`, `pantryCalculations.ts`)
* **Status:** ✅ **Zrealizowane (2026-11-16)**
* **Obszar:** Internacjonalizacja (`ADR-003`) / Czystość Warstwy Kalkulacji
* **Pliki zmodyfikowane:** [AddCalendarMealDialog.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/AddCalendarMealDialog.tsx), [UncertaintyWarningModal.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/UncertaintyWarningModal.tsx), [calendarStatus.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/calendarStatus.ts), [pantryCalculations.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/pantryCalculations.ts), [pl.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/i18n/locales/pl.ts), [en.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/i18n/locales/en.ts)
* **Rozwiązanie Wdrożeniowe:**
  1. Przeniesiono wszystkie pozostałe polskie napisy i placeholdery w `AddCalendarMealDialog.tsx` (`ingredientsCount`, `customNameLabel`, `targetKcalPlaceholder`, `notesPlaceholder`) oraz `UncertaintyWarningModal.tsx` (`defaultMealName`, `restored`, `formatUnit`) do słowników `pl.ts` i `en.ts`, normalizując klucz slugów `meal_categories` (`categories.<slug>`).
  2. Zastąpiono polski fallback `'Posiłek'` w `calendarStatus.ts` wywołaniem `translate('calendar.defaultMealName')` oraz usunięto nadmiarowe polskie aliasy jednostek (`szczypta`, `łyżeczka`, `łyżka`, `szklanka`) z czystej kalkulacji `pantryCalculations.ts` (pozostawiając normalizację na granicy wejścia w `recipeJsonImport.ts`).
* **Definition of Done (DoD):**
  - ✅ Pełna obsługa języka angielskiego w modalach i kalkulacjach Kalendarza (`0` twardo zakodowanych polskich tekstów, zweryfikowane w `CalendarModals.test.tsx`).

---

### NORM-15: Dialogi Potwierdzenia Usunięcia (`ConfirmDeleteDialog`) oraz Strefy Dotyku `>= 44x44px` w Modalach Kalendarza (`AddCalendarMealDialog`, `DayCalendarView`, `WeeklyTemplatesModal`)
* **Status:** ✅ **Zrealizowane (2026-11-16)**
* **Obszar:** UI/UX / Dostępność Dotykowa (`Reguła 01`) / Ochrona Przed Przypadkowym Usunięciem
* **Pliki zmodyfikowane:** [AddCalendarMealDialog.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/AddCalendarMealDialog.tsx), [DayCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/DayCalendarView.tsx), [WeeklyTemplatesModal.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/WeeklyTemplatesModal.tsx), [UncertaintyWarningModal.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/UncertaintyWarningModal.tsx)
* **Rozwiązanie Wdrożeniowe:**
  1. Powiększono strefy dotyku przycisków stepperów porcji (`-`/`+` z `w-8 h-8` na `min-w-[44px] min-h-[44px] w-11 h-11`) oraz przycisków akcji/kategorii w `AddCalendarMealDialog.tsx`, `DayCalendarView.tsx`, `UncertaintyWarningModal.tsx` i `WeeklyTemplatesModal.tsx` (`min-w-[44px] min-h-[44px] w-11 h-11` dla kosza).
  2. Dodano `ConfirmDeleteDialog` przed usunięciem szablonu tygodniowego w `WeeklyTemplatesModal.tsx` (usuwanie posiłku dnia w `DayCalendarView.tsx` i `DayMealPlanCard.tsx` posiadało już wcześniej `44x44px` oraz `ConfirmDeleteDialog`).
* **Definition of Done (DoD):**
  - ✅ Wszystkie przyciski akcji w Kalendarzu spełniają minimum `44x44px`, a operacje destrukcyjne wymagają potwierdzenia (`CalendarModals.test.tsx`).

---

### NORM-16: Aktualizacja Dokumentacji (`README.md`, `docs/PRD.md`, `docs/plan.md`) po Wdrożeniu `LOW-08` i `LOW-11` oraz Naprawa Linków do ADR
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Dokumentacja (`Reguła 06`) & System Reguł Agentów (`AGENTS.md`, `.agents/rules/01..06`)
* **Pliki zmodyfikowane:** [README.md](file:///d:/08_Git/SmartShopping/SmartShopping/README.md#L16-L137), [PRD.md](file:///d:/08_Git/SmartShopping/SmartShopping/docs/PRD.md#L31-L225), [plan.md](file:///d:/08_Git/SmartShopping/SmartShopping/docs/plan.md), [AGENTS.md](file:///d:/08_Git/SmartShopping/SmartShopping/AGENTS.md), [Reguły 01–06](file:///d:/08_Git/SmartShopping/SmartShopping/.agents/rules/)
* **Problem / Uzasadnienie:**
  * W [README.md](file:///d:/08_Git/SmartShopping/SmartShopping/README.md#L129-L136) dwa linki ADR były uszkodzone (`ADR-002-realtime-optimistic-ui.md`, `ADR-009-meal-planning-calendar-and-shopping-sync.md`), a w linii 36 widniały nieaktualne wersje `TypeScript 5.8, Vite 6` zamiast `TypeScript 6.0, Vite 8.2`.
  * W [PRD.md](file:///d:/08_Git/SmartShopping/SmartShopping/docs/PRD.md) brakowało tabel `household_members`, `household_invites` oraz kolumn `product_categories.is_non_food`, `products.type` i `meals.type`, a także opisu wdrożonych funkcji `LOW-08` i `LOW-11` w `PRD.md` i `plan.md`.
* **Zastosowane Rozwiązanie:**
  1. Naprawiono linki do `ADR-002` i `ADR-009` oraz zaktualizowano opis wersji i funkcji w `README.md`.
  2. Zsynchronizowano schemat DDL i wymagania funkcjonalne (`LOW-08` Szablony Tygodniowe, `LOW-11` Przelicznik Miar Kuchennych) w `docs/PRD.md` oraz `docs/plan.md`.
  3. Wzmocniono `AGENTS.md` (10-punktowa checklista samokontroli agenta przed zakończeniem zadania) i `.agents/rules/01-06` (w tym pełny zakaz przestarzałych klas `bg-black`/`text-zinc-500` na rzecz 6 motywów WCAG AA, rygor `catch (err: unknown)`, brak zapytań N+1 i nieograniczonych zapytań, obowiązek aktualizacji dokumentacji w tym samym kroku).
* **Definition of Done (DoD):**
  - ✅ Wszystkie linki w `README.md` są aktywne, `PRD.md` i `plan.md` odzwierciedlają 100% tabel, kolumn i wdrożonych funkcji (`LOW-08`, `LOW-11`), a zasady dla przyszłych promptów zapobiegają dryfowi i regresjom.

---

### NORM-17: Przegląd Spójności Plików `>300` Linii i Aktualizacja Wytycznych Modularności (`AGENTS.md`, `04-typescript-code-quality.md`)
* **Status:** ✅ **Zrealizowane — Decyzja Architektoniczna (2026-11-16)**
* **Obszar:** Modularność Kodu (`Reguła 04`, [AGENTS.md](file:///d:/08_Git/SmartShopping/SmartShopping/AGENTS.md))
* **Pliki zmodyfikowane:** [AGENTS.md](file:///d:/08_Git/SmartShopping/SmartShopping/AGENTS.md), [04-typescript-code-quality.md](file:///d:/08_Git/SmartShopping/SmartShopping/.agents/rules/04-typescript-code-quality.md)
* **Wynik Audytu i Decyzja:**
  * Przeprowadzono przegląd wszystkich ~26 plików produkcyjnych o długości `304–616` linii (`calendarStatus.ts`, `useMealPlanStore.ts`, `WeekCalendarView.tsx`, `DesktopHistoryView.tsx`, `useActiveListController.ts`, `pantryService.ts`, `pantryCalculations.ts`, `householdService.ts`, `DesktopSidebar.tsx`, itp.).
  * Po wcześniejszej dekompozycji monolitów (`NORM-02`, `NORM-11`) każdy z pozostałych plików stanowi pojedynczą, spójną odpowiedzialność domenową (silnik kalkulacji, fasada serwisu, store lub widok oparty o wydzielony hook i subkomponenty). Dalsze cięcie pod sztywny limit `<300` linii wprowadziłoby jedynie sztuczną fragmentację importów.
  * Poluzowano twardy limit `250–300` linii w [AGENTS.md](file:///d:/08_Git/SmartShopping/SmartShopping/AGENTS.md) i [.agents/rules/04-typescript-code-quality.md](file:///d:/08_Git/SmartShopping/SmartShopping/.agents/rules/04-typescript-code-quality.md) na rzecz miękkiego progu spójności (`~300–550` linii, sygnał do oceny podziału przy mieszaniu niezależnych domen).
* **Definition of Done (DoD):**
  - ✅ Spójne moduły zachowane bez sztucznego rozbijania, a reguły konstytucji zaktualizowane o praktyczne kryterium spójności.

---

## 6. 🔵 Kategoria LOW (Niski Priorytet / Nowe Funkcjonalności)

### LOW-01: Skaner Kodów Kreskowych (Barcode Scanner) w PWA
* **Obszar:** Innowacja / Mobile PWA / Kamera
* **Opis:**
  - Skanowanie kodów kreskowych (EAN-13 / UPC) z kamery telefonu w sklepie i spiżarni.
  - Wykorzystanie natywnego API przeglądarek `BarcodeDetector` z fallbackiem do biblioteki JavaScript.
  - Automatyczne wyszukiwanie produktu w katalogu lub otwarcie formularza szybkiego dodawania.

---

### LOW-02: Śledzenie Cen i Szacowanie Kosztu Zakupów (Price & Budget Tracking)
* **Obszar:** Finanse Domowe / Nowy Moduł
* **Opis:**
  - Opcjonalne pole ceny przy produktach (`last_price`, `estimated_unit_price`).
  - Dynamiczne podsumowanie szacowanego kosztu koszyka w widoku `DraftView` i `ActiveListView`.
  - Ostrzeganie o przekroczeniu zdefiniowanego limitu budżetowego gospodarstwa.

---

### LOW-03: Tryb Gościa / Udostępnianie Listy Zakupów Linkiem (Guest Share Mode)
* **Obszar:** Integracje / Bezpieczeństwo
* **Opis:**
  - Generowanie unikalnego, ograniczonego czasowo linku z tokenem dostępu (np. na 24h).
  - Umożliwienie osobie spoza gospodarstwa (sąsiad, kurier, rodzina) podejrzenia i odhaczenia listy w przeglądarce bez konieczności logowania kontem Google.

---

### LOW-04: Inteligentny Import Paragonów ze Zdjęcia (AI Vision / OCR)
* **Obszar:** AI / Automatyzacja
* **Opis:**
  - Zrobienie zdjęcia paragonu po powrocie ze sklepu.
  - Przetworzenie obrazu przez Edge Function z modelem multimodalnym (np. Gemini Vision).
  - Automatyczne rozpoznanie artykułów, przypisanie do kategorii i zasilenie modułu Spiżarni jednym kliknięciem.

---

### LOW-05: Mini Aplikacja Towarzysząca na Smartwatche (Wear OS / watchOS)
* **Obszar:** Wearables / Ekosystem
* **Opis:**
  - Bardzo prosty widok odhaczania listy zakupowej bezpośrednio z nadgarstka, aby nie wyciągać telefonu przy każdej alejce w markecie.

---

### LOW-06: Profile Sklepowe dla Układu Alejek (Biedronka / Lidl / Carrefour)
* **Obszar:** UX / Personalizacja Zakupów / Multi-Store
* **Pliki:** `household_category_settings`, [CategoryManagerContent.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/categories/CategoryManagerContent.tsx), [ActiveListView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/ActiveListView.tsx)
* **Opis:**
  - W schemacie bazy danych w tabeli `household_category_settings` istnieje już przewidziane pole `store_profile_id UUID`.
  - Różne sieci sklepów mają diametralnie inny układ alejek (np. w Biedronce pieczywo i warzywa są na wejściu, w Lidlu owoce są pierwsze, a chemia na końcu).
  - Funkcjonalność umożliwia zdefiniowanie profili sklepowych (np. "Biedronka Osiedlowa", "Lidl Główny") i szybkie przełączanie aktywnego marketu z nagłówka listy zakupowej.

---

### LOW-07: Silnik Rekomendacji Przepisów na Bazie Zawartości Spiżarni ("Co dziś ugotować?")
* **Obszar:** Kulinaria / Nowy Moduł / Zero Waste
* **Pliki:** [CookbookView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/CookbookView.tsx), [DesktopCookbookView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/views/DesktopCookbookView.tsx), [pantryCalculations.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/pantryCalculations.ts)
* **Opis:**
  - Inteligentny filtr w Przepiśniku sortujący dania według dostępności składników w spiżarni gospodarstwa.
  - Zakładki: *"Gotowe do zrobienia (100% składników)"*, *"Brakuje 1 produktu"*, *"Wykorzystaj kończące się zapasy"*.
  - Eliminuje marnowanie żywności i podpowiada obiady bez konieczności wychodzenia do sklepu.

---

### LOW-08: Szablony i Powtarzalne Cykle Tygodniowe w Kalendarzu Posiłków
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Planowanie / Kalendarz Posiłków (ADR-009)
* **Pliki implementacji:** [weeklyTemplateCalculations.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/weeklyTemplateCalculations.ts), [useMealPlanStore.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/store/useMealPlanStore.ts), [WeeklyTemplatesModal.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/WeeklyTemplatesModal.tsx), [WeekCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/WeekCalendarView.tsx), [calendar.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/types/calendar.ts)
* **Pliki testów:** [weeklyTemplateCalculations.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/__tests__/weeklyTemplateCalculations.test.ts)
* **Wdrożone Rozwiązanie:**
  - Możliwość zapisania całego skomponowanego tygodnia posiłków jako nazwanego szablonu gospodarstwa (np. *"Tydzień redukcyjny 2200 kcal"*, *"Szybki tydzień pracujący"*) w oknie Dual Layout (`WeeklyTemplatesModal` – `Dialog` na Desktopie / `Sheet` na Mobile PWA).
  - Aplikowanie szablonu na dowolny tydzień w kalendarzu jednym kliknięciem z automatycznym skalowaniem porcji (`0.5x`–`4x`) oraz kaloryczności `target_kcal` i pomijaniem duplikatów.

---

### LOW-09: Eksport Listy Zakupów na E-mail (Gmail / Resend)
* **Obszar:** Integracje / Udostępnianie
* **Pliki:** Supabase Edge Function, [ActiveListView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/ActiveListView.tsx), [DesktopActiveListView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/views/DesktopActiveListView.tsx)
* **Opis:**
  - Przywrócenie planowanej w PRD funkcji wysyłki listy zakupowej na adres Gmail połączony z kontem.
  - Edge Function w Supabase generująca estetyczny, sformatowany szablon HTML listy zakupów podzielony według alejek sklepowych z polami wyboru i wysyłająca go przez API (np. Resend).

---

### LOW-10: Tryb „Gotuję Teraz" (Step-by-Step Cooking Mode z Minutnikami i Blokadą Wygaszania Ekranu `WakeLock API`)
* **Obszar:** UX Kulinaria / Mobile PWA
* **Pliki:** [MealDetailsSheet.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/dialogs/MealDetailsSheet.tsx), [DayCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/DayCalendarView.tsx)
* **Opis:**
  - Pełnoekranowy widok krok-po-kroku dla otwartego przepisu z dużym kontrastowym fontem (czytelny z odległości blatu kuchennego bez dotykania ekranu mokrymi dłońmi).
  - Automatyczne wykrywanie wyrażeń czasowych w instrukcji przygotowania (`preparation_steps`, np. *"gotuj 15 min"*, *"piecz przez 25 minut"*) i zamiana ich w klikalne minutniki z powiadomieniem dźwiękowym/wibracją.
  - Aktywacja natywnego Web API `navigator.wakeLock.request('screen')` utrzymującego włączony ekran telefonu podczas gotowania, a po zakończeniu ostatniego kroku bezpośrednie przejście do `CookMealDeductModal` (rozchód składników ze spiżarni).

---

### LOW-11: Automatyczne Przeliczanie Miar Kuchennych (Łyżka / Łyżeczka / Szklanka / Szczypta ↔ Gramy / Mililitry)
* **Status:** ✅ **Zrealizowane (Listopad 2026)**
* **Obszar:** Kulinaria / Czyste Kalkulacje
* **Pliki implementacji:** [kitchenUnits.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/kitchenUnits.ts), [macroCalculations.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/macroCalculations.ts), [pantryCalculations.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/pantryCalculations.ts), [recipeJsonImport.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/recipeJsonImport.ts), [useMealForm.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/hooks/useMealForm.ts), [MealIngredientsSection.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/meals/MealIngredientsSection.tsx), [AddMealSheet.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/dialogs/AddMealSheet.tsx)
* **Pliki testów:** [kitchenUnits.test.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/__tests__/kitchenUnits.test.ts)
* **Wdrożone Rozwiązanie:**
  - Słownik przeliczników miar domowych (`1 szklanka = 250 ml / g`, `1 łyżka = 15 ml / g`, `1 łyżeczka = 5 ml / g`, `1 szczypta = 1 g`, `dag`, `kg`, `l`) z selektorem i podglądem konwersji na żywo w formularzu przepisu (`MealIngredientsSection`).
  - Pełna integracja z `pantryCalculations.ts` (`areUnitsCompatible`, `convertQuantity`), `macroCalculations.ts` oraz importerem JSON (`normalizeUnitAndQuantity`), zapewniająca automatyczną agregację w gramach/mililitrach na liście zakupowej, w kalkulatorze kalorii i przy rozchodzie ze spiżarni.

---

### LOW-12: Analityka Żywieniowa Gospodarstwa i Historia Spożycia Makroskładników (Macro Trends & Weekly Summary)
* **Obszar:** Zdrowie & Dietetyka / Kalendarz Posiłków
* **Pliki:** [CalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/CalendarView.tsx), [DesktopCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/views/DesktopCalendarView.tsx), [calendarStatus.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/calendarStatus.ts)
* **Opis:**
  - Widok podsumowania tygodniowego i miesięcznego średniego spożycia kalorii oraz rozkładu procentowego makroskładników (Białko / Węglowodany / Tłuszcze) na podstawie zaplanowanych i ugotowanych posiłków w Kalendarzu.
  - Opcjonalne zdefiniowanie dziennego celu kalorycznego (`target_daily_kcal`) w profilu użytkownika z wizualizacją stopnia realizacji celu na pasku `CalendarMacroBar`.

---

### LOW-13: Planowanie Gotowania na Kilka Dni i Wykorzystanie Resztek (`Batch Cooking & Leftovers`)
* **Obszar:** Planowanie / Kulinaria / Zero Waste
* **Pliki:** [AddCalendarMealDialog.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/AddCalendarMealDialog.tsx), [DayCalendarView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/DayCalendarView.tsx), [calendarStatus.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/calculations/calendarStatus.ts)
* **Opis:**
  - Obsługa gotowania „na 2–3 dni” (Batch Cooking): zaplanowanie posiłku bazowego w jednym dniu oraz przypięcie powiązanego posiłku w kolejnych dniach w trybie *„Resztki / Z poprzedniego dnia”*.
  - Wpisy pochodne wliczają pełne makroskładniki i kalorie do bilansu danego dnia, ale nie generują duplikatów zakupowych w Koszyku (`0` dodatkowych składników do kupienia).

---

### LOW-14: Import Przepisów z Linku URL / Blogów Kulinarnych (`Schema.org/Recipe` & AI Parser)
* **Obszar:** Przepiśnik / Automatyzacja / Integracje
* **Pliki:** [JsonRecipeImportDialog.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/dialogs/JsonRecipeImportDialog.tsx), [recipeJsonImport.ts](file:///d:/08_Git/SmartShopping/SmartShopping/src/lib/recipeJsonImport.ts), Supabase Edge Function
* **Opis:**
  - Rozszerzenie istniejącego importera JSON o wklejenie adresu URL przepisu (np. Kwestia Smaku, AniaGotuje, blogi kulinarne).
  - Edge Function wydobywa ustrukturyzowane dane JSON-LD (`@type: "Recipe"` / `Schema.org`), automatycznie mapuje jednostki miar domowych (`LOW-11`) i dopasowuje składniki do katalogu produktów gospodarstwa.

---

### LOW-15: Profile Alergenów, Preferencje Dietetyczne Domowników i Alerty Składników (`Dietary & Allergen Guards`)
* **Obszar:** Zdrowie / Personalizacja Gospodarstwa
* **Pliki:** `users` / `household_members`, [AddCalendarMealDialog.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/calendar/AddCalendarMealDialog.tsx), [CookbookMealCard.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/cookbook/CookbookMealCard.tsx)
* **Opis:**
  - Możliwość zdefiniowania na profilu domownika alergenów i preferencji dietetycznych (np. bez laktozy, bez glutenu, wegetariańskie, alergia na orzechy).
  - Wyświetlanie czytelnego ostrzeżenia przy planowaniu posiłku lub przeglądaniu Przepiśnika oraz sugerowanie bezpiecznego zamiennika z katalogu produktów (`reference_product` / warianty hierarchiczne `ADR-010`).

---

### LOW-16: Ulubione Zestawy Zakupowe („Szybkie Koszyki" / Staples) oraz Podpowiedzi Częstotliwości Zakupów
* **Obszar:** Koszyk & Zakupy / UX
* **Pliki:** [DraftView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/DraftView.tsx), [DesktopDraftView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/layout/desktop/views/DesktopDraftView.tsx), [HistoryView.tsx](file:///d:/08_Git/SmartShopping/SmartShopping/src/components/views/HistoryView.tsx)
* **Opis:**
  - Możliwość zapisania stałych pakietów zakupowych (np. *„Baza tygodniowa: mleko, jajka, pieczywo, banany”*, *„Weekendowy wyjazd”*) i wrzucenia ich jednym kliknięciem do Koszyka (`Draft`).
  - Sekcja podpowiedzi *„Często kupowane”* analizująca historię zarchiwizowanych list (`shopping_lists`) i brakujące zapasy w Spiżarni.

---

## 7. Podsumowanie i Matryca Realizacji

```mermaid
gantt
    title SmartShopping - Harmonogram Realizacji Rozszerzonego Backlogu
    dateFormat  YYYY-MM
    section Krytyczne (Security & Offline)
    CRIT-03 Fix Push Edge Function Auth :crit, done, 2026-10, 2d
    CRIT-04 Fix RLS household_members    :crit, done, 2026-10, 2d
    CRIT-01 Offline Mutation Queue       :crit, done, 2026-10, 3d
    CRIT-02 Concurrency & OCC            :crit, done, 2026-10, 2d
    CRIT-05 Fix PostgREST FK meal_plans  :crit, done, 2026-11, 1d
    section Wysokie (Performance & Quality)
    HIGH-01 Fix Fast Refresh Oxlint     :done, 2026-11, 2d
    HIGH-02 Fix Act Warnings Vitest      :done, 2026-11, 2d
    HIGH-04 RLS User Index & FK Indexes  :done, 2026-11, 1d
    HIGH-05 Zustand Selectors & Shallow  :done, 2026-11, 2d
    HIGH-06 Stop Realtime Echo & Vibrate :done, 2026-11, 2d
    HIGH-03 RLS Multi-tenancy Audit      :done, 2026-11, 2d
    HIGH-07 Fix targetKcal pcs & refProd :done, 2026-11, 1d
    HIGH-08 Harden RLS meals & parent_id :done, 2026-11, 1d
    HIGH-09 Sync in_pantry & Retention   :done, 2026-11, 2d
    HIGH-10 Mobile BottomNav & LayoutUX  :done, 2026-11, 2d
    HIGH-11 Calendar Pipeline & Day Cats :done, 2026-11, 2d
    HIGH-12 Meal Edit & Global UI Align  :done, 2026-11, 2d
    HIGH-13 Security Audit & Linter Rule :done, 2026-11, 2d
    section Średnie (Backend & Biznes)
    MED-07 Setup GitHub Actions CI/CD    :done, 2026-11, 4d
    MED-06 Transactional RPC Archive     :done, 2026-11, 12d
    MED-05 Deduct Pantry on Meal Cooked  :done, 2026-11, 14d
    MED-01 Bundle Size & Lazy Loading    :done, 2026-11, 10d
    MED-02 Data Retention Script         :done, 2026-11, 10d
    MED-03 Dismiss Uncertainty ⚠️        :done, 2026-11, 7d
    MED-04 Pantry Mixed Unit Math        :done, 2026-11, 7d
    MED-08 Hierarchical Pantry in Cards  :done, 2026-11, 1d
    MED-09 Pantry Select & Offline Edit  :done, 2026-11, 1d
    MED-10 Local Date Math in Calendar   :done, 2026-11, 1d
    MED-11 Offline Badge & Grid Selected :done, 2026-11, 1d
    MED-12 Light Theme Contrast & Layout :done, 2026-11, 1d
    MED-13 Pantry Search & Sidebar Trunc :done, 2026-11, 1d
    MED-14 Date Window, Paging & N+1 Fix :done, 2026-11, 3d
    MED-15 Calendar O(1) Maps & Memo     :done, 2026-11, 1d
    MED-16 Business Logic Bugfixes (4x)  :done, 2026-11, 3d
    MED-17 Sync Weekly Templates DB      :done, 2026-11, 2d
    MED-18 PostgreSQL CHECK Constraints  :done, 2026-11, 1d
    section Normalne (Higiena & PWA)
    NORM-05 Eliminate `any` in Services  :done, 2026-11, 7d
    NORM-06 Sync PRD.md Specs            :done, 2026-11, 3d
    NORM-07 Refactor Contexts DB Queries :done, 2026-11, 10d
    NORM-08 Workbox PWA Offline Cache    :done, 2026-11, 7d
    NORM-09 Realtime Aisle Order Sync    :done, 2026-11, 5d
    NORM-01 Sync plan.md Docs            :done, 2026-11, 2d
    NORM-02 Component Size Check         :done, 2026-11, 10d
    NORM-03 Accessibility a11y           :done, 2026-11, 14d
    NORM-04 Pantry Expiry Dates          :done, 2026-11, 10d
    NORM-10 Complete i18n & Delete Modal :done, 2026-11, 2d
    NORM-11 Split shoppingListService    :done, 2026-11, 2d
    NORM-12 Update README & Docs Sync    :done, 2026-11, 1d
    NORM-13 Touch Targets & Tablet RWD   :done, 2026-11, 1d
    NORM-14 Calendar i18n & Slug Mapping :done, 2026-11, 1d
    NORM-15 Calendar Confirm & 44px UX   :done, 2026-11, 1d
    NORM-16 Fix README Links & Sync Docs :done, 2026-11, 1d
    NORM-17 Cohesion Review & Rules Sync :done, 2026-11, 1d
    section Nowe Funkcje (Low)
    LOW-07 Pantry Recipe Recommender     :2027-01, 18d
    LOW-06 Multi-Store Aisle Profiles    :2027-01, 14d
    LOW-10 Step-by-Step Cooking Mode     :2027-01, 10d
    LOW-01 Barcode Scanner               :2027-02, 25d
    LOW-08 Weekly Meal Plan Templates    :done, 2026-11, 2d
    LOW-11 Kitchen Units Converter       :done, 2026-11, 2d
    LOW-02 Price & Budget Tracking       :2027-03, 20d
    LOW-09 Email List Export (Resend)    :2027-03, 10d
    LOW-12 Household Macro Analytics     :2027-03, 14d
    LOW-13 Batch Cooking & Leftovers     :2027-03, 10d
    LOW-14 URL Recipe Import Schema.org  :2027-04, 14d
    LOW-15 Allergen & Diet Guards        :2027-04, 14d
    LOW-16 Quick Staples & Freq Hints    :2027-04, 10d
    LOW-04 AI OCR Receipt Scanner        :2027-05, 30d
```

| ID Zadania | Status | Kategoria | Moduł | Szacowany Czas | Kluczowa Korzyść |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CRIT-03** | ✅ Zrealizowane | 🔴 Critical | Security / Edge Functions | 1-2 dni | Eliminacja podatności podszywania się pod obce gospodarstwo w powiadomieniach push. |
| **CRIT-04** | ✅ Zrealizowane | 🔴 Critical | Security / Supabase RLS | 1-2 dni | Uniemożliwienie samowolnego dołączania użytkowników do cudzych gospodarstw. |
| **CRIT-01** | ✅ Zrealizowane | 🔴 Critical | Frontend / Offline PWA | 4-5 dni | Brak utraty odhaczonych artykułów przy braku zasięgu w halach marketów. |
| **CRIT-02** | ✅ Zrealizowane | 🔴 Critical | Backend / Realtime | 2-3 dni | Spójność równoległych zakupów dwóch domowników (Last-Write-Wins prevention). |
| **CRIT-05** | ✅ Zrealizowane | 🔴 Critical | Backend / PostgREST | 0.5 dnia | Usunięcie błędu `PGRST201` (ambiguous FK) i poprawne liczenie kalorii produktów ogólnych w Kalendarzu. |
| **HIGH-01** | ✅ Zrealizowane | 🟠 High | Tooling / Linter | 0.5 dnia | Czysty kod `0 warnings` w `oxlint` i działający React Fast Refresh (HMR). |
| **HIGH-02** | ✅ Zrealizowane | 🟠 High | Testing / Vitest | 1 dzień | Wyeliminowanie ostrzeżeń `act(...)` i stabilne testy jednostkowe/integracyjne. |
| **HIGH-03** | ✅ Zrealizowane | 🟠 High | Security / Supabase RLS | 1-2 dni | Audyt i domknięcie luk multi-tenancy (m.in. `push_subscriptions`, `users`, FK). |
| **HIGH-04** | ✅ Zrealizowane | 🟠 High | Database / Indexes | 1 dzień | Błyskawiczna ewaluacja RLS `get_user_household_ids` w całej bazie danych. |
| **HIGH-05** | ✅ Zrealizowane | 🟠 High | Performance / React | 2 dni | Eliminacja kaskadowych przerenderowań dzięki selektorom Zustand i `useShallow`. |
| **HIGH-06** | ✅ Zrealizowane | 🟠 High | UX / Realtime | 1-2 dni | Usunięcie podwójnych wibracji telefonu i zbędnych zapytań GET przy każdym odhaczeniu. |
| **HIGH-07** | ✅ Zrealizowane | 🟠 High | Logika / Makro | 0.5 dnia | Poprawne skalowanie `targetKcal` w koszyku dla sztuk (`pcs`) oraz produktów ogólnych (`reference_product`). |
| **HIGH-08** | ✅ Zrealizowane | 🟠 High | Security / Supabase RLS | 1 dzień | Blokada wstrzykiwania globalnych przepisów (`household_id IS NULL`) i walidacja tenant-isolation na `parent_id`. |
| **HIGH-09** | ✅ Zrealizowane | 🟠 High | Logika / Lista & Historia | 1-2 dni | Spójne wliczanie `in_pantry` do liczników list oraz obsługa snapshotu retencji (`MED-02`) w Historii. |
| **HIGH-10** | ✅ Zrealizowane | 🟠 High | UI/UX / Nawigacja Mobile | 1-2 dni | Odchudzenie 7-zakładkowego `BottomNavigation`, badge `activeCount` i przełącznik układu w `AppHeader`. |
| **HIGH-11** | ✅ Zrealizowane | 🟠 High | Kalendarz / Pipeline Sync | 1-2 dni | Prawidłowy status `in_list`/`bought`/`uncertain` po przeniesieniu na Aktywną Listę oraz sekcje kategorii dnia w `DayCalendarView`. |
| **HIGH-12** | ✅ Zrealizowane | 🟠 High | Przepiśnik / CRUD & RLS Align | 2 dni | Pełna edycja przepisów (`updateMeal`), selektor `meal_categories` oraz usunięcie blokowanego przez RLS przełącznika `Global`. |
| **HIGH-13** | ✅ Zrealizowane | 🟠 High | Security / RLS, Push & Linter | 1-2 dni | Walidacja `isUuid()` w `.or()`, role właściciela gospodarstwa, walidacja Edge Function Push i egzekwowanie braku `any` w `oxlint`. |
| **MED-01** | ✅ Zrealizowane | 🟡 Medium | Frontend / Bundle | 2-3 dni | Redukcja głównego chunka z 1,036 kB do 134 kB (`React.lazy` + Rolldown `codeSplitting`). |
| **MED-02** | ✅ Zrealizowane | 🟡 Medium | Database / Retention | 1 dzień | Ręczny skrypt retencji `shopping_list_items_archive` i RPC archiwizujące (bez CRON). |
| **MED-03** | ✅ Zrealizowane | 🟡 Medium | UX / Kalendarz | 1 dzień | Możliwość wyciszenia ostrzeżenia ⚠️ braków w `UncertaintyWarningModal`. |
| **MED-04** | ✅ Zrealizowane | 🟡 Medium | Logika / Spiżarnia | 1 dzień | Konwersja jednostek wagowych, objętościowych i sztukowych w spiżarni i modalach. |
| **MED-05** | ✅ Zrealizowane | 🟡 Medium | Biznes / Spiżarnia | 3 dni | Zdejmowanie zużytych składników ze spiżarni po realizacji posiłku (`CookMealDeductModal`). |
| **MED-06** | ✅ Zrealizowane | 🟡 Medium | Database / RPC | 2 dni | Transakcyjne zamykanie listy i zasilanie spiżarni w 1 wywołaniu `archive_shopping_list`. |
| **MED-07** | ✅ Zrealizowane | 🟡 Medium | DevOps / Tooling | 1 dzień | Automatyczna brama jakości CI/CD na GitHubie chroniąca przed regresjami. |
| **MED-08** | ✅ Zrealizowane | 🟡 Medium | UX / Przepiśnik & Kalendarz | 1 dzień | Hierarchiczne wykrywanie spiżarni na kartach przepisów i skalowanie składników wg `target_kcal` w widoku dnia. |
| **MED-09** | ✅ Zrealizowane | 🟡 Medium | State / Offline & Spiżarnia | 0.5 dnia | Pełne metadane hierarchii po dodaniu do spiżarni i obsługa offline/echo przy ręcznej edycji ilości na liście. |
| **MED-10** | ✅ Zrealizowane | 🟡 Medium | Logika Dat / Kalendarz | 0.5 dnia | Eliminacja przesunięć daty o północy i podczas zmiany czasu (DST) w Kalendarzu (`toISOString`). |
| **MED-11** | ✅ Zrealizowane | 🟡 Medium | UI/UX / Offline & Kalendarz | 0.5 dnia | Wizualny wskaźnik pracy Offline (`pendingCount`) zamiast stałego „Realtime" oraz wyróżnienie `isSelected` w siatce miesiąca. |
| **MED-12** | ✅ Zrealizowane | 🟡 Medium | Design / Motyw `clean-light` | 1 dzień | Poprawa kontrastu odznak semantycznych (`-400`/`zinc-*`) na jasnym tle (`1.92:1` → `>=4.5:1`) i usunięcie podwójnych paddingów w Kalendarzu. |
| **MED-13** | ✅ Zrealizowane | 🟡 Medium | UI/UX / Spiżarnia & Sidebar | 0.5 dnia | Naprawa ściśniętego pola wyszukiwania w Spiżarni (`88.5px` na Desktopie / `101.1px` na Mobile) oraz nadmiernego `truncate` w `DesktopSidebar` i kartach. |
| **MED-14** | ✅ Zrealizowane | 🟡 Medium | Performance / DB & Zapytania | 2-3 dni | Okno dat dla `meal_plans`, paginacja `getHistoryLists` i eliminacja pętli N+1 `await` przy imporcie/szablonach/transferze. |
| **MED-15** | ✅ Zrealizowane | 🟡 Medium | Performance / Kalendarz UI | 0.5-1 dzień | Zastąpienie liniowych skanów `.find`/`.filter` w `DayCalendarView` i `MonthCalendarGrid` mapami O(1) z memoizacją. |
| **MED-16** | ✅ Zrealizowane | 🟡 Medium | Logika Biznesowa | 2-3 dni | Poprawka powiadomienia `LIST_COMPLETED` (`in_pantry`), scalania po archiwizacji, zbiorczego transferu tygodnia i edycji ułamkowej. |
| **MED-17** | ✅ Zrealizowane | 🟡 Medium | Backend / Kalendarz (`LOW-08`) | 1-2 dni | Współdzielenie szablonów tygodniowych w bazie Supabase (RLS gospodarstwa) zamiast wyłącznie `localStorage`. |
| **MED-18** | ✅ Zrealizowane | 🟡 Medium | Database / Integralność | 0.5-1 dzień | Dodanie ograniczeń `CHECK` w PostgreSQL dla nieujemnych ilości/makro i limitów długości pól tekstowych. |
| **NORM-01** | ✅ Zrealizowane | 🟢 Normal | Documentation | 0.5 dnia | Oznaczenie Fazy 15 jako zakończonej w [plan.md](file:///d:/08_Git/SmartShopping/SmartShopping/docs/plan.md). |
| **NORM-02** | ✅ Zrealizowane | 🟢 Normal | Frontend / Architecture | 2 dni | Dekompozycja monolitów (> 430 linii) do 14 hooków kontrolerów i 12 subkomponentów UI. |
| **NORM-03** | ✅ Zrealizowane | 🟢 Normal | Frontend / a11y | 2 dni | Pełne role WAI-ARIA, nawigacja klawiaturą, strefy dotyku 44px i kontrast WCAG AA we wszystkich 6 motywach. |
| **NORM-04** | ✅ Zrealizowane | 🟢 Normal | Database / Spiżarnia | 2 dni | Opcjonalne daty ważności `expiration_date`, badge `< 48h` i sortowanie w spiżarni Dual Layout. |
| **NORM-05** | ✅ Zrealizowane | 🟢 Normal | TypeScript Quality | 1-2 dni | Czyste, silne typowanie joinów PostgREST bez użycia typu `any`. |
| **NORM-06** | ✅ Zrealizowane | 🟢 Normal | Documentation | 0.5 dnia | Likwidacja driftu specyfikacji [PRD.md](file:///d:/08_Git/SmartShopping/SmartShopping/docs/PRD.md) z kodem. |
| **NORM-07** | ✅ Zrealizowane | 🟢 Normal | Architecture / Services | 1 dzień | Separacja zapytań Supabase do `userService.ts`; 0 bezpośrednich zapytań w kontekstach. |
| **NORM-08** | ✅ Zrealizowane | 🟢 Normal | PWA / Offline Cache | 1 dzień | Reguły Workbox `CacheFirst` (fonty, media) oraz `StaleWhileRevalidate` (JS/CSS) w `vite.config.ts`. |
| **NORM-09** | ✅ Zrealizowane | 🟢 Normal | Realtime / UX | 0.5 dnia | Synchronizacja kolejności alejek w czasie rzeczywistym bezpośrednio w widoku aktywnej listy. |
| **NORM-10** | ✅ Zrealizowane | 🟢 Normal | i18n / UX | 1 dzień | Przeniesienie pozostałych twardo zakodowanych polskich tekstów do słowników i18n oraz `ConfirmDeleteDialog` w Przepiśniku. |
| **NORM-11** | ✅ Zrealizowane | 🟢 Normal | Architecture / Modularity | 1-2 dni | Podział `shoppingListService.ts` (1,106L → 298L) i `useShoppingStore.ts` (477L → 284L) na mniejsze moduły domenowe. |
| **NORM-12** | ✅ Zrealizowane | 🟢 Normal | Documentation | 0.5 dnia | Zastąpienie szablonu Vite w `README.md` dokumentacją SmartShopping i korekta domyślnego motywu w DDL `PRD.md`. |
| **NORM-13** | ✅ Zrealizowane | 🟢 Normal | UX / RWD & Touch Targets | 1 dzień | Strefy dotyku `>= 44x44px` / powiększone przyciski mobilne oraz responsywność tabletowa (`768px–1023px`) i `LoginScreen`. |
| **NORM-14** | ✅ Zrealizowane | 🟢 Normal | i18n / Kalkulacje | 0.5 dnia | Przeniesienie ostatnich polskich tekstów w modalach Kalendarza (`AddCalendarMealDialog`, `UncertaintyWarningModal`) i `calendarStatus.ts` do i18n oraz czyszczenie aliasów w `pantryCalculations.ts`. |
| **NORM-15** | ✅ Zrealizowane | 🟢 Normal | UX / Kalendarz | 0.5 dnia | Strefy dotyku `>= 44x44px` oraz `ConfirmDeleteDialog` w modalach Kalendarza (`AddCalendarMealDialog`, `DayCalendarView`, `WeeklyTemplatesModal`, `UncertaintyWarningModal`). |
| **NORM-16** | ✅ Zrealizowane | 🟢 Normal | Documentation | 0.5 dnia | Naprawa linków ADR/wersji w `README.md`, dopisanie `LOW-08`/`LOW-11`/DDL w `PRD.md`/`plan.md` oraz wzmocnienie `AGENTS.md` i `.agents/rules/01..06`. |
| **NORM-17** | ✅ Zrealizowane | 🟢 Normal | Architecture / Modularity | 0.5 dnia | Audyt spójności ~26 plików `>300` linii (pozostawione jako spójne całości) oraz urealnienie progu długości plików w `AGENTS.md` i `Regule 04`. |
| **LOW-07** | ⏳ Oczekujące | 🔵 Low | New Feature / UX | 3-4 dni | Rekomendacje dań pod bieżące zapasy w lodówce ("Co dziś ugotować?"). |
| **LOW-06** | ⏳ Oczekujące | 🔵 Low | Multi-Store | 3 dni | Dedykowane układy alejek dopasowane do Biedronki, Lidla czy Carrefoura. |
| **LOW-08** | ✅ Zrealizowane | 🔵 Low | Planowanie / Kalendarz | 2 dni | Zapisywanie i aplikowanie szablonów tygodniowych posiłków ze skalowaniem porcji. |
| **LOW-10** | ⏳ Oczekujące | 🔵 Low | UX Kulinaria / PWA | 2-3 dni | Tryb „Gotuję Teraz" krok-po-kroku z minutnikami i blokadą wygaszania ekranu (`WakeLock API`). |
| **LOW-11** | ✅ Zrealizowane | 🔵 Low | Kulinaria / Kalkulacje | 2 dni | Przelicznik miar domowych (szklanka, łyżka, łyżeczka, szczypta ↔ g/ml) w formularzu przepisu i spiżarni. |
| **LOW-12** | ⏳ Oczekujące | 🔵 Low | Dietetyka / Kalendarz | 2-3 dni | Analityka makroskładników i historia realizacji dziennych celów kalorycznych. |
| **LOW-13** | ⏳ Oczekujące | 🔵 Low | Planowanie / Zero Waste | 2-3 dni | Gotowanie na 2–3 dni (Batch Cooking) i powiązane posiłki z resztek bez dublowania listy zakupów. |
| **LOW-14** | ⏳ Oczekujące | 🔵 Low | Przepiśnik / Import URL | 2-3 dni | Import przepisów z linków URL (JSON-LD `Schema.org/Recipe`) z mapowaniem składników. |
| **LOW-15** | ⏳ Oczekujące | 🔵 Low | Personalizacja / Zdrowie | 2-3 dni | Profile alergenów i preferencji dietetycznych domowników z ostrzeżeniami i zamiennikami. |
| **LOW-16** | ⏳ Oczekujące | 🔵 Low | Koszyk & Historia | 2 dni | Ulubione zestawy „Szybkie Koszyki” (Staples) i podpowiedzi produktów wg częstotliwości zakupów. |

> **Zalecana sekwencja wdrożeniowa kolejnych kroków:**  
> 1. **Domknięcie rozjazdów i bezpieczeństwa (`HIGH-11`..`HIGH-13`):** ✅ *Zrealizowane (Listopad 2026)* — podłączenie `activeListItems` / `archivedListItems` i sekcji kategorii w Kalendarzu, pełna edycja przepisów (`updateMeal`), wybór `meal_categories`, usunięcie martwego przełącznika `Global`, walidacja UUID w `.or()`, role właściciela gospodarstwa (`household_members.role`), walidacja Edge Function Push oraz reguła `no-explicit-any` w `oxlint`.  
> 2. **Wydajność, spójność logiki biznesowej, higiena i modularność (`MED-14`..`MED-18`, `NORM-14`..`NORM-17`):** ✅ *Zrealizowane (Listopad 2026)* — okno dat ±7d w Kalendarzu, paginacja Historii (`HISTORY_PAGE_SIZE = 30`), eliminacja zapytań N+1, mapy O(1) w Kalendarzu, naprawa 4 luk logiki domenowej, synchronizacja szablonów tygodniowych w Supabase (`weekly_meal_templates`), ograniczenia `CHECK` w PostgreSQL, domknięcie i18n oraz `44px`/`ConfirmDeleteDialog` w modalach Kalendarza oraz audyt spójności modułów z aktualizacją progu wielkości plików w konstytucji.  
> 3. **Nowe moduły funkcjonalne (`LOW-01`..`LOW-16`):** Rozwój rekomendacji przepisów pod stan spiżarni (`LOW-07`), profili sklepowych (`LOW-06`), trybu „Gotuję Teraz" (`LOW-10`) oraz planowania Batch Cooking (`LOW-13`) i importu URL (`LOW-14`).
