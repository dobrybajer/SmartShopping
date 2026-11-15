# SmartShopping 🛒🍽️

**SmartShopping** to progresywna aplikacja webowa (PWA) stworzona do nowoczesnego planowania posiłków w gospodarstwie domowym, śledzenia makroskładników, zarządzania zapasami w spiżarni oraz synchronizowanych w czasie rzeczywistym zakupów spożywczych.

---

## ✨ Kluczowe Funkcjonalności

- **Równorzędny Dual Layout (Mobile PWA & Desktop):**
  - **Mobile PWA (`< 1024px`):** Dolny pasek nawigacji (`BottomNavigation`), wysuwane arkusze (`Sheet`), gesty przesuwania (`SwipeToDismiss`), ergonomia strefy kciuka (min. `44x44px` touch targets) oraz wibracje haptyczne (`navigator.vibrate(50)`).
  - **Desktop (`>= 1024px`):** Stały lewy pasek boczny (`DesktopSidebar`), górny pasek narzędziowy (`DesktopHeader`), wycentrowane okna dialogowe (`Dialog`), wielokolumnowe widoki danych oraz skróty klawiszowe (np. `Ctrl+Alt+P` dla importu przepisów JSON).
- **Wiele Aktywnych List Zakupowych i Synchronizacja Realtime:**
  - Wsparcie dla wielu równoległych list zakupowych w ramach jednego gospodarstwa domowego (np. *Bieżące spożywcze*, *Chemia domowa*, *Apteka*).
  - **Optimistic UI + OCC (Optimistic Concurrency Control):** Natychmiastowe odhaczanie pozycji (`< 16ms`) z ochroną przed wyścigami zapisu (WebSockets Supabase Realtime + kolejka Offline Queue z synchronizacją po powrocie sieci).
  - Automatyczna agregacja produktów i grupowanie według definiowanego przez gospodarstwo układu alejek sklepowych (`household_category_settings`).
- **Książka Kucharska i Planer Kalendarzowy (Miesiąc / Tydzień / Dzień):**
  - Przepisy z automatycznym wyliczaniem makroskładników (`kcal`, `B`, `W`, `T`), obsługą miar kuchennych (`szklanki`, `łyżki`, `łyżeczki`, `szczypty`, `dag`, `kg`, `l`) z konwersją na jednostki bazowe oraz dynamicznym skalowaniem gramatury składników do docelowej kaloryczności porcji.
  - Dwu-poziomowa hierarchia produktów (Produkty Ogólne i Szczegółowe) z dynamicznym trasowaniem makro przez wariant referencyjny (`ADR-010`).
  - Kalendarz posiłków z 3 perspektywami czasowymi, szablonami tygodniowymi (zapisywanie i nakładanie tygodnia Pn–Pt / Pn–Nd z mnożnikiem porcji `0.5x–4x`), śledzeniem statusów składników (`Zaplanowane` → `W koszyku` → `Na liście` → `Kupione` / `W spiżarni`) oraz detekcją niepewności (`⚠️`).
- **Inteligentna Spiżarnia (`Pantry`):**
  - Automatyczne zasilanie spiżarni kupionymi produktami w momencie archiwizacji listy zakupowej (atomowe RPC `archive_shopping_list`).
  - Wskaźniki świeżości zapasów, śledzenie dat ważności (`expiration_date`) oraz automatyczne zdejmowanie zużytych składników po ugotowaniu potrawy.
- **Wielodostępność Gospodarstw Domowych (Multi-Tenant Households) i Bezpieczeństwo RLS:**
  - Pełna izolacja danych na poziomie wierszy PostgreSQL (`ENABLE ROW LEVEL SECURITY` + `get_user_household_ids(auth.uid())`).
  - Przełączanie między gospodarstwami, system zaproszeń e-mail oraz powiadomienia Web Push (VAPID) o zmianach na liście.
- **Personalizacja (i18n & Motywy OLED):**
  - Pełna dwujęzyczność interfejsu (**Polski `pl`** / **Angielski `en`**) z natywną pluralizacją `Intl.PluralRules`.
  - 6 szat graficznych opartych na zmiennych CSS (w tym domyślny **True Black OLED `#000000`** oszczędzający baterię na ekranach AMOLED).

---

## 🛠️ Stos Technologiczny

| Warstwa | Technologie |
| :--- | :--- |
| **Frontend** | React 19, TypeScript 6.0 (Strict Mode), Vite 8.2 |
| **Styling & UI** | Tailwind CSS, Radix UI / shadcn/ui, Lucide React |
| **Zarządzanie Stanem** | Zustand (persystencja `localStorage`, Optimistic UI, kolejka offline) |
| **Backend & Baza Danych** | Supabase (PostgreSQL, PostgREST, GoTrue Google OAuth, Realtime WebSockets, Edge Functions) |
| **Testy & Jakość Kodu** | Vitest, React Testing Library (`jsdom`), `oxlint`, `tsc -b` |

---

## 🚀 Szybki Start (Środowisko Developerskie)

### 1. Wymagania wstępne
- **Node.js** `>= 20.x` oraz `npm` `>= 10.x`
- Projekt **Supabase** (chmurowy lub lokalny przez Supabase CLI)

