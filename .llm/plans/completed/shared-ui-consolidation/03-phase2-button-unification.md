# Phase 2 — Button unification (Shared UI consolidation)

## Preconditions

- Phase 1 complete or explicitly deferred only if inventory marks breadcrumbs as low priority (unlikely).

## Goal

Single **`Button`** implementation for Podverse: lift the canonical component from `apps/web` into
`packages/ui`, then consume it from **both** web and management-web. Remove
`apps/management-web/src/components/ui/Button` once unused.

## Why web’s Button

- `apps/web/src/components/Button/Button.tsx` is the **feature-complete** implementation (variants,
  loading, accessibility props). Management’s Button is a minimal subset—replacing management-only
  styling without adopting web behavior would not achieve “shared experience.”

## Dependency and packaging

- Add `@podverse/ui` to **`apps/web/package.json`** `dependencies` (workspace `*`) when web imports
  the React entry—today web uses path-only SCSS forwards and may not declare the package.
- Move or duplicate SCSS so **button styles live with** `packages/ui` (reuse
  `packages/ui/src/styles/mixins/_buttons.scss` where possible).
- Pull in required runtime deps used by the lifted component (e.g. `classnames`, `react-icons`) via
  **`packages/ui/package.json`** if not already present—avoid duplicate implementations.

## Migration steps

1. Copy/move `Button.tsx` + module SCSS into `packages/ui`; adjust imports (no app-relative paths).
2. Export `Button` + prop types from `packages/ui/src/index.ts`.
3. Update `apps/web` to import from `@podverse/ui` (or thin re-export file if needed for migration).
4. Update `apps/management-web` to import `Button` from `@podverse/ui`; map `variant` props as needed.
5. Delete obsolete management `components/ui/Button` and fix all imports.
6. Remove dead SCSS in management pages that only existed to mimic buttons (if any).

## Verification

- Lint + build packages + both apps from monorepo root per `AGENTS.md`.
- E2E/report:
  - Management-web specs touching buttons on migrated pages.
  - Web smoke or affected specs if any routes changed visually.

Example management-web command shape:

```bash
make e2e_test_management_web_report_spec SPEC=e2e/feed-operations-flag-status.spec.ts
```

Adjust `SPEC` to the specs covering edited pages.

## Risks

- Visual regression: compare primary/secondary/outline variants on dark/light themes.
- Bundle size: ensure tree-shaking and avoid pulling unnecessary icons if refactoring allows.

## Completion

Mark Prompt 3 in `COPY-PASTA.md`; move this file to `completed/` when finished.
