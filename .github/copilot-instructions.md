# Project overview

This repository is a cross-browser WebExtension project for YAP UI customization. It uses one TypeScript/WXT codebase to ship browser-specific builds for Chrome, Edge, Opera, Firefox, and a Safari handoff build. Internet Explorer is out of scope.

# Key architecture

- `src/entrypoints/` contains extension entrypoints: background, popup, options, `yap-init.content`, and `yap.content`.
- `src/features/content-foundation/` contains page lifecycle and shared content-runtime helpers.
- `src/features/forum/` contains the actual forum/UI behavior: feed transformation, context menu, filtering, FBO helpers, and related DOM logic.
- `src/utils/settings/` is the source of truth for settings schema, normalization, migration, and `browser.storage.local` persistence.
- `public/config.json` contains bundled default settings.
- `groups.json` is an optional extension resource: runtime loads it when present, and falls back to an empty group lookup when absent.
- `wxt.config.ts` is the single manifest/build configuration source. Do not introduce duplicate browser-specific manifest files.

# Required workflow for changes

Always prefer small, behavior-safe changes that preserve existing extension behavior across browsers.

Before changing code:

1. Read the relevant entrypoint/feature/util files instead of guessing.
2. Reuse existing helpers and patterns before adding new abstractions.
3. Keep Firefox, Chrome, and Edge behavior aligned unless browser-specific handling is genuinely required.

After changing code, always run:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
```

Run `npm run zip` when the change affects packaging, manifests, release artifacts, or store submission behavior.

For Firefox packaging and release work, remember that the generated `sources.zip` must stay review-friendly and must not include historical or workspace-only content such as `orig-poc-src/**`, `tmp/**`, or `tests/**`.

# Development and release commands

- Install dependencies: `npm install`
- Local dev: `npm run dev`
- Browser-specific dev: `npm run dev:firefox`, `npm run dev:edge`, `npm run dev:opera`
- Lint: `npm run lint`
- Build all targets: `npm run build`
- Build one target: `npm run build:chrome|firefox|edge|opera|safari`
- Create distributable archives: `npm run zip`
- Create one browser archive: `npm run zip:chrome|firefox|edge|opera`
- Safari handoff packaging on macOS: `npm run build:safari` then `npm run package:safari`
- Release/store automation runs on pushes to `main` via semantic-release, not from manually pushed release tags
- Firefox submit runs automatically from the release workflow; Chrome and Edge auto-submit are opt-in via repository variables `AUTO_SUBMIT_CHROME=true` and `AUTO_SUBMIT_EDGE=true`
- `package.json` is the single source of truth for the extension version; do not hardcode `manifest.version` in `wxt.config.ts`
- Semantic versioning depends on Conventional Commits in `main` history; if release type must reflect all merged commits, avoid squash merges

# Testing expectations

Tests are mandatory for non-trivial logic changes. Prefer extracting pure logic into testable helpers and covering it with Vitest unit tests under `tests/unit/`.

At minimum:

- add or update tests for behavior changes;
- keep existing tests green;
- do not remove coverage just to make a change easier.

If a change is documentation-only, code tests are not required.

# Code and review principles

- Use TypeScript consistently; avoid `any` unless there is no safer option.
- Follow `.editorconfig` and keep ESLint clean instead of relying on ad-hoc formatting fixes.
- Prefer explicit data normalization and compatibility helpers over ad-hoc DOM hacks.
- Do not silently swallow errors.
- Do not commit secrets, tokens, certificates, or store credentials.
- Keep comments sparse and useful: explain why, not what.
- Preserve the single-manifest WXT strategy.
- Keep Safari publishing as a separate manual/App Store Connect lane unless the task explicitly adds that workflow.

When reviewing a change, check:

1. Is the behavior still correct for the existing extension feature set?
2. Are settings persistence and bundled resources still handled through the existing utilities?
3. Are tests added/updated where logic changed?
4. Were `lint`, `typecheck`, `test:unit`, and `build` run?
5. Did the change avoid unrelated refactors and historical POC leakage into release artifacts?

# Documentation

Keep `README.md` and `docs/ru/*.md` aligned with workflow, release, and packaging changes. Update documentation whenever commands, release automation, signing flow, or validation expectations change.
