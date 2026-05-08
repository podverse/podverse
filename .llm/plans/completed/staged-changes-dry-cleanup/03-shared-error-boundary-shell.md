# 03 — Shared `ErrorBoundaryShell` for both apps

## Goal

Replace the byte-identical `error.tsx` and `global-error.tsx` (plus their identical
SCSS) in `apps/web` and `apps/management-web` with thin shells that compose a single
`ErrorBoundaryShell` exported from `@podverse/ui`. Remove the duplicated
`ErrorBoundary.module.scss` from the apps.

## Why

[`apps/web/src/app/error.tsx`](../../../../apps/web/src/app/error.tsx) and
[`apps/management-web/src/app/error.tsx`](../../../../apps/management-web/src/app/error.tsx)
are line-for-line identical except for one comment.
[`global-error.tsx`](../../../../apps/web/src/app/global-error.tsx) is also a near-clone
in both apps (~130 lines each, including duplicated `getGlobalErrorTranslations`,
locale-cookie loader, English fallback strings declared **twice per file**, `tErrors` /
`tMisc` shims, and `<html><body>` shell). The
`apps/*/src/styles/components/ErrorBoundary/ErrorBoundary.module.scss` files are
identical too.

This violates the policy in [`shared-ui-i18n.mdc`](../../../../.cursor/rules/shared-ui-i18n.mdc):
the rendered shell is generic; only the i18n strings differ.

## Design

### `@podverse/ui`: `ErrorBoundaryShell`

- Location: `packages/ui/src/components/layout/ErrorBoundaryShell/ErrorBoundaryShell.tsx`
  (+ module SCSS moved from app paths).
- **No baked-in copy** — apps pass localized strings (matches `shared-ui-i18n.mdc`).
- Two render modes via prop or via two named exports:

  - `ErrorBoundaryShell` — used by `error.tsx` (rendered inside provider tree).
  - `GlobalErrorBoundaryShell` — used by `global-error.tsx` (wraps content in
    `<html><body>` and limits actions to "Try again" + "Reload page").

- Required props (`ErrorBoundaryShell`):

  - `title: string`
  - `message: string`
  - `tryAgainLabel: string`
  - `reloadLabel: string`
  - `goHomeLabel: string`
  - `detailsSummaryLabel: string`
  - `error: Error & { digest?: string }`
  - `onReset: () => void`
  - `showDetails?: boolean` (default `process.env.NODE_ENV === 'development'`; let
    apps pass when needed; do **not** read `NODE_ENV` in the shell — keep it pure).

- The shell renders the same JSX both apps render today. Action callbacks
  (`onReload`, `onGoHome`) default to `window.location.reload()` /
  `window.location.href = '/'` but are overridable.

### `@podverse/ui`: `loadGlobalErrorTranslations` helper (optional)

- Location: `packages/ui/src/lib/errorBoundary/loadGlobalErrorTranslations.ts`.
- Framework-agnostic helper accepting:

  ```ts
  loadGlobalErrorTranslations({
    loadMessages: (locale: string) => Promise<unknown>,
    loadFallback: () => Promise<unknown>,
    fallbackErrors: Record<string, string>,
    fallbackMisc: Record<string, string>,
  });
  ```

- Reads `NEXT_LOCALE` cookie, calls `loadMessages`, falls back to `loadFallback`,
  falls back to `fallback*` constants. Apps only own the dynamic-import paths
  (`apps/web/i18n/originals/<locale>.json` vs `apps/management-web/i18n/originals/<locale>.json`).

## App changes

### `apps/web/src/app/error.tsx`

Reduce to ~10 lines: import `ErrorBoundaryShell`, call `useTranslations`, pass
strings + `error` + `reset` through.

### `apps/management-web/src/app/error.tsx`

Identical shape to `apps/web` version (different namespace: still `errors` / `misc`).

### `apps/web/src/app/global-error.tsx` and `apps/management-web/src/app/global-error.tsx`

Reduce to ~25 lines each: keep the `useState` + `useEffect` to load translations using
the shared helper, then render `GlobalErrorBoundaryShell` with the resolved strings.

### SCSS

- Move `apps/web/src/styles/components/ErrorBoundary/ErrorBoundary.module.scss` and
  the management-web copy into
  `packages/ui/src/components/layout/ErrorBoundaryShell/ErrorBoundaryShell.module.scss`.
- Delete both app SCSS files.

## Barrel

Export from [`packages/ui/src/index.ts`](../../../../packages/ui/src/index.ts):

```ts
export {
  ErrorBoundaryShell,
  GlobalErrorBoundaryShell,
} from './components/layout/ErrorBoundaryShell/ErrorBoundaryShell';
export type {
  ErrorBoundaryShellProps,
  GlobalErrorBoundaryShellProps,
} from './components/layout/ErrorBoundaryShell/ErrorBoundaryShell';
export { loadGlobalErrorTranslations } from './lib/errorBoundary/loadGlobalErrorTranslations';
export type { LoadGlobalErrorTranslationsArgs } from './lib/errorBoundary/loadGlobalErrorTranslations';
```

## Tests

- Vitest: `packages/ui/src/components/layout/ErrorBoundaryShell/ErrorBoundaryShell.test.tsx`
  — render shell with strings; assert title/message/buttons; assert dev-only details
  block toggled via `showDetails`; click `onReset` calls back.
- Vitest: `packages/ui/src/lib/errorBoundary/loadGlobalErrorTranslations.test.ts` — happy
  path with mocked `loadMessages`, fallback path on rejection, ultimate fallback when
  both reject.

## Done when

- Both apps' `error.tsx` and `global-error.tsx` are <30 lines each.
- No `error.tsx` or `global-error.tsx` contains string fallbacks like
  `'Application Error'` — those live as `fallbackErrors` constants in `@podverse/ui` (or
  app-passed).
- `apps/*/src/styles/components/ErrorBoundary/` folders are deleted.
- `npm run lint`, `npm run build:packages`, and a build of each app pass from repo root.
