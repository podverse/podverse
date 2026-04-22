# Follow-up: validate and harden unified test commands

## Prerequisites

- All phases from `unified-test-commands` completed (plans moved to `.llm/plans/completed/unified-test-commands/`).

## Goal

Validate the test infrastructure end-to-end and fix issues found during execution. These items were identified as gaps during implementation but deferred to avoid blocking the initial wiring.

## Tasks

### 1. Install Playwright browsers

Playwright `@playwright/test` is installed but browsers are not:

```bash
cd /path/to/podverse
npx playwright install chromium
```

Document in AGENTS.md that this is a one-time step after `npm install`.

### 2. Verify seed scripts against actual schema

The seed scripts in `tools/web/seed-e2e.mjs` and `tools/management-web/seed-e2e.mjs` assume table names `account` and `admin_account`. Verify these match the actual Podverse schema in `infra/k8s/base/db/source/0001_init_database.sql` and `0003_init_management_database.sql`. If table/column names differ, update the seed SQL accordingly.

**Validation:**
```bash
make test_deps
node tools/web/seed-e2e.mjs
node tools/management-web/seed-e2e.mjs
```

### 3. Verify management-api existing test still passes

The existing `apps/management-api/src/routes/adminAccount.integration.test.ts` mocks the ORM, so it should not need a DB. But the updated `vitest.setup.ts` now points at port 5732 and uses `podverse_management_test` as the DB. Verify the mock still works:

```bash
npm run test -w apps/management-api
```

If the test imports app code that tries to connect to the DB at import time (not just in the mock), the env change may break it. Either keep the mock approach working or adjust the test to handle the new env.

### 4. Ensure apps are built before Playwright runs

The Playwright webServer configs reference `dist/` directories:
- `apps/api/dist/src/bin/www.js` — needs `npm run build -w apps/api`
- `apps/web/sidecar/dist/server.js` — needs `npm run bundle -w @podverse/web-sidecar`
- `apps/management-web/sidecar/dist/server.js` — needs `npm run bundle -w @podverse/management-web-sidecar`

The E2E Makefile targets should either:
- Require builds to be done before running, OR
- Include build steps in the webServer commands

Document the build prerequisite in `help_test` / `AGENTS.md`.

### 5. Update Podverse AGENTS.md with test documentation

Add a Testing section to Podverse `AGENTS.md` (or update the existing one) with:
- Root npm script matrix (`test:unit`, `test:e2e:api`, `test:e2e:web`, `test:reports`, `npm test`)
- Test port conventions (5732/6679, 403x/413x)
- `make test_deps` / `make help_test` instructions
- Playwright browser install step
- Build prerequisites for E2E

### 6. Verify CI workflow has skipped test step

Per the master plan, Podverse `.github/workflows/ci.yml` should include a **skipped "Test" step** and PR comment row mirroring Metaboost. Check if this exists; if not, add it.

### 7. End-to-end smoke validation

Run the full chain locally:

```bash
# From podverse repo root
npm run build:packages
npm run build -w apps/api
npm run build -w apps/management-api
npm run build:sidecar:web
npm run build:sidecar:management-web
make test_deps
npm run test:unit
npm run test:e2e:api
# Web E2E (requires Playwright browsers installed):
npm run test:e2e -w @podverse/web -- --list
npm run test:e2e -w @podverse/management-web -- --list
```

Fix any issues found.

## Definition of done

- All npm test scripts run without errors (unit, e2e:api at minimum; e2e:web if Playwright browsers are installed).
- Seed scripts produce no SQL errors.
- Existing management-api test still passes.
- AGENTS.md documents the test matrix.
- CI workflow has the skipped test reminder.
