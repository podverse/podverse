# Plan 02: Add `sideEffects: false` to Helper Packages

## Goal

Add `"sideEffects": false` to `@podverse/helpers`, `@podverse/helpers-requests`, `@podverse/helpers-validation`, and `@podverse/helpers-browser` so bundlers can safely drop unused exports and improve tree-shaking.

## Scope

- `packages/helpers/package.json`
- `packages/helpers-requests/package.json`
- `packages/helpers-validation/package.json`
- `packages/helpers-browser/package.json`

## Implementation

Add `"sideEffects": false` to each `package.json`. Place it at the top level (same level as `"name"`, `"version"`, etc.).

**Example** (`packages/helpers/package.json`):

```json
{
  "name": "@podverse/helpers",
  "version": "5.2.2",
  "sideEffects": false,
  "description": "...",
  ...
}
```

Apply the same addition to the other three packages. Do not add `sideEffects` to packages that truly have side effects (e.g. main app packages, config scripts); this plan only touches the four listed above.

## Verification

1. From monorepo root:
   ```bash
   npm run build:packages
   npm run lint
   ```
2. Build and run the web app:
   ```bash
   cd apps/web && npm run build
   ```
3. Run the bundle analyzer and compare against a baseline (post–Plan 01) to confirm client bundle size still measures correctly and that tree-shaking did not regress (optional: expect modest size improvements).

## Success Criteria

- All four packages declare `"sideEffects": false`.
- `build:packages` and `lint` pass.
- `apps/web` production build succeeds.