### 2. Instalacja zależności
```bash
npm install
```

### 3. Zmienne środowiskowe (`.env`)
Utwórz plik `.env` w katalogu głównym projektu:
```env
VITE_SUPABASE_URL=https://twoj-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=twoj-klucz-anon-public
VITE_VAPID_PUBLIC_KEY=opcjonalny-klucz-publiczny-web-push
```

### 4. Migracje bazy danych Supabase
Wykonaj migracje SQL znajdujące się w katalogu [`supabase/migrations/`](./supabase/migrations/) w kolejności chronologicznej w panelu SQL Editor Supabase (lub przez `supabase db push`), aby utworzyć tabele, indeksy, funkcje RPC oraz polityki Row Level Security (RLS).

### 5. Uruchomienie serwera deweloperskiego
```bash
npm run dev
```

---

## 🧪 Skrypty i Bramki Jakości (Quality Gates)

Przed każdym commitem lub zamknięciem zadania wymagane jest przejście wszystkich trzech bramek jakości:

```bash
# 1. Uruchomienie testów jednostkowych i integracyjnych User Flows (Vitest)
npm run test -- --run

# 2. Analiza statyczna kodu (oxlint)
npm run lint

# 3. Ścisła weryfikacja typów TypeScript
npx tsc -b

# 4. Budowanie wersji produkcyjnej PWA
npm run build
```

---

## 📂 Struktura Projektu

```text
SmartShopping/
├── .agents/                  # Reguły architektoniczne (.agents/rules/) i skille AI (.agents/skills/)
├── docs/                     # Dokumentacja projektowa
│   ├── PRD.md                # Product Requirements Document (schemat DB, logika biznesowa)
│   ├── plan.md               # Plan implementacji i historia zrealizowanych faz
│   ├── Roadmap.md            # Mapa drogowa audytu architektonicznego i status zadań
│   └── adr/                  # Architecture Decision Records (ADR-001 .. ADR-010)
├── supabase/
│   ├── functions/            # Supabase Edge Functions (np. send-push-notification)
│   └── migrations/           # Migracje SQL PostgreSQL + polityki RLS
└── src/
    ├── components/           # Komponenty UI (Mobile PWA views, Desktop views, modale, shadcn/ui)
    ├── context/              # Konteksty React (AuthContext)
    ├── hooks/                # Współdzielone kontrolery widoków i custom hooki (Dual Layout)
    ├── i18n/                 # Słowniki tłumaczeń (pl.ts, en.ts) i silnik pluralizacji
    ├── lib/
    │   ├── calculations/     # Czyste funkcje domenowe (makro, agregacja, sortowanie alejek, koszyk)
    │   └── realtime/         # Śledzenie lokalnych mutacji dla deduplikacji WebSocket
    ├── services/             # Warstwa komunikacji z API Supabase (zero zapytań bezpośrednio z UI)
    ├── store/                # Sklepy Zustand (koszyk, aktywna lista, spiżarnia, kalendarz, offline queue)
    └── types/                # Typy bazy danych Supabase (supabase.ts)
```

---

## 🏛️ Dokumentacja i Decyzje Architektoniczne (ADR)

Szczegółowa dokumentacja architektury oraz standardów projektu znajduje się w:
- **[AGENTS.md](./AGENTS.md)** – Konstytucja projektu i główny przewodnik dla kontrybutorów oraz agentów AI
- **[docs/PRD.md](./docs/PRD.md)** – Specyfikacja wymagań produktowych i modelu danych
- **[docs/Roadmap.md](./docs/Roadmap.md)** – Mapa drogowa rozwoju i audytu technicznego
- **Rejestr Decyzji Architektonicznych (`docs/adr/`):**
  - [ADR-001: Dual Layout Architecture (Mobile PWA & Desktop)](./docs/adr/ADR-001-dual-layout-architecture.md)
  - [ADR-002: State & Realtime Architecture](./docs/adr/ADR-002-state-and-realtime-architecture.md)
  - [ADR-003: Internationalization (i18n) & English-Only Codebase](./docs/adr/ADR-003-internationalization-i18n.md)
  - [ADR-004: Multi-Theme System & Visual Styling Architecture](./docs/adr/ADR-004-theme-system-and-visual-styling.md)
  - [ADR-005: Multiple Active Shopping Lists Architecture](./docs/adr/ADR-005-multiple-active-shopping-lists.md)
  - [ADR-006: Custom Product Categories & Aisle Sorting](./docs/adr/ADR-006-custom-product-categories-and-aisle-sorting.md)
  - [ADR-007: Multiplatform Web Push Notifications](./docs/adr/ADR-007-multiplatform-web-push-notifications.md)
  - [ADR-008: Household Pantry Management & Smart Inventory Sync](./docs/adr/ADR-008-pantry-management-and-inventory-sync.md)
  - [ADR-009: Meal Planning & Calendar Module](./docs/adr/ADR-009-meal-planning-and-calendar-module.md)
  - [ADR-010: Two-Level Hierarchical Product Catalog & Smart Nutrition Routing](./docs/adr/ADR-010-hierarchical-product-catalog-and-smart-nutrition-routing.md)
