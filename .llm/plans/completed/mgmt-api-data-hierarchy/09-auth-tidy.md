# Phase 09 — Auth tidy

Mount-style refactor only.

## Scope

- Convert `auth.ts` to mount-style at `/auth`.
- No URL changes (`/auth/login`, `/auth/logout`, `/auth/me` already correct).

## Steps

1. `apps/management-api/src/routes/auth.ts`: mount at `/auth`, rewrite handlers
   as `'/login'`, `'/logout'`, `'/me'`.
2. Update `apps/management-api/src/routes/auth.integration.test.ts` only if any
   path strings changed (they should not).

## Key files

- `apps/management-api/src/routes/auth.ts`
- `apps/management-api/src/routes/auth.integration.test.ts`

## Verification

- `npm run test:e2e:api` auth suite passes.
- `make e2e_test_management_web_report_spec SPEC=e2e/smoke.spec.ts,e2e/navbar-chrome.spec.ts`
  passes (login flow).
