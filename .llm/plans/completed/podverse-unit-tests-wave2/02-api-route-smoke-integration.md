# Wave 2 — API Route Smoke (Integration)

## Status

Deferred in this wave: adding supertest-based smoke tests requires a stable API bootstrap path (config/env) and was not implemented here. Revisit when CI provides a reproducible test env or a thin `createTestApp()` harness exists.

## Targets

- [apps/api/src/app.ts](apps/api/src/app.ts)
- Critical routes under [apps/api/src/routes/](apps/api/src/routes/)

## Intent

Add **small-surface** HTTP integration tests (e.g. supertest) where:

- Routes are stable and cheap to exercise (health, auth shape, 401/403 contracts).
- Tests do **not** require production DB if avoidable (use existing test doubles or skip if env blocks).

## Guardrails

- Prefer a **single shared test bootstrap** helper over per-route duplication.
- Skip full DB-backed flows unless CI already provisions a test DB.

## Planned first slice

1. Smoke: app boots and responds on a documented path (404 or health).
2. Optional: unauthenticated protected route returns 401 JSON shape.

## Verification

```bash
./scripts/nix/with-env npm run test -w apps/api
```

## Deferred

If Express bootstrap requires full env/secrets for CI, document skip and rely on Wave 2 Phase 03–05 unit tests instead.
