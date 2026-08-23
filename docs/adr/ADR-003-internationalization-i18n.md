# ADR-003: Internationalization (i18n) Strategy (Polish & English)

## Status
Proposed

## Context
SmartShopping is currently implemented with Polish as the primary UI language. To prepare the application for broader multi-lingual adoption, the architecture must support internationalization with Polish as default and English as the secondary language, without degrading runtime performance or complicating existing components.

## Decision
When internationalization is implemented in a future phase, the following standards will apply:
1. **i18n Engine:** Adopt a lightweight, type-safe translation mechanism (e.g. `i18next` with `react-i18next` or a typed translation dictionary).
2. **Language Configuration:**
   - Default Language: Polish (`pl`).
   - Secondary Language: English (`en`).
   - Persistence: Stored in `localStorage` and optionally synced with user preferences in Supabase.
3. **Translation Keys & Organization:**
   - Translations organized hierarchically by domain (`common`, `navigation`, `cookbook`, `draft`, `activeList`, `history`, `products`, `settings`).
   - Strict TypeScript keys to prevent missing translations at build time.
4. **Implementation Scope:**
   - Dynamic database content (e.g. user-created meal names and custom products) remains in the user's input language.
   - Global categories (e.g. `product_categories`, `meal_categories`) will support localized display names via translation keys.

## Consequences
### Positive
- Seamless multi-language switching for global household users.
- Clean separation of UI text labels from component templates.

### Negative / Trade-offs
- Requires wrapping hardcoded strings in translation hooks `t('...')` when implemented.
- Database default seed categories need key-based translation mapping.
