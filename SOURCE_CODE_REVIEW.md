# Firefox source review instructions

This repository packages Firefox source-review artifacts through WXT.

## Build from source

```bash
npm install
npm run zip:firefox
```

## Main project files

- `src/` — TypeScript source for the extension
- `wxt.config.ts` — manifest source and build configuration
- `web-ext.config.ts` — development browser startup configuration

## Notes for reviewers

- The extension is built with WXT, which generates browser-specific manifest/output artifacts from `wxt.config.ts`.
- No release credentials are included in source control.
