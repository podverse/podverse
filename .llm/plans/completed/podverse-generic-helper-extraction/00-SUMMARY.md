# Podverse Generic Helper Extraction - 00 Summary

## Scope
- Runtime production code only: `apps/*/src` and `packages/*/src`.
- Exclude tests, scripts, and tools for this wave.
- High-confidence generic helpers only.

## Goal
Move helper-style logic out of implementation-specific files into shared helper packages when the logic is generic, even if only one current caller exists.

## Destination Packages
- `@podverse/helpers`: isomorphic primitives and pure transforms.
- `@podverse/helpers-validation`: generic input validation/parsing contracts.
- `@podverse/helpers-backend`: Node/Express/backend helpers.
- `@podverse/helpers-browser`: browser-only helpers (`window`, `Blob`, DOM APIs).

## Candidate Inventory (High Confidence)

### A) String / Number / URL primitives
- `packages/v4v-metaboost/src/publicConversion.ts`
  - `parseNonEmptyString`
  - `parseRequiredNumber`
  - `normalizeUrl`
  - `normalizeCurrencyCode`
- `packages/v4v-metaboost/src/metaBoostCapabilityParseThresholdContext.ts`
  - `parseOptionalHttpUrl`
  - `parseOptionalNonEmptyString`
  - `parseOptionalNonNegativeInteger`
- `packages/v4v-metaboost/src/mbV1FetchCapability.ts`
  - `isValidHttpUrlString`
  - `normalizeCapabilityUrl`
- `packages/v4v-metaboost/src/mbrssV1FetchCapability.ts`
  - `isValidHttpUrlString`
  - `normalizeCapabilityUrl`

Target:
- Parse primitives to `@podverse/helpers`.
- URL validation primitives to `@podverse/helpers-validation`.

### B) API + workers backend helpers
- `apps/api/src/lib/params.ts`
  - `getParam`
  - `getParamRequired`
- `apps/api/src/lib/addByRSSParseCache.ts`
  - `buildAddByRSSParseCacheKey`
- `apps/workers/src/commands/addByRSSParseCache.ts`
  - `buildAddByRSSParseCacheKey` (duplicate pattern)

Target:
- `getParam*` helpers to `@podverse/helpers-backend`.
- Shared cache key builder to `@podverse/helpers-backend`.

### C) Browser helpers (web + management-web)
- `apps/web/src/components/Head/RuntimeConfigScript.tsx`
  - `serializeRuntimeConfig`
  - `buildRuntimeConfigScript`
- `apps/management-web/src/components/Head/RuntimeConfigScript.tsx`
  - duplicate of runtime config helpers
- `apps/web/src/lib/notifications/webpush/requestNotificationPermission.ts`
  - `urlBase64ToUint8Array`

Target:
- Runtime config script helpers to `@podverse/helpers-browser`.
- Web push conversion helper to `@podverse/helpers-browser`.

### D) Parser / mapping / ORM pure transforms
- `packages/parser-mapping/src/addByRSS/cacheMaps.ts`
  - `buildCacheMaps`
- `packages/orm/src/lib/redactForLog.ts`
  - `redactForLog`
- `packages/orm/src/lib/filterImageDtosByHighestWidth.ts`
  - `filterDtosByHighestWidth`

Target:
- Keep domain-specific transforms where they are unless clearly cross-domain.
- Only move to shared helper packages when reused or clearly generic.

## Out of Scope in This Wave
- Test-only helper refactors.
- Script and tooling helper extraction.
- Domain-heavy helpers where generalization is unclear.

## Risks To Preserve During Extraction
- URL helper semantics (allowed schemes, normalization behavior) must remain identical.
- Runtime config script escaping must preserve XSS-safe behavior (`<` escaping).
- Cache key format must remain byte-identical between API and workers.
- Avoid adding browser-only code into isomorphic helper packages.

## Success Criteria
- Local helper duplicates are removed for selected high-confidence targets.
- New helper APIs are exported from canonical shared packages.
- Call sites import from shared helper packages without behavior changes.
- Lint and type-check pass for touched workspaces.
