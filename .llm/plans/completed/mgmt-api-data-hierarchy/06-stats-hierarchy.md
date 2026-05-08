# Phase 06 — Stats hierarchy inversion

Entity type becomes the parent in the URL; ranking/search are children of the
entity type.

## Scope

- API renames:
  - `GET /stats/top/:entityType` -> `GET /stats/:entityType/top`
  - `GET /stats/detail/:entityType/:id` -> `GET /stats/:entityType/:id`
  - `GET /stats/search/:entityType` -> `GET /stats/:entityType/search`
- Convert `stats.ts` to mount-style.
- No web URL changes (`/stats` page unchanged).

## Steps

1. Mount `apps/management-api/src/routes/stats.ts` at `/stats`. Rewrite
   handlers:
   - `router.get('/:entityType/top', ...)`
   - `router.get('/:entityType/search', ...)`
   - `router.get('/:entityType/:id', ...)` (must be registered LAST so `/top`
     and `/search` are not shadowed).
2. Update `apps/management-api/src/routes/stats.integration.test.ts` paths.
3. Update `apps/management-web/src/lib/requests/stats.ts`:
   - `reqStatsTop` -> path `/stats/${entityType}/top?...`
   - `reqStatsDetail` -> path `/stats/${entityType}/${id}`
   - `reqStatsSearch` -> path `/stats/${entityType}/search?...`
4. Update e2e spec `stats-page.spec.ts` if it asserts API paths.

## Key files

- `apps/management-api/src/routes/stats.ts`
- `apps/management-api/src/routes/stats.integration.test.ts`
- `apps/management-web/src/lib/requests/stats.ts`
- `apps/management-web/e2e/stats-page.spec.ts`

## Verification

- Integration tests pass for invalid entity type (400), missing id (404), and
  ranking/search/detail happy paths.
- `make e2e_test_management_web_report_spec SPEC=e2e/stats-page.spec.ts`
  passes.
