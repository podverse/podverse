# Plan 10 (Optional): ESM Build for Helper Packages

## Goal

Emit **ESM** from `@podverse/helpers` (and optionally `helpers-requests`, etc.) so bundlers can tree-shake more effectively. Complements `sideEffects: false` (Plan 02).

## Scope

- `packages/helpers`: `tsconfig.json`, build setup, `package.json` (`"module"`, `"exports"`).
- Optionally: `helpers-requests`, `helpers-validation`, `helpers-browser` if we extend ESM to them.

## Implementation

1. Add an ESM build (e.g. `dist/index.mjs` or `dist/esm/`) via `tsconfig` with `"module": "ESNext"` (or `"NodeNext"`) and `"moduleResolution": "Node16"` / `"NodeNext"`.
2. In `package.json`, set `"module": "dist/index.mjs"` (or equivalent) and, if needed, `"exports"` so consumers resolve ESM when appropriate.
3. Keep existing CJS build for Node/backward compatibility unless we deliberately drop it; dual CJS+ESM is common.
4. Run `build:packages`, verify dependent apps and packages still build and tests pass.

## Verification

- `npm run build:packages` and `npm run lint`.
- `apps/web` and `apps/api` (or other consumers) build and run.
- Bundle analyzer: client bundle size for web unchanged or improved after ESM.

## Success Criteria

- Helpers (at minimum) publish ESM; consumers use it where beneficial.
- No build or runtime regressions.

## When to Use

Pursue after Plans 01–08 if you need further tree-shaking gains. Higher effort than 02–03.
