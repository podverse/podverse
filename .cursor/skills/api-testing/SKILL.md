---
name: api-testing
description: When changing API routes, auth, or env-dependent behavior, add or update the corresponding integration tests and keep the test file layout consistent.
version: 1.0.0
---

# API Integration Testing (Podverse)

Testing requirement policy lives in **feature-implementation-testing**. This skill focuses on **how** to add or update API integration tests. If an API change affects behavior in `apps/web` or `apps/management-web`, also update the corresponding E2E specs (see e2e-page-tests).

Use this skill when adding or changing auth endpoints, routes, or any API behavior that depends on environment variables.

## Test file layout

| File                                                   | Scope                            | When to update                               |
| ------------------------------------------------------ | -------------------------------- | -------------------------------------------- |
| `apps/api/src/test/*.test.ts`                          | API integration tests            | Add tests for new routes or behavior changes |
| `apps/management-api/src/routes/*.integration.test.ts` | Management-API integration tests | Change when management routes change         |

- **Base URL**: Use `config.api.prefix` + `config.api.version` (from config), never hardcode `/api/v2`.
- **Test data**: Use file-unique prefixes for all emails, usernames, and identifiers so tests run without collisions.

## Test setup

**Canonical test env** lives in [`packages/helpers-config/src/podverseTestEnv.ts`](packages/helpers-config/src/podverseTestEnv.ts). Vitest setup files and Playwright E2E server prefixes import builders from `@podverse/helpers-config`. Integration tests and E2E do **not** require `make local_env_setup` (only `make test_deps` plus app builds).

### apps/api

- `apps/api/src/test/setup.ts` applies `buildPodverseApiTestEnv({ profile: 'apiVitest' })`.
- `apps/api/vitest.config.ts` references the setup file via `setupFiles`.
- `apps/api/src/test/podverse-test-env-startup.test.ts` asserts Vitest and web-E2E profiles pass `validateStartupRequirements()`.
- Tests that need different env override only those vars at the top of the file and load config via dynamic import in `beforeAll`.

### apps/management-api

- `apps/management-api/vitest.setup.ts` applies `buildPodverseManagementApiTestEnv({ profile: 'managementApiVitest' })`.
- `apps/management-api/vitest.config.ts` references the setup file.
- `apps/management-api/src/test/podverse-test-env-startup.test.ts` asserts Vitest and E2E profiles pass startup validation.
- For ORM-dependent tests, mock the ORM layer or ensure test DB is populated.

### Playwright E2E

- Web API server: `buildPodverseApiTestEnv({ profile: 'apiWebE2e' })` via `apps/web/playwright.e2e-server-env.ts` (sets `PODVERSE_SKIP_DOTENV=true`).
- Management API: `buildPodverseManagementApiTestEnv` via `apps/management-web/playwright.management-api-env.ts`.

## Requirements

- **Before tests:** Postgres and Valkey must be up and test DBs created. Run `make test_deps` from repo root (starts Postgres on **5732**, Valkey on **6679**, creates `podverse_app_test` and `podverse_management_test`).
- **Check requirements:** `node scripts/check-test-requirements.mjs` verifies ports are reachable; exits with instructions if not.
- **Root command:** `npm run test:e2e:api` runs check-requirements then both API test suites.

## What to update when the API changes

1. **New route**: Add a test file in the appropriate test directory with happy path and error cases.
2. **Schema/ORM change**: Ensure entity column names match the DB so tests don't fail with "column does not exist".
3. **New env variable**: Add it to `packages/helpers-config/src/podverseTestEnv.ts` for every affected profile, then run `podverse-test-env-startup.test.ts` in api and/or management-api.

## Quick reference

- Run all API tests: `npm run test:e2e:api` from repo root.
- Run one API test file: `npm run test -w apps/api -- src/test/<file>.test.ts`
- Run management-api tests: `npm run test -w apps/management-api`
- Test env: `packages/helpers-config/src/podverseTestEnv.ts` (ports 5732/6679, DB names `podverse_app_test`/`podverse_management_test`).
