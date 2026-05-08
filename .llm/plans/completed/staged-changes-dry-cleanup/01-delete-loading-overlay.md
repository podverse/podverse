# 01 — Delete dead `LoadingOverlay`

## Goal

Remove [`packages/ui/src/components/layout/LoadingOverlay/`](../../../../packages/ui/src/components/layout/LoadingOverlay/).
It re-implements `LoadingSpinner`'s pixel map and uses `<FaSpinner>` directly, while
[`LoadingSpinnerOverlay`](../../../../packages/ui/src/components/layout/LoadingSpinnerOverlay/LoadingSpinnerOverlay.tsx)
already composes `LoadingSpinner` correctly. No app imports `LoadingOverlay` — it is
dead code.

## Why

- `LoadingOverlay` defines its own `SPINNER_PX = { small: 18, medium: 32, large: 48 }`
  duplicating `LoadingSpinner`'s `SIZE_PX`.
- `LoadingSpinnerOverlay` already provides the same UX and reuses `LoadingOverlay`'s
  SCSS classes — but uses `LoadingSpinner` for the spinner.
- A repo-wide grep confirms no consumer outside the package's own files
  (`index.ts`, test, history docs).

## Files to remove

- `packages/ui/src/components/layout/LoadingOverlay/LoadingOverlay.tsx`
- `packages/ui/src/components/layout/LoadingOverlay/LoadingOverlay.module.scss`
- `packages/ui/src/components/layout/LoadingOverlay/LoadingOverlay.test.tsx`
- `packages/ui/src/components/layout/LoadingOverlay/index.ts`
- The directory itself.

## Files to update

- [`packages/ui/src/index.ts`](../../../../packages/ui/src/index.ts) — remove the
  `LoadingOverlay` and `LoadingOverlaySpinnerSize` exports (lines ~96–100).
- [`packages/ui/src/components/layout/LoadingSpinnerOverlay/LoadingSpinnerOverlay.tsx`](../../../../packages/ui/src/components/layout/LoadingSpinnerOverlay/LoadingSpinnerOverlay.tsx)
  — currently imports `overlayStyles` and `LoadingOverlaySpinnerSize` from
  `../LoadingOverlay`. Move those styles next to `LoadingSpinnerOverlay` (rename SCSS
  classes if needed) and define `LoadingSpinnerOverlaySize` locally (or alias
  `LoadingSpinnerSize` directly).
- Re-export the renamed type from `index.ts` if any thin wrapper relied on the old
  `LoadingOverlaySpinnerSize` name (search before removing).

## Steps

1. Move the four SCSS rules from `LoadingOverlay.module.scss` (`.overlay`, `.content`,
   `.message`, `.spinnerWrapper`) into `LoadingSpinnerOverlay.module.scss` (or a
   neighbour SCSS file in the same directory).
1. Update `LoadingSpinnerOverlay.tsx` imports so it no longer touches `../LoadingOverlay`.
1. Delete the `LoadingOverlay/` directory.
1. Remove the `LoadingOverlay` exports from `packages/ui/src/index.ts` (one block).
1. Search the repo for `LoadingOverlay` and `LoadingOverlaySpinnerSize` to confirm no
   stale imports remain (history / plan markdown matches are fine).

## Done when

- `npm run lint -w @podverse/ui` and `npm run build:packages` pass from repo root.
- Repo-wide grep for `LoadingOverlay` returns only `.llm/` history matches.
