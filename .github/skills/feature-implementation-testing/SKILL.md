---
name: feature-implementation-testing
description: When creating or implementing plans for features that touch api, management-api, web, or management-web, include the corresponding tests — integration tests for api/management-api and E2E tests for web/management-web.
version: 1.0.0
---

# Feature Implementation Testing Requirement

When **creating or implementing plans** for features that touch `apps/api`, `apps/management-api`, `apps/web`, or `apps/management-web`, adding or updating the corresponding tests is a **requirement**, not optional.

**Terminology:** **Integration tests** = api/management-api (Vitest, no browser). **E2E tests** = web/management-web (Playwright, browser).

## Requirement by app

- **api / management-api**: Add or update **integration tests** (see **api-testing**). If the change affects UI in web or management-web, also add or update the relevant **E2E tests** (see **e2e-page-tests**).
- **web / management-web**: Add or update **E2E tests** (see **e2e-page-tests**, **e2e-crud-state-matrix** as applicable).

## When this applies

- Implementing a plan file that touches any of the four apps.
- Implementing a feature (with or without a plan) that makes meaningful changes to api, management-api, web, or management-web.

## Planning vs implementation

- **Plan creation phase:** Do not implement product code or tests. Include explicit testing work in the plan steps (integration tests for api/management-api changes, E2E tests for web/management-web changes).
- **Implementation phase:** Add or update the actual test files as required by this policy.

Apply the relevant skill for _how_ to write the tests (api-testing for integration tests, e2e-page-tests for Playwright specs).

## Test command reference

| Script                 | What it runs                                                                  | Services needed                                       |
| ---------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------- |
| `npm run test:unit`    | Vitest in packages and apps (excludes api/management-api)                     | None                                                  |
| `npm run test:e2e:api` | `check-test-requirements` then Vitest in apps/api + apps/management-api       | Postgres **5732**, Valkey **6679** (`make test_deps`) |
| `npm run test:e2e:web` | `make e2e_test_playwright` (Playwright: web + management-web; not API Vitest) | Pairs with `test:e2e:api` in `npm test`               |
| `npm run test:reports` | `test:unit` then `test:e2e:api` then `test:e2e:web:reports`                   | All tiers                                             |
| `npm test`             | `test:unit` then `test:e2e:api` then `test:e2e:web`                           | All tiers                                             |
