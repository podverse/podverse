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

- **Base URL**: Use `config.api.prefix` + `config.api.version` (from config), never hardcode `/api/v1`.
- **Test data**: Use file-unique prefixes for all emails, usernames, and identifiers so tests run without collisions.

## Test setup

### apps/api

- `apps/api/src/test/setup.ts` sets smart-default env for all tests (DB port 5732, Valkey port 6679, test DB names).
- `apps/api/vitest.config.ts` references the setup file via `setupFiles`.
- Tests that need different env override only those vars at the top of the file and load config via dynamic import in `beforeAll`.

### apps/management-api

- `apps/management-api/vitest.setup.ts` sets test env (DB port 5732, `podverse_management_test`).
- `apps/management-api/vitest.config.ts` references the setup file.
- For ORM-dependent tests, mock the ORM layer or ensure test DB is populated.

## Requirements

- **Before tests:** Postgres and Valkey must be up and test DBs created. Run `make test_deps` from repo root (starts Postgres on **5732**, Valkey on **6679**, creates `podverse_app_test` and `podverse_management_test`).
- **Check requirements:** `node scripts/check-test-requirements.mjs` verifies ports are reachable; exits with instructions if not.
- **Root command:** `npm run test:e2e:api` runs check-requirements then both API test suites.

## What to update when the API changes

1. **New route**: Add a test file in the appropriate test directory with happy path and error cases.
2. **Schema/ORM change**: Ensure entity column names match the DB so tests don't fail with "column does not exist".
3. **New env variable**: Add it to the test setup file with a safe default.

## Quick reference

- Run all API tests: `npm run test:e2e:api` from repo root.
- Run one API test file: `npm run test -w apps/api -- src/test/<file>.test.ts`
- Run management-api tests: `npm run test -w apps/management-api`
- Test env: `apps/api/src/test/setup.ts` (ports 5732/6679, DB names `podverse_app_test`/`podverse_management_test`).
