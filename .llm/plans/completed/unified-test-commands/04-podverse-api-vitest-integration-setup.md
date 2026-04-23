# Phase 04 — Podverse: API + management-api Vitest integration setup

## Prerequisites

- Phase 02: `make test_deps` provides Postgres **5732**, Valkey **6679**, initialized test DBs.
- Phase 03: `scripts/check-test-requirements.mjs` passes; `npm run test -w apps/api` can be invoked after env setup.

## Goal

Bring Podverse [`apps/api`](../../../../apps/api) and [`apps/management-api`](../../../../apps/management-api) test harnesses in line with Metaboost patterns (setup, globalSetup, env defaults).

**v1 stop line — integration file count:** At most **one** integration-style Vitest file per app for foundations (e.g. **two files total** across api + management-api). Existing [`adminAccount.integration.test.ts`](../../../../apps/management-api/src/routes/adminAccount.integration.test.ts) can satisfy management-api; **apps/api** adds **one** focused file (route or health smoke). Expand coverage in a later plan; do not grow a large route matrix here.

**Harness parity:**

- Shared smart-default env in **`src/test/setup.ts`** (Metaboost reference: [`apps/api/src/test/setup.ts`](../../../../../metaboost/apps/api/src/test/setup.ts)).
- **`globalSetup`** / truncate pattern if Metaboost uses it for clean slate ([`apps/api/src/test/global-setup.mjs`](../../../../../metaboost/apps/api/src/test/global-setup.mjs) — verify paths in Metaboost).
- Vitest [`vitest.config.ts`](../../../../apps/api/vitest.config.ts) / [`apps/management-api/vitest.config.ts`](../../../../apps/management-api/vitest.config.ts): `setupFiles`, `test.include`, any `pool` settings matching Metaboost.
- **`vitest.setup.ts`** in management-api: replace hard-coded **5432** with **5732** (or env driven) so tests never touch default dev DB on the same machine.

## Port and env alignment

All API test env must point at **Podverse test** stack:

| Variable area | Value / source |
| -------------- | --------------- |
| `DB_HOST` | `localhost` |
| `DB_PORT` | `5732` (or read from env with default 5732) |
| KeyVal / Redis | host `localhost`, port **6679**, password consistent with Makefile-created Valkey |
| Database names | Match phase 02 (`podverse_app_test`, etc.) |

Never use Metaboost ports (**5632** / **6579**) or DB names (`metaboost_*`) in Podverse tests.

## Implementation steps

1. **Read Metaboost** api + management-api `src/test/` trees end-to-end (setup, global-setup, sample `*.test.ts`).

2. **apps/api** — Add missing pieces only:
   - `src/test/setup.ts` if absent; wire in `vitest.config.ts`.
   - Global setup for truncate/migrate if required by Podverse ORM patterns.
   - Ensure dynamic import / `beforeAll` pattern matches Metaboost for tests that override mailer or JWT.

3. **apps/management-api** — Update [`vitest.setup.ts`](../../../../apps/management-api/vitest.setup.ts) to use test ports and Podverse test DB names; align [`adminAccount.integration.test.ts`](../../../../apps/management-api/src/routes/adminAccount.integration.test.ts) if env drift breaks.

4. **Supertest / route tests** — Stay within **v1 file cap** (step 3): at most **one** integration module per app; contents can be a minimal happy-path and one auth failure if the cap is already met in a single file per app.

5. **`npm run test:e2e:api`** (from phase 03) must pass locally after `make test_deps`.

## Verification

```bash
make test_deps
node scripts/check-test-requirements.mjs
npm run test -w apps/api
npm run test -w apps/management-api
npm run test:e2e:api   # once root script exists
```

## Definition of done

- API Vitest suites run against **5732** / **6679** only; no accidental dev DB (**5432**) usage in default test paths.
- Parity with Metaboost patterns documented in Podverse [`AGENTS.md`](../../../../AGENTS.md) Testing subsection.
