# browser-extention-yap

Cross-browser WebExtension project for YAP UI customization.

## Documentation

- `docs/ru/architecture.md` — project architecture
- `docs/ru/development.md` — development workflow
- `docs/privacy-policy.md` — public privacy policy for store listings
- `docs/ru/release.md` — release, signing, and store publication

## Current repository layout

- `src/` — TypeScript/WXT source tree.
- `public/config.json` — bundled default settings.
- `scripts/` — helper scripts for building, zipping, and Safari packaging.
- `tests/` — unit and future e2e tests.
- `tmp/` — local reports and scratch files, ignored by git.

## Stack

- **WXT** — manifest generation, browser targets, build and zip tooling
- **TypeScript** — typed source code
- **webextension-polyfill** — browser API compatibility layer
- **ESLint** — repository linting baseline
- **Vitest** — unit test baseline

## Supported browser targets

- Chrome
- Edge
- Opera
- Firefox
- Safari (build target and packaging handoff)

> Internet Explorer is intentionally out of scope. It does not support WebExtensions.

## Prerequisites

- Node.js 22+
- npm 10+
- For Safari packaging: macOS with Xcode command line tools

## Development

```bash
npm install
npm run dev
```

Useful variants:

```bash
npm run dev:firefox
npm run dev:edge
npm run dev:opera
```

## Run CI checks locally

To run the same checks as the `CI` workflow locally:

**Linux/macOS**

```bash
bash ./scripts/run-ci-checks.sh
```

**Windows**

```bat
scripts\run-ci-checks.bat
```

The script installs dependencies with `npm ci`, runs the verify suite, and runs commitlint when a commit range is available.

## Tags & Users

User tags are stored in `browser.storage.local` — no external file needed.

Use the **Tags & Users** section on the options page to import (native format or legacy format) and export (`tags-users.json`).

## Build and package

Build all browser targets:

```bash
npm run build
```

Build individual targets:

```bash
npm run build:chrome
npm run build:firefox
npm run build:edge
npm run build:opera
npm run build:safari
```

Create distributable ZIPs:

```bash
npm run zip
```

Per-browser ZIPs:

```bash
npm run zip:chrome
npm run zip:firefox
npm run zip:edge
npm run zip:opera
```

Safari handoff package:

```bash
npm run build:safari
npm run package:safari
```

## GitHub Actions release flow

- `ci.yml` — run commitlint plus the shared CI verification script on pushes and pull requests
- `release-artifacts.yml` — run semantic-release on pushes to `main`, create the release commit/tag/GitHub Release, build ZIP artifacts from the new release tag, attach them to the GitHub Release, and submit configured store packages
- `submit-stores.yml` — manual rebuild/resubmit workflow for a chosen git ref and chosen target stores

Release behavior:

- merge or push commits to `main` → semantic-release analyzes all commits in `main` since the last release tag and computes the next semantic version
- if a release is needed, the workflow creates a `vX.Y.Z` tag and GitHub Release automatically, then builds the new store packages
- run `submit-stores.yml` manually → choose `ref`, `target` (`all`, `chrome`, `firefox`, `edge`) and `dry_run`

Important release facts:

- `package.json` is the single source of truth for the extension version; WXT derives the manifest version from it
- semantic-release relies on Conventional Commits in `main` history
- if you want release type calculation from all merged commits, merge with merge/rebase instead of squash; with squash, only the squash commit message remains in `main`

Store submission requires GitHub **Environments** and secrets configured in repository settings:

- `chrome-store`
- `firefox-store`
- `edge-store`

Automatic store submit toggles:

- Firefox submit runs automatically when release packaging succeeds.
- Chrome auto-submit runs only when repository variable `AUTO_SUBMIT_CHROME=true` is set.
- Edge auto-submit runs only when repository variable `AUTO_SUBMIT_EDGE=true` is set.
- `submit-stores.yml` remains available for manual dry-runs and re-submits for every supported store target.

Safari remains a separate manual/TODO release lane.

## Checks

```bash
npm run lint
npm run typecheck
npm run test:unit
```

## Code style

- `.editorconfig` in the repository root is the source of truth for indentation, line endings, and trailing whitespace handling.
- Run `npm run lint` before commits and keep the ESLint configuration green.

## Manifest strategy

The project uses **one manifest source** in `wxt.config.ts`.

Browser differences are handled through:

