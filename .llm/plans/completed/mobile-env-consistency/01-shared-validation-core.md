# 01 — Shared value-based validation core

Extract the pure validation logic so both backend and mobile reuse it. No behavior change for backend.

## Why

`@podverse/helpers-config` validators read `process.env[varName]` internally, which Expo cannot inline (dynamic access). Splitting the pure logic (value in, `ValidationResult` out) into `@podverse/helpers` (mobile-safe) makes it reusable everywhere.

## Tasks

1. In `@podverse/helpers`, add a config-validation module (e.g. `packages/helpers/src/configValidation/`):
   - Move `ValidationResult` and `ValidationSummary` types here (from `packages/helpers-config/src/startupValidation.ts`).
   - Add value-based pure functions that take the resolved value + `varName` + `category` and return a `ValidationResult`. At minimum the generic ones mobile/backend share:
     - `validateRequiredValue(value, varName, category)`
     - `validateOptionalValue(value, varName, category, defaultMessage?)`
     - `validateOptionalNonEmptyValue(...)`, `validatePositiveNumberValue(...)`, `validateBooleanValue(...)`
     - `validateAbsoluteHttpUrlValue(value, varName, category, { required })` (reuse the `^https?://` check from `validateOptionalAbsoluteHttpUrlIfSet`).
   - Keep the existing numeric special-casing (`_PORT`, `_EXPIRATION`) inside the value-based core so behavior is identical.
   - Export from `packages/helpers/src/index.ts`.

2. Refactor `packages/helpers-config/src/startupValidation.ts`:
   - Re-export `ValidationResult` / `ValidationSummary` from `@podverse/helpers` (back-compat for existing importers).
   - Rewrite `validateRequired`, `validateOptional`, `validateOptionalNonEmpty`, `validatePositiveNumber`, `validateBoolean`, `validateOptionalAbsoluteHttpUrlIfSet` as thin wrappers: read `process.env[varName]`, then delegate to the value-based core. Keep exported names/signatures unchanged.
   - Domain-specific validators (locale, theme, signup mode, server env, user-agent, log level, web protocol) may stay name-based for now OR delegate to a value-based helper if trivial — do not expand scope.

3. Update `@podverse/helpers-config` unit tests only if imports of `ValidationResult` moved; do not change assertions. Keep all existing tests green.

4. Respect build order: `@podverse/helpers` builds before `@podverse/helpers-config` (already the case). Run `npm run build:packages` mentally — no new package added.

## Constraints

- No `process.env` access in the `@podverse/helpers` core module (value-based only) so it is mobile-safe.
- Backend public API of `@podverse/helpers-config` unchanged.
- Do not run tests during agent work; end with operator verification commands.
