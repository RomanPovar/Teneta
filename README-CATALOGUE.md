# TENETA — organization catalogue

Drop-in source files for your existing **Vite + React + JavaScript** project. No additional runtime packages are required. Keep your existing `package.json`, `src/main.jsx`, Vite configuration and lockfile.

## Install into your current project

1. Back up or commit your current work.
2. Extract this archive. Copy its **contents** into `D:\Projects\Teneta`, beside your existing `package.json`. Merge the `src` and `public` folders; replace the included files when asked. Do not create another `src` inside your existing `src`.
3. From the project root, run:

```sh
npm run dev
```

The archive replaces `src/App.jsx`, `src/App.css`, `src/SearchBar.css` and `src/index.css`. It adds components, a data adapter, a loading service, a JSON fixture and tests. `App.jsx` imports the shared styles itself, so it also works with the standard Vite `main.jsx`.

The old hover-to-reveal search is removed. Search and filters are always visible.

## What works

- Live, case-insensitive search across organization names, legal names, cities, regions, INN/OGRN, IDs, sectors, corporate websites/emails and vacancy titles/skills. Cyrillic is supported. Each space-separated term must match somewhere in the record.
- City, sector, risk and record-type filters. All active conditions are combined with AND. Dropdown choices are generated from the loaded data.
- Ascending/descending sorting by organization, city, risk or loaded vacancy count. Names and cities use Russian-aware alphabetical collation. Risk uses low → moderate → high, not alphabetical order.
- Filter chips, clear-search, clear-all, result counts, empty states and pagination. Changing search, filters or sorting resets the current page.
- Record details with supplied description, analysis, organizational contacts, vacancies and a source link. Dialog supports Escape and returns focus when closed.
- Export of ALL matching records, not only the visible page, in the original nested JSON schema. Personal recruiter records are excluded from exports.
- Loading, failed-request and retry states; keyboard search shortcut Ctrl+K / Command+K.
- Responsive layout. On a narrow display, only the table scrolls horizontally, not the whole page.

Clearing **only the search text** leaves the selected filters active. Clearing all controls restores the complete list. Filtering and sorting do not remove or modify records in the source JSON.

## Files to understand first

```text
public/
  data/organizations.json          ← add or replace organization records here
src/
  App.jsx                         ← page state and composition
  index.css                       ← shared colors, font and reset
  App.css                         ← page, table, dialog and responsive styles
  SearchBar.css                   ← search/filter styles and gradient borders
  components/
    CatalogFilters.jsx            ← controlled search and dropdowns
    OrganizationTable.jsx         ← rows, sorting headers and empty state
    RiskBadge.jsx                 ← low/moderate/high display
    RecordDialog.jsx              ← record details and dataset help dialog
    Icon.jsx                      ← small inline SVG UI icons; no icon package
  lib/catalog.js                  ← JSON adapter, search, sorting and risk policy
  services/organizationService.js  ← the only data-loading boundary
```

The data path is:

```text
JSON file / API
    ↓ loadOrganizations()
    ↓ normalizePayload()
    ↓ filterOrganizations()
    ↓ sortOrganizations()
    ↓ current page (slice)
    ↓ OrganizationTable
```

State stores inputs: search text, filters, sort and page number. The results are calculated from the original dataset, rather than copied into another state and synchronized with an effect.

## Adding data

Edit `public/data/organizations.json`. The supplied fixture is an array of nine nested organization objects. Keep the array's square brackets and put commas between objects.

Supported response shapes:

```js
[organizationA, organizationB]
// or
{ items: [organizationA, organizationB] }
// or
{ organizations: [organizationA, organizationB] }
// or a single organization object matching your sample.
```

Each record needs a unique, stable `meta.entity_id` (or a nonempty string INN as fallback) and a name in `company_profile.brand_name` or `legal_name`. Missing optional fields are handled. Duplicate IDs and incompatible payloads produce an error instead of silently rendering incorrect rows.

Your original fields remain nested. The adapter reads, for example:

```js
raw.company_profile.brand_name
raw.company_profile.primary_location.city
raw.intelligence_analysis.threat_score
raw.vacancies
```

