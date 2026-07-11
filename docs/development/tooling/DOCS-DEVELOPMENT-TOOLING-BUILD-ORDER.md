# Build Order Of Operations

This document defines the required build order for first-time and clean builds in the Podverse
monorepo.

## Why order matters

Many workspaces import other internal `@podverse/*` packages. If a dependent package builds before
its dependency has emitted `dist/*.d.ts`, TypeScript reports module-resolution failures such as:

- `TS2307: Cannot find module '@podverse/helpers'`
- `TS2307: Cannot find module '@podverse/parser-mapping'`

The root build flow must therefore run in dependency-safe stages.

## Canonical root build sequence

`npm run build` from repo root runs this exact order:

1. `npm run build:packages`
2. `npm run build:apps`
3. `npm run build:tools`

## Stage details

### 1) Packages first

`npm run build:packages` uses an explicit workspace order in `package.json` so foundational
packages (for example `helpers`, `playback-core`, `observability`, request helpers, ORM, parser) are built before
dependents.

### 2) Apps and sidecars second

`npm run build:apps` builds:

- `apps/api`
- `apps/web`
- `apps/workers`
- `apps/management-api`
- `apps/management-web`
- `apps/web/sidecar`
- `apps/management-web/sidecar`

### 3) Tools last

`npm run build:tools` builds:

- `tools/qa`
- `tools/test-assets`

These depend on already-built package outputs and should not run before packages/apps are ready.

## Commands

```bash
npm run build
npm run build:packages
npm run build:apps
npm run build:tools
```

## When changing build process

If you modify build orchestration, keep order-of-operations correct and update these files in the
same change:

- `package.json` (`build`, `build:packages`, `build:apps`, `build:tools`)
- `docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-BUILD-ORDER.md` (this document)
- Any related CI/validation flow summaries if behavior changed

Do not switch root `build` back to all-workspace enumeration without dependency-safe staging.
