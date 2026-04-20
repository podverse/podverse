# Podverse Generic Helper Extraction - 01 Foundation Shared Primitives

## Scope
Create canonical shared helper APIs for generic primitives so downstream extraction plans can import consistent functions.

## Files To Touch
- `packages/helpers/src/` (new primitive helpers + exports)
- `packages/helpers-validation/src/` (URL parsing/validation primitive wrapper)
- `packages/helpers-backend/src/` (backend-safe parameter helpers where needed)
- `packages/helpers-browser/src/` (browser utility exports used by web plans)
- Package `src/index.ts` files for new exports

## Foundation APIs To Introduce

### A) `@podverse/helpers` primitives
Introduce a focused primitive module for isomorphic usage:
- `parseNonEmptyString(value: unknown): string | null`
- `parseFiniteNumber(value: unknown): number | null`
- `normalizeUpperCaseToken(value: string): string` (trim + upper-case, generic naming)

Notes:
- Keep function contracts minimal and deterministic.
- No environment-specific behavior here.

### B) `@podverse/helpers-validation` URL primitive
Introduce or expose a low-level URL parser primitive:
- `parseHttpOrHttpsUrl(urlRaw: string): URL | null`

Then use this primitive internally in existing URL validators where possible.

Notes:
- Preserve existing behavior in existing public validators.
- Do not embed domain/path-specific checks in generic URL primitive.

### C) `@podverse/helpers-backend` request parameter helpers
Introduce backend-focused helpers:
- `getParam(params: Record<string, unknown>, key: string): string | null`
- `getParamRequired(params: Record<string, unknown>, key: string): string`

Notes:
- Keep implementation generic over params object so both Express apps can share it.
- Throw message for required helper should remain stable and clear.

### D) `@podverse/helpers-browser` browser primitives
Introduce browser-only utility exports:
- `urlBase64ToUint8Array(base64String: string): Uint8Array`
- Runtime config script helpers:
  - `serializeRuntimeConfig(config: unknown): string`
  - `buildRuntimeConfigScript(config: unknown): string`

Notes:
- Preserve XSS-safe escaping behavior in runtime script serialization.

## Implementation Steps
1. Add helper implementation files in each target package.
2. Export helpers from each package `src/index.ts`.
3. Ensure naming is generic and reusable.
4. Keep dependencies minimal to avoid bundle growth.

## Acceptance Criteria
- All new foundation helpers compile.
- APIs are exported from canonical package entrypoints.
- No app/package callsite changes in this plan except local package-internal validator composition.

## Verification
Run from monorepo root:

```bash
npm run build -w packages/helpers
```

```bash
npm run build -w packages/helpers-validation
```

```bash
npm run build -w packages/helpers-backend
```

```bash
npm run build -w packages/helpers-browser
```
