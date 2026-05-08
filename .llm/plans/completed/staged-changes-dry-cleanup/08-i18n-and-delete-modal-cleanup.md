# 08 — `useDeleteModal` i18n + loading namespace alignment

## Goal

Two small i18n cleanups in `@podverse/ui` and the apps:

1. Remove the hard-coded English `'Delete failed'` fallback from
   [`useDeleteModal`](../../../../packages/ui/src/hooks/useDeleteModal.ts).
1. Align `common.loading` (management-web) vs `misc.loading` (web) so a single
   canonical key exists for "generic loading" announcements.

## Why

### `useDeleteModal` fallback

`packages/ui/src/hooks/useDeleteModal.ts` line ~47 currently calls
`setError(err instanceof Error ? err.message : 'Delete failed');`. This violates
[`shared-ui-i18n.mdc`](../../../../.cursor/rules/shared-ui-i18n.mdc) (no English
defaults inside `@podverse/ui` for user-visible text). The string is currently dead
because `ResourceTableWithFilter` does not surface `deleteModal.error` to the
`DeleteConfirmModalShell`, but the hook should not own a copy decision either way.

### Loading namespace

`ManagementLoadingSpinnerFull` resolves `common.loading`; `WebLoadingSpinnerOverlay`
resolves `misc.loading`. Same concept, two namespaces — translators see and have to
maintain two keys. Pick one.

## Design

### `useDeleteModal`

- Add an optional `formatError?: (err: unknown) => string` callback to
  `UseDeleteModalOptions`.
- Replace the hard-coded `'Delete failed'` with `formatError?.(err) ?? ''`. When the
  caller does not provide `formatError`, the hook stores empty string. Callers that
  actually surface `error` (none today) must opt in.
- Update JSDoc and the `useDeleteModal.test.tsx` test to cover both branches:

  - Caller passes `formatError` → custom string surfaces.
  - Caller omits `formatError` → `error` stays empty.

### Loading namespace

- Decide on a single canonical key. Two acceptable options:

  - **Option A (recommended):** keep `misc.loading` for both apps — `misc` is already
    used by web for the same concept, and the management-web key is a thin wrapper.
  - **Option B:** keep `common.loading` and add it to web's `i18n/originals/*.json`.

- Update the affected app wrapper(s):

  - If Option A: change `apps/management-web/src/components/LoadingSpinner/Management*`
    spinner wrappers to `useTranslations('misc')` and use `t('loading')`. Add the key
    to `apps/management-web/i18n/originals/*.json` if not already present; remove
    `common.loading` if it has no other consumers.
  - If Option B: mirror `common.loading` into all `apps/web/i18n/originals/*.json` and
    update `WebLoadingSpinnerOverlay` and any sibling wrappers accordingly.

- Run the i18n sync flow (see [`i18n-management.mdc`](../../../../.cursor/rules/i18n-management.mdc))
  to keep translation overrides aligned.

## Tests

- `useDeleteModal.test.tsx` — cover `formatError` provided and omitted.
- No new test for the i18n key change beyond the existing wrappers' render tests
  (assert the spinner has the expected `aria-label`).

## Done when

- Repo-wide grep for `'Delete failed'` returns zero matches in `packages/ui`.
- Repo-wide grep for `common.loading` and `misc.loading` returns one canonical key
  (with the other namespace removed if unused).
- `npm run lint` passes; affected apps build.
- Vitest for `@podverse/ui` and the affected app wrapper still pass.
