# SmartShopping — Kompleksowa Specyfikacja Testowa E2E i Utrzymania Długożyjących Domostw (`docs/testing.md`)

Ten dokument stanowi **kanoniczny podręcznik testowania funkcjonalnego, niefunkcjonalnego, bezpieczeństwa oraz lokalizacji** aplikacji **SmartShopping**. Jest zaprojektowany jako wspólny plan wykonawczy zarówno dla **automatycznych testów Playwright**, jak i **manualnych testów weryfikacyjnych** prowadzonych równolegle na dwóch bliźniaczych, długożyjących gospodarstwach domowych.

---

## Spis Treści

1. [Część I: Architektura Testowania, Koncepcja 2 Długożyjących Domostw i Utrzymanie](#część-i-architektura-testowania-koncepcja-2-długożyjących-domostw-i-utrzymanie)
   - [1.1 Filozofia Dwutorowego Testowania Długożyjącego](#11-filozofia-dwutorowego-testowania-długożyjącego)
   - [1.2 Konwencja Stanu Danych: `[BASE]` vs `[TEMP]`](#12-konwencja-stanu-danych-base-vs-temp)
   - [1.3 Legenda Adnotacji, Tagów Playwright i Komendy CLI](#13-legenda-adnotacji-tagów-playwright-i-komendy-cli)
   - [1.4 Konfiguracja Autoryzacji `storageState` dla Playwrighta](#14-konfiguracja-autoryzacji-storagestate-dla-playwrighta)
   - [1.5 Macierz Kanonicznych Danych Testowych (`[BASE]` Dataset Reference)](#15-macierz-kanonicznych-danych-testowych-base-dataset-reference)
2. [Część II: Chronologiczne Moduły Testowe (10 Modułów Użytkowych)](#część-ii-chronologiczne-moduły-testowe-10-modułów-użytkowych)
   - [Moduł 01: Autoryzacja, Utworzenie Domostwa i Konfiguracja Konta (`@module:setup-household`)](#moduł-01-autoryzacja-utworzenie-domostwa-i-konfiguracja-konta-modulesetup-household)
   - [Moduł 02: Przegląd Stanu Początkowego i Alejki Sklepowe (`@module:categories-empty-states`)](#moduł-02-przegląd-stanu-początkowego-i-alejki-sklepowe-modulecategories-empty-states)
   - [Moduł 03: Katalog Produktów i Hierarchia Dwu-poziomowa ADR-010 (`@module:products`)](#moduł-03-katalog-produktów-i-hierarchia-dwu-poziomowa-adr-010-moduleproducts)
   - [Moduł 04: Książka Kucharska, Miary Kuchenne, Dynamiczne Makro i JSON (`@module:cookbook`)](#moduł-04-książka-kucharska-miary-kuchenne-dynamiczne-makro-i-json-modulecookbook)
   - [Moduł 05: Spiżarnia, Terminy Ważności i Świeżość Zapasów ADR-008 (`@module:pantry`)](#moduł-05-spiżarnia-terminy-ważności-i-świeżość-zapasów-adr-008-modulepantry)
   - [Moduł 06: Koszyk Roboczy (Draft) i Weryfikacja ze Spiżarnią (`@module:draft`)](#moduł-06-koszyk-roboczy-draft-i-weryfikacja-ze-spiżarnią-moduledraft)
   - [Moduł 07: Wiele Aktywnych List, Zakupy w Sklepie i Archiwizacja ADR-005 (`@module:active-lists`)](#moduł-07-wiele-aktywnych-list-zakupy-w-sklepie-i-archiwizacja-adr-005-moduleactive-lists)
   - [Moduł 08: Historia Zakupów i Retencja Archiwum (`@module:history`)](#moduł-08-historia-zakupów-i-retencja-archiwum-modulehistory)
   - [Moduł 09: Kalendarz Posiłków, Pipeline Statusów i Szablony Tygodniowe ADR-009 (`@module:calendar-templates`)](#moduł-09-kalendarz-posiłków-pipeline-statusów-i-szablony-tygodniowe-adr-009-modulecalendar-templates)
   - [Moduł 10: Przekrojowe Testy Lokalizacji (i18n `PL`/`EN`), Motywów (WCAG) i Bezpieczeństwa (RLS) (`@module:cross-cutting`)](#moduł-10-przekrojowe-testy-lokalizacji-i18n-plen-motywów-wcag-i-bezpieczeństwa-rls-modulecross-cutting)
3. [Część III: Cykl Życia, Utrzymanie po Zmianach i Lista Kontrolna Wdrożenia](#część-iii-cykl-życia-utrzymanie-po-zmianach-i-lista-kontrolna-wdrożenia)

---

## Część I: Architektura Testowania, Koncepcja 2 Długożyjących Domostw i Utrzymanie

### 1.1 Filozofia Dwutorowego Testowania Długożyjącego

Aplikacja SmartShopping ma charakter silnie stanowy i relacyjny (kategorie → produkty 2-poziomowe → składniki przepisów → spiżarnia → koszyk → wiele aktywnych list → historia → kalendarz → szablony tygodniowe). Zamiast tworzyć jednorazowe środowiska kasowane po każdym teście, utrzymujemy **dwa długowieczne, równoległe gospodarstwa na jednym koncie Google użytkownika**, połączonym przez zapisaną sesję Playwright (`storageState`):

| Rola | Nazwa Domostwa | Kto utrzymuje | Przeznaczenie |
| :--- | :--- | :--- | :--- |
| **Środowisko Automatyczne (Playwright)** | `Household_Test` | Zestaw testów Playwright (`e2e/`) | Pierwszy pełny przebieg (*Bootstrap*) tworzy kompletne dane `[BASE]`. Kolejne uruchomienia weryfikują wybrane moduły po zmianach w kodzie bez niszczenia reszty danych. |
| **Środowisko Manualne (Użytkownik)** | `Household_Test_Manual` | Człowiek (ręczne przejście kroków z `docs/testing.md` + testy eksploracyjne) | Bliźniacze domostwo w tym samym profilu użytkownika. Umożliwia błyskawiczne przełączenie w `HouseholdsDialog` i bezpośrednie porównanie UI, stylów, powiadomień OS oraz zachowania PWA na smartfonie. |

> [!IMPORTANT]
> **Zasada izolacji domostw:** Przed rozpoczęciem każdego modułu lub suity Playwright test automatyczny (oraz tester manualny) **upewnia się w `HouseholdsDialog` lub nagłówku, że aktywnym kontekstem jest właściwe domostwo** (`Household_Test` dla Playwrighta, `Household_Test_Manual` dla testów ręcznych). Zapobiega to przypadkowemu nadpisaniu danych między środowiskami oraz na produkcyjnym domostwie domowym!

---

### 1.2 Konwencja Stanu Danych: `[BASE]` vs `[TEMP]`

Aby można było **wielokrotnie uruchamiać pojedynczy moduł Playwright** (np. tylko `@module:pantry` lub `@module:active-lists`) po zmianach w kodzie, bez konieczności każdorazowego odbudowywania całej aplikacji od zera, stosujemy dwie klasy obiektów:

1. **`[BASE]` — Kanoniczny Stan Bazowy (Idempotentny i Trwały):**
   - Wszystkie kluczowe encje współdzielone między modułami noszą jawny prefiks `[BASE]` (np. `[BASE] Awokado`, `[BASE] Kurczak Teriyaki z ryżem i awokado`, `[BASE] Zakupy Spożywcze Tydzień`).
   - Testy oznaczone tagiem `@state:BASE` działają **idempotentnie (Ensure-or-Verify)**:
     - Jeśli encja `[BASE]` **nie istnieje** w `Household_Test` (pierwszy przebieg / Bootstrap) → test **tworzy ją** zgodnie z Macierzą Danych z sekcji 1.5 i weryfikuje poprawność zapisu.
     - Jeśli encja `[BASE]` **już istnieje** (ponowny przebieg modułu po zmianach w kodzie) → test **nie dubluje jej**, lecz weryfikuje jej obecność, spójność wartości i poprawność renderowania/kalkulacji (lub doprowadza jej stan do wartości bazowej, np. ilość w spiżarni).
2. **`[TEMP]` — Samoczyszczące Dane Operacyjne (Self-Cleaning):**
   - Wszystkie testy niszczące dane, sprawdzające usuwanie (`ConfirmDeleteDialog`), wyciszanie ostrzeżeń, zmianę nazw w historii czy błędy walidacji operują na encjach z prefiksem `[TEMP]` (np. `[TEMP] Produkt Testowy`, `[TEMP] Lista Do Usunięcia`).
   - Każdy test `@state:TEMP` **sprząta po sobie w bloku teardown (`afterEach` / krok końcowy)** lub przywraca poprzedni stan bazowy (np. po usunięciu listy tymczasowej z historii przywraca stan koszyka `[BASE]`). Dzięki temu powtórne uruchomienie dowolnego modułu po tygodniu zawsze zastaje czyste środowisko `[BASE]`.

---

### 1.3 Legenda Adnotacji, Tagów Playwright i Komendy CLI

Każdy przypadek testowy w Części II jest opisany ustandaryzowanym zestawem metadanych:

#### Adnotacje Wykonawcze i Macierz Podziału (`Automatyczne` vs `Manualne`)
- **`[Playwright: E2E]`** — w pełni automatyzowalny test End-to-End działający przeciwko aplikacji webowej i żywej bazie Supabase (w kontekście `Household_Test`) w 3 projektach RWD (`desktop-e2e` `1440x900`, `tablet-e2e` `768x1024`, `mobile-pwa-e2e` `360x800`) ze strażnikiem błędów runtime (`page.on('pageerror')`).
- **`[Playwright: Mock/Route]`** — test automatyzowalny w Playwright na żywym UI, w którym warstwa sieciowa / przeglądarkowa jest kontrolowana przez `page.route()`, `context.setOffline()` lub nadpisanie odpowiedzi REST/RPC (np. symulacja błędu RLS `403`, błędu `500`, konfliktu `OCC updated_at`, uprawnień `Notification.permission`, statusu `role = 'member'`).
- **`[Manual]`** — wymaga ręcznej weryfikacji na fizycznym urządzeniu / systemie operacyjnym (np. natywny Web Push na zablokowanym ekranie iOS/Android, instalacja PWA „Dodaj do ekranu początkowego”, fizyczna wibracja haptyczna urządzenia, logowanie Google OAuth z 2FA).

| Kategoria wykonawcza | Które testy tu należą | Zasada wykonywania |
| :--- | :--- | :--- |
| **1. `TYLKO MANUALNIE` (`[Manual-Only]`)** | 1. Fizyczny odbiór natywnego powiadomienia Web Push na zablokowanym ekranie iOS / Android i tapnięcie w nie (`TC-SETUP-10` krok 5).<br>2. Instalacja PWA *„Dodaj do ekranu początkowego”* i uruchomienie w trybie `standalone` na fizycznym smartfonie (`TC-SETUP-10`).<br>3. Fizyczna wibracja haptyczna urządzenia przy odhaczaniu i dodawaniu Ad-Hoc (`TC-ACT-04`, `TC-DRAFT-04`).<br>4. Realne logowanie Google OAuth (ekran zgody Google + 2FA) przy generowaniu `e2e/.auth/user.json` (`TC-SETUP-01`).<br>5. Ergonomia obsługi jedną ręką w strefie kciuka podczas realnych zakupów. | Wykonywane wyłącznie przez człowieka na fizycznym urządzeniu (silnik Taptic/Vibrator, systemowy ekran blokady OS oraz zabezpieczenia anty-botowe Google OAuth nie są dostępne w headless browserze). |
| **2. `AUTOMATYCZNIE + JEDNORAZOWO MANUALNIE` (`[E2E + Manual Twin]`)** | Wszystkie testy ze znacznikiem `@state:BASE` (`TC-SETUP-02`, `TC-CAT-03`, `TC-PROD-01..03`, `TC-MEAL-01`, `TC-MEAL-04`, `TC-PANTRY-01`, `TC-DRAFT-01..02`, `TC-ACT-01..02`, `TC-ACT-06`, `TC-HIST-01..02`, `TC-CAL-02..03`, `TC-CAL-06`). | Playwright utrzymuje je automatycznie w `Household_Test`, a człowiek wykonuje je **jednorazowo przy Bootstrapie** `Household_Test_Manual`, aby mieć bliźniacze domostwo do wizualnego porównywania UI. |
| **3. `TYLKO AUTOMATYCZNIE` (`[Automated-Only]`)** | Wszystkie testy `@state:TEMP`, `@type:negative`, `@type:security` oraz `[Playwright: Mock/Route]` (walidacje limitów znaków, anulowanie `ConfirmDeleteDialog`, symulacje błędów `403`/`409`/`500`, paginacja 31+ list w historii, wstrzyknięcia PostgREST, macierz 6 motywów × 3 rozdzielczości, synchronizacja 2 kart `pageA ↔ pageB`). | Wykonywane wyłącznie przez Playwright (`npx playwright test`) — nie należy powtarzać ich ręcznie przy każdym wydaniu. |

#### Tagi Klasyfikacji i Filtrowania (`--grep`)
- **Moduły:** `@module:setup-household`, `@module:categories-empty-states`, `@module:products`, `@module:cookbook`, `@module:pantry`, `@module:draft`, `@module:active-lists`, `@module:history`, `@module:calendar-templates`, `@module:cross-cutting`.
- **Typ testu:** `@type:happy-path`, `@type:corner-case`, `@type:negative`, `@type:security`, `@type:i18n`, `@type:rwd`.
- **Zarządzanie stanem:** `@state:BASE`, `@state:TEMP`, `@state:READONLY`.
- **Zakres layoutu:** `[Desktop >=1024px]`, `[Tablet 768-1023px]`, `[Mobile PWA 360px]`.

#### Ściągawka Komend Uruchamiania Playwright (Cząstkowe i Pełne)

| Scenariusz uruchomienia | Komenda CLI | Kiedy używać |
| :--- | :--- | :--- |
| **1. Pełny Bootstrap `Household_Test`** | `npx playwright test --grep "@state:BASE"` | Jednorazowo na starcie lub po pełnym wyczyszczeniu `Household_Test` — buduje cały ekosystem danych krok po kroku (Moduły 01–09). |
| **2. Pełna regresja po dużym releasie** | `npx playwright test` | Przed wydaniem wersji na `PROD`, sprawdza wszystkie moduły (w tym `@type:negative` i `@state:TEMP`). |
| **3. Testy po zmianach w konkretnym module** | `npx playwright test --grep "@module:products"` | Po każdej zmianie w kodzie dotyczącej np. Produktów (analogicznie zamień na `:pantry`, `:draft`, `:active-lists`, `:calendar-templates` itp.). |
| **4. Tylko testy negatywne i bezpieczeństwa** | `npx playwright test --grep "@type:negative\|@type:security"` | Po modyfikacjach walidacji formularzy, polityk RLS w Supabase lub `ConfirmDeleteDialog`. |
| **5. Tylko lokalizacja PL / EN** | `npx playwright test --grep "@type:i18n"` | Po zmianach w `src/i18n/locales/pl.ts` lub `en.ts`. |
| **6. Tryb z podglądem UI (Debug)** | `npx playwright test --grep "@module:cookbook" --headed --ui` | Do wizualnej inspekcji kroków na żywym browserze. |

---

### 1.4 Konfiguracja Autoryzacji `storageState` dla Playwrighta

Ponieważ aplikacja wykorzystuje logowanie Google OAuth (GoTrue), Playwright nie powinien każdorazowo przechodzić ekranu logowania Google (który blokuje boty CAPTCHA/2FA). Zamiast tego:

1. **Jednorazowe zapisanie sesji (`e2e/.auth/user.json`):**
   - Uruchom lokalny serwer dev (`npm run dev`), otwórz okno z zapisem stanu Playwright:
     `npx playwright codegen http://localhost:5173 --save-storage=e2e/.auth/user.json`
   - Zaloguj się ręcznie swoim kontem Google w otwartym oknie, poczekaj aż załaduje się główny widok aplikacji (widoczna sesja Supabase w `localStorage`), po czym zamknij okno.
2. **Bezpieczeństwo repozytorium:**
   - Plik `e2e/.auth/user.json` zawiera aktywne tokeny JWT sesji Supabase — **MUSI** znajdować się w `.gitignore` i nigdy nie może zostać zacommitowany do Gita!
3. **Odświeżenie sesji:**
   - Gdy token `refresh_token` w `e2e/.auth/user.json` wygaśnie po dłuższym okresie nieużywania, wystarczy powtórzyć krok 1, nadpisując plik sesji.
4. **Weryfikacja samego ekranu logowania (`TC-SETUP-01`):**
   - Test ekranu logowania `LoginScreen` uruchamiany jest w osobnym projekcie/kontekście z pustym stanem (`test.use({ storageState: { cookies: [], origins: [] } })`), aby nie stracić zapisanej sesji `user.json`.

---

### 1.5 Macierz Kanonicznych Danych Testowych (`[BASE]` Dataset Reference)

Wszystkie obliczenia w testach Koszyka, Spiżarni i Kalendarza opierają się na poniższych, dokładnych liczbach bazowych. Tester manualny dla `Household_Test_Manual` wprowadza **dokładnie te same dane** (opcjonalnie rozszerzając je o własne scenariusze eksploracyjne):

#### A. Kategorie własne gospodarstwa (Moduł 02)
| Nazwa kategorii | `is_non_food` | Docelowa pozycja w alejkach | Uwagi |
| :--- | :--- | :--- | :--- |
| `[BASE] Suplementy i Odżywki` | `false` | Pozycja `1` (przed globalnymi) | Test sortowania własnej alejki na szczycie listy |
| `[BASE] EKO Chemia i Dom` | `true` | Koniec listy (obok `household`) | Test progu świeżości non-food (`14d` / `28d`) |

#### B. Produkty bazowe (Moduł 03)
| Nazwa produktu | Poziom (`ADR-010`) | Rodzic (`parent_id`) | Jednostka | Kategoria | Makro (`kcal / B / W / T` na 100g/100ml lub 1 szt.) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `[BASE] Awokado` | Ogólny (`is_general=true`) | `null` | `pcs` | `fruits_vegetables` | *brak (ukryte)* |
| `[BASE] Awokado Hass` | Szczegółowy (dziecko) | `[BASE] Awokado` | `pcs` | `fruits_vegetables` | `220 / 2.8 / 11.8 / 20.5` |
| `[BASE] Awokado Fuerte` | Szczegółowy (dziecko) | `[BASE] Awokado` | `pcs` | `fruits_vegetables` | `160 / 2.0 / 8.5 / 14.7` |
| `[BASE] Mleko` | Ogólny (`is_general=true`) | `null` | `ml` | `dairy` | *brak (ukryte)* |
| `[BASE] Mleko bez laktozy 1.5%` | Szczegółowy (dziecko) | `[BASE] Mleko` | `ml` | `dairy` | `45 / 3.3 / 4.8 / 1.5` |
| `[BASE] Mleko klasyczne 3.2%` | Szczegółowy (dziecko) | `[BASE] Mleko` | `ml` | `dairy` | `60 / 3.2 / 4.7 / 3.2` |
| `[BASE] Baterie` | Ogólny (`is_general=true`) | `null` | `pcs` | `[BASE] EKO Chemia i Dom` | *brak (ukryte)* |
| `[BASE] Baterie AA Alkaliczne` | Szczegółowy (dziecko) | `[BASE] Baterie` | `pcs` | `[BASE] EKO Chemia i Dom` | `0 / 0 / 0 / 0` (non-food) |
| `[BASE] Pierś z kurczaka` | Samodzielny | `null` | `g` | `meat_fish` | `110 / 23 / 0 / 1.5` |
| `[BASE] Ryż basmati` | Samodzielny | `null` | `g` | `pantry` | `350 / 7.5 / 77 / 0.8` |
| `[BASE] Oliwa z oliwek Extra Virgin` | Samodzielny | `null` | `ml` | `pantry` | `884 / 0 / 0 / 100` |
| `[BASE] Odżywka białkowa WPI` | Samodzielny | `null` | `g` | `[BASE] Suplementy i Odżywki` | `380 / 85 / 4 / 2.5` |
| `[BASE] Sól morska` | Samodzielny | `null` | `g` | `pantry` | `0 / 0 / 0 / 0` |
| `[BASE] Płatki owsiane górskie` | Samodzielny (z JSON) | `null` | `g` | *(opcjonalnie `pantry`)* | `370 / 13 / 62 / 7` |
| `[BASE] Jajka wiejskie L` | Samodzielny (z JSON) | `null` | `pcs` | *(opcjonalnie `dairy`)* | `75 / 6.5 / 0.6 / 5` |

#### C. Kanoniczny przepis bazowy i wyliczenia makro (Moduł 04)
Przepis **`[BASE] Kurczak Teriyaki z ryżem i awokado`** (kategoria: `Obiad`, tagi: `['WOD', 'Wysokobiałkowe']`):
1. `[BASE] Pierś z kurczaka`: `200 g` → `220.0 kcal | B: 46.0g | W: 0.0g | T: 3.0g`
2. `[BASE] Ryż basmati`: `0.4 cup` (`0.4 * 250g = 100 g`) → `350.0 kcal | B: 7.5g | W: 77.0g | T: 0.8g`
3. `[BASE] Oliwa z oliwek Extra Virgin`: `1 tbsp` (`15 ml`) → `132.6 kcal | B: 0.0g | W: 0.0g | T: 15.0g`
4. `[BASE] Awokado` (referencyjny wariant: `[BASE] Awokado Hass`): `0.5 pcs` → `110.0 kcal | B: 1.4g | W: 5.9g | T: 10.25g`
5. `[BASE] Sól morska` (zapas dynamiczny w `pantry_items` w Module 05 zgodnie z `ADR-008`): `2 pinch` (`2 g`) → `0.0 kcal | B: 0.0g | W: 0.0g | T: 0.0g`
- **Suma porcji bazowej (1.0x):** **`812.6 kcal` (w UI `813 kcal`)** | **`B: 54.9 g`** | **`W: 82.9 g`** | **`T: 29.05 g` (`29.1 g`)**.
- **Po przełączeniu referencji awokado na `[BASE] Awokado Fuerte` (`160 kcal/pcs`):** `0.5 pcs = 80.0 kcal` → suma **`782.6 kcal` (w UI `783 kcal`)**.

---
## Część II: Chronologiczne Moduły Testowe (10 Modułów Użytkowych)

> [!NOTE]
> **Zasada Dual Layout przy każdym teście:**
> Jeśli przypadek testowy nie ma odrębnych sekcji `[Desktop >=1024px]` i `[Mobile PWA 360px]`, jego kroki dotyczą wspólnej logiki domenowej i są identyczne w obu widokach (w Playwright uruchamiamy projekt Desktop Edge `1440x900` oraz Mobile `360x800` + przegląd Tablet `768x1024`). Tam, gdzie nawigacja, kontener (`Dialog` vs `Sheet`), skrót klawiaturowy lub gest (`SwipeToDismiss`) różnią się, podano jawne warianty dla każdego layoutu.

---

### Moduł 01: Autoryzacja, Utworzenie Domostwa i Konfiguracja Konta (`@module:setup-household`)

**Cel modułu:** Weryfikacja ekranu logowania, utworzenie długożyjącego gospodarstwa (`Household_Test` / `Household_Test_Manual`), zarządzanie listą gospodarstw, zaproszeniami, rolami `Owner`/`Member`, zabezpieczeniami przed usunięciem gospodarstwa oraz ustawieniami konta (6 motywów, języki `PL`/`EN`, powiadomienia Web Push).

---

#### `TC-SETUP-01` — Ekran logowania (`LoginScreen`) i przełącznik języka przed zalogowaniem
- **Adnotacja:** `[Playwright: E2E]` *(uruchamiane z czystym `storageState`)*
- **Tagi:** `@module:setup-household` `@type:happy-path` `@type:i18n` `@state:READONLY`
- **Warunki wstępne:** Użytkownik jest wylogowany (brak sesji w `localStorage` i cookies).
- **Kroki:**
  1. Otwórz stronę główną `/`.
  2. Zweryfikuj elementy widoczne na `LoginScreen`: logo `AppLogo`, nagłówek `<h1>Smart Shopping</h1>`, podtytuł (`auth.tagline`), przycisk logowania Google (`auth.signInWithGoogle`) oraz notkę OLED (`auth.demoNotice`).
  3. Kliknij `LanguageSwitcher` w prawym górnym rogu, przełączając z `PL` na `EN`, a następnie z powrotem na `PL`.
  4. Kliknij przycisk „Zaloguj przez Google” (`signInWithGoogle`) — w środowisku manualnym zaloguj się kontem Google; w Playwright zweryfikuj stan ładowania (spinner) i przejdź do kontekstu z zapisanym `e2e/.auth/user.json`.
- **Oczekiwany rezultat:**
  - **UI (`PL`):** Widoczne polskie teksty: *„Planowanie Posiłków & Wspólne Zakupy w Czasie Rzeczywistym”*, *„Zaloguj przez Google”*, *„Aplikacja PWA zoptymalizowana pod ekrany OLED (True Black).”*.
  - **UI (`EN`):** Natychmiastowa zmiana bez przeładowania strony na: *„Meal Planning & Real-Time Shared Grocery Lists”*, *„Sign in with Google”*, *„OLED-optimized PWA (True Black).”*.
  - **Jak NIE powinna się zachować:** Na `LoginScreen` nie mogą pojawiać się żadne zakładki aplikacji (Koszyk, Lista, Spiżarnia) ani nieprzechwycone błędy konsoli przed autoryzacją.

---

#### `TC-SETUP-02` — Utworzenie nowego długożyjącego gospodarstwa (`Household_Test`) i ustawienie jako domyślne
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:setup-household` `@type:happy-path` `@state:BASE`
- **Warunki wstępne:** Użytkownik jest zalogowany.
- **Dane wejściowe:**
  - Dla Playwrighta: nazwa **`Household_Test`**
  - Dla testera manualnego: nazwa **`Household_Test_Manual`**
- **Kroki:**
  1. Otwórz modal zarządzania gospodarstwami (`HouseholdsDialog`):
     - `[Desktop >=1024px]`: kliknij przycisk/nazwę aktualnego gospodarstwa w `DesktopHeader` lub `DesktopSidebar`.
     - `[Mobile PWA 360px]`: kliknij ikonę Domu / nazwę gospodarstwa w `AppHeader`.
  2. W sekcji **„Utwórz Nowe Gospodarstwo”** wpisz `Household_Test` (lub `Household_Test_Manual`) i kliknij **„Utwórz”**.
  3. *(Re-run idempotentny)*: Jeśli na liście `Moje Gospodarstwa` istnieje już `Household_Test`, zamiast tworzenia duplikatu kliknij na niego, aby przełączyć aktywny kontekst.
  4. Na karcie nowo utworzonego / wybranego gospodarstwa kliknij ikonę gwiazdki („Ustaw to gospodarstwo jako domyślne”).
  5. Odśwież stronę (`F5` / `page.reload()`).
- **Oczekiwany rezultat:**
  - **UI:** Wywołanie RPC `create_household_with_member` tworzy gospodarstwo w Supabase, przypisuje aktualnego użytkownika jako `owner` w `household_members`, czyści pole formularza i automatycznie przełącza widok na `Household_Test`.
  - **Odznaki:** Przy `Household_Test` widoczna jest odznaka **`Aktywne`** (`Active`) oraz po kliknięciu gwiazdki odznaka **`Domyślne`** (`Default`).
  - **Trwałość:** Po odświeżeniu strony aplikacja automatycznie uruchamia się w kontekście `Household_Test` (pobierając `users.household_id`).

---

#### `TC-SETUP-03` — Edycja nazwy gospodarstwa inline oraz zmiana kolejności Drag & Drop
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:setup-household` `@type:happy-path` `@state:TEMP`
- **Warunki wstępne:** Otwarty `HouseholdsDialog`, użytkownik posiada co najmniej 2 gospodarstwa (np. domowe i `Household_Test`).
- **Kroki:**
  1. Przy gospodarstwie `Household_Test` kliknij ikonę edycji (ołówek) — pole zamienia się w input inline.
  2. Zmień nazwę na `Household_Test_Edited` i naciśnij `Enter` (lub przycisk zapisu).
  3. Sprawdź zmianę nazwy w nagłówku aplikacji (`AppHeader` / `DesktopHeader`), po czym edytuj nazwę z powrotem na **`Household_Test`**.
  4. Przetestuj anulowanie edycji klawiszem `Escape` (wpisz `XXX`, wciśnij `Esc`).
  5. Przeciągnij (Drag & Drop) niedomyślne gospodarstwo nad inną niedomyślną pozycję na liście (gospodarstwo domyślne z gwiazdką pozostaje przypięte na pozycji `0`).
- **Oczekiwany rezultat:**
  - **UI & Baza:** Zapis zmienia rekord `households.name` i natychmiast odświeża nagłówek aplikacji; `Escape` zamyka input bez wysyłania zapytania do bazy; kolejność niedomyślnych gospodarstw zapisuje się w `localStorage`.
  - **Jak NIE powinna się zachować:** Gospodarstwo oznaczone jako `Domyślne` (`draggable={!isEditing && !isDef}`) nie może dać się przesunąć poniżej niedomyślnych wpisów.

---

#### `TC-SETUP-04` — Walidacja nazwy gospodarstwa (puste znaki, spacje, limit 120 znaków)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:setup-household` `@type:negative` `@type:corner-case` `@state:READONLY`
- **Warunki wstępne:** Otwarty `HouseholdsDialog`.
- **Kroki:**
  1. W polu „Utwórz Nowe Gospodarstwo” wpisz same spacje: `"     "`.
  2. Sprawdź stan przycisku „Utwórz”.
  3. Spróbuj wysłać formularz przez `Enter`.
  4. Wpisz nazwę o długości **121 znaków** (`"A".repeat(121)`) i spróbuj utworzyć lub zapisać w edycji inline.
- **Oczekiwany rezultat:**
  - **Jak POWINNA się zachować:** Przy pustym polu lub samych spacjach przycisk **„Utwórz”** (oraz przycisk zapisu inline) jest `disabled` (nieaktywny), a naciśnięcie `Enter` nie tworzy żadnego pustego gospodarstwa.
  - **Dla >120 znaków:** Ograniczenie bazy `CHECK (char_length(TRIM(name)) >= 1 AND char_length(name) <= 120)` odrzuca nieprawidłowy zapis, aplikacja wyświetla czytelny komunikat błędu / nie dodaje uszkodzonego rekordu do listy, a UI pozostaje stabilne.

---

#### `TC-SETUP-05` — Zapraszanie domowników (`household_invites`), duplikaty i zły format e-mail
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:setup-household` `@type:happy-path` `@type:negative` `@state:TEMP`
- **Warunki wstępne:** Otwarty `HouseholdsDialog` w kontekście `Household_Test`.
- **Dane wejściowe:** Poprawny e-mail `[TEMP]` `partner.test@smartshopping.local`, błędny format `niepoprawny-email`.
- **Kroki:**
  1. W panelu `HouseholdMembersPanel` sprawdź listę członków (widoczny aktualny użytkownik z odznaką **`Ty`** / **`You`**).
  2. Wpisz niepoprawny e-mail `niepoprawny-email` i kliknij „Wyślij Zaproszenie”.
  3. Wpisz `partner.test@smartshopping.local` i kliknij „Wyślij Zaproszenie”.
  4. Wpisz **ponownie ten sam e-mail** `partner.test@smartshopping.local` i kliknij „Wyślij Zaproszenie”.
  5. *(Sprzątanie `[TEMP]`)*: Usuń testowe zaproszenie (lub wyczyść w bazie dla `Household_Test` jeśli jest tylko do testu), tak aby panel członków pozostał czysty.
- **Oczekiwany rezultat:**
  - **Krok 2 (Błędny format):** Natywna walidacja `type="email"` lub walidator aplikacji (`dialogs.households.invalidEmail`) blokuje wysłanie i nie zapisuje zaproszenia w `household_invites`.
  - **Krok 3 (Poprawny e-mail):** W sekcji zaproszeń pojawia się wiersz `partner.test@smartshopping.local` z pomarańczową odznaką **`Oczekuje`** (`Pending`) oraz zielonym komunikatem sukcesu (`inviteSentSuccess`).
  - **Krok 4 (Duplikat):** Constraint bazy `unique_household_invite` zapobiega zduplikowaniu rekordu; w UI pojawia się czerwony komunikat błędu (`inviteError` / `saveInviteError`) bez powielania wiersza na liście.

---

#### `TC-SETUP-06` — Uprawnienia ról `Owner` vs `Member` w gospodarstwie (Odmowa usunięcia RLS)
- **Adnotacja:** `[Playwright: Mock/Route]` + `[Manual]` *(na dwóch kontach Google)*
- **Tagi:** `@module:setup-household` `@type:negative` `@type:security` `@state:READONLY`
- **Warunki wstępne:** Symulacja (lub realne zalogowanie) użytkownika o roli `role = 'member'` w tabeli `household_members` (w Playwright przez przechwycenie odpowiedzi `403 Forbidden` / RLS error `42501` z PostgREST przy próbie `DELETE /rest/v1/households`).
- **Kroki:**
  1. Otwórz `HouseholdsDialog` i kliknij ikonę kosza przy gospodarstwie, aby otworzyć `DeleteHouseholdDialog`.
  2. Odczytaj wygenerowaną frazę potwierdzającą w `[data-testid="expected-confirmation-phrase"]` i wpisz ją w `[data-testid="delete-confirmation-input"]`.
  3. Kliknij przycisk **„Usuń Gospodarstwo”** przy aktywnej blokadzie RLS dla roli `'member'` (`403 Forbidden` / `code: '42501'`).
- **Oczekiwany rezultat:**
  - **Jak NIE powinna się zachować:** Zwykły członek (`member`) **NIE MOŻE** usunąć gospodarstwa ani usunąć właściciela (`owner`) — baza odrzuca takie wywołanie na poziomie polityki `is_household_owner` (0 zmodyfikowanych wierszy / błąd uprawnień `42501`), a UI prezentuje komunikat błędu (`Nie udało się usunąć gospodarstwa`) zamiast fałszywego sukcesu i zachowuje domostwo na liście.

---

#### `TC-SETUP-07` — Zabezpieczenie przed usunięciem gospodarstwa (`DeleteHouseholdDialog`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:setup-household` `@type:negative` `@type:happy-path` `@state:TEMP`
- **Warunki wstępne:** Otwarty `HouseholdsDialog`, aktywne `Household_Test`.
- **Kroki:**
  1. Kliknij ikonę kosza przy `Household_Test`, aby otworzyć `DeleteHouseholdDialog`.
  2. Odczytaj wygenerowaną frazę potwierdzającą w `[data-testid="expected-confirmation-phrase"]` (format: `Household_Test XXXXXX`, gdzie `XXXXXX` to 6 losowych wielkich liter).
  3. Wpisz w `[data-testid="delete-confirmation-input"]` błędny tekst: samą nazwę `Household_Test` bez kodu, lub zły kod `Household_Test WRONG1`.
  4. Kliknij przycisk „Anuluj” — upewnij się, że `Household_Test` NIE zostało usunięte!
  5. *(Test pełnego usunięcia na obiekcie `[TEMP]`)*: Utwórz tymczasowe gospodarstwo `[TEMP] Domostwo Do Usunięcia`, otwórz dla niego `DeleteHouseholdDialog`, kliknij przycisk „Kopiuj” lub wpisz dokładnie wyświetloną frazę `<nazwa> <6-literowy kod>` i zatwierdź przyciskiem **„Usuń Gospodarstwo”**.
- **Oczekiwany rezultat:**
  - **Krok 3 (Błędna fraza):** Przycisk **„Usuń Gospodarstwo”** jest zablokowany (`disabled`) dopóki wpisany tekst nie pokryje się dokładnie z oczekiwaną frazą.
  - **Krok 4 (Anuluj):** `Household_Test` wraz ze wszystkimi danymi pozostaje nienaruszone.
  - **Krok 5 (`[TEMP]`):** Przycisk odblokowuje się po wpisaniu dokładnej frazy, a po kliknięciu tymczasowe gospodarstwo znika z listy i z bazy `households`, zaś aktywny kontekst wraca bezpiecznie do `Household_Test`.

---

#### `TC-SETUP-08` — Przełączanie wszystkich 6 motywów graficznych i trwałość (`ADR-004`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:setup-household` `@type:happy-path` `@state:BASE`
- **Warunki wstępne:** Użytkownik jest zalogowany w kontekście `Household_Test`.
- **Kroki:**
  1. Otwórz ustawienia konta (`AccountDetailsDialog`):
     - `[Desktop >=1024px]`: kliknij ikonę/awatar użytkownika w stopce `DesktopSidebar` lub w `DesktopHeader`.
     - `[Mobile PWA 360px]`: kliknij ikonę profilu w `AppHeader`.
  2. W sekcji **„Szata Graficzna”** (`ThemeSelector`) przetestuj kolejno wszystkie 6 kafelków motywów (`oled-black`, `midnight-blue`, `forest-sage`, `warm-amber`, `cyberpunk-violet`, `clean-light`).
  3. Dla każdego motywu sprawdź atrybut/klasę motywu na `document.documentElement` oraz obliczony kolor tła `--background` (szczególnie przejście z ciemnego `#000000` na jasny `#f8fafc` w `clean-light`).
  4. Przełącz z powrotem na domyślny **`oled-black`** i odśwież stronę (`F5`).
- **Oczekiwany rezultat:**
  - **UI & Wydajność:** Zmiana motywu następuje natychmiast (`<1ms`, bez białego błysku FOUC i bez przeładowania strony).
  - **Persistence:** Wybrany motyw zapisuje się synchronicznie w `localStorage` (`smartshopping_theme`) oraz asynchronicznie w `public.users.theme` (po odświeżeniu strony aktywny motyw pozostaje zachowany).

---

#### `TC-SETUP-09` — Przełączanie języka interfejsu `PL` ↔ `EN` w ustawieniach konta
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:setup-household` `@type:happy-path` `@type:i18n` `@state:BASE`
- **Warunki wstępne:** Otwarte okno `AccountDetailsDialog`.
- **Kroki:**
  1. Zmień wartość w `LanguageSwitcher` (`variant="segmented"`) z **`Polski`** na **`English`**.
  2. Zamknij modal i zweryfikuj etykiety nawigacji:
     - `[Desktop >=1024px]`: `DesktopSidebar` (`Recipes`, `Draft`, `Active List`, `History`, `Pantry`, `Calendar`, `Products`).
     - `[Mobile PWA 360px]`: `BottomNavigation` (`Cookbook`, `Calendar`, `Products`, `Draft`, `List` z `aria-label="Active List"`, `History`, `Pantry` — bez zawijania/obcinania tekstu).
  3. Odśwież stronę (`F5`), sprawdź czy język `EN` przetrwał restart, a następnie przełącz z powrotem na **`Polski` (`pl`)** jako stan bazowy dla kolejnych testów.
- **Oczekiwany rezultat:** Cały interfejs tłumaczy się synchronicznie w pamięci, zapisuje w `localStorage` (klucz języka dla trybu offline) oraz synchronizuje z `users.language` w Supabase.

---

#### `TC-SETUP-10` — Powiadomienia Web Push: baner, uprawnienia, iOS PWA oraz `TEST_NOTIFICATION` (`ADR-007`)
- **Adnotacja:** `[Playwright: Mock/Route]` + `[Manual]`
- **Tagi:** `@module:setup-household` `@type:happy-path` `@type:negative` `@type:corner-case` `@state:READONLY`
- **Warunki wstępne:** Otwarty ekran główny (`NotificationPromptBanner`) lub `AccountDetailsDialog` → sekcja `NotificationSettings`.
- **Kroki:**
  1. **Baner zachęty (`NotificationPromptBanner`):** Przy `Notification.permission === 'default'` i wyczyszczonym kluczu `smartshopping_push_prompt_dismissed` sprawdź widoczność banera (Desktop i Mobile PWA). Kliknij przycisk **„Później”** (`dismissButton`) → odśwież stronę i zweryfikuj, że baner zapamiętał odrzucenie w `localStorage`.
  2. **Odmowa uprawnień (`denied`) i wskazówka iOS:**
     - `[Playwright: Mock/Route]`: Zasymuluj `Notification.permission = 'denied'` i otwórz `NotificationSettings` w ustawieniach konta.
     - `[Playwright: Mock/Route]`: Zasymuluj User-Agent iOS Safari poza trybem standalone (`isIosSafariNonPwa = true`).
  3. **Wysyłka `TEST_NOTIFICATION` i logika „Powiadamiaj mnie” (`smartshopping_notify_self`):**
     - `[Playwright: Mock/Route]`: Zasymuluj `Notification.permission = 'granted'`, aktywną rejestrację Service Workera z `pushManager.getSubscription()` i przechwyć wywołanie `POST /functions/v1/send-push-notification`:
       - **Wariant A (`notifySelf = false`):** Odznacz checkbox **„Powiadamiaj mnie”** (`#notify-self-checkbox`), kliknij przycisk **„Wyślij testowe powiadomienie”** → sprawdź w przechwyconym payloadzie żądania `includeSender: false` oraz odpowiedź `sentCount: 0` (gdy w domostwie jest tylko 1 urządzenie nadawcy).
       - **Wariant B (`notifySelf = true`):** Zaznacz checkbox **„Powiadamiaj mnie”** (`#notify-self-checkbox`), kliknij **„Wyślij testowe powiadomienie”** → sprawdź w payloadzie `includeSender: true`, tytuł z `NOTIFICATION_REGISTRY.TEST_NOTIFICATION` (`🔔 Test powiadomień Web Push`) oraz `tag: "test-notification"`, `url: "/?tab=settings"`.
       - **Propagacja domenowa `notifySelf`:** Przy zaznaczonym „Powiadamiaj mnie” (`smartshopping_notify_self = 'true'`) wszystkie powiadomienia domenowe (`LIST_ITEM_ADDED`, `LIST_COMPLETED`, `LIST_CLEARED_OR_ARCHIVED`, `HOUSEHOLD_MEMBER_JOINED`) również przekazują `includeSender: true` do Edge Function, umożliwiając testowanie powiadomień jednoosobowo na własnym urządzeniu.
  4. **Wyłączenie subskrypcji i błąd sieciowy:** Kliknij **„Wyłącz powiadomienia push”** (`unsubscribe`) i sprawdź usunięcie wpisu z `push_subscriptions`; następnie zasymuluj błąd HTTP `500` Edge Function przy próbie wysyłki testowej.
  5. `[Manual-Only — iOS/Android]`: Zainstaluj aplikację jako PWA na ekranie początkowym, włącz powiadomienia, zaznacz „Powiadamiaj mnie” i kliknij „Wyślij testowe powiadomienie”, sprawdzając fizyczne pojawienie się powiadomienia OS na zablokowanym ekranie oraz kliknięcie go (przekierowanie Deep-Link na właściwy `url`).
- **Oczekiwany rezultat:**
  - **Gdy `denied`:** Wyświetla się czerwony badge *„Zablokowane w przeglądarce”* (`notifications.statusDenied`) oraz wskazówka odblokowania przy kłódce; przycisk włączania jest `disabled` (brak wyjątku `DOMException`).
  - **Gdy `isIosSafariNonPwa`:** Wyświetla się podpowiedź `notifications.iosPwaHint` o dodaniu aplikacji do ekranu początkowego.
  - **Gdy `TEST_NOTIFICATION`:** Przy `sentCount: 0` (brak odbiorców lub wyłączone `notifySelf` na jednym urządzeniu) UI pokazuje czytelny komunikat `notifications.errors.noDevices`; przy `sentCount >= 1` pokazuje Toast/status `notifications.testSent`; błąd `500` wyświetla komunikat `notifications.errors.testFailed` bez blokowania pracy aplikacji.

---

#### `TC-SETUP-11` — Wyzwalacz powiadomienia `HOUSEHOLD_MEMBER_JOINED` i auto-pruning martwych tokenów (`410`/`404`)
- **Adnotacja:** `[Playwright: Mock/Route]` + `[Manual]`
- **Tagi:** `@module:setup-household` `@type:happy-path` `@type:corner-case` `@state:READONLY`
- **Warunki wstępne:** Zapisane urządzenie w `push_subscriptions` dla `Household_Test`.
- **Kroki:**
  1. `[Manual]` *(2 konta Google)* lub `[Playwright: Mock/Route]`: Zasymuluj dołączenie zaproszonego użytkownika do gospodarstwa (wywołanie `notificationService.notify('HOUSEHOLD_MEMBER_JOINED', { householdId, householdName, memberName }, householdId)`).
  2. Sprawdź treść żądania kierowanego do `/functions/v1/send-push-notification` oraz odpowiedź w scenariuszu martwej subskrypcji (`pruned >= 1` po odpowiedzi `410 Gone` / `404 Not Found` z serwera Push).
- **Oczekiwany rezultat:**
  - Payload zawiera `title: "👋 Nowy domownik"` (lub EN `"👋 New household member"`), `tag: "household-{householdId}"`, `url: "/?tab=settings"` oraz imię dołączającej osoby.
  - Wygasłe tokeny (`410`/`404`) są automatycznie usuwane z `push_subscriptions` przez Edge Function (`pruned`), nie blokując dostarczenia powiadomienia do pozostałych aktywnych urządzeń.

---

#### `TC-SETUP-12` — Profil konta, przełącznik trybu Layoutu (`HIGH-10`), Quick-Add Header, Status Live i Wylogowanie
- **Adnotacja:** `[Playwright: E2E]` + `[Playwright: Mock/Route]`
- **Tagi:** `@module:setup-household` `@type:happy-path` `@type:rwd` `@state:TEMP`
- **Warunki wstępne:** Zalogowany użytkownik w kontekście `Household_Test`.
- **Kroki:**
  1. **Edycja nazwy wyświetlanej (`AccountDetailsDialog`):** Zmień pole `Nazwa Wyświetlana` na `Tester SmartShopping`, zapisz i sprawdź komunikat sukcesu (`updateNameSuccess`) oraz odświeżenie inicjałów w `AppHeader` / `DesktopSidebar` (następnie przywróć pierwotną nazwę). Zweryfikuj, że pole `Adres Email Konta Google` jest `disabled` (`tylko do odczytu`), a `Konto utworzone` wyświetla sformatowaną datę.
  2. **Ręczne nadpisanie trybu Layoutu (`HIGH-10`) i skrót klawiaturowy `Ctrl+Alt+L`:**
     - `[Desktop >=1024px]`: W stopce `DesktopSidebar` kliknij selektor `Widok:` i przełącz z `Automatyczny` na `Mobilny PWA`, zweryfikuj pojawienie się `BottomNavigation` i `AppHeader`, a następnie wróć do `Automatyczny` przez menu profilowe w `AppHeader`. Przetestuj także skrót klawiaturowy **`Ctrl + Alt + L`** przełączający błyskawicznie między trybem Desktop a Mobile PWA.
     - `[Mobile PWA 360px]`: W menu `AppHeader` przełącz na `Desktop`, zweryfikuj `DesktopSidebar` i wróć do `Automatyczny`.
  3. **Globalne menu `+ Dodaj` i wskaźnik statusu w `DesktopHeader` (`[Desktop >=1024px]`):**
     - Rozwiń przycisk `+ Dodaj` w prawym górnym rogu `DesktopHeader` i sprawdź dostępność wszystkich 4 skrótów: *Dodaj Przepis*, *Dodaj Produkt*, *Dodaj Pozycję Ad-Hoc*, *Importuj przepis (`Ctrl+Alt+P`)* (oraz otwarcie formularza z poziomu nagłówka i odświeżenie widoku przez `CustomEvent`).
     - Zweryfikuj zielony wskaźnik **`Na żywo`** (`realtime`), a po zasymulowaniu offline sprawdź przejście na pomarańczowy wskaźnik **`Offline (N)`** / **`Sync (N)`** z licznikiem kolejki.
  4. **Trwałość zakładki, Deep-Linking URL (`/?tab=...`) i liczniki badge (`99+`):**
     - Przełącz na zakładkę `Spiżarnia`, odśwież stronę (`F5`) i sprawdź czy aplikacja zapamiętała ostatnią zakładkę w `smartshopping_active_tab`.
     - Przetestuj wejście przez Deep-Link URL wygenerowany przez powiadomienie Push: `/?tab=history` (otwiera zakładkę Historia), `/?tab=active&listId=<id>` (otwiera Aktywną Listę i wybiera wskazaną listę) oraz `/?tab=settings` (otwiera modal `AccountDetailsDialog`).
     - Sprawdź wyświetlanie liczników na ikonach Koszyka i Aktywnej Listy (oraz format `99+` przy >99 pozycjach).
  5. **Wylogowanie (`signOut`):** *(W izolowanym kontekście testowym bez niszczenia `e2e/.auth/user.json`)* Kliknij **„Wyloguj się”** → sprawdź powrót do ekranu `LoginScreen`.
- **Oczekiwany rezultat:**
  - Nazwa wyświetlana zapisuje się w `users.name`, e-mail pozostaje niemodyfikowalny (`readOnly`).
  - Przełącznik `layoutMode` płynnie przełącza interfejs między Desktop a Mobile PWA niezależnie od szerokości okna.
  - Po odświeżeniu strony aktywna zakładka i stan sesji są poprawnie odtwarzane; wylogowanie czyści sesję i wraca na `LoginScreen`.

---

### Moduł 02: Przegląd Stanu Początkowego i Alejki Sklepowe (`@module:categories-empty-states`)

**Cel modułu:** Potwierdzenie, że nowo utworzone `Household_Test` ma prawidłowe puste stany we wszystkich modułach, widzi katalog globalny oraz pozwala bezpiecznie zarządzać własnymi kategoriami i układem alejek sklepowych (`ADR-006`).

---

#### `TC-CAT-01` — Weryfikacja pustych stanów (`Empty States`) we wszystkich 7 widokach startowych
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:categories-empty-states` `@type:happy-path` `@state:READONLY`
- **Warunki wstępne:** Aktywne jest świeże domostwo `Household_Test` (bez dodanych własnych produktów, przepisów, list czy zapasów).
- **Kroki:**
  1. Przejdź kolejno przez wszystkie zakładki w nawigacji (`BottomNavigation` na Mobile / `DesktopSidebar` na Desktopie):
     - **Koszyk (`Draft`)**
     - **Aktywna Lista (`Active List`)**
     - **Historia (`History`)**
     - **Spiżarnia (`Pantry`)**
     - **Kalendarz (`Calendar`)**
     - **Przepisy (`Cookbook`)**
     - **Produkty (`Products`)**
  2. Na każdej zakładce sprawdź obecność poprawnego nagłówka `<h1>`, brak błędów konsoli oraz właściwy stan początkowy.
- **Oczekiwany rezultat:**
  - **Koszyk, Aktywna Lista, Historia, Spiżarnia:** Wyświetlają dedykowane ekrany pustego stanu (np. *„Koszyk roboczy jest pusty”*, *„Brak aktywnych list zakupowych”*, *„Brak zarchiwizowanej historii”*, *„Twoja spiżarnia jest pusta”*) z przyciskami CTA kierującymi do kolejnych akcji.
  - **Kalendarz:** Siatka miesiąca / tygodnia bez przypisanych dań, licznik makro dnia = `0 kcal`.
  - **Produkty i Przepisy:** Brak jakichkolwiek pozycji z odznaką gospodarstwa; widoczne są wyłącznie elementy z katalogu globalnego (`Global`), jeśli występują w bazie.

---

#### `TC-CAT-02` — Przegląd kategorii globalnych i ochrona przed ich edycją/usunięciem
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:categories-empty-states` `@type:negative` `@type:security` `@state:READONLY`
- **Warunki wstępne:** Aktywne `Household_Test`.
- **Kroki:**
  1. Otwórz menedżer alejek i kategorii:
     - Z `HouseholdsDialog` kliknij przycisk **„Konfiguruj”** przy sekcji *„Zarządzaj alejkami i kategoriami”*.
     - Sprawdź wariant kontenera: `[Desktop >=1024px]` otwiera `CategoryManagerDialog`, `[Mobile PWA 360px]` otwiera wysuwany arkusz `CategoryManagerSheet`.
  2. Odszukaj na liście domyślne kategorie globalne (odznaka `Globalna`: *Owoce i Warzywa*, *Pieczywo*, *Nabiał i Jaja*, *Mięso i Ryby*, *Spiżarnia i Sypkie*, *Napoje*, *Chemia i Dom*, *Inne / Różne*).
  3. Zweryfikuj dostępne ikony akcji na karcie kategorii globalnej.
- **Oczekiwany rezultat:**
  - **Jak NIE powinna się zachować:** Przy kategoriach globalnych (`is_global = true`) **NIE MOGĄ** być dostępne przyciski edycji nazwy ani usunięcia (ochrona modeli hybrydowych z `ADR-006`).
  - **Jak POWINNA się zachować:** Przy każdej kategorii globalnej dostępne są wyłącznie: zmiana kolejności (strzałki góra/dół lub Drag & Drop) oraz ikona oka (ukryj/pokaż `is_hidden`).

---

#### `TC-CAT-03` — Utworzenie własnych kategorii gospodarstwa (`[BASE]`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:categories-empty-states` `@type:happy-path` `@state:BASE`
- **Warunki wstępne:** Otwarty menedżer alejek (`CategoryManagerDialog` / `CategoryManagerSheet`) dla `Household_Test`.
- **Dane wejściowe:**
  1. **`[BASE] Suplementy i Odżywki`**
  2. **`[BASE] EKO Chemia i Dom`**
- **Kroki:**
  1. Wpisz `[BASE] Suplementy i Odżywki` i kliknij **„Dodaj kategorię”**.
  2. *(Idempotencja)*: Jeśli kategoria już istnieje z poprzedniego uruchomienia, pomiń dodawanie i zweryfikuj jej obecność na liście.
  3. Analogicznie dodaj `[BASE] EKO Chemia i Dom`.
  4. Zweryfikuj odznakę przy nowo dodanych wierszach.
- **Oczekiwany rezultat:**
  - Obie kategorie zapisują się w tabeli `product_categories` z `household_id = Household_Test.id`.
  - Na liście wyświetlają się z odznaką **`Własna`** (`Custom`) oraz aktywnymi przyciskami edycji (ołówek) i usunięcia (kosz).

---

#### `TC-CAT-04` — Kolejność alejek, ukrywanie kategorii oraz edycja/usuwanie kategorii `[TEMP]`
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:categories-empty-states` `@type:happy-path` `@type:corner-case` `@state:TEMP`
- **Warunki wstępne:** Otwarty menedżer kategorii w `Household_Test`.
- **Kroki:**
  1. Przesuń kategorię `[BASE] Suplementy i Odżywki` (strzałkami lub Drag & Drop) na **pierwszą pozycję** (`Alejka 1`, przed `Owoce i Warzywa`).
  2. Kliknij ikonę oka przy kategorii globalnej `Napoje`, aby ją ukryć (`is_hidden = true`).
  3. Odśwież stronę, wróć do menedżera kategorii — sprawdź, czy układ alejek i stan ukrycia zostały zapisane w bazie (`household_category_settings`). Następnie odkryj kategorię `Napoje` (`is_hidden = false`).
  4. Dodaj kategorię tymczasową `[TEMP] Kategoria Testowa`, edytuj jej nazwę na `[TEMP] Kategoria Zmieniona`, po czym przypisz do niej tymczasowy produkt lub sprawdź przypadek usunięcia i kliknij ikonę kosza.
  5. W modalu `ConfirmDeleteDialog` najpierw kliknij „Anuluj”, upewnij się że kategoria pozostała; następnie ponownie kliknij kosz i potwierdź przyciskiem „Usuń”.
  6. **Fallback bezpieczeństwa ukrytej alejki (`ADR-006`):** Na Aktywnej Liście dodaj tymczasowy produkt należący do kategorii (np. `Napoje`), następnie w menedżerze kategorii **ukryj** kategorię `Napoje` (`is_hidden = true`), wróć na Aktywną Listę i po sprawdzeniu odkryj ją z powrotem (`is_hidden = false`).
- **Oczekiwany rezultat:**
  - Kolejność alejek zapisuje się w `household_category_settings.custom_sort_order` z rzadkimi odstępami (`10, 20, 30...`), a po restarcie `[BASE] Suplementy i Odżywki` nadal jest pierwsza.
  - Usunięcie kategorii `[TEMP]` usuwa ją z listy i bazy dopiero po jawnym potwierdzeniu w `ConfirmDeleteDialog` — produkty wcześniej do niej przypisane **nie są usuwane**, lecz automatycznie trafiają do sekcji *„Inne / Różne”*.
  - **Ochrona zakupów (`filterVisibleCategoriesForShopping`):** Ukryta kategoria posiadająca niezakupione pozycje na Aktywnej Liście **pozostaje widoczna** w sklepie (z banerem informacyjnym `hiddenCategoryWithActiveItemsBanner`), aby kupujący nie pominął produktu w markecie! Dopiero gdy nie ma na niej aktywnych pozycji, znika z listy alejek.

---

#### `TC-CAT-05` — Walidacja formularza kategorii (puste, za krótkie, >40 znaków, duplikat)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:categories-empty-states` `@type:negative` `@type:corner-case` `@state:READONLY`
- **Warunki wstępne:** Otwarty menedżer kategorii.
- **Kroki:**
  1. Wpisz pojedynczy znak `"A"` i kliknij „Dodaj kategorię”.
  2. Wpisz **41 znaków** (`"X".repeat(41)`) i kliknij „Dodaj kategorię”.
  3. Wpisz nazwę istniejącej kategorii niezależnie od wielkości liter: `"[base] suplementy i odżywki"` i kliknij „Dodaj kategorię”.
  4. Wpisz same spacje `"   "`.
- **Oczekiwany rezultat:**
  - **Krok 1:** Komunikat błędu `categoryManager.validation.tooShort` (*„Nazwa kategorii musi mieć co najmniej 2 znaki.”*).
  - **Krok 2:** Komunikat błędu `categoryManager.validation.tooLong` (*„Nazwa kategorii nie może przekraczać 40 znaków.”*).
  - **Krok 3:** Komunikat błędu `categoryManager.validation.duplicate` (*„Kategoria o takiej nazwie już istnieje.”*).
  - **Krok 4:** Przycisk dodawania pozostaje zablokowany (`disabled`). Żaden nieprawidłowy rekord nie trafia do Supabase.

---

#### `TC-CAT-06` — Lokalizacja kategorii systemowych vs własnych (`PL` ↔ `EN`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:categories-empty-states` `@type:i18n` `@state:READONLY`
- **Warunki wstępne:** Dodana własna kategoria `[BASE] Suplementy i Odżywki` i widoczne kategorie globalne.
- **Kroki:**
  1. Przełącz język aplikacji na `EN` i otwórz menedżer kategorii.
  2. Sprawdź nazwy kategorii globalnych i własnych, po czym przełącz z powrotem na `PL`.
- **Oczekiwany rezultat:**
  - Kategorie globalne tłumaczą się poprawnie (`Owoce i Warzywa` → `Fruits & Vegetables`, `Nabiał i Jaja` → `Dairy & Eggs`).
  - Własna kategoria wyświetla dokładnie tekst użytkownika (`[BASE] Suplementy i Odżywki`) — **NIGDY** surowy klucz typu `categories.[BASE] Suplementy i Odżywki`.

---

### Moduł 03: Katalog Produktów i Hierarchia Dwu-poziomowa ADR-010 (`@module:products`)

**Cel modułu:** Zbudowanie pełnego katalogu produktów `[BASE]` z wykorzystaniem 2-poziomowej hierarchii (produkty ogólne-rodzice i warianty szczegółowe-dzieci), produktów samodzielnych, weryfikacja czystości makro, blokady usunięcia rodzica z dziećmi (`ON DELETE RESTRICT`) oraz ochrony katalogu `Global` (`HIGH-08`).

---

#### `TC-PROD-01` — Utworzenie Produktów Ogólnych (Rodziców, `is_general = true`) (`[BASE]`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:products` `@type:happy-path` `@state:BASE`
- **Warunki wstępne:** Zakładka **Produkty** w kontekście `Household_Test`.
- **Dane wejściowe (z Macierzy 1.5B):**
  1. **`[BASE] Awokado`** (`pcs`, kategoria: *Owoce i Warzywa*)
  2. **`[BASE] Mleko`** (`ml`, kategoria: *Nabiał i Jaja*)
  3. **`[BASE] Baterie`** (`pcs`, kategoria: *`[BASE] EKO Chemia i Dom`*)
- **Kroki:**
  1. Kliknij **„Dodaj Produkt”** (otwiera `Dialog` na Desktopie / `Sheet` na Mobile).
  2. W przełączniku „Poziom w katalogu” wybierz **„Produkt ogólny”** (`products.general`).
  3. Obserwuj formularz: sprawdź, czy sekcja makroskładników (`kcal`, `B`, `W`, `T`) oraz pole wyboru rodzica (`parentSelectLabel`) zniknęły, a pojawiła się informacja `products.generalProductNote`.
  4. Wypełnij nazwę, jednostkę i kategorię dla każdego z 3 produktów ogólnych (idempotentnie pomijając już istniejące) i zapisz.
- **Oczekiwany rezultat:**
  - **UI:** Pola makro są ukryte w formularzu dla produktów ogólnych (`ADR-010`).
  - **Katalog & Baza:** Wszystkie 3 produkty pojawiają się na liście z odznaką **`Ogólny`** (`General`) oraz `is_general = true`, `parent_id = null`, `type = 'Household'`.

---

#### `TC-PROD-02` — Utworzenie Produktów Szczegółowych (Wariantów-Dzieci z `parent_id`) (`[BASE]`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:products` `@type:happy-path` `@state:BASE`
- **Warunki wstępne:** Istnieją produkty ogólne z `TC-PROD-01`.
- **Dane wejściowe (z Macierzy 1.5B):**
  1. **`[BASE] Awokado Hass`** → Rodzic: `[BASE] Awokado`, `pcs`, `Owoce i Warzywa`, `kcal: 220`, `B: 2.8`, `W: 11.8`, `T: 20.5`
  2. **`[BASE] Awokado Fuerte`** → Rodzic: `[BASE] Awokado`, `pcs`, `Owoce i Warzywa`, `kcal: 160`, `B: 2.0`, `W: 8.5`, `T: 14.7`
  3. **`[BASE] Mleko bez laktozy 1.5%`** → Rodzic: `[BASE] Mleko`, `ml`, `Nabiał i Jaja`, `kcal: 45`, `B: 3.3`, `W: 4.8`, `T: 1.5`
  4. **`[BASE] Mleko klasyczne 3.2%`** → Rodzic: `[BASE] Mleko`, `ml`, `Nabiał i Jaja`, `kcal: 60`, `B: 3.2`, `W: 4.7`, `T: 3.2`
  5. **`[BASE] Baterie AA Alkaliczne`** → Rodzic: `[BASE] Baterie`, `pcs`, `[BASE] EKO Chemia i Dom`, opcja „Produkt niespożywczy / brak makro” (`0 / 0 / 0 / 0`)
- **Kroki:**
  1. Otwórz formularz dodawania produktu z domyślną opcją **„Produkt szczegółowy”**.
  2. W polu **„Produkt nadrzędny”** rozwiń listę i wybierz odpowiedniego rodzica.
  3. Wpisz wartości makroskładników (w tym ułamki dziesiętne np. `2.8`, `11.8`) i zapisz każdy z 5 wariantów.
- **Oczekiwany rezultat:**
  - Warianty zapisują się w `products` z `is_general = false` i poprawnym `parent_id`.
  - Na widoku katalogu pod kartą rodzica `[BASE] Awokado` widoczny jest licznik wariantów (`2 wariantów`) oraz wcięte karty dzieci z odznaką **`Wariant`**.

---

#### `TC-PROD-03` — Utworzenie Samodzielnych Produktów Szczegółowych (`[BASE]`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:products` `@type:happy-path` `@state:BASE`
- **Warunki wstępne:** Zakładka **Produkty** w `Household_Test`.
- **Kroki:** Dodaj 5 samodzielnych produktów szczegółowych (`parent_id = Brak`) zgodnie z tabelą z Macierzy 1.5B:
  1. `[BASE] Pierś z kurczaka` (`g`, *Mięso i Ryby*, `110 / 23 / 0 / 1.5`)
  2. `[BASE] Ryż basmati` (`g`, *Spiżarnia i Sypkie*, `350 / 7.5 / 77 / 0.8`)
  3. `[BASE] Oliwa z oliwek Extra Virgin` (`ml`, *Spiżarnia i Sypkie*, `884 / 0 / 0 / 100`)
  4. `[BASE] Odżywka białkowa WPI` (`g`, *`[BASE] Suplementy i Odżywki`*, `380 / 85 / 4 / 2.5`)
  5. `[BASE] Sól morska` (`g`, *Spiżarnia i Sypkie*, `0 / 0 / 0 / 0`)
- **Oczekiwany rezultat:** Wszystkie 5 produktów widnieją jako samodzielne pozycje w swoich kategoriach, z poprawnie zapisanymi makroskładnikami na 100g/100ml.

---

#### `TC-PROD-04` — Blokada usunięcia Produktu Ogólnego z dziećmi (`ON DELETE RESTRICT`, `ADR-010`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:products` `@type:negative` `@type:security` `@state:READONLY`
- **Warunki wstępne:** Produkt ogólny `[BASE] Awokado` posiada 2 podpięte warianty (`Awokado Hass` i `Awokado Fuerte`).
- **Kroki:**
  1. Znajdź na liście kartę rodzica `[BASE] Awokado`.
  2. Spróbuj kliknąć przycisk usunięcia produktu (lub otworzyć modal usuwania rodzica).
- **Oczekiwany rezultat:**
  - **Jak NIE powinna się zachować:** Aplikacja **NIE MOŻE** pozwolić na usunięcie rodzica ani na kaskadowe skasowanie jego dzieci (`ON DELETE RESTRICT`).
  - **Jak POWINNA się zachować:** Przycisk usunięcia jest zablokowany lub wyświetla ostrzeżenie `products.deleteBlockedHasChildren` (*„Nie można usunąć produktu ogólnego "[BASE] Awokado", dopóki posiada warianty szczegółowe (2). Usuń lub przenieś je najpierw.”*). Wszystkie 3 rekordy pozostają w bazie.

---

#### `TC-PROD-05` — Ochrona produktów `Global` oraz parytet UI ↔ RLS (`HIGH-08`)
- **Adnotacja:** `[Playwright: E2E]` + `[Playwright: Mock/Route]`
- **Tagi:** `@module:products` `@type:negative` `@type:security` `@state:READONLY`
- **Warunki wstępne:** Widok **Produkty** z widocznymi pozycjami `Global` (lub przefiltrowanymi po typie `Globalny`).
- **Kroki:**
  1. Otwórz formularz dodawania produktu (`ProductFormSheet`) i sprawdź wszystkie pola.
  2. Znajdź na liście produkt globalny (z niebieską odznaką `Globalny`).
  3. *(Test API/RLS)*: Zasymuluj lub wykonaj bezpośrednią próbę `INSERT` produktu z `type: 'Global', household_id: null` albo `UPDATE`/`DELETE` na produkcie globalnym z poziomu zwykłego zalogowanego użytkownika.
- **Oczekiwany rezultat:**
  - **UI (`HIGH-08`):** W formularzu **nie istnieje żaden przełącznik** tworzenia produktu `Globalny` — każdy tworzony produkt trafia zawsze do `Household_Test`. Na karcie produktu globalnego przyciski Edytuj / Usuń są ukryte lub nieaktywne.
  - **Baza RLS:** Próba zapisu lub usunięcia rekordu `Global` przez zwykłego użytkownika kończy się odmową RLS (`403` / `42501`), a UI pokazuje Toast błędu zamiast fałszywego potwierdzenia.

---

#### `TC-PROD-06` — Walidacja formularza produktu i ochrona przed 3-poziomową hierarchią
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:products` `@type:negative` `@type:corner-case` `@state:READONLY`
- **Kroki:**
  1. Otwórz formularz dodawania produktu, zostaw pustą nazwę (lub same spacje) i kliknij „Dodaj Produkt”.
  2. Wpisz ujemne wartości makro: `kcal = -100`, `protein = -5` i spróbuj zapisać.
  3. Rozwiń listę „Produkt nadrzędny (opcjonalnie)” i sprawdź, jakie produkty są na niej dostępne.
  4. Wpisz nazwę dłuższą niż `200` znaków i spróbuj zapisać.
- **Oczekiwany rezultat:**
  - Pusta nazwa zwraca błąd walidacji w formularzu bez wywołania API.
  - Ujemne makro są blokowane przez atrybut `min="0"` w UI i walidację / `CHECK (>= 0)` w bazie.
  - Lista wyboru rodzica zawiera **WYŁĄCZNIE** produkty ogólne (`is_general = true`) — nigdy produkty szczegółowe (gwarancja płaskiego drzewa max. 2 poziomy, bez cykli i wnuków!).

---

#### `TC-PROD-07` — Filtrowanie, wyszukiwanie i hierarchiczny `ProductAutocomplete` (`Desktop` vs `Mobile`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:products` `@type:happy-path` `@type:rwd` `@state:READONLY`
- **Kroki:**
  1. W widoku **Produkty** wpisz w wyszukiwarce `"Awokado"` → sprawdź wyniki (powinien pojawić się rodzic i oba warianty).
  2. Przefiltruj po własnej kategorii `[BASE] Suplementy i Odżywki` → widoczny jest produkt `[BASE] Odżywka białkowa WPI`.
  3. **Szybkie zarządzanie Spiżarnią z karty produktu (`ProductCatalogCard`):** Na karcie produktu w katalogu kliknij ikonę magazynu `Warehouse` (podświetloną kolorem `primary`, jeśli produkt jest już w Spiżarni, lub wyszarzoną, jeśli go brakuje) → zweryfikuj otwarcie modala dodania/zarządzania stanem tego produktu.
  4. Przełącz na widok `[Mobile PWA 360px]` i sprawdź rozmiar strefy dotyku przycisków akcji na kartach produktów (`>= 44x44px`) oraz brak poziomego scrolla (`scrollWidth <= innerWidth`).
- **Oczekiwany rezultat:** Wyszukiwanie i filtrowanie działają błyskawicznie bez przeładowania, a layout na `360px`, `768px` i `1440px` nie ucina etykiet i zachowuje `>= 44x44px` na wszystkich przyciskach interaktywnych.

---

#### `TC-PROD-08` — Edycja i usuwanie produktu tymczasowego `[TEMP]` (`ConfirmDeleteDialog`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:products` `@type:happy-path` `@type:negative` `@state:TEMP`
- **Kroki:**
  1. Utwórz produkt `[TEMP] Produkt Do Usunięcia` (`pcs`, `100 kcal`).
  2. Edytuj jego nazwę na `[TEMP] Produkt Edytowany` i kalorie na `150 kcal` → zapisz i zweryfikuj zmianę na karcie.
  3. Kliknij ikonę kosza → w `ConfirmDeleteDialog` kliknij **„Anuluj”** (produkt musi zostać na liście).
  4. Kliknij kosz ponownie → kliknij **„Usuń”**.
- **Oczekiwany rezultat:** Edycja aktualizuje produkt, anulowanie przerywa operację, a potwierdzenie usuwa produkt `[TEMP]` całkowicie z listy i bazy.

---

### Moduł 04: Książka Kucharska, Miary Kuchenne, Dynamiczne Makro i JSON (`@module:cookbook`)

**Cel modułu:** Stworzenie bazy przepisów `[BASE]`, weryfikacja przelicznika miar kuchennych (`kitchenUnits.ts`), dynamicznego trasowania makro przez wariant referencyjny (`ADR-010`), skalowania porcji/kcal w locie oraz wsadowego importu JSON na Desktopie (`Ctrl+Alt+P`).

---

#### `TC-MEAL-01` — Utworzenie kanonicznego przepisu `[BASE] Kurczak Teriyaki z ryżem i awokado`
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:cookbook` `@type:happy-path` `@state:BASE`
- **Warunki wstępne:** Zakładka **Przepisy** w `Household_Test`, utworzone produkty `[BASE]` z Modułu 03.
- **Dane wejściowe (z Macierzy 1.5C):**
  - Nazwa: **`[BASE] Kurczak Teriyaki z ryżem i awokado`**
  - Kategoria: **`Obiad`** (`lunch`), Tagi: `WOD`, `Wysokobiałkowe`
  - Opis: `Wysokobiałkowy obiad z ryżem basmati i świeżym awokado.`
  - Kroki przygotowania: `1. Ugotuj ryż. 2. Podsmaż kurczaka na oliwie. 3. Podaj z awokado.`
  - Komentarze: `Idealny posiłek potreningowy.`
  - Składniki:
    1. `[BASE] Pierś z kurczaka` → ilość `200`, jednostka `g`
    2. `[BASE] Ryż basmati` → ilość `0.4`, miara kuchenna `cup` (*szklanka 250 g* → podgląd `= 100 g`)
    3. `[BASE] Oliwa z oliwek Extra Virgin` → ilość `1`, miara kuchenna `tbsp` (*łyżka 15 ml* → podgląd `= 15 ml`)
    4. `[BASE] Awokado` (produkt ogólny!) → ilość `0.5` `pcs`, wariant referencyjny makro: **`[BASE] Awokado Hass`**
    5. `[BASE] Sól morska` → ilość `2`, miara kuchenna `pinch` (*szczypta 1 g* → podgląd `= 2 g`). *(Zgodnie z `ADR-008` w formularzu `AddMealSheet` usunięto statyczny checkbox „Produkt spiżarniowy (na stanie)” — pokrycie spiżarniowe jest wyliczane dynamicznie z tabeli `pantry_items` w Module 05).*
- **Kroki:**
  1. Kliknij **„Dodaj Przepis”** (`AddMealSheet`) i upewnij się, że przestarzały checkbox „Produkt spiżarniowy (na stanie)” nie występuje w formularzu (`ADR-008`).
  2. Wypełnij kategorię, nazwę, opis, tagi (dodając przez `Enter`), kroki i komentarze.
  3. Dla każdego z 5 składników użyj `ProductAutocomplete` (sprawdź prezentację 2-poziomową z wcięciami `↳`), wybierz odpowiednią miarę kuchenną i wpisz ilość.
  4. Dla składnika `[BASE] Awokado` sprawdź widoczność selektora wariantu referencyjnego i wybierz `[BASE] Awokado Hass`.
  5. Zapisz przepis i otwórz jego kartę szczegółów (`MealDetailsSheet`).
- **Oczekiwany rezultat:**
  - **Przelicznik jednostek:** Po zapisie w `meal_ingredients` zapisane są ilości w jednostkach bazowych (`100 g` ryżu, `15 ml` oliwy, `2 g` soli).
  - **Matematyka Makro (1.0x):** Na karcie i w szczegółach widnieje **`813 kcal`** (`812.6 kcal`), **`B: 54.9 g`**, **`W: 82.9 g`**, **`T: 29.1 g` (`29.05 g`)**.

---

#### `TC-MEAL-02` — Dynamiczne Trasowanie Makro (`ADR-010`) i brak wariantów (Corner Case)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:cookbook` `@type:happy-path` `@type:corner-case` `@state:TEMP`
- **Warunki wstępne:** Istnieje przepis `[BASE] Kurczak Teriyaki z ryżem i awokado`.
- **Kroki:**
  1. Edytuj przepis `[BASE] Kurczak Teriyaki z ryżem i awokado`.
  2. W wierszu składnika `[BASE] Awokado` zmień wariant referencyjny makro (`reference_product_id`) z `[BASE] Awokado Hass` (`220 kcal/pcs`) na **`[BASE] Awokado Fuerte`** (`160 kcal/pcs`).
  3. Zapisz lub sprawdź podsumowanie na żywo w karcie szczegółów.
  4. Przywróć wariant referencyjny z powrotem na **`[BASE] Awokado Hass`**, aby utrzymać kanoniczne `813 kcal`!
  5. *(Corner Case)*: Utwórz chwilowo produkt ogólny `[TEMP] Przyprawa Ogólna Bez Dzieci` (`is_general = true`, brak dzieci) i wybierz go w formularzu nowego przepisu (bez zapisywania), po czym posprzątaj `[TEMP]`.
- **Oczekiwany rezultat:**
  - Po przełączeniu na `Awokado Fuerte` kaloryczność przepisu spada dokładnie o `30 kcal` (`0.5 * (220 - 160)`), pokazując **`783 kcal`** (`782.6 kcal`), `B: 54.5g`, `W: 81.3g`, `T: 26.2g`.
  - Dla produktu ogólnego bez wariantów podrzędnych wyświetla się ostrzeżenie `cookbook.noReferenceWarning` (*„Brak wariantów do wyliczenia makro”*) i kontrybucja `0 kcal` bez błędu wykonania (`NaN`).

---

#### `TC-MEAL-03` — Kompletny test przeliczników miar kuchennych (`kitchenUnits.ts`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:cookbook` `@type:happy-path` `@type:corner-case` `@state:READONLY`
- **Warunki wstępne:** Otwarty formularz `AddMealSheet`.
- **Kroki:**
  1. Dodaj wiersz ze składnikiem wagowym (`g`, np. `[BASE] Ryż basmati`) → sprawdź listę rozwijaną miar: muszą być dostępne `g`, `łyżka (15 g)`, `łyżeczka (5 g)`, `szklanka (250 g)`, `szczypta (1 g)`, `dag (10 g)`, `kg (1000 g)`. Sprawdź podgląd `1 kg = 1000 g`, `2 dag = 20 g`, `1 tsp = 5 g`.
  2. Dodaj wiersz ze składnikiem objętościowym (`ml`, np. `[BASE] Mleko bez laktozy 1.5%`) → sprawdź opcje: `ml`, `łyżka (15 ml)`, `łyżeczka (5 ml)`, `szklanka (250 ml)`, `l (1000 ml)`. Sprawdź podgląd `0.5 l = 500 ml`.
  3. Dodaj wiersz ze składnikiem sztukowym (`pcs`, np. `[BASE] Awokado Hass`) → sprawdź opcje miar kuchennych.
- **Oczekiwany rezultat:**
  - Dla produktów sztukowych (`pcs`) dostępna jest **wyłącznie** jednostka `pcs` (`szt.`) — brak możliwości wybrania np. szklanki lub kilograma dla sztuk.
  - Podgląd konwersji na żywo aktualizuje się przy każdej zmianie liczby lub jednostki.

---

#### `TC-MEAL-04` — Import Przepisów z JSON (`Ctrl+Alt+P` / `JsonRecipeImportDialog`) (`[BASE]` `[Desktop Only]`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:cookbook` `@type:happy-path` `@type:rwd` `@state:BASE`
- **Warunki wstępne:** Widok **`[Desktop >=1024px]`** w `Household_Test`.
- **Dane wejściowe (JSON wsadowy):**
  ```json
  [
    {
      "name": "[BASE] Szejk Białkowy Po Treningu",
      "description": "Szybki shake potreningowy",
      "tags": ["WOD", "Białko"],
      "category_id": 1,
      "ingredients": [
        { "name": "[BASE] Odżywka białkowa WPI", "quantity": 0.04, "unit": "kg" },
        { "name": "[BASE] Mleko bez laktozy 1.5%", "quantity": 0.3, "unit": "l" }
      ]
    },
    {
      "name": "[BASE] Omlet z płatkami owsianymi",
      "description": "Klasyczne śniadanie białkowo-tłuszczowe",
      "tags": ["Śniadanie"],
      "category_id": 1,
      "ingredients": [
        { "name": "[BASE] Płatki owsiane górskie", "quantity": 6, "unit": "dag", "kcal_per_100": 370, "protein_per_100": 13, "carbs_per_100": 62, "fat_per_100": 7 },
        { "name": "[BASE] Jajka wiejskie L", "quantity": 3, "unit": "szt", "kcal_per_100": 75, "protein_per_100": 6.5, "carbs_per_100": 0.6, "fat_per_100": 5 }
      ]
    }
  ]
  ```
- **Kroki:**
  1. *(Idempotencja)*: Jeśli oba przepisy `[BASE]` są już w Książce Kucharskiej, zweryfikuj ich składniki i makro; w przeciwnym razie wykonaj kroki 2–5.
  2. Naciśnij skrót klawiaturowy **`Ctrl + Alt + P`** (na macOS `Cmd + Option + P`).
  3. *(Opcjonalnie sprawdź przyciski pomocnicze)*: Kliknij **„Kopiuj szablon JSON”** (weryfikacja zmiany na ikonę ✓ `Skopiowano szablon do schowka`) oraz kliknij wstawienie przykładowego szablonu, a następnie wyczyść pole przyciskiem kosza (`Wyczyść`).
  4. Wklej powyższą tablicę JSON do edytora w `JsonRecipeImportDialog`.
  5. Kliknij przycisk `Prettify` (formatowanie) i sprawdź zielony pasek walidacji oraz informację o liczbie automatycznie tworzonych produktów.
  6. Kliknij **„Zapisz 2 przepisów”**.
- **Oczekiwany rezultat:**
  - **Normalizacja jednostek:** `0.04 kg` → `40 g`; `0.3 l` → `300 ml`; `6 dag` → `60 g`; `3 szt` → `3 pcs`.
  - **Auto-tworzenie produktów:** W katalogu `products` dla `Household_Test` automatycznie tworzą się brakujące produkty `[BASE] Płatki owsiane górskie` (`g`) i `[BASE] Jajka wiejskie L` (`pcs`) z `type = 'Household'` i podanym makro; istniejące `[BASE] Odżywka białkowa WPI` oraz `[BASE] Mleko bez laktozy 1.5%` nie są dublowane.
  - **Przepiśnik:** Oba przepisy pojawiają się w Książce Kucharskiej (`[BASE] Szejk Białkowy Po Treningu` ≈ `287 kcal`, `[BASE] Omlet z płatkami owsianymi` = `447 kcal`).

---

#### `TC-MEAL-05` — Walidacja błędów JSON Import oraz blokada skrótu na Mobile PWA
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:cookbook` `@type:negative` `@type:corner-case` `@type:rwd` `@state:READONLY`
- **Kroki:**
  1. `[Desktop >=1024px]`: Otwórz `JsonRecipeImportDialog` (`Ctrl+Alt+P`) i przetestuj kolejno:
     - Uszkodzony JSON: `{ "name": "Test", ` (brak domknięcia)
     - Pusta tablica: `[]`
     - Przepis bez składników: `{ "name": "Pusty", "ingredients": [] }`
     - Ujemna ilość: `{ "name": "Zły", "ingredients": [{"name": "Jajko", "quantity": -2, "unit": "pcs"}] }`
     - Nieznana jednostka: `{ "name": "Zły", "ingredients": [{"name": "Woda", "quantity": 1, "unit": "galon"}] }`
  2. `[Mobile PWA 360px]`: Wyślij zdarzenie klawiatury `Ctrl+Alt+P` na widoku mobilnym.
- **Oczekiwany rezultat:**
  - Każdy błędny przypadek wyświetla precyzyjny komunikat błędu (`syntaxErrorTitle` lub `schemaErrorsTitle`) ze wskazaniem nazwy przepisu/składnika, a przycisk zapisu jest `disabled`.
  - Na `[Mobile PWA 360px]` skrót `Ctrl+Alt+P` **NIE** otwiera modala importu JSON (`JsonRecipeImportDialog` jest wyłącznie dla Desktopu).

---

#### `TC-MEAL-06` — Skalowanie porcji i docelowych kalorii w `MealDetailsSheet`
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:cookbook` `@type:happy-path` `@type:corner-case` `@state:READONLY`
- **Warunki wstępne:** Otwarte szczegóły `[BASE] Kurczak Teriyaki z ryżem i awokado` (baza `812.6 kcal`).
- **Kroki:**
  1. W polu docelowych kalorii wpisz `1625.2` (lub ustaw mnożnik `2x`, jeśli używane w UI) — sprawdź przeliczone składniki i makro.
  2. Wpisz `1219` kcal (`1.5x`).
  3. Wpisz `0` lub wyczyść pole → sprawdź powrót do wartości bazowej `1.0x`.
- **Oczekiwany rezultat:**
  - Dla `2x` (`1625 kcal`): Kurczak = `400 g`, Ryż = `200 g`, Oliwa = `30 ml`, Awokado = `1 pcs`, Sól = `4 g`; B = `109.8g`, W = `165.8g`, T = `58.1g`.
  - Dla `0` lub pustego pola: aplikacja bezpiecznie wraca do porcji bazowej `1.0x` (`813 kcal`) — **nie dzieli przez zero** ani nie pokazuje `0 g` składników.

---

#### `TC-MEAL-07` — Walidacja formularza przepisu (`AddMealSheet`) i edycja/usuwanie `[TEMP]`
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:cookbook` `@type:negative` `@state:TEMP`
- **Kroki:**
  1. Otwórz `AddMealSheet`, spróbuj zapisać przepis z pustą nazwą lub bez żadnego składnika.
  2. Dodaj składnik z ilością `0` lub `-5` i spróbuj zapisać.
  3. **Tworzenie nowego produktu w locie z formularza przepisu:** W wyszukiwarce składnika `ProductAutocomplete` wpisz nazwę nieistniejącego produktu `[TEMP] Przyprawa Z Przepisu` i kliknij przycisk utworzenia nowego produktu (`ProductFormSheet` otwiera się z uzupełnioną nazwą `initialName`), zapisz produkt i sprawdź automatyczne podpięcie go do edytowanego przepisu.
  4. Zapisz przepis `[TEMP] Przepis Do Usunięcia`, sprawdź jego pojawienie się po wyszukaniu i filtrowaniu po tagu/kategorii, a następnie usuń przepis i produkt `[TEMP] Przyprawa Z Przepisu` przez `ConfirmDeleteDialog` (Anuluj → Usuń).
- **Oczekiwany rezultat:** Formularz blokuje zapis przy braku nazwy, braku składników lub ilości `<= 0`; operacje filtrowania i usuwania działają identycznie na Mobile (`Sheet`) i Desktopie (`Dialog`).

---

### Moduł 05: Spiżarnia, Terminy Ważności i Świeżość Zapasów ADR-008 (`@module:pantry`)

**Cel modułu:** Zasilić spiżarnię danymi bazowymi `[BASE]`, zweryfikować ostrzeżenia terminów ważności (`< 48h` i przeterminowane), progi świeżości dla produktów spożywczych vs non-food, hierarchiczną agregację zapasów w przepisach (`ADR-010`) oraz odejmowanie składników funkcją **„Ugotowane”** (`MED-05`).

---

#### `TC-PANTRY-01` — Dodanie kanonicznych zapasów `[BASE]` do Spiżarni (z katalogu i z widoku Produktów)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:pantry` `@type:happy-path` `@state:BASE`
- **Warunki wstępne:** Użytkownik w `Household_Test`, zakładka **Spiżarnia** (lub szybkie dodanie z **Produkty**).
- **Dane wejściowe (`[BASE]`):**
  1. `[BASE] Oliwa z oliwek Extra Virgin` → ilość: `500 ml`, data ważności: `+180 dni` od dziś
  2. `[BASE] Sól morska` → ilość: `200 g`, data ważności: *brak (`null`)*
  3. `[BASE] Awokado Hass` → ilość: `2 pcs`, data ważności: **jutro (`+1 dzień`, czyli `< 48h`)**
  4. `[BASE] Awokado Fuerte` → ilość: `1 pcs`, data ważności: `+5 dni` od dziś
  5. `[BASE] Ryż basmati` → ilość: `50 g` *(celowo zapas częściowy — mniejszy niż `100g` w przepisie!)*, data ważności: `+90 dni`
  6. `[BASE] Baterie AA Alkaliczne` → ilość: `4 pcs` (dodaj przez przycisk szybkiego dodania „Dodaj do spiżarni” bezpośrednio na karcie produktu w zakładce **Produkty**!)
- **Kroki:**
  1. W widoku **Spiżarnia** kliknij **„Dodaj do Spiżarni”** (`AddPantryItemDialog`) i wprowadź pozycje 1–5 (idempotentnie ustawiając dokładnie podane ilości w trybie `Ustaw dokładnie`, jeśli produkt już istniał).
  2. Przejdź do zakładki **Produkty**, znajdź `[BASE] Baterie AA Alkaliczne` i użyj szybkiego przycisku `quickAdd` do spiżarni.
  3. **Pozycja Ad-Hoc oraz tworzenie produktu z Spiżarni (`[TEMP]`):** W `AddPantryItemDialog` wpisz nazwę produktu spoza katalogu (np. `[TEMP] Filtr do dzbanka` jako wpis Ad-Hoc bez dodawania do katalogu) oraz sprawdź prompt utworzenia nowego produktu `createProductPrompt`, zweryfikuj jego obecność na liście, a następnie usuń `[TEMP] Filtr do dzbanka` (na Desktopie przyciskiem kosza, a na `[Mobile PWA 360px]` również gestem `SwipeToDismiss` z potwierdzeniem).
  4. **Statystyki i wyszukiwarka Spiżarni:** Sprawdź pasek liczników (`Świeże / niedawno`, `Weryfikacja`, `Dawno / uzupełnij`) oraz przefiltruj zapasy przez `pantry.searchPlaceholder` (np. `"Awokado"`).
- **Oczekiwany rezultat:**
  - Wszystkie 6 pozycji `[BASE]` znajduje się w `pantry_items` dla `Household_Test`, pogrupowanych domyślnie według kolejności alejek z Modułu 02.
  - Edycja ilości steperem (`+` / `-`) oraz bezpośrednio z klawiatury (np. ułamek `1.5`) aktualizuje stan natychmiast.
  - Statystyki świeżości sumują poprawnie liczbę pozycji w każdym z 3 przedziałów, a pozycje `[TEMP]` po usunięciu nie pozostawiają śladów w Spiżarni.

---

#### `TC-PANTRY-02` — Ostrzeżenia o terminie ważności (`NORM-04`) i sortowanie Spiżarni
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:pantry` `@type:happy-path` `@type:corner-case` `@state:TEMP`
- **Warunki wstępne:** Zapas z `TC-PANTRY-01` w Spiżarni.
- **Kroki:**
  1. Sprawdź wiersz `[BASE] Awokado Hass` (termin = jutro) oraz `[BASE] Awokado Fuerte` (`+5 dni` → stan `upcoming`: *„Ważne jeszcze 5 dni”*).
  2. Tymczasowo dodaj produkt `[TEMP] Jogurt Przeterminowany` z datą ważności **wczoraj (`-1 dzień`)**.
  3. **Edycja i czyszczenie daty ważności inline (`PantryItemRow`):** Na pozycji `[BASE] Sól morska` (brak daty) kliknij przycisk **`Ustaw termin`**, wybierz datę za `30 dni`, sprawdź pojawienie się badge’a `Ważne do ...`, a następnie kliknij w ten badge i użyj przycisku **`Wyczyść datę`** (`clearDate`), aby przywrócić `expiration_date = null`.
  4. Kliknij przełącznik sortowania z **„Wg alejek”** (`sortByAisle`) na **„Wg daty ważności”** (`sortByExpiry`).
  5. Usuń `[TEMP] Jogurt Przeterminowany` (z potwierdzeniem w `ConfirmDeleteDialog`) i przywróć domyślne sortowanie.
- **Oczekiwany rezultat:**
  - Aplikacja rozróżnia wszystkie 4 progi daty ważności: `Przeterminowane` (`< 0d`), `Kończy się termin` (`<= 48h`), `Ważne jeszcze {days} dni` (`3–7 dni`) oraz `Ważne do {date}` (`> 7 dni`).
  - Edycja i czyszczenie daty inline zapisują się w `pantry_items.expiration_date` bez otwierania osobnego okna dialogowego.
  - W trybie „Wg daty ważności” kolejność od góry jest ścisła: `Jogurt (wczoraj)` → `Awokado Hass (jutro)` → `Awokado Fuerte (+5d)` → `Ryż (+90d)` → `Oliwa (+180d)` → pozycje bez daty ważności (`Sól morska`, `Baterie`) na końcu listy!

---

#### `TC-PANTRY-03` — Wskaźniki świeżości `Warehouse` (Spożywcze vs Non-Food)
- **Adnotacja:** `[Playwright: E2E]` + `[Playwright: Mock/Route]`
- **Tagi:** `@module:pantry` `@type:happy-path` `@type:corner-case` `@state:READONLY`
- **Warunki wstępne:** Zapas z `TC-PANTRY-01` w Spiżarni.
- **Kroki:**
  1. Zweryfikuj kolor świeżości dla nowo dodanych pozycji (`last_purchased_at = dzisiaj` → poziom `fresh` / zielony).
  2. *(Playwright Mock lub modyfikacja daty w stanie testowym)*: Dla produktu spożywczego (`[BASE] Ryż basmati`) zasymuluj `last_purchased_at` sprzed **5 dni** oraz **10 dni**, a dla produktu niespożywczego (`[BASE] Baterie AA Alkaliczne`, `is_non_food = true`) zasymuluj daty sprzed **10 dni**, **20 dni** oraz **35 dni**.
- **Oczekiwany rezultat:**
  - **Spożywcze:** `< 3 dni` = Zielony (`fresh`), `3–7 dni` = Pomarańczowy (`medium`), `> 7 dni` = Czerwony (`old`).
  - **Chemia / Non-Food:** `< 14 dni` = Zielony (`fresh`), `14–28 dni` = Pomarańczowy (`medium`), `> 28 dni` = Czerwony (`old`). (`10 dni` dla baterii nadal jest zielone!).

---

#### `TC-PANTRY-04` — Hierarchiczna detekcja Spiżarni (`ADR-010`) w Książce Kucharskiej
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:pantry` `@type:happy-path` `@state:READONLY`
- **Warunki wstępne:** W Spiżarni są `2 pcs` `[BASE] Awokado Hass` i `1 pcs` `[BASE] Awokado Fuerte`; w Książce Kucharskiej istnieje `[BASE] Kurczak Teriyaki z ryżem i awokado`.
- **Kroki:**
  1. Przejdź do **Przepisy** i otwórz szczegóły `[BASE] Kurczak Teriyaki z ryżem i awokado`.
  2. Sprawdź statusy zapasów przy liście składników (`MealDetailsIngredientsSection`):
     - `[BASE] Oliwa z oliwek Extra Virgin` (wymagane `15 ml`, w spiżarni `500 ml`),
     - `[BASE] Ryż basmati` (wymagane `100 g`, w spiżarni `50 g`),
     - `[BASE] Awokado` (produkt ogólny, wymagane `0.5 pcs`, w spiżarni łączna suma dzieci = `3 pcs`),
     - `[BASE] Pierś z kurczaka` (brak w spiżarni).
- **Oczekiwany rezultat:**
  - Oliwa i Sól oznaczone są jako w pełni dostępne w spiżarni.
  - Ryż basmati oznaczony jest jako **częściowo w spiżarni (`50 g`)**.
  - Produkt ogólny `[BASE] Awokado` agreguje warianty dzieci i pokazuje dostępność `3 szt.` z możliwością podglądu wariantów (`Awokado Hass: 2 szt.`, `Awokado Fuerte: 1 szt.`).

---

#### `TC-PANTRY-05` — Funkcja „Ugotowane / Zdejmij ze spiżarni” (`CookMealDeductModal`, `MED-05`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:pantry` `@type:happy-path` `@type:corner-case` `@state:TEMP`
- **Warunki wstępne:** W Spiżarni są `500 ml` oliwy, `50 g` ryżu, `200 g` soli oraz dodajemy tymczasowo `[BASE] Pierś z kurczaka` w ilości `200 g`.
- **Kroki:**
  1. Otwórz szczegóły przepisu `[BASE] Kurczak Teriyaki z ryżem i awokado`.
  2. Kliknij przycisk **„Ugotowane / Zdejmij ze spiżarni”** (`CookMealDeductModal`).
  3. Zweryfikuj listę proponowanych odjęć (kurczak `200g -> 0g` z badge `Wyczerpie zapas`, ryż `50g -> 0g`, oliwa `500ml -> 485ml`, sól `200g -> 198g`, awokado `2 pcs -> 1.5 pcs`).
  4. Odznacz checkbox przy `[BASE] Awokado Hass` oraz `[BASE] Ryż basmati` (nie chcemy ich zdejmować), zostaw zaznaczonego kurczaka, oliwę i sól, i kliknij **„Zdejmij ze spiżarni”**.
  5. *(Przywrócenie stanu `[BASE]`)*: W Spiżarni ustaw ponownie `500 ml` oliwy i `200 g` soli (kurczak powinien zostać automatycznie usunięty po zejściu do `0`!).
- **Oczekiwany rezultat:**
  - Zapas kurczaka spadł do `0` i rekord zniknął ze Spiżarni.
  - Zapas oliwy zmniejszył się dokładnie o `15 ml` (`485 ml`), a niezaznaczone ryż (`50 g`) i awokado (`2 pcs`) pozostały nietknięte.
  - Wyświetlił się Toast `pantry.cookModal.successToast`.

---

#### `TC-PANTRY-06` — Duplikat produktu w Spiżarni (`uq_pantry_household_product`) i walidacja ułamków/liczb ujemnych
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:pantry` `@type:negative` `@type:corner-case` `@state:TEMP`
- **Kroki:**
  1. W `AddPantryItemDialog` wybierz produkt już obecny w spiżarni: `[BASE] Oliwa z oliwek Extra Virgin`.
  2. Sprawdź pojawienie się żółtego panelu ostrzegawczego `alreadyInPantry` z dwoma trybami scalania: **„Zwiększ stan (+X)”** vs **„Ustaw dokładnie (X)”**.
  3. Wybierz „Zwiększ stan (+50 ml)” → zapisz (stan `550 ml`), a następnie użyj „Ustaw dokładnie (500 ml)”, aby wrócić do wartości `[BASE]`.
  4. Spróbuj wpisać w ilość liczbę ujemną `-10` lub `0`.
- **Oczekiwany rezultat:**
  - Brak błędu naruszenia unikalnego klucza SQL (`23505`); aplikacja inteligentnie aktualizuje istniejący wpis zamiast próbować błędnego `INSERT`.
  - Liczby `<= 0` nie pozwalają na zapis.

---

### Moduł 06: Koszyk Roboczy (Draft) i Weryfikacja ze Spiżarnią (`@module:draft`)

**Cel modułu:** Sprawdzenie dodawania posiłków z Przepiśnika do Koszyka, agregacji duplikatów (`mergeDraftItems.ts`), decyzji spiżarniowych (`PantryConfirmModal`: „Mam całość” / „Mam częściowo” / „Nie mam produktu”), pozycji Ad-Hoc, ułamkowych ilości i gestu `SwipeToDismiss` na Mobile.

---

#### `TC-DRAFT-01` — Dodanie składników przepisu do Koszyka Roboczego (z `MealDetailsSheet` oraz szybki przycisk na karcie `CookbookMealCard`) (`[BASE]`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:draft` `@type:happy-path` `@state:BASE`
- **Warunki wstępne:** Pusty Koszyk Roboczy w `Household_Test`, stany Spiżarni jak po Module 05.
- **Kroki:**
  1. W zakładce **Przepisy** otwórz `[BASE] Kurczak Teriyaki z ryżem i awokado` i kliknij **„Dodaj Składniki do Koszyka”** (`1.0x`), a także przetestuj szybki przycisk dodania do koszyka bezpośrednio na karcie przepisu (`CookbookMealCard` / `CookbookMealActions`) bez otwierania szczegółów.
  2. Przejdź do zakładki **Koszyk** (`Draft`).
- **Oczekiwany rezultat:**
  - Toast potwierdzenia dodania przepisu.
  - W Koszyku widoczne są zagregowane składniki (`[BASE] Pierś z kurczaka` `200 g`, `[BASE] Ryż basmati` `100 g`, `[BASE] Oliwa z oliwek Extra Virgin` `15 ml`, `[BASE] Awokado` `0.5 pcs` itd.).
  - Przy składnikach występujących w Spiżarni (`Ryż`, `Oliwa`, `Awokado`, `Sól`) wyświetla się kolorowa ikona magazynu `Warehouse` sygnalizująca obecność w spiżarni!

---

#### `TC-DRAFT-02` — Agregacja identycznych produktów (`mergeDraftItems.ts`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:draft` `@type:happy-path` `@state:BASE`
- **Warunki wstępne:** W Koszyku jest `[BASE] Pierś z kurczaka` (`200 g`) z `TC-DRAFT-01`.
- **Kroki:**
  1. Przejdź do **Przepisy** i dodaj ponownie `[BASE] Kurczak Teriyaki z ryżem i awokado` do Koszyka (lub dodaj z `AddAdHocSheet` produkt katalogowy `[BASE] Pierś z kurczaka` w ilości `300 g` w tej samej kategorii).
  2. Wróć do **Koszyka** i policz wiersze produktu `[BASE] Pierś z kurczaka`.
- **Oczekiwany rezultat:**
  - W Koszyku istnieje **jeden** zagregowany wiersz `[BASE] Pierś z kurczaka` o zsumowanej ilości (`400 g` po dodaniu drugiego przepisu lub `500 g` po dodaniu `300 g`).
  - Jeśli ten sam produkt zostałby dodany ręcznie w **innej kategorii**, system celowo utrzymuje je jako osobne pozycje per alejka (`getCategorySuffix`), nie mieszając alejek!

---

#### `TC-DRAFT-03` — Interaktywny Modal Decyzyjny Spiżarni (`PantryConfirmModal`) w Koszyku i blokada niezgodnych jednostek
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:draft` `@type:happy-path` `@type:corner-case` `@state:TEMP`
- **Warunki wstępne:** W Koszyku znajdują się pozycje ze stanem w Spiżarni: `[BASE] Oliwa z oliwek Extra Virgin` (w spiżarni `500 ml`) oraz `[BASE] Ryż basmati` (potrzebne `200 g`, w spiżarni `50 g`!).
- **Kroki:**
  1. Kliknij ikonę `Warehouse` przy `[BASE] Oliwa z oliwek Extra Virgin` → sprawdź wyświetloną datę zakupu oraz przycisk **„Mam całość”** (`haveAll`). Kliknij **„Mam całość”**.
  2. Kliknij ikonę `Warehouse` przy `[BASE] Ryż basmati` → sprawdź obliczenie brakującej różnicy (`remainingToBuy: 150 g`) i kliknij **„Mam częściowo”** (`havePartial`).
  3. *(Test „Nie mam produktu” na danych `[TEMP]`)*: Dodaj do Spiżarni i Koszyka tymczasowy produkt `[TEMP] Masło testowe` (`1 pcs`), kliknij ikonę `Warehouse` w Koszyku i wybierz **„Nie mam produktu”** (`dontHave`), po czym usuń `[TEMP] Masło testowe` z Koszyka.
  4. *(Corner Case niezgodnych jednostek `areUnitsCompatible = false`)*: Jeśli jednostka zapasu w Spiżarni różni się typem od jednostki w Koszyku (np. `pcs` vs `g`), przycisk „Mam częściowo” (`isPartial = false`) jest ukryty, aby uniemożliwić błędne odjęcie sztuk od gramów.
- **Oczekiwany rezultat:**
  - **„Mam całość” (Oliwa):** Oliwa zostaje natychmiast usunięta z Koszyka Roboczego (`removedFromCart` Toast), a jej `last_verified_at` w Spiżarni zostaje zaktualizowane.
  - **„Mam częściowo” (Ryż):** Ilość w Koszyku zostaje pomniejszona o stan spiżarni (z `200 g` zostaje `150 g` do kupienia!), a `last_verified_at` w Spiżarni zostaje zaktualizowane (przed testami Modułu 07 możesz przywrócić `50 g` ryżu w Spiżarni lub zaktualizować bazę pod `TC-ACT-06`).
  - **„Nie mam produktu”:** Produkt znika ze Spiżarni, ikona `Warehouse` w Koszyku gaśnie, ale pozycja pozostaje w Koszyku do kupienia.

---

#### `TC-DRAFT-04` — Pozycje Ad-Hoc, auto-dopasowanie do katalogu, edycja ułamkowa inline, zmiana kategorii i `SwipeToDismiss`
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:draft` `@type:happy-path` `@type:corner-case` `@type:rwd` `@state:BASE`
- **Kroki:**
  1. Kliknij **„Dodaj Ad-hoc”** (`AddAdHocSheet`).
  2. Dodaj **`Ręczniki papierowe`** (`1 pcs`, kategoria `[BASE] EKO Chemia i Dom`) wybierając w modalu **„Tylko do koszyka”** (bez zapisywania w katalogu), wypróbuj opcję **„Zapisz w bazie i dodaj”** dla `[TEMP] Woda gazowana` (`6 pcs`), oraz sprawdź wpisanie z klawiatury nazwy istniejącego w katalogu produktu (np. `[base] sól morska` — formularz automatycznie dopasowuje istniejące `product_id` case-insensitive i dodaje do koszyka bez wyświetlania pytania o zapis do bazy).
  3. Na pozycji `[BASE] Awokado` kliknij liczbę ilości, zmień ją inline z klawiatury na **`1.5`** (`inputMode="decimal"`) i zatwierdź `Enter` (sprawdź też sanitizację znaków ujemnych `-` oraz ignorowanie `0`).
  4. Zmień kategorię wybranej pozycji bezpośrednio w Koszyku.
  5. Usuń `[TEMP] Woda gazowana`:
     - `[Desktop >=1024px]`: kliknij ikonę kosza przy pozycji → potwierdź w `ConfirmDeleteDialog`.
     - `[Mobile PWA 360px]`: wykonaj gest przesunięcia palcem w lewo (`SwipeToDismiss`) na wierszu `[TEMP]` lub zmniejsz ilość poniżej `1` przyciskiem `-` (co wywoła `ConfirmDeleteDialog`).
- **Oczekiwany rezultat:**
  - Edycja ułamkowa `1.5` zapisuje się bez zaokrąglenia do pełnych liczb całkowitych, a wartości `<= 0` są odrzucane.
  - Zarówno przycisk kosza, jak i zmniejszenie ilości do `0` zabezpieczone są modalem potwierdzenia usunięcia (`ConfirmDeleteDialog`).

---

#### `TC-DRAFT-05` — Zaznaczanie selektywne, `ConfirmDeleteDialog` pozycji i Czyszczenie całego Koszyka
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:draft` `@type:happy-path` `@type:negative` `@state:TEMP`
- **Kroki:**
  1. Użyj przycisków **„Odznacz wszystkie”** / **„Zaznacz wszystkie”** i zweryfikuj licznik `{selected} z {total} zaznaczonych` oraz stan przycisku **„Przenieś do Listy Zakupów”** (gdy `0` zaznaczonych → przycisk zablokowany).
  2. Usuń pojedynczą pozycję (ikona kosza na Desktopie / gest `SwipeToDismiss` na Mobile PWA) → w `ConfirmDeleteDialog` kliknij **„Anuluj”** (pozycja pozostaje na liście i na Mobile wraca na ekran bez utknięcia poza krawędzią).
  3. Kliknij **„Wyczyść Koszyk”** (bezpośrednie wyczyszczenie `clearDraft()` tymczasowego stanu) → sprawdź ekran pustego stanu (`draft.emptyTitle`) → opcjonalnie dodaj z powrotem wsad testowy do Koszyka.
- **Oczekiwany rezultat:** Anulowanie `ConfirmDeleteDialog` zachowuje pozycję; **„Wyczyść Koszyk”** czyści `draftItems` i wyświetla ekran pustego koszyka (`draft.emptyTitle`); przy `0` zaznaczonych pozycji transfer do listy jest niemożliwy.

---

### Moduł 07: Wiele Aktywnych List, Zakupy w Sklepie i Archiwizacja ADR-005 (`@module:active-lists`)

**Cel modułu:** Przetestowanie selektywnego transferu z Koszyka na wiele równoległych list aktywnych, scalania z resetem odhaczenia, grupowania po alejkach (`ADR-006`), odhaczania z `in_pantry` i wyzwalacza `LIST_COMPLETED`, odporności Offline/OCC oraz 3 niezmienników archiwizacji (`archive_shopping_list`).

---

#### `TC-ACT-01` — Selektywny transfer z Koszyka i utworzenie 2 równoległych Aktywnych List (`[BASE]`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:active-lists` `@type:happy-path` `@type:rwd` `@state:BASE`
- **Warunki wstępne:** W Koszyku są produkty spożywcze (`[BASE] Pierś z kurczaka`, `[BASE] Odżywka białkowa WPI`, `[BASE] Ryż basmati`) oraz niespożywcze (`[BASE] Baterie AA Alkaliczne` `2 pcs`, `Ręczniki papierowe` `1 pcs`).
- **Kroki:**
  1. W Koszyku zaznacz **tylko pozycje spożywcze** (odznaczając baterie i ręczniki) i kliknij **„Przenieś X pozycji”**:
     - `[Desktop >=1024px]`: otwiera się `TransferToActiveListDialog`.
     - `[Mobile PWA 360px]`: otwiera się `TransferToActiveListSheet`.
  2. Wybierz tryb **„Utwórz nową listę zakupów”**, wpisz nazwę **`[BASE] Zakupy Spożywcze Tydzień`**, zaznacz **„Ustaw jako listę domyślną”** i zatwierdź.
  3. Wróć do Koszyka (gdzie pozostały tylko niezaznaczone pozycje niespożywcze!), zaznacz je i przenieś do **drugiej nowej listy** o nazwie **`[BASE] Dom i Chemia`** (bez ustawiania jako domyślna).
  4. Przejdź na zakładkę **Aktywna Lista** i przetestuj przełączanie między obiema listami:
     - `[Desktop >=1024px]`: klikaj **Segmented Tabs** na górze widoku.
     - `[Mobile PWA 360px]`: klikaj **horyzontalne pigułki (chipsy)** z licznikami nieodhaczonych pozycji.
- **Oczekiwany rezultat:**
  - W zakładce **Aktywna Lista** istnieją równolegle **2 niezależne aktywne listy** (utworzenie drugiej nie archiwizuje pierwszej!).
  - Lista `[BASE] Zakupy Spożywcze Tydzień` ma odznakę **`Domyślna`**, a liczniki na chipach/zakładkach precyzyjnie pokazują liczbę niekupionych artykułów każdej z nich.

---

#### `TC-ACT-02` — Transfer do istniejącej aktywnej listy (Scalanie ilości + Reset `is_checked`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:active-lists` `@type:happy-path` `@type:corner-case` `@state:BASE`
- **Warunki wstępne:** Na aktywnej liście `[BASE] Zakupy Spożywcze Tydzień` znajduje się `[BASE] Pierś z kurczaka` (np. `500 g`).
- **Kroki:**
  1. Na liście `[BASE] Zakupy Spożywcze Tydzień` odhacz checkbox przy `[BASE] Pierś z kurczaka` (`is_checked = true` — przekreślony).
  2. Przejdź do **Koszyka**, dodaj `[BASE] Pierś z kurczaka` `200 g` (w tej samej kategorii *Mięso i Ryby*).
  3. Kliknij „Przenieś do Listy Zakupów”, wybierz **„Dodaj do istniejącej listy”** → **`[BASE] Zakupy Spożywcze Tydzień`** i zatwierdź.
  4. *(Weryfikacja Push `LIST_ITEM_ADDED`)*: Przechwyć żądanie `POST /functions/v1/send-push-notification` podczas dodawania pozycji do istniejącej aktywnej listy.
- **Oczekiwany rezultat:**
  - Na liście `[BASE] Zakupy Spożywcze Tydzień` NIE powstaje drugi wiersz z kurczakiem — ilość aktualizuje się do **`700 g`** (`500 + 200`).
  - **Kluczowy warunek (`mergeDraftItems.ts`):** Flaga `is_checked` automatycznie resetuje się z `true` na **`false`**, a przekreślenie znika, aby kupujący w sklepie wiedział, że musi dokupić nową partię mięsa!
  - **Powiadomienie Push (`LIST_ITEM_ADDED`):** Wywołany zostaje `send-push-notification` z tytułem `🛒 Nowy produkt na liście`, nazwą produktu (lub formatem `<pierwszy> (+N)` dla wielu pozycji), `tag: "list-{listId}"` oraz `url: "/?tab=active&listId={listId}"` (i nie blokuje transferu nawet przy błędzie sieciowym Push).

---

#### `TC-ACT-03` — Sortowanie według własnego układu alejek (`ADR-006`) oraz wyszukiwarka i pasek postępu na Desktopie
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:active-lists` `@type:happy-path` `@type:rwd` `@state:BASE`
- **Warunki wstępne:** Lista `[BASE] Zakupy Spożywcze Tydzień` zawiera produkty z kategorii `[BASE] Suplementy i Odżywki` (ustawionej na pozycji 1 w Module 02), `Owoce i Warzywa`, `Mięso i Ryby` oraz `Spiżarnia i Sypkie`.
- **Kroki:**
  1. Otwórz widok `[BASE] Zakupy Spożywcze Tydzień` i zweryfikuj kolejność sekcji (alejek) od góry strony.
  2. `[Desktop >=1024px]`: W nagłówku karty listy sprawdź pasek postępu (`coveredCount / totalCount (progressPercent%)`) oraz wpisz frazę w polu wyszukiwania `Szukaj produktu...` (np. `"Oliwa"`, a następnie nieistniejącą frazę `"XYZ"`), po czym wyczyść filtr.
- **Oczekiwany rezultat:**
  - Sekcja **`1. [BASE] Suplementy i Odżywki`** renderuje się jako **pierwsza alejka na samej górze listy** (zgodnie z `custom_sort_order` z `TC-CAT-04`), przed sekcjami globalnymi.
  - Na Desktopie pole wyszukiwania natychmiast filtruje widoczne sekcje i pozycje na aktywnej liście bez przeładowania strony.

---

#### `TC-ACT-04` — Zakupy w sklepie: Optimistic UI, Haptics, edycja/usuwanie pozycji, `PantryConfirmModal` (`in_pantry` / `havePartial`) i wyzwalacz `LIST_COMPLETED`
- **Adnotacja:** `[Playwright: E2E]` + `[Manual-Only]` (wibracja fizyczna)
- **Tagi:** `@module:active-lists` `@type:happy-path` `@type:corner-case` `@state:TEMP`
- **Warunki wstępne:** Tymczasowa lista `[TEMP] Lista PantryCheck` (lub `[BASE] Dom i Chemia`).
- **Kroki:**
  1. Kliknij checkbox przy pozycji na liście:
     - Sprawdź natychmiastową zmianę wizualną (`line-through text-muted-foreground`),
     - Sprawdź, że pozycja **NIE przeskakuje** w dół listy ani między alejkami (stabilność listy pod palcem!),
     - `[Mobile PWA]`: zweryfikuj wywołanie `navigator.vibrate(50)`.
  2. Kliknij ikonę `Warehouse` przy pozycji posiadającej zapas w Spiżarni → w `PantryConfirmModal` (`context="active"`) wybierz **„Mam całość”** (`in_pantry = true`).
  3. **Cofnięcie statusu „W spiżarni” (`restoreToBuy`) oraz opcje „Mam częściowo” / „Nie mam produktu”:** Ponownie kliknij wiersz oznaczony odznaką „W spiżarni” → w `PantryConfirmModal` wybierz **„Przywróć do kupienia”** (`restoreToBuy`) → sprawdź powrót pozycji do aktywnego stanu (`in_pantry = false`) i zwiększenie licznika pozostałych zakupów. Przetestuj także wybór **„Mam częściowo”** (`havePartial` zmniejsza `total_quantity` na aktywnej liście o stan ze spiżarni) oraz **„Nie mam produktu”** (`dontHave`).
  4. **Edycja ilości inline oraz usuwanie pojedynczej pozycji z Aktywnej Listy (`ConfirmDeleteDialog`):**
     - Kliknij wartość ilości na nieodhaczonej pozycji, wpisz `999` i naciśnij `Escape` (anulowanie edycji bez zmiany ilości), następnie wpisz `50` i naciśnij `Enter` (zapis nowej ilości; upewnij się też, że dla pozycji z `is_checked = true` lub `in_pantry = true` edycja ilości i stepery `-`/`+` są `disabled`).
     - Zmniejsz ilość pozycji przyciskiem `-` do `0` (`newQty <= 0`) → otwiera się `ConfirmDeleteDialog` → kliknij **„Anuluj”** (pozycja zostaje na liście), a dla pozycji tymczasowej kliknij **„Usuń”**.
  5. Odhacz wszystkie pozostałe pozycje na liście, sprawdzając licznik postępu przy odhaczaniu **ostatniej brakującej pozycji** (gdy na liście wszystkie pozycje mają `is_checked = true` lub `in_pantry = true`).
- **Oczekiwany rezultat:**
  - Pozycja oznaczona jako `in_pantry = true` wyświetla specjalny styl i etykietę „W spiżarni” oraz odejmuje się z licznika pozycji pozostałych do kupienia; akcja **„Przywróć do kupienia”** natychmiast przywraca ją na zakupy (`restoredToList` Toast).
  - Zmniejszenie ilości poniżej minimum wywołuje `ConfirmDeleteDialog` (ochrona przed przypadkowym skasowaniem pozycji w sklepie).
  - Odhaczenie ostatniego brakującego produktu obniża licznik niekupionych do `0`, wyświetla baner **„Wszystkie produkty zebrane!”** i wyzwala powiadomienie **`LIST_COMPLETED`** (`notificationService.notify('LIST_COMPLETED', ...)`).

---

#### `TC-ACT-05` — Kolejka Offline (`offlineMutationQueue`) i Konflikt Współbieżności (`OCC updated_at`)
- **Adnotacja:** `[Playwright: Mock/Route]`
- **Tagi:** `@module:active-lists` `@type:corner-case` `@type:negative` `@state:TEMP`
- **Warunki wstępne:** Otwarta Aktywna Lista w trybie online.
- **Kroki:**
  1. **Tryb Offline w sklepie (piwnica / brak zasięgu):** Wywołaj `await context.setOffline(true)` w Playwright (lub wyłącz Wi-Fi/LTE manualnie).
  2. Odhacz pozycję na aktywnej liście i zmień ilość steperem (`+`).
  3. Zweryfikuj zawartość `localStorage` pod kluczem kolejki `offlineMutationQueue` oraz stan UI.
  4. Przywróć sieć (`await context.setOffline(false)`) i odczekaj na automatyczny flush kolejki.
  5. **Konflikt OCC (`shoppingItemConflict.ts` / HTTP `409`):** Zasymuluj konflikt `409` lub zdarzenie Realtime z innego urządzenia ze starszym/nowszym `updated_at`, w którym partner kupił pozycję (`is_checked = true`), podczas gdy lokalne opóźnione żądanie próbuje zapisać `is_checked = false`.
- **Oczekiwany rezultat:**
  - **Podczas Offline:** Odhaczone pozycje **NIE robią rollbacku** (zostają przekreślone!), w UI widać status `Offline`, a mutacje czekają w kolejce w `localStorage`.
  - **Po powrocie sieci:** Kolejka synchronizuje się z Supabase i opróżnia.
  - **Konflikt OCC:** Pozycja raz oznaczona jako kupiona (`is_checked = true`) przez któregokolwiek domownika **nigdy** nie jest samoczynnie odznaczana przez opóźnioną odpowiedź ze starszego stanu (`resolveShoppingItemConflict`).

---

#### `TC-ACT-06` — Archiwizacja Aktywnej Listy (`archive_shopping_list`) — 3 Niezmienniki Domenowe (`[BASE]`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:active-lists` `@type:happy-path` `@type:corner-case` `@state:BASE`
- **Warunki wstępne:** Utwórz z Koszyka dedykowaną listę do zamknięcia **`[BASE] Zakupy Weekendowe`** (zamiast niszczyć główną `[BASE] Zakupy Spożywcze Tydzień`, dzięki czemu zawsze masz aktywną listę bazową w zakładce!) zawierającą **3 pozycje**:
  1. `[BASE] Sól morska` (`100 g`) lub `[BASE] Ryż basmati` (`500 g`) — ustaw jako **kupione** (`is_checked = true`, `in_pantry = false`),
  2. `[BASE] Oliwa z oliwek Extra Virgin` — ilość: `100 ml`, ustaw jako **posiadane w spiżarni** (`is_checked = false`, `in_pantry = true` przez `PantryConfirmModal`),
  3. `[BASE] Pierś z kurczaka` — ilość: `300 g`, zostaw jako **niekupione** (`is_checked = false`, `in_pantry = false`).
- **Kroki:**
  1. Zapisz aktualny stan zapasów w Spiżarni przed archiwizacją.
  2. Kliknij **„Zakończ i Zarchiwizuj”** (`handleArchiveList` — wykonuje atomowe RPC `archive_shopping_list` bezpośrednio i automatycznie zwraca niekupione pozycje do Koszyka Roboczego).
  3. Sprawdź kolejno: **Spiżarnię**, **Koszyk Roboczy** oraz **Historię**.
  4. *(Weryfikacja Push `LIST_CLEARED_OR_ARCHIVED`)*: Przechwyć wywołanie `POST /functions/v1/send-push-notification` podczas archiwizacji listy (wariant `archived`) oraz przy usuwaniu/czyszczeniu aktywnej listy (wariant `cleared`).
- **Oczekiwany rezultat (Weryfikacja 3 niezmienników domenowych):**
  1. **Auto-zasilanie Spiżarni:** Kupiona pozycja (`is_checked = true, in_pantry = false`) automatycznie powiększa stan w Spiżarni i ustawia `last_purchased_at` na dzisiaj!
  2. **Brak dublowania `in_pantry`:** `[BASE] Oliwa z oliwek Extra Virgin` (`in_pantry = true`) **NIE zwiększa** stanu w Spiżarni (zostaje dokładnie `500 ml`).
  3. **Zwrot niekupionych do Koszyka:** `[BASE] Pierś z kurczaka` (`300 g`) wraca automatycznie do Koszyka Roboczego przez `addMultipleToDraft`, **zachowując przypisaną na liście kategorię** oraz `meal_plan_item_id`!
  4. Lista `[BASE] Zakupy Weekendowe` znika z Aktywnych List i pojawia się w **Historii** ze statusem `archived` i wypełnionym `completed_at`.
  5. **Powiadomienie Push (`LIST_CLEARED_OR_ARCHIVED`):** Wyzwalane z tytułem `📦 Zaktualizowano listę`, odpowiednim komunikatem `bodyArchived` (lub `bodyCleared`), `tag: "list-{listId}"` i `url: "/?tab=history"`.

---

#### `TC-ACT-07` — Tworzenie pustej listy, zmiana nazwy, ustawienie jako Domyślna, usuwanie listy `[TEMP]` i walidacja nazwy
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:active-lists` `@type:happy-path` `@type:negative` `@state:TEMP`
- **Kroki:**
  1. Kliknij **„Nowa Lista”** (`CreateActiveListDialog`) → spróbuj zatwierdzić pustą nazwę (lub >150 znaków) → następnie utwórz pustą listę `[TEMP] Lista Robocza`.
  2. Zweryfikuj stan pusty `activeList.emptyTitle`.
  3. Zmień nazwę listy przez `RenameActiveListDialog` na `[TEMP] Lista Robocza Zmieniona`.
  4. Kliknij **„Usuń Listę”** → w `ConfirmDeleteDialog` najpierw kliknij „Anuluj”, a następnie potwierdź „Usuń”.
- **Oczekiwany rezultat:** Walidacja blokuje puste nazwy; lista `[TEMP]` zostaje trwale usunięta z `shopping_lists`, a widok automatycznie przełącza się na domyślną `[BASE] Zakupy Spożywcze Tydzień`.

---

#### `TC-ACT-08` — Synchronizacja Realtime WebSockets między 2 kartami (`pageA ↔ pageB`) i odporność na echo lokalnych mutacji (`trackLocalItemMutation`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:active-lists` `@type:happy-path` `@type:corner-case` `@state:TEMP`
- **Warunki wstępne:** Utworzona lista `[TEMP] Lista Realtime` z pozycją `[BASE] Sól morska` (`100 g`).
- **Kroki:**
  1. Otwórz w tym samym kontekście sesji drugą kartę przeglądarki (`const pageB = await context.newPage()`) na adresie `/?tab=active` i wybierz listę `[TEMP] Lista Realtime`.
  2. Na Karcie A (`page`) kliknij szybko dwukrotnie przycisk zwiększania ilości (`+` `+`) i sprawdź, że `localMutationTracker` (`trackLocalItemMutation`) chroni UI przed cofnięciem licznika przez opóźnione echo pierwszego żądania.
  3. Odhacz pozycję na Karcie A (`is_checked = true`), zamknij Kartę B i usuń listę `[TEMP] Lista Realtime`.
- **Oczekiwany rezultat:** Obie karty widzą spójny stan listy w ramach gospodarstwa, a szybkie serie kliknięć stepera nie powodują migotania ani cofania wartości.

---

### Moduł 08: Historia Zakupów i Retencja Archiwum (`@module:history`)

**Cel modułu:** Weryfikacja sortowania historii malejąco po dacie zakończenia, 3 wariantów odznaki `HistoryStatusBadge`, śledzenia `original_name` po zmianie nazwy, przywracania pozycji do Koszyka z zachowaniem nadpisanych kategorii, odporności na usunięty produkt z katalogu (`product = null`) oraz paginacji powyżej 30 wpisów.

---

#### `TC-HIST-01` — Przegląd Historii, kolejność sortowania po `completed_at` i 3 stany `HistoryStatusBadge`
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:history` `@type:happy-path` `@state:BASE`
- **Warunki wstępne:** W Historii znajduje się co najmniej lista `[BASE] Zakupy Weekendowe` z `TC-ACT-06`.
- **Kroki:**
  1. Przejdź do zakładki **Historia** (`HistoryView` / `DesktopHistoryView`).
  2. Sprawdź kolejność zarchiwizowanych list, sformatowaną datę i godzinę zakończenia (`completed_at`) oraz odznakę statusu realizacji `<HistoryStatusBadge />`.
- **Oczekiwany rezultat:**
  - Najnowsza zarchiwizowana lista znajduje się na samej górze (sortowanie malejąco po `completed_at`).
  - Odznaka `<HistoryStatusBadge />` prezentuje właściwy z 3 stanów (`calculateHistoryListStatus`):
    - **100% kupionych (`checked === total && total > 0`)**: zielona odznaka **`Zrealizowano`**,
    - **Częściowo kupione (`0 < checked < total`)**: żółto-pomarańczowa odznaka **`Zrealizowano (X/Y)`**,
    - **0 kupionych (`checked === 0`)**: czerwona odznaka **`Niezrealizowano`**.

---

#### `TC-HIST-02` — Szczegóły zarchiwizowanej listy, edycja nazwy i śledzenie `original_name`
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:history` `@type:happy-path` `@type:corner-case` `@state:BASE`
- **Warunki wstępne:** Zarchiwizowana lista `[BASE] Zakupy Weekendowe` (nazwa niezmieniana od momentu zamknięcia).
- **Kroki:**
  1. Otwórz szczegóły listy `[BASE] Zakupy Weekendowe` (`HistoryListDetailsSheet` na Mobile / prawy panel split-pane w `DesktopHistoryView` na Desktopie).
  2. Przed edycją sprawdź metadane:
     - Widoczne są **obie daty**: `Zakończono` (`completed_at`) oraz `Utworzono` (`created_at`).
     - Pod tytułem **NIE** wyświetla się linijka „Oryginalna nazwa” (ponieważ `name === original_name`).
  3. Kliknij ikonę edycji nazwy, zmień nazwę na **`[BASE] Archiwum: Weekendowe zakupy spożywcze`** i zatwierdź `Enter`.
  4. Sprawdź kartę tej listy na głównym widoku **Historia**.
- **Oczekiwany rezultat:**
  - Zarówno w szczegółach, jak i na karcie w głównej liście Historii pod nowym tytułem pojawia się linijka z oryginalną nazwą z momentu archiwizacji (`[BASE] Zakupy Weekendowe`) zapisana drobną czcionką (`text-xs text-muted-foreground font-mono`).
  - Próba zapisu samej spacji jako nazwy jest blokowana/ignorowana.

---

#### `TC-HIST-03` — Przywracanie pozycji z Historii do Koszyka z zachowaniem kategorii i układ 50/50 paska akcji
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:history` `@type:happy-path` `@type:rwd` `@state:TEMP`
- **Warunki wstępne:** Otwarte szczegóły listy w Historii.
- **Kroki:**
  1. Sprawdź pasek przycisków na dole szczegółów (zarówno `[Desktop >=1024px]`, jak i `[Mobile PWA 360px]`): przyciski **„Dodaj do koszyka”** oraz czerwony **„Usuń listę”** muszą dzielić szerokość po 50% (`grid-cols-2` / `w-1/2`).
  2. Kliknij pojedynczy przycisk `+` przy jednej pozycji albo kliknij **„Dodaj do koszyka”** (wszystkie pozycje).
  3. Przejdź do **Koszyka Roboczego** i sprawdź przywróconą pozycję (czy zachowała kategorię wybraną na liście, a nie domyślną z katalogu), po czym wyczyść Koszyk Roboczy.
- **Oczekiwany rezultat:**
  - Przywrócone pozycje trafiają do Koszyka z zachowaniem przypisanej na liście kategorii, a pasek akcji na dole jest idealnie symetryczny 50/50.

---

#### `TC-HIST-04` — Paginacja historii powyżej 30 wpisów (`MED-14`), odporność na usunięty produkt (`product: null`) i usuwanie wpisu z Historii
- **Adnotacja:** `[Playwright: Mock/Route]` + `[Playwright: E2E]`
- **Tagi:** `@module:history` `@type:corner-case` `@type:negative` `@state:TEMP`
- **Kroki:**
  1. `[Playwright: Mock/Route]`: Zamockuj odpowiedź `shopping_lists?status=eq.archived` zwracającą `31` zarchiwizowanych list (w tym listy ze statusem pełnym, częściowym i niezrealizowanym oraz pozycję z `product: null, ad_hoc_name: '[TEMP] Produkt Usunięty Z Katalogu'` po `ON DELETE SET NULL`). Sprawdź pojawienie się przycisku **„Pokaż starsze listy”** (`history.loadMore`) oraz poprawne wyrenderowanie szczegółów pozycji z `product: null` bez błędu runtime.
  2. `[Playwright: E2E]`: W szczegółach zarchiwizowanej listy kliknij czerwony przycisk **„Usuń listę”** → w `ConfirmDeleteDialog` kliknij „Anuluj” (lista pozostaje), lub na liście `[TEMP]` potwierdź „Usuń”.
- **Oczekiwany rezultat:**
  - Przy `> 30` wynikach pojawia się przycisk ładowania kolejnych stron; pozycje po usuniętych produktach katalogowych bezpiecznie wyświetlają `ad_hoc_name` / fallback.
  - Szybkie przełączanie między kartami w `DesktopHistoryView` jest chronione przez `latestDetailRequestRef` przed wyścigiem zapytań, a usunięcie listy wymaga potwierdzenia w `ConfirmDeleteDialog`.

---

### Moduł 09: Kalendarz Posiłków, Pipeline Statusów i Szablony Tygodniowe ADR-009 (`@module:calendar-templates`)

**Cel modułu:** Finał ścieżki użytkownika — planowanie posiłków w 3 perspektywach czasowych (Miesiąc / Tydzień / Dzień), weryfikacja kumulatywnej rezerwacji Spiżarni, skalowania przez `target_kcal` (`getEffectiveMultiplier`) i cyklu statusów (`Zaplanowane → W koszyku → Na liście → Kupione`), obsługa alarmu brakujących składników (`⚠️` `UncertaintyWarningModal`), blokada historycznych dat oraz tworzenie i aplikowanie **presaved Szablonów Tygodniowych** ze skalowaniem porcji `0.5x–4x`.

---

#### `TC-CAL-01` — Nawigacja po 3 perspektywach Kalendarza i tryb Pn–Pt vs Pn–Nd
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:calendar-templates` `@type:happy-path` `@type:rwd` `@state:BASE`
- **Warunki wstępne:** Zakładka **Kalendarz** w `Household_Test`.
- **Kroki:**
  1. Przełączaj segmenty widoku: **Miesiąc** (`MonthCalendarGrid`) → **Tydzień** (`WeekCalendarView`) → **Dzień** (`DayCalendarView`).
  2. W widoku **Tydzień** przełącz między **„Roboczy (Pn-Pt)”** (`5` kolumn/dni) a **„Pełny (Pn-Nd)”** (`7` kolumn/dni).
  3. W widoku **Miesiąc** kliknij wybrany dzień w siatce i sprawdź przejście do **Widoku Dnia**.
  4. Przejdź strzałkami nawigacji na **przyszły tydzień** (od poniedziałku za 7 dni) oraz kliknij przycisk **„Dziś”**.
- **Oczekiwany rezultat:**
  - Widok Tygodnia dynamicznie pokazuje `5` lub `7` dni; kliknięcie dnia w Miesiącu otwiera Widok Dnia z wybraną datą; przełączenie do kolejnego miesiąca/tygodnia automatycznie dociąga okno ±7 dni (`getCalendarFetchWindow`) bez przeładowania strony.

---

#### `TC-CAL-02` — Planowanie posiłków z Książki Kucharskiej, dań Ad-Hoc i duplikowanie (`[BASE]`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:calendar-templates` `@type:happy-path` `@state:BASE`
- **Warunki wstępne:** Ustaw w Kalendarzu widok **bieżącego lub przyszłego tygodnia** (daty przyszłe od poniedziałku `T+7 dni`, aby wszystkie dni były edytowalne i nie podlegały blokadzie archiwalnej!).
- **Kroki:**
  1. Kliknij **„Dodaj posiłek”** (`AddCalendarMealDialog`) na **Poniedziałek** przyszłego tygodnia:
     - Wybierz z Książki Kucharskiej: **`[BASE] Szejk Białkowy Po Treningu`**, pora posiłku: **`Śniadanie`**, porcje: `1`, notatka: `Po porannym cardio`.
  2. Na ten sam **Poniedziałek** dodaj obiad z Książki Kucharskiej: **`[BASE] Kurczak Teriyaki z ryżem i awokado`**, pora posiłku: **`Obiad`**, porcje: `1`, docelowe kalorie: `813`.
  3. Na **Poniedziałek** dodaj również szybkie danie **Ad-Hoc** (`is_ad_hoc = true`): nazwa **`[BASE] Kolacja na mieście (Pizza)`**, pora: **`Kolacja`**, `target_kcal = 950`.
  4. Na karcie śniadania `[BASE] Szejk Białkowy Po Treningu` kliknij ikonę **„Kopiuj na jutro”** (`duplicateNextDay`), aby skopiować je na **Wtorek**.
  5. Zaplanuj `[BASE] Omlet z płatkami owsianymi` na **Środę**, **Czwartek** i **Piątek**, oraz `[BASE] Kurczak Teriyaki z ryżem i awokado` na **Wtorek** i **Środę** (potrzebne do testu kumulatywnego zapasu awokado w `TC-CAL-03` i szablonu w `TC-CAL-06`).
  6. **Edycja, gotowanie z karty dnia i usuwanie posiłku `[TEMP]`:** W **Widoku Dnia** sprawdź pigułki składników na karcie `DayMealPlanCard` (składniki obecne w Spiżarni podświetlone na zielono z ikoną `Warehouse`), kliknij akcję **„Ugotowano”** bezpośrednio z karty dnia (`CookMealDeductModal`), następnie edytuj tymczasowy posiłek (`AddCalendarMealDialog` w trybie edycji) i usuń go przez `ConfirmDeleteDialog`.
- **Oczekiwany rezultat:**
  - W **Widoku Dnia** posiłki są zgrupowane w czytelne sekcje poranne/popołudniowe (`Śniadanie`, `Obiad`, `Kolacja`) z odznakami kategorii.
  - Pasek `CalendarMacroBar` poprawnie sumuje kalorie i B/W/T ze wszystkich posiłków dnia (zarówno z przepisów z bazy, jak i z wpisów Ad-Hoc `950 kcal`).
  - Przycisk „Kopiuj na jutro” tworzy identyczny wpis w dniu następnym (`+1 dzień`), a akcja **„Ugotowano”** z kalendarza zdejmuje ze Spiżarni ilości przeskalowane według porcji/kalorii zaplanowanego posiłku.

---

#### `TC-CAL-03` — Pipeline Statusów, Skalowanie `target_kcal` (`getEffectiveMultiplier`) i Kumulatywna Rezerwacja Spiżarni (`MED-16`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:calendar-templates` `@type:happy-path` `@type:corner-case` `@state:TEMP`
- **Warunki wstępne:**
  - W Spiżarni znajdują się łącznie `3 pcs` `[BASE] Awokado` (`2` Hass + `1` Fuerte), `500 ml` oliwy, `200 g` soli.
  - W zaplanowanym tygodniu znajduje się `[BASE] Kurczak Teriyaki z ryżem i awokado` (wymagający `0.5 pcs` awokado i `200 g` kurczaka na każde wystąpienie).
- **Kroki:**
  1. Sprawdź początkowe statusy zaplanowanych posiłków w Kalendarzu (**`Zaplanowane`** — gdy brakuje składnika na liście i w spiżarni).
  2. **Wszystkie 3 poziomy transferu do Koszyka (`Meal` / `Day` / `Week`) oraz skalowanie przez `target_kcal`:**
     - Przetestuj pojedynczy transfer na karcie posiłku (**„Dodaj do koszyka”** — Toast `transferredToDraftSuccess`),
     - Przetestuj transfer całego dnia w Widoku Dnia (**„Wyślij dzień do koszyka”** — Toast `dayTransferredToDraftSuccess`),
     - Przetestuj zbiorczy transfer w Widoku Tygodnia (**„Tydzień do koszyka”** — `transferWeekToDraft` → jeden Toast `weekTransferredToDraftSuccess`).
     - *(Corner Case `target_kcal !== baseKcal`)*: Gdy zaplanowany posiłek ma ustawione `target_kcal = 1625` (czyli `2.0x` bazowych `812.6 kcal`), `getEffectiveMultiplier` mnoży ilości składników eksportowanych do Koszyka przez `target_kcal / baseKcal` (`2.0x`).
     - *(Corner Case 100% w Spiżarni)*: Dla posiłku, którego wszystkie składniki mają pokrycie w Spiżarni, kliknij „Dodaj do koszyka” → sprawdź komunikat `noIngredientsToTransfer` i brak pustych wpisów w Koszyku.
  3. Sprawdź zawartość **Koszyka Roboczego** i statusy w **Kalendarzu** (powinny zmienić się na **`W koszyku`**!).
  4. Przenieś wygenerowane pozycje z Koszyka na **Aktywną Listę** (np. `[BASE] Zakupy Spożywcze Tydzień`) → sprawdź status w Kalendarzu (**`Na liście`**).
  5. Odhacz wszystkie składniki jednego z posiłków na Aktywnej Liście → sprawdź status tego posiłku w Kalendarzu (**`Kupione`**).
- **Oczekiwany rezultat:**
  - **Kumulatywna rezerwacja spiżarni (`MED-16`):** Jeśli suma wymaganego składnika w tygodniu (np. `400 ml` oliwy z oliwek lub `3.5 pcs` awokado) mieści się lub częściowo przekracza zapas w Spiżarni (`500 ml` oliwy, `3 pcs` awokado), `transferWeekToDraft` **NIE dubluje zapasów** dla kolejnych dni — rezerwuje spiżarnię kumulatywnie i wysyła do Koszyka wyłącznie brakującą różnicę (`0.5 pcs` awokado oraz `0 ml` oliwy!), zachowując przy tym `meal_plan_item_id` i wyświetlając **jeden** zbiorczy Toast!
  - Kropki na `MonthCalendarGrid` i odznaki `MealPlanStatusBadge` zmieniają kolory płynnie wraz z cyklem: `Zaplanowane` → `W koszyku` → `Na liście` → `Kupione`.

---

#### `TC-CAL-04` — Wykrywanie Niepewności (`⚠️` `UncertaintyWarningModal`, `MED-03`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:calendar-templates` `@type:happy-path` `@type:corner-case` `@state:TEMP`
- **Warunki wstępne:** Zaplanowany posiłek z Książki Kucharskiej w przyszłości, którego składnik (`[BASE] Pierś z kurczaka` powiązany przez `meal_plan_item_id`) znajduje się obecnie w Koszyku Roboczym lub na Aktywnej Liście.
- **Kroki:**
  1. Przejdź do **Koszyka** (lub Aktywnej Listy) i **usuń ręcznie** pozycję `[BASE] Pierś z kurczaka` przypisaną do tego zaplanowanego dnia (lub zmniejsz jej ilość znacznie poniżej wymaganej).
  2. Wróć do **Kalendarza**.
  3. Zlokalizuj żółto-czerwoną ikonę ostrzeżenia **`⚠️` (`Niepewne (Braki)`)** na karcie posiłku i kliknij ją, aby otworzyć `UncertaintyWarningModal`.
  4. **Scenariusz A (Przywrócenie):** W modalu kliknij **„Przywróć do koszyka”** (`restoreOne` lub `restoreAll`) → sprawdź powrót składnika do Koszyka i zniknięcie `⚠️`.
  5. **Scenariusz B (Wyciszenie):** Ponownie usuń składnik tymczasowego posiłku z Koszyka, otwórz `UncertaintyWarningModal` i kliknij **„Zrozumiałem / Ignoruj brak”** (`is_uncertainty_dismissed = true`).
- **Oczekiwany rezultat:**
  - Modal wskazuje dokładnie nazwę brakującego składnika i brakującą ilość.
  - Po przywróceniu składnika alert `⚠️` znika automatycznie; po kliknięciu „Ignoruj brak” zapisuje się `is_uncertainty_dismissed = true` i alarm nie pojawia się ponownie dla tego konkretnego planu posiłku.

---

#### `TC-CAL-05` — Tryb Archiwalny dla dat przeszłych (`isPastDate` Read-Only)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:calendar-templates` `@type:negative` `@type:security` `@state:READONLY`
- **Warunki wstępne:** Widok **Kalendarza**.
- **Kroki:**
  1. Przejdź w widoku Miesiąca lub Dnia do **wczorajszego dnia** (albo daty sprzed miesiąca).
  2. Sprawdź widoczny baner informacyjny oraz dostępne przyciski na widoku dnia i kartach posiłków.
- **Oczekiwany rezultat:**
  - Wyświetla się baner **`Archiwum (Tylko do odczytu)`** (`calendar.pastArchive` / `calendar.archiveNotice`).
  - **Jak NIE powinna się zachować:** Na dacie przeszłej **NIE MOGĄ** być aktywne akcje dodawania nowych posiłków, edycji porcji ani usuwania przeszłych posiłków.

---

#### `TC-CAL-06` — Finał Ścieżki: Presaved Szablony Tygodniowe (`WeeklyTemplatesModal`, `MED-17`) (`[BASE]`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:calendar-templates` `@type:happy-path` `@state:BASE`
- **Warunki wstępne:** Zaplanowany przyszły tydzień z posiłkami z `TC-CAL-02` (obejmujący Pn–Pt lub Pn–Nd).
- **Kroki:**
  1. W widoku **Tydzień** (w trybie **„Roboczy (Pn-Pt)”**) kliknij przycisk **„Szablony”** (`WeeklyTemplatesModal`).
  2. Wpisz nazwę **`[BASE] Szablon Tygodnia Roboczego (Pn-Pt)`** i kliknij **„Zapisz szablon”**.
  3. Przełącz widok na **„Pełny (Pn-Nd)”** (upewniając się, że w Sobocie lub Niedzieli też jest co najmniej 1 zaplanowany posiłek, np. `[BASE] Szejk Białkowy Po Treningu`), otwórz **„Szablony”** i zapisz drugi szablon: **`[BASE] Pełny Szablon Treningowy (Pn-Nd)`**.
  4. Przejdź w Kalendarzu na **kolejny, pusty tydzień (`T+14 dni`)**.
  5. Otwórz `WeeklyTemplatesModal`, w sekcji *„Skalowanie porcji dla domowników przy aplikowaniu”* kliknij mnożnik **`1.5x`** (przetestuj także klikalność presetów `0.5x`, `1x`, `2x`, `3x`, `4x`).
  6. Przy szablonie `[BASE] Pełny Szablon Treningowy (Pn-Nd)` kliknij **„Zastosuj”**.
  7. Po zamknięciu modala sprawdź wygenerowane posiłki w tygodniu `T+14 dni`, a na końcu kliknij **„Tydzień do koszyka”** (`transferWeekToDraft`).
  8. Odśwież stronę (`F5`) i sprawdź, czy zapisane szablony nadal są widoczne (synchronizacja z tabelą `weekly_meal_templates` w Supabase, a nie tylko `localStorage`!).
- **Oczekiwany rezultat:**
  - Oba szablony zapisują się w tabeli `weekly_meal_templates` dla `Household_Test` z poprawną liczbą posiłków i dni (`templateMeta`).
  - Zastosowanie szablonu z mnożnikiem `1.5x` wywołuje wsadowe `createMealPlansBatch` (zero pętli N+1!), tworząc wszystkie posiłki w nowym tygodniu ze skalą porcji `1.5x` (np. `1` → `1.5` porcji, `813 kcal` → `1219 kcal`).
  - Ponowne kliknięcie „Zastosuj” dla tego samego szablonu na ten sam tydzień (`skipDuplicates: true`) nie dubluje już istniejących posiłków i wyświetla komunikat `nothingToApplyNotice`.

---

#### `TC-CAL-07` — Walidacja i usuwanie Szablonu Tygodniowego `[TEMP]`
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:calendar-templates` `@type:negative` `@type:corner-case` `@state:TEMP`
- **Kroki:**
  1. Przejdź na zupełnie **pusty przyszły tydzień (`T+28 dni`)** i otwórz `WeeklyTemplatesModal`.
  2. Spróbuj zapisać szablon z pustego tygodnia (sprawdź stan przycisku „Zapisz szablon” oraz komunikat `calendar.templates.emptyWeekHint`).
  3. Wróć do zaplanowanego tygodnia, spróbuj zapisać szablon z samymi spacjami lub z nazwą `>120` znaków (`CHECK (char_length <= 120)`).
  4. Zapisz tymczasowy szablon `[TEMP] Szablon Do Usunięcia`, po czym kliknij przy nim ikonę kosza i potwierdź usunięcie.
- **Oczekiwany rezultat:**
  - Nie da się zapisać szablonu z pustego tygodnia ani z pustą / zbyt długą nazwą.
  - Usunięty szablon `[TEMP]` znika z UI i z bazy `weekly_meal_templates`, pozostawiając oba szablony `[BASE]` nienaruszone.

---

### Moduł 10: Przekrojowe Testy Lokalizacji (i18n `PL`/`EN`), Motywów (WCAG) i Bezpieczeństwa (RLS) (`@module:cross-cutting`)

**Cel modułu:** Kompleksowy audyt gotowego, w pełni zapełnionego danymi `Household_Test` pod kątem tłumaczeń `PL`/`EN` (w tym pluralizacji `Intl.PluralRules`), kontrastu wszystkich 6 motywów w 3 rozdzielczościach RWD oraz odporności na ataki wstrzyknięcia i wycieki między domostwami (Multi-Tenant RLS).

---

#### `TC-I18N-01` — Pełny audyt językowy `PL` vs `EN` na wypełnionym `Household_Test`
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:cross-cutting` `@type:i18n` `@state:READONLY`
- **Warunki wstępne:** Ukończone Moduły 01–09 w `Household_Test`.
- **Kroki:**
  1. Przełącz aplikację na język **`EN` (`English`)**.
  2. Odwiedź kolejno wszystkie 7 widoków głównych oraz główne modale (`AddMealSheet`, `ProductFormSheet`, `PantryConfirmModal`, `WeeklyTemplatesModal`, `HistoryListDetailsSheet`).
  3. Przetestuj **reguły pluralizacji `Intl.PluralRules`** na licznikach aktywnej listy (`activeList.itemsLeft` / `totalCount`):
     - `PL`: `1` (*Został 1 produkt*), `2–4` (*Zostały 2 produkty*), `5+` (*Zostało 5 produktów*).
     - `EN`: `1` (*1 item left*), `2+` (*2 items left*).
  4. Sprawdź tłumaczenia jednostek (`szt.` vs `pcs`), miar kuchennych (`szkl.` vs `cup`), kategorii systemowych (`Nabiał i Jaja` vs `Dairy & Eggs`), kategorii posiłków (`Śniadanie` vs `Breakfast`), świeżości spiżarni oraz statusów kalendarza (`Zaplanowane` vs `Scheduled`).
  5. Upewnij się przez asercję regex w Playwright, że żaden element widocznego tekstu nie zawiera surowego klucza z kropkami (np. `calendar.status.planned` lub `categories.undefined`).
  6. Przywróć język **`PL`**.
- **Oczekiwany rezultat:** Zero surowych kluczy i18n, zero mieszanych tekstów polsko-angielskich dla etykiet systemowych, poprawne formy liczby pojedynczej/mnogiej w obu językach.

---

#### `TC-THEME-01` — Audyt wszystkich 6 motywów na 3 progach RWD (`1440px` / `768px` / `360px`)
- **Adnotacja:** `[Playwright: E2E]`
- **Tagi:** `@module:cross-cutting` `@type:rwd` `@state:READONLY`
- **Warunki wstępne:** Zapełnione widoki `Household_Test` (Koszyk, Aktywna Lista z przekreślonymi pozycjami, Spiżarnia z badge’ami terminów, Kalendarz z kolorowymi statusami).
- **Kroki:**
  1. Dla każdego z 3 rozmiarów viewportu: `1440x900` (Desktop), `768x1024` (Tablet) i `360x800` (Mobile PWA):
     - Przełącz motyw na **`clean-light`** (najbardziej podatny na błędy kontrastu!) oraz sprawdź ciemne motywy **`oled-black`**, **`midnight-blue`**, **`forest-sage`**, **`warm-amber`**, **`cyberpunk-violet`**.
     - Sprawdź brak poziomego przewijania (`document.documentElement.scrollWidth <= window.innerWidth`).
     - Sprawdź widoczność każdego tekstu na kartach, w inputach, badge’ach (`Global`, `W spiżarni`, `Kończy się termin`, `Niepewne`) oraz przyciskach `44x44px`.
     - Sprawdź pojedynczy `<h1>` na aktywnym widoku.
  2. Przywróć motyw domyślny `oled-black`.
- **Oczekiwany rezultat:**
  - W `clean-light` **NIE występują** białe napisy na białym tle ani czarne kontenery z zahardkodowanych klas (`bg-black`, `text-zinc-*`) — wszystkie kolory reagują na semantyczne tokeny CSS.
  - Zero uciętych kart lub poziomego scrolla na żadnym z 3 progów RWD.

---

#### `TC-SEC-01` — Izolacja Multi-Tenant RLS, Cross-Row FK oraz ochrona przed PostgREST Injection
- **Adnotacja:** `[Playwright: Mock/Route]` + `[Playwright: E2E]`
- **Tagi:** `@module:cross-cutting` `@type:security` `@type:negative` `@state:READONLY`
- **Kroki:**
  1. **PostgREST `.or()` Filter Injection (`isUuid()`):** Wpisz w polach wyszukiwania produktów, przepisów i historii złośliwe ciągi znaków: `%,id.neq.00000000-0000-0000-0000-000000000000`, `' OR 1=1 --`, `<script>alert(1)</script>`.
  2. **Cross-Tenant Isolation (RLS):** Przełączając się między `Household_Test` a `Household_Test_Manual` sprawdź, że własne produkty (`[BASE] ...`), własne kategorie, spiżarnia, listy aktywne i kalendarz z jednego domostwa **nigdy** nie przenikają do drugiego domostwa!
  3. **Odmowa dostępu do obcego `household_id`:** Za pomocą żądania fetch w kontekście przeglądarki (z tokenem sesji użytkownika) spróbuj odpytać/zmodyfikować losowy obcy `household_id = '99999999-9999-4999-8999-999999999999'` w tabelach `products`, `shopping_lists`, `pantry_items`, `meal_plans`, `weekly_meal_templates` lub wywołać RPC `archive_shopping_list` z obcym `p_household_id`.
  4. **Ochrona Edge Function `send-push-notification` (`CRIT-03`):** Wyślij z tokenem zalogowanego użytkownika bezpośrednie żądanie `POST /functions/v1/send-push-notification` podając obcy `householdId = '99999999-9999-4999-8999-999999999999'` lub zewnętrzny adres `url: "https://evil.example"` (zamiast ścieżki względnej `/...`).
- **Oczekiwany rezultat:**
  - Wyszukiwarki traktują ciągi specjalne bezpiecznie jako literały tekstowe (`0` lub pasujące wyniki, zero błędów składniowych PostgREST `400`, zero wykonania skryptu XSS).
  - Dane obu domostw są w 100% odseparowane (zarówno w UI, jak i w pamięci `localStorage` dla `weekly_meal_templates` i `draftItems`).
  - Próba dostępu lub mutacji na cudzym `household_id` zwraca `0` wierszy lub błąd odmowy uprawnień (`403` / `42501` RLS) — **nigdy** nie ujawnia ani nie modyfikuje cudzych danych.
  - Wywołanie `send-push-notification` z obcym `householdId` zwraca **`403 Forbidden`** (`"Forbidden: You are not a member of this household"`), a niepoprawny `url` (np. zewnętrzny `https://...`) jest odrzucany kodem **`400 Bad Request`**.

---

## Część III: Cykl Życia, Utrzymanie po Zmianach i Lista Kontrolna Wdrożenia

### 3.1 Scenariusz A: Pierwsze uruchomienie (Bootstrap dwóch domostw)
1. **Automatyzacja (`Household_Test`):**
   - Wygeneruj jednorazowo plik sesji `e2e/.auth/user.json` (Sekcja 1.4).
   - Uruchom sekwencyjnie testy oznaczone `@state:BASE` (od Modułu 01 do Modułu 09). W efekcie w Twojej bazie powstanie kompletne, długożyjące domostwo `Household_Test` wypełnione kanonicznym zestawem danych `[BASE]`.
2. **Przebieg Manualny (`Household_Test_Manual`):**
   - Zaloguj się w przeglądarce (lub telefonie PWA) na to samo konto Google.
   - Przejdź ręcznie przez Moduły 01–10 tworząc `Household_Test_Manual`, odhaczając przy okazji punkty oznaczone `[Manual]` (fizyczne wibracje na telefonie, Web Push na ekranie blokady, wygodę strefy kciuka jedną ręką).
   - Od tej chwili możesz w każdej chwili w `HouseholdsDialog` porównać wygląd i dane między `Household_Test` (Playwright) a `Household_Test_Manual` (Twoim domostwem).

### 3.2 Scenariusz B: Praca codzienna po zmianach w kodzie (Selektywna Regresja)
Gdy modyfikujesz kod tylko w konkretnym obszarze aplikacji, **nie uruchamiasz wszystkich testów od zera**. Korzystasz z mapowania zmian na tagi modułowe:

| Zmieniony obszar w kodzie (`src/`) | Moduły do uruchomienia w Playwright |
| :--- | :--- |
| `HouseholdsDialog`, `AccountDetailsDialog`, `auth`, `ThemeSelector` | `--grep "@module:setup-household"` |
| `CategoryManager*`, `categorySorting.ts`, `useCategoryStore` | `--grep "@module:categories-empty-states\|@module:active-lists"` |
| `ProductFormSheet`, `ProductsView`, `ProductAutocomplete`, `ADR-010` | `--grep "@module:products\|@module:cookbook"` |
| `AddMealSheet`, `MealDetailsSheet`, `JsonRecipeImportDialog`, `kitchenUnits.ts` | `--grep "@module:cookbook"` |
| `PantryView`, `PantryConfirmModal`, `CookMealDeductModal`, `pantryCalculations.ts` | `--grep "@module:pantry\|@module:draft"` |
| `DraftView`, `mergeDraftItems.ts`, `TransferToActiveList*` | `--grep "@module:draft\|@module:active-lists"` |
| `ActiveListView`, `shoppingListTransfer.ts`, `shoppingListArchive.ts`, `offlineMutationQueue` | `--grep "@module:active-lists\|@module:history"` |
| `HistoryView`, `HistoryListDetailsSheet` | `--grep "@module:history"` |
| `CalendarView`, `WeeklyTemplatesModal`, `calendarStatus.ts`, `weeklyTemplateCalculations.ts` | `--grep "@module:calendar-templates"` |
| `src/i18n/`, `src/theme/`, migracje SQL RLS (`supabase/migrations/`) | `--grep "@module:cross-cutting"` + `npm run test` |

### 3.3 Bramki Jakości Towarzyszące Testom Playwright
Przed każdym mergem / wydaniem połącz testy Playwright z weryfikacją statyczną i testami jednostkowymi Vitest:
```bash
npm run lint && npx tsc -b && npm run test
```
gdzie `npm run test` weryfikuje m.in.:
- `src/lib/__tests__/rlsSecurityAudit.test.ts` (audyt bezpieczeństwa zapytań),
- `src/theme/__tests__/wcagContrast.test.ts` (kontrast WCAG 2.1 AA we wszystkich 6 motywach),
- `src/i18n/__tests__/i18n.test.ts` (symetria kluczy `pl.ts` ↔ `en.ts`),
- `src/store/__tests__/zustandSelectors.test.tsx` (stabilność selektorów `useShallow`).

### 3.4 Macierz Pokrycia Endpointów Backendu (`1:1 Endpoint-to-Test Traceability Matrix`)

Każdy endpoint wywoływany w warstwie `src/services/` posiada bezpośrednie odzwierciedlenie zarówno w niniejszej specyfikacji (`TC-...`), jak i w automatycznych testach Playwright (`e2e/01-*.spec.ts` .. `e2e/10-*.spec.ts`):

| Zasób / Tabela / RPC / Edge Function | Operacja HTTP / PostgREST | Metoda w `src/services/` | Przypadki testowe (`docs/testing.md` ↔ `e2e/*.spec.ts`) |
| :--- | :--- | :--- | :--- |
| **`supabase.auth`** | `getSession`, `getUser`, `onAuthStateChange`, `signInWithOAuth`, `signOut` | `authService.*` | `TC-SETUP-01`, `TC-SETUP-12` (`e2e/01-setup-household.spec.ts`) |
| **`public.users`** | `SELECT`, `INSERT`, `UPDATE (household_id, theme, language, name)` | `authService.getOrCreateUserProfile`, `updateUserHousehold`, `updateUserTheme`, `updateUserLanguage`, `updateUserProfile` | `TC-SETUP-01`, `TC-SETUP-02`, `TC-SETUP-08`, `TC-SETUP-09`, `TC-SETUP-12`, `TC-I18N-01`, `TC-THEME-01` |
| **`rpc/create_household_with_member`** | `POST /rest/v1/rpc/create_household_with_member` | `householdService.createNewHousehold` | `TC-SETUP-02`, `TC-SETUP-06` (`e2e/01-setup-household.spec.ts`) |
| **`public.households`** | `SELECT`, `INSERT (fallback)`, `UPDATE (name)`, `DELETE` | `householdService.updateHouseholdName`, `deleteHousehold` | `TC-SETUP-02`, `TC-SETUP-03`, `TC-SETUP-04`, `TC-SETUP-06`, `TC-SETUP-07` |
| **`public.household_members`** | `SELECT (users!inner)`, `INSERT`, `UPSERT` | `householdService.getUserHouseholds`, `getHouseholdMembers`, `processPendingInvites` | `TC-SETUP-01`, `TC-SETUP-02`, `TC-SETUP-05` |
| **`public.household_invites`** | `SELECT`, `UPSERT (onConflict: household_id,email)`, `DELETE` | `householdService.inviteMemberByEmail`, `getPendingInvitesForHousehold`, `cancelInvite`, `processPendingInvites` | `TC-SETUP-01`, `TC-SETUP-05` |
| **`public.push_subscriptions`** | `UPSERT (onConflict: user_id,endpoint)`, `DELETE` | `notificationService.subscribe`, `unsubscribe` | `TC-SETUP-10`, `TC-SETUP-11` |
| **Edge Function `send-push-notification`** | `POST /functions/v1/send-push-notification` (`5` typów zdarzeń + `400`/`401`/`403`/`500`) | `notificationService.notify`, `sendTest` | `TC-SETUP-10`, `TC-SETUP-11`, `TC-ACT-03`, `TC-ACT-05`, `TC-ACT-06`, `TC-SEC-01` |
| **`public.product_categories`** | `SELECT`, `INSERT`, `UPDATE (name)`, `DELETE` | `categoryService.getAllCategories`, `addCategory`, `updateCategory`, `deleteCategory` | `TC-CAT-02`, `TC-CAT-03`, `TC-CAT-04`, `TC-CAT-05` (`e2e/02-categories-empty-states.spec.ts`) |
| **`public.household_category_settings`** | `SELECT`, `UPSERT (custom_sort_order, is_hidden)` | `categoryService.getHouseholdSettings`, `upsertSetting`, `updateSortOrders` | `TC-CAT-03`, `TC-CAT-04` (`e2e/02-categories-empty-states.spec.ts`) |
| **`public.products`** | `SELECT`, `SELECT HEAD (hasChildren)`, `INSERT` (single & batch), `UPDATE`, `DELETE` | `productService.getAllProducts`, `hasChildren`, `createProduct`, `createProductsBatch`, `updateProduct`, `deleteProduct` | `TC-PROD-01` .. `TC-PROD-08` (`e2e/03-products.spec.ts`), `TC-MEAL-04` |
| **`public.meal_categories`** | `SELECT` | `mealCategoryService.getAllCategories` | `TC-MEAL-01`, `TC-MEAL-07` (`e2e/04-cookbook.spec.ts`) |
| **`public.meals` & `public.meal_ingredients`** | `SELECT (!meal_ingredients_product_id_fkey, !meal_ingredients_reference_product_id_fkey)`, `INSERT` (single & batch), `UPDATE`, `DELETE` | `mealService.getAllMeals`, `createMeal`, `createMealsBatch`, `updateMeal`, `deleteMeal` | `TC-MEAL-01` .. `TC-MEAL-07` (`e2e/04-cookbook.spec.ts`) |
| **`public.pantry_items`** | `SELECT (!pantry_items_product_id_fkey)`, `INSERT`, `UPDATE (quantity, last_verified_at, expiration_date)`, `DELETE` (`removeItem`, `removeByProductOrName`) | `pantryService.getItems`, `addItem`, `updateQuantity`, `verifyItem`, `updateExpirationDate`, `deductIngredients`, `removeItem`, `removeByProductOrName` | `TC-PANTRY-01` .. `TC-PANTRY-06` (`e2e/05-pantry.spec.ts`), `TC-PROD-07`, `TC-DRAFT-03`, `TC-ACT-04` |
| **`public.shopping_lists`** | `SELECT (active/archived, pagination range)`, `INSERT`, `UPDATE (name, status)`, `DELETE` | `shoppingListService.getActiveLists`, `getArchivedLists`, `getListWithDetails`, `createActiveList`, `updateListName`, `deleteActiveList` | `TC-ACT-01` .. `TC-ACT-09` (`e2e/07-active-lists.spec.ts`), `TC-HIST-01` .. `TC-HIST-04` (`e2e/08-history.spec.ts`) |
| **`public.shopping_list_items` & `_archive`** | `SELECT`, `INSERT` (batch & single), `UPDATE (is_checked, in_pantry, total_quantity + OCC updated_at)`, `DELETE` | `shoppingListService.transferItemsToList`, `toggleItemChecked`, `toggleItemPantry`, `updateItemQuantity`, `addItemToList`, `removeItem`, `getArchivedItemsForPlans` | `TC-ACT-01` .. `TC-ACT-09` (`e2e/07-active-lists.spec.ts`), `TC-CAL-03` |
| **`rpc/archive_shopping_list`** | `POST /rest/v1/rpc/archive_shopping_list` | `shoppingListService.completeAndArchiveList` | `TC-ACT-05`, `TC-ACT-06` (`e2e/07-active-lists.spec.ts`) |
| **`public.meal_plans`** | `SELECT (gte/lte date window)`, `INSERT` (single & batch `createMealPlansBatch`), `UPDATE (edit & is_uncertainty_dismissed)`, `DELETE` | `mealPlanService.getMealPlans`, `createMealPlan`, `createMealPlansBatch`, `updateMealPlan`, `dismissUncertainty`, `deleteMealPlan` | `TC-CAL-01` .. `TC-CAL-07` (`e2e/09-calendar-templates.spec.ts`) |
| **`public.weekly_meal_templates`** | `SELECT`, `UPSERT (onConflict: household_id,id)`, `DELETE` | `weeklyTemplateService.fetchWeeklyTemplates`, `saveWeeklyTemplate`, `deleteWeeklyTemplate` | `TC-CAL-06`, `TC-CAL-07` (`e2e/09-calendar-templates.spec.ts`) |
| **Realtime WebSockets (`postgres_changes`)** | `shopping_list_items_*`, `shopping_lists_list_*`, `pantry_items_*` + `offlineMutationQueue` | `shoppingListService.subscribeToList`, `subscribeToHouseholdLists`, `pantryService.subscribeToPantry` | `TC-ACT-07`, `TC-ACT-08` (`e2e/07-active-lists.spec.ts`) |
