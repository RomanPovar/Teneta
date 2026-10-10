# Teneta catalogue

React + JavaScript catalogue with search, combined filters, sorting, organization details and JSON export.

## Current interface

The header uses the supplied Teneta logo and one motto: **Relationships reveal truth**.
The catalogue contains aggregate totals, a search field, City / Sector / Risk level filters,
a sortable table, pagination and a compact **Risk scale** reference. Presentation-only
workspace labels, explanatory banners, record-type controls and promotional footer text
have been removed.

## Risk display

The interface reads the final company score from `intelligence_analysis.threat_score`.
It does not calculate vacancy triggers, model weights, graph coefficients or hard-negative rules.

| Score interval | Level | Meaning |
| --- | --- | --- |
| 0 <= score < 65 | Low | Civilian activity or general industry |
| 65 <= score < 85 | Moderate | Dual-use products or technologies |
| 85 <= score <= 100 | High | Strong defense-related indicators |

For integer scores these intervals are 0–64, 65–84 and 85–100. The team's 0–24 civilian
band is included in Low; there is no fourth assessed level. Decimal scores are compared
without rounding (64.9 is Low, 84.9 is Moderate). A valid numeric score is authoritative;
an older `risk_level` field does not override it. Missing, invalid or out-of-range scores
are shown as **Not assessed**, a data-availability state rather than another risk tier.
The frontend does not convert a high score into a claim of independent verification.

Thresholds and canonical data values live in `src/lib/catalog.js`.
Interface text and translated risk descriptions live in `src/i18n/messages.js`.

## Interface language

The header has **EN / УКР** controls. The initial language is English unless a saved
choice exists. Selecting Ukrainian translates navigation, headings, filters, table
labels, accessible names, risk badges and descriptions, record headings, dates,
loading/error/empty states and export feedback. The document's `lang` and tab title
are also updated.

The choice is stored as `en` or `uk` under `teneta.ui.language` in localStorage.
Switching still works for the current session when storage is blocked. An unsupported
stored value falls back to English. Language changes do not reset search text,
filters, sorting, pagination or reload the dataset.

Company names, locations, categories, vacancies and analytical text from JSON remain
in their source language. JSON exports retain the same data regardless of the selected
interface language. The requested motto **Relationships reveal truth** remains English.

The search shortcut and its visual hint have both been removed. The page does not
intercept Ctrl/Cmd+K; ordinary input, clear-search and Tab navigation remain available.

## Data source

`public/data/organizations.json` is unchanged. Loading still uses:

    `${import.meta.env.BASE_URL}data/organizations.json`

The existing optional `VITE_ORGANIZATIONS_URL` override is retained. No new backend API,
query parameters, server pagination or authentication have been introduced.

`normalizePayload()` excludes records with `meta.is_demo === true` before validation,
statistics, filter choices, table rendering and export. With the currently supplied JSON,
this leaves one organization. Exclusion does **not** delete these entries from the original
file: its original bytes remain in `public/` and in the published static data file.
Do not treat frontend filtering as an access-control mechanism.

The accepted shapes remain a single company record, an array, `{ items: [...] }`,
or `{ organizations: [...] }`. Each eligible record requires a stable `meta.entity_id`
(or INN) and a `company_profile.brand_name` (or legal name).

## Search and export

Search is case-insensitive and supports Cyrillic. Every whitespace-separated query term
must occur in the searchable organization fields. City, sector and risk combine with the
query. Clearing the query preserves selected filters; **Clear all** resets all controls.
Results are derived from loaded data without mutating the source records.

**Export JSON** exports every matching organization, not only the current page. It retains
the nested source schema and provenance metadata. Individual `recruiters` entries remain
excluded, as before. No risk labels or additional evidence are invented during export.

## Development

Use the existing project dependencies and configuration:

    npm install
    npm run dev

Check the data logic and production build:

    node --test
    npm run build
    npm run preview

Keep `base: "/Teneta/"` in the existing Vite configuration. There are no dependency or
GitHub Actions changes in this update.

## Files

| File | Responsibility |
| --- | --- |
| `src/App.jsx` | Page state, statistics, pagination and export |
| `src/components/LanguageSwitcher.jsx` | Header language controls |
| `src/i18n/messages.js` | English and Ukrainian interface strings |
| `src/i18n/LanguageProvider.jsx` | Language state, persistence and document language |
| `src/components/Brand.jsx` | Reusable header logo and motto |
| `src/components/CatalogFilters.jsx` | Search and three filters |
| `src/components/OrganizationTable.jsx` | Sortable catalogue rows |
| `src/components/RiskBadge.jsx` | Risk badge and concise tooltip |
| `src/components/RiskLegend.jsx` | Points / Level / Meaning reference |
| `src/components/RecordDialog.jsx` | Organization information |
| `src/lib/catalog.js` | Normalization, exclusion, risk mapping, sorting and export |
| `src/services/organizationService.js` | Existing data-loading boundary |
| `src/assets/teneta-logo.png` | Unmodified supplied logo |
| `tests/catalog.test.mjs` | Data-logic and risk-threshold tests |
| `tests/i18n.test.mjs` | Translation, persistence and shortcut-removal checks |
| `tests/organizationService.test.mjs` | Data-loading and localized-error-code tests |

The original logo is displayed through two CSS windows for the symbol and wordmark,
with a monochrome treatment for the dark header. Its source PNG has not been altered.

See `CHECKS-CATALOGUE.md` for actual validation results and limitations.
