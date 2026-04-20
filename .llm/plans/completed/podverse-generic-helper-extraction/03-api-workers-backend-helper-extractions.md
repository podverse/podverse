# Podverse Generic Helper Extraction - 03 API Workers Backend

## Scope
Extract duplicated backend helper patterns across API and workers to `@podverse/helpers-backend`.

## Primary Files
- `apps/api/src/lib/params.ts`
- `apps/api/src/lib/addByRSSParseCache.ts`
- `apps/workers/src/commands/addByRSSParseCache.ts`
- Related backend helper package exports in `packages/helpers-backend/src/index.ts`

## Extraction Mapping

### 1) Params helpers
Current local API helpers:
- `getParam`
- `getParamRequired`

Action:
- Move generic implementation to `@podverse/helpers-backend`.
- Replace local definitions in API with package imports.
- Reuse same helpers in management-api if applicable (optional in this wave if zero-risk and runtime-only).

### 2) Add-by-RSS cache key builder
Current duplicate pattern:
- `buildAddByRSSParseCacheKey` in API and workers.

Action:
- Move one canonical implementation to `@podverse/helpers-backend`.
- Update API and workers call sites to import the shared function.

## Detailed Steps
1. Add backend helper modules and exports in `packages/helpers-backend/src`.
2. Update API and workers files to consume shared helpers.
3. Remove duplicate local helper declarations after import migration.
4. Confirm no changes to cache key format, delimiter, or ordering.

## Risks
- Cache key contract must remain byte-for-byte identical to avoid cache misses.
- `getParamRequired` thrown error messaging may be consumed by callers/tests; keep wording stable where required.

## Acceptance Criteria
- API and workers both import the same cache-key helper from `@podverse/helpers-backend`.
- API `params.ts` local helper logic is replaced by shared imports.
- No behavior changes in runtime parameter parsing.

## Verification
Run from monorepo root:

```bash
npm run build -w packages/helpers-backend
```

```bash
npm run build -w apps/api
```

```bash
npm run build -w apps/workers
```

```bash
npm run lint -w apps/api && npm run lint -w apps/workers
```
