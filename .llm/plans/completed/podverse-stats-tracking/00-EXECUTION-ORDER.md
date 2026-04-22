# Execution order

1. Plan files (this folder) — reference only.
2. `packages/helpers-requests` — stats API functions + `ApiRequestService` wrappers.
3. `apps/web` — `trackStats*` helpers + page/hook wiring.
4. `apps/api` — integration tests + `supertest` devDependency.
5. Run `npm run lint -w packages/helpers-requests`, `npm run lint -w apps/web`, `npm run test -w apps/api -- src/test/stats.track.test.ts`.
