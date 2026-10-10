# Apply the catalogue + language update

This is a CUMULATIVE update. Use this ZIP instead of the previous
`teneta-catalogue-update.zip`; it includes all earlier catalogue refinements, the supplied
logo and team risk thresholds, plus EN / УКР and removal of the search shortcut.
It also works when the earlier catalogue update has already been applied.

Only changed/new files are included. Extract the ZIP CONTENTS into the existing Teneta
project root, next to `package.json`. Merge `src` and `tests`, replacing matching files.
Do not create a nested project or replace the whole `src` directory.

## Before copying

Save or commit existing work. Create a branch from an updated `main`, unless you already
have a working branch for these catalogue changes:

    git switch main
    git pull --ff-only origin main
    git switch -c feat/catalogue-language

Do not switch branches with unrelated unsaved/uncommitted changes.

## After copying

    node --test
    npm run lint
    npm run build
    npm run dev

No new dependencies are required. The archive does not contain replacements for:

- `package.json` / `package-lock.json`
- `src/main.jsx` / `src/index.css`
- `vite.config.js` / `.github/workflows/deploy.yml`
- `public/data/organizations.json`

## Verify

Click УКР in the header, inspect the catalogue and risk scale, then reload. Switch back
to EN. Search text, active filters and pagination should remain unchanged when switching
language; only the chosen language persists across a full page reload.

Check that the search field has no Ctrl+K hint and the app no longer intercepts the
combination. Company data stays in its original language. The source JSON is unchanged.

Suggested commit:

    feat: add Ukrainian interface and remove search shortcut

Push the branch and create a PR to `main`. No remote edits or deployments have been
performed on your behalf. See `CHECKS-CATALOGUE.md` for validation limitations.
