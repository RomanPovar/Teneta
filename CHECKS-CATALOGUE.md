# Validation record

## Passed

**28 data-logic tests**, using Node 22.16.0 and the included `tests/catalog.test.mjs`:

- Nested JSON normalization, expected fixture counts and missing optional fields.
- Case-insensitive Cyrillic search, INN search, multiple search terms and Unicode normalization.
- Intersecting search/city/sector/risk/origin conditions, clear-all and empty results.
- Ascending and descending organization/city/risk sorting; source data remains unmodified.
- Score boundaries, explicit risk labels, invalid scores, unassessed-last sorting and confidence/risk separation.
- Supported response shapes, duplicate-ID rejection and safe source URL protocols.
- Export omits individual recruiter records without changing the original object.

**26 browser interaction/layout checks**, using Chromium and the locally available React 18.2.0 runtime:

- Initial rendering and computed totals.
- Search, all dropdowns, filter chips, reset, empty results and disabled export.
- Sort directions and `aria-sort` feedback.
- Pagination, last-page controls and reset-on-filter.
- Record details and dataset help; Escape closes and restores keyboard focus.
- Ctrl+K search focus.
- Actual JSON download for the filtered result, preserving the nested schema and excluding recruiters.
- Desktop layout and mobile layout with the table scrolling inside its own container.
- No document overflow at 320, 390, 768, 1024 and 1440px.
- Failed-request and retry behavior.
- No uncaught JavaScript errors in these checks.

All eight JS/JSX modules also passed a TypeScript JSX syntax-transpilation check. This was compilation for testing, not a migration of the delivered JavaScript to TypeScript.

## Scope and limitations

The browser checks used an **offline test harness with mocked JSON-fetch responses**, because package-network access and local HTTP browser navigation were unavailable. UI source was transpiled into this harness; the delivered files remain normal Vite source files and do not include the harness or its React runtime.

A Vite production build and an actual backend connection were **not tested here**. The existing project files, package versions and Vite configuration were not supplied. No package.json, lockfile or Vite configuration is replaced by this archive. No Safari/Firefox or full accessibility audit was performed.

Run these inside your existing project after copying the files:

```sh
node --test tests/catalog.test.mjs
npm run build
npm run preview
```

Quick local smoke check: search `авг`; clear it; select city `Казань` and risk `High`; reset; click the Organization, City and Risk headers twice; choose 5 rows per page and go to the next page; open a record; export the filtered JSON.