- WXT browser targets (`chrome`, `firefox`, `edge`, `opera`, `safari`)
- browser-specific manifest fields such as `browser_specific_settings.gecko`
- browser-specific build/package commands instead of manually maintained duplicate manifests

Extension versioning is **not** hardcoded in `wxt.config.ts`; WXT reads it from `package.json`.

## Publishing and signing

### Chrome Web Store

1. Register in the Chrome Web Store Developer Dashboard.
2. Create the store listing manually the first time.
3. Build/package with:

   ```bash
   npm run zip:chrome
   ```

4. Upload the produced Chrome ZIP for the first submission.
5. After the first listing exists, automation uses the `chrome-store` GitHub Environment with:

   - `CHROME_EXTENSION_ID`
   - `CHROME_CLIENT_ID`
   - `CHROME_CLIENT_SECRET`
   - `CHROME_REFRESH_TOKEN`

6. For local/manual submit setup:

   ```bash
   npm run submit:init
   ```

### Microsoft Edge Add-ons

1. Register in Microsoft Partner Center.
2. Create the Edge Add-ons listing manually.
3. Build/package with either:

   ```bash
   npm run zip:edge
   ```

   or reuse the Chrome ZIP if the package is identical.
4. Automation uses the `edge-store` GitHub Environment with:

   - `EDGE_PRODUCT_ID`
   - `EDGE_CLIENT_ID`
   - `EDGE_API_KEY`

5. Keep publication metadata in Partner Center, not in source control secrets.

### Opera Add-ons

1. Register in the Opera Add-ons developer portal.
2. Create the listing manually.
3. Build/package with:

   ```bash
   npm run zip:opera
   ```

4. Submit the ZIP through Opera's review flow.

> Opera review is still a manual store process; keep package scripts here, but do not store portal credentials in the repository.

### Firefox Add-ons (AMO)

1. Register at addons.mozilla.org Developer Hub.
2. Create the first listing manually.
3. Build/package with:

   ```bash
   npm run zip:firefox
   ```

4. WXT will also prepare the Firefox source-review ZIP.
5. The Firefox source ZIP intentionally includes only build/review-relevant files and excludes:

   - `orig-poc-src/**`
   - `tmp/**`
   - `tests/**`

6. Automation uses the `firefox-store` GitHub Environment with:

   - `FIREFOX_EXTENSION_ID`
   - `FIREFOX_JWT_ISSUER`
   - `FIREFOX_JWT_SECRET`

7. For local/manual submit setup:

   ```bash
   npm run submit:init
   ```

### Safari

Safari requires a different distribution model:

1. Join the Apple Developer Program.
2. Build the Safari target:

   ```bash
   npm run build:safari
   ```

3. On macOS, package the generated `.output/safari-mv3` output with:

   ```bash
   npm run package:safari
   ```

4. Continue signing and distribution in Xcode / App Store Connect.

WXT does **not** automate Safari publishing. That is expected and correct.

## Secret management

Do **not** commit store credentials.

Use one of these approaches:

- local `.env.submit` generated by `npm run submit:init`
- GitHub Actions **Environment** secrets
- organization-level CI secrets

Recommended release hardening:

1. create Chrome / Edge / Firefox listings manually first
2. run `npm run submit:init`
3. keep `.env.submit` local only
4. mirror those values into `chrome-store`, `firefox-store`, and `edge-store`
5. test `submit-stores.yml` with `dry_run=true`
6. use Conventional Commits on changes merged to `main`
7. let `release-artifacts.yml` create `v*` tags automatically from `main`

## Project structure

The codebase is organized around a standard extension layout:

- `src/entrypoints/*.content/` — content scripts
- `src/entrypoints/popup/` — popup UI
- `src/entrypoints/options/` — options UI
- `src/utils/` — shared runtime utilities
- `src/features/` — feature modules
- `src/domain/` — domain and storage logic

## Reference links

- MDN WebExtensions: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions
- WXT docs: https://wxt.dev/
- Chrome Web Store publish docs: https://developer.chrome.com/docs/webstore/publish/
- Edge Add-ons publish docs: https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/publish-extension
- Firefox signing/distribution docs: https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/
- Safari Web Extensions docs: https://developer.apple.com/documentation/safariservices/safari-web-extensions
- Opera publishing docs: https://dev.opera.com/extensions/publishing-guidelines/
