# Phase 07 — Workers resource (was /worker-commands)

Reserves `/workers` as the namespace for current and future worker-related
endpoints.

## Scope

- API rename: `GET /worker-commands` -> `GET /workers/commands`.
- Convert `workerCommands.ts` to mount-style at `/workers`.
- No web page rename (`/workers` page already exists).

## Steps

1. Rename `apps/management-api/src/routes/workerCommands.ts` ->
   `workers.ts`. Mount at `/workers`. Replace handler with
   `router.get('/commands', ...)`.
2. Update `apps/management-api/src/app.ts` import
   (`workerCommandsRouter` -> `workersRouter`).
3. Rename
   `apps/management-api/src/routes/workerCommands.integration.test.ts` ->
   `workers.integration.test.ts`; update paths.
4. Rename `apps/management-web/src/lib/requests/workerCommands.ts` ->
   `workers.ts`. `listWorkerCommands` -> path `/workers/commands` (function
   name may stay).
5. Update `WorkersPageClient.tsx` import path if it changed.
6. Update e2e spec `workers-page.spec.ts` if it asserts API paths.

## Key files

- `apps/management-api/src/routes/workers.ts` (renamed)
- `apps/management-api/src/routes/workers.integration.test.ts` (renamed)
- `apps/management-api/src/app.ts`
- `apps/management-web/src/lib/requests/workers.ts` (renamed)
- `apps/management-web/src/app/(management)/workers/WorkersPageClient.tsx`
- `apps/management-web/e2e/workers-page.spec.ts`

## Verification

- `npm run test:e2e:api` covers `/workers/commands` (200, 401, 403).
- `make e2e_test_management_web_report_spec SPEC=e2e/workers-page.spec.ts`
  passes.
