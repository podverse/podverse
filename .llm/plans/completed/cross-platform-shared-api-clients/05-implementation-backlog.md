# Implementation backlog (detailed)

Use this as the actionable backlog when executing phases in `03-rollout-phases-and-verification.md`.

## Phase 2 backlog — shared core + main client wiring

- Create package scaffold:
  - `packages/http-request-core/package.json`
  - `packages/http-request-core/tsconfig.json`
  - `packages/http-request-core/src/index.ts`
  - `packages/http-request-core/src/request.ts`
- Extract and normalize behavior currently duplicated in:
  - `packages/helpers-requests/src/_request.ts`
  - `apps/management-web/src/lib/requests/_request.ts`
- Add unit tests in core package for:
  - JSON content-type behavior (`POST`/`PUT`/`PATCH`)
  - timeout + abort behavior
  - header merge precedence
  - response + error shape contract
- Refactor `helpers-requests` internals to consume core exports without breaking public API.

## Phase 3 backlog — management client package extraction

- Create package scaffold:
  - `packages/management-api-requests/package.json`
  - `packages/management-api-requests/tsconfig.json`
  - `packages/management-api-requests/src/index.ts`
  - `packages/management-api-requests/src/client.ts`
- Move request modules from:
  - `apps/management-web/src/lib/requests/*.ts`
  - into `packages/management-api-requests/src/...`
- Keep temporary compatibility layers in app:
  - app-local files re-export package functions
  - no transport logic remains app-local
- Add package tests for:
  - base URL assembly
  - auth context mapping to request headers/cookies
  - representative admin/users/stats request modules

## Phase 4 backlog — auth context and bearer-ready constructors

- Define shared auth context types and helpers in core package.
- Update both client packages to accept shared auth context.
- Update web/SSR shell code to build cookie auth context from existing sessions.
- Add examples/docs for bearer auth initialization.
- Add regression tests for:
  - cookie context path (web/SSR parity)
  - bearer context path (mobile readiness)

## Phase 5 backlog — mobile token endpoints (API + clients)

- Add/update endpoint handlers in:
  - `apps/api/src/routes/auth.ts` (+ controllers/services as needed)
  - `apps/management-api/src/routes/auth.ts` (+ controllers/services as needed)
- Add rotating refresh token persistence model (tables/entities/services) for both auth domains or a
  shared policy with clear domain partitioning.
- Add/update schema validation for token endpoint payloads.
- Add/update OpenAPI definitions for endpoint contracts.
- Add integration tests in API and management-api test suites for allow/deny paths.
- Add integration tests for refresh token reuse detection and invalidation of token families.
- Add typed request wrappers in:
  - `packages/helpers-requests/src/api/auth/*`
  - `packages/management-api-requests/src/auth/*`

## Cleanup backlog (post-migration)

- Remove deprecated app-local compatibility re-exports once adoption is complete.
- Remove obsolete comments/docs pointing to app-local request ownership.
- Ensure `packages/helpers-requests` and `packages/management-requests` exports are explicit and
  stable.
