# Catalogue + language update — validation

## Baseline and scope

Based on the two supplied catalogue archives, with the latest
`teneta-catalogue-update.zip` applied over the initial catalogue files. This update is
cumulative. No live GitHub repository, branch, setting or deployment was modified.

## Completed on this update

- **83 / 83** Node tests passed using Node 22.16.0 (`node --test`).
  Includes the previous 54 data-logic tests, 20 localization checks and 9 service tests.
- **90 / 90** Chromium interaction/layout assertions passed.
- **16** JavaScript/JSX modules transpiled using TypeScript 5.8.3 with **0 syntax diagnostics**.
- Original JSON and logo bytes were checked against the supplied archives and are unchanged.
- Desktop and mobile screenshots were inspected.

Browser checks cover EN/УКР switching, translated controls, captions, accessibility labels,
risk descriptions, dates, active chips, empty and error states, retries, logo loading,
unchanged source-language data, stable search/filter/sort/page state, all-page JSON exports,
modal closing/focus restoration, language restoration after app remount, unavailable or
invalid storage and removal of both the hint and Ctrl/Cmd+K event interception.
Layout checks include 1440, 768, 640, 390 and 320 pixel viewport widths.

## Test environment limits

Chromium ran the source components in an **offline React/ReactDOM 19.1.1 harness**.
JSX was transpiled to isolated test modules. The environment blocks browser navigation,
so the page was mounted with in-memory requests and a Web Storage test double. Restoring
language was tested by unmounting/remounting the app against that storage, not by a live
website reload. Exported Blob contents were inspected; OS-level downloads were intercepted.
No test fixtures, runtime bundles, browser tools or storage shims are shipped with the app.

The npm registry was unavailable (`EAI_AGAIN`). **No successful production Vite build,
ESLint run or GitHub Pages deployment is claimed.** TypeScript transpilation is a syntax
check, not a replacement for the project's build/lint pipeline.

## Before merging in the actual project

    node --test
    npm run lint
    npm run build
    npm run preview

Open the Vite preview including `/Teneta/`. Test a real page reload after selecting УКР.
The actual application uses browser localStorage with guarded access; when storage is
blocked, switching works but the choice cannot persist after reload. Keep the project's
existing dependency versions, Vite base path and deployment configuration.
