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
packages (for example `helpers`, `playback-core`, `observability`, request helpers,
`external-services-paypal`, `external-services-strike`, `external-services-apple-app-store`,
`external-services-google-play`, ORM, parser) are built before dependents.

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

## Lint and type-check read package builds

Workspace type-check resolves `@podverse/*` to each package's `dist/`. `npm run lint` and
`npm run lint:fix` first check every `build:packages` package: `tsc --build --dry` for
composite or incremental builds, and file times for the rest. When one is out of date they
skip type-check, list the packages, and ask for `npm run build:packages`.
`npm run lint:build:fix` is the one-command path. It installs root deps when they are missing or
older than `package-lock.json`, runs that build, installs `apps/mobile` deps the same way (root
installs never reach mobile), then runs `lint:fix`. The install checks live in
`scripts/dev/deps-ensure.sh` and use `npm ci`, so lockfiles are not rewritten. CI runs
`build:packages` before lint.

Composite package `build` and `build:prod` scripts run `tsc --build`, then `tsc-alias` when
that package rewrites path aliases (`orm`, `parser`, `mq`). That records referenced project
versions in the build info the dry check reads. A package whose build tsconfig is not
composite stays on plain `tsc`; the lint check compares file times for those.

## Commands

```bash
npm run build
npm run build:packages
npm run lint:build:fix
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
