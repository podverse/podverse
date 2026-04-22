# 01 — Test Helpers and Shared Utilities

**Implemented.** Delivered: `helpers/index.ts` (`startTestApp`, `stopTestApp`, `authHeaders`, `adminAuthHeaders`, `createMockFn`, `getBaseApiUrl`), `helpers/mockAccount.ts` (`createDefaultAccountGet`, `defaultAccountGet`), `helpers/mockOrm.ts` (`IntegrationTestNoopCategoryService`). The original `mockOrmServices(overrides)` factory was not added; each test file keeps a focused `vi.mock('@podverse/orm', …)` and can import the shared no-op category + account helpers.

## Goal

Extract shared test utilities into `apps/api/src/test/helpers/` so that every subsequent test file can reuse the same patterns for app startup, auth token generation, and ORM mocking.

## Why first

Every test file needs the same `beforeAll`/`afterAll` lifecycle, JWT generation, and mock setup. Duplicating this across 12+ files creates maintenance burden and inconsistency. A shared module eliminates that.

## Files to create

### `apps/api/src/test/helpers/index.ts`

Shared exports:

1. **`startTestApp()`** — initializes ORM context, imports and starts the Express app, returns `{ app, server, ormContext }`. Encapsulates the `beforeAll` pattern from `stats.track.test.ts`.
2. **`stopTestApp(server, ormContext)`** — closes server and destroys ORM data sources. Encapsulates the `afterAll` pattern.
3. **`authHeaders(userId?, email?)`** — returns `{ Authorization: 'Bearer <jwt>' }` signed with `AUTH_JWT_SECRET`. Defaults to `{ id: 1, email: 'test-user@example.com' }`.
4. **`adminAuthHeaders(userId?, email?)`** — same as above but with admin-scoped email for management-api tests.
5. **`createMockFn(resolvedValue?)`** — wraps `vi.fn(async () => resolvedValue)` for consistent mock creation.
6. **`baseApiUrl`** — computed from `config.api.prefix + config.api.version` so tests never hardcode `/api/v1`.

### `apps/api/src/test/helpers/mockAccount.ts`

Standard mock for `AccountService.get()` that returns a valid account with active membership when `id === 1` and `null` otherwise. This is reused in every test file that needs auth.

### `apps/api/src/test/helpers/mockOrm.ts`

A helper function `mockOrmServices(overrides)` that:
- Imports the actual `@podverse/orm` via `importOriginal`
- Accepts an object of service name → mock class overrides
- Returns the merged module (actual + overrides)
- Always includes `MockCategoryService` (needed for app startup) and `MockAccountService` (needed for auth)

## Implementation steps

1. Create `apps/api/src/test/helpers/` directory
2. Create `index.ts` with the six exports listed above
3. Create `mockAccount.ts` with the standard account mock
4. Create `mockOrm.ts` with the `mockOrmServices` helper
5. Refactor `stats.track.test.ts` to use the new helpers (validate they work)
6. Run `npm run test -w apps/api -- src/test/stats.track.test.ts` to verify no regressions

## Verification

```bash
./scripts/nix/with-env npm run test -w apps/api -- src/test/stats.track.test.ts
./scripts/nix/with-env npm run test -w apps/api -- src/test/env.smoke.test.ts
```