No flattening of your backend schema is required. The normalizer produces a simpler view model just for the interface.

## Demo data and privacy

The fixture includes **one user-supplied company record plus eight entirely fictional test organizations**. The latter are flagged `meta.is_demo: true`, named “Демо …”, have no real employer URLs or contacts, and are visibly marked “Fictional demo.” They were not scraped from hh.ru. Their jobs and risk scores are arbitrary UI test data, not real findings.

The provided company record is marked unverified. Its original description, supplied analysis, identifiers, corporate contact fields, vacancy and graph are retained. Its individual recruiter entry was deliberately omitted from the public fixture. The interface does not publish personal recruiter details. This is a catalogue page, not a semantic-graph page.

IMPORTANT: `public/data/organizations.json` is a public web asset. Anything loaded into a visitor's browser is accessible to that visitor even when a column is hidden. Before connecting a backend or deploying real data, have the backend remove fields that should not be sent to the client and enforce appropriate access controls. Hiding a field in React is not an access-control mechanism.

## Risk policy: temporary, explicit, editable

The input schema did not define a formal scoring scale or its thresholds. This demo assumes a 0–100 `threat_score` and uses these provisional display cutoffs, defined once in `src/lib/catalog.js`:

```js
export const RISK_POLICY = {
  moderateFrom: 34,
  highFrom: 67,
  maximum: 100,
};
```

- Low: 0 ≤ score < 34.
- Moderate: 34 ≤ score < 67.
- High: 67 ≤ score ≤ 100.

For integer scores these are 0–33, 34–66 and 67–100. A provided `intelligence_analysis.risk_level` of `low`, `moderate` or `high` takes precedence. Confidence is never used as a risk score. Missing, nonnumeric, negative or out-of-range scores show “Not assessed”; this is a missing-data state, not a fourth assessed risk category. Unassessed records sort last in both directions.

These labels are NOT an assessment made by the frontend. Agree the authoritative scale and criteria with the backend team before treating them as meaningful.

## Your five-color palette

All five supplied colors are shared variables in `src/index.css`. Higher elevation means a darker surface:

| Level | Color | Use |
| --- | --- | --- |
| 0 | `#4e634c` | Page background |
| 1 | `#455a43` | Data notice |
| 2 | `#3e4f3c` | Statistics and table surface |
| 3 | `#364534` | Filter panel and table headers/footer |
| 4 | `#2d3c2c` | Top navigation, fields, buttons and modal |

Neutral light text supplies contrast. Risk labels also use text and one/two/three bars, so color is not the only signal. Search and filter form borders use a dim layered gradient in `SearchBar.css`.

## Connect the backend later

By default, the loader fetches the JSON fixture through Vite's public base path. No environment file is required.

When an endpoint is available, create `.env.local` beside `package.json`:

```dotenv
VITE_ORGANIZATIONS_URL=http://localhost:8000/api/organizations
```

Restart `npm run dev`. The label changes from Local JSON to Backend API. Use an HTTPS endpoint with an HTTPS-deployed frontend, and configure the backend's allowed frontend origin (or use a same-origin proxy). The endpoint must return a documented shape above.

This is a small-dataset, **client-side** implementation. The loader performs one request and filtering/sorting operate on the returned records. It does not automatically fetch all pages of a paginated backend response. A backend response with only one page means only that page can be searched here. When the dataset grows, agree a server-side query contract (`query`, `city`, `risk`, `sort`, `page`, `pageSize`, `total`) and replace the loading/filtering path accordingly. An environment variable alone does not implement server-side pagination, authentication or filtering.

Never put tokens, passwords or private API keys in `VITE_*` variables; Vite includes those values in the client bundle.

## Checks

Run the included dependency-free data tests:

```sh
node --test tests/catalog.test.mjs
```

Then check the production build in your own existing project:

```sh
npm run build
npm run preview
```

See `CHECKS-CATALOGUE.md` for exactly what was checked and what remains unverified.

## Relevant documentation

- React: https://react.dev/learn/thinking-in-react
- Vite environment variables: https://vite.dev/guide/env-and-mode

Suggested commit: `feat(catalogue): add JSON-backed organization search, filters and sorting`
