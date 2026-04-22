# Unified test commands — master plan (Metaboost authoritative, Podverse parity)

## Goal

Align **npm** script names and ordering across **Metaboost** and **Podverse** so:

- `npm run test:unit`, `npm run test:e2e:api`, `npm run test:e2e:web`, report variants, and full `npm test` behave predictably.
- Local **Makefile** flows (`make test_deps`, E2E seed, Playwright) remain the authoritative source for Docker DBs and E2E orchestration where Metaboost already does so.

This directory holds phased plans to execute **one part at a time**.

## Foundation stop line (v1 scope)

Two ideas must stay distinct:

1. **Coverage breadth (minimal first):** Keep **few** Playwright specs and **few** API integration files while wiring the stack — e.g. one smoke spec per web app, at most one integration Vitest file per API app for the first milestone (expand cases in later plans).

2. **Process parity with Metaboost (required):** Test **harness** and **local developer workflows** should match Metaboost foundations: `make test_deps`, `check-test-requirements`, Vitest setup/globalSetup patterns, Playwright webServers/env layout, **and** — for web E2E — **report generation that is the same or intentionally equivalent** to Metaboost’s (custom HTML step reporter, `PLAYWRIGHT_HTML_OUTPUT_DIR`, `E2E_STEP_SCREENSHOTS`, `E2E_SPEC_ORDER`, Make targets such as `e2e_test_report` / scoped variants). Podverse ports (**403x** / **413x**) and compose paths differ; the **recipe** (env + reporter path + Makefile structure) should mirror [`metaboost/makefiles/local/Makefile.local.e2e.mk`](../../../../../metaboost/makefiles/local/Makefile.local.e2e.mk) and [`scripts/e2e-html-steps-reporter.ts`](../../../../../metaboost/scripts/e2e-html-steps-reporter.ts).

| Tier | v1 target |
| ----- | ---------- |
| **API integration (“e2e:api”)** | Metaboost-aligned harness (`setup.ts`, globalSetup, ports **5732** / **6679**). At most **one** integration-style Vitest file per app at first delivery (two files total across api + management-api); grow scenarios later. |
| **Web Playwright** | Metaboost-aligned configs (webServers, env injection). **Minimal spec count** at first (e.g. one smoke per app); additional specs ship in future plans. |
| **Web E2E reports** | **Not optional:** Implement the same report pipeline as Metaboost (copy/adapt `scripts/e2e-html-steps-reporter.ts`, same Make/env pattern for HTML output and step screenshots). Multiple auth-mode Playwright configs (signup-enabled, admin-only-email, etc.) can follow Metaboost **exactly where product needs them** — if Podverse initially runs fewer configs, still use the **identical reporter + Makefile pattern** for each run that produces HTML. |

**Metaboost note:** Root `npm test` may chain full `make e2e_test` and stay **slow**; Podverse `npm run test:reports` should invoke the same class of targets once wired. CI remains “run tests locally” (skipped step).

## Same-machine coexistence (Metaboost + Podverse)

Both monorepos are expected to run on one developer machine **at the same time**. **Do not reuse Metaboost’s ports or Docker container names** for Podverse test stacks.

### Reserved by Metaboost today (do not use for Podverse)

| Concern | Metaboost |
| -------- | --------- |
| Test Postgres host port | **5632** (`Makefile.local.test.mk` `TEST_DB_PORT`) |
| Test Valkey host port | **6579** (`TEST_VALKEY_PORT`) |
| Postgres container name | `metaboost_test_postgres` |
| Valkey container name | `metaboost_test_valkey` |
| Web Playwright API / sidecar / web | **4010** / **4011** / **4012** (`apps/web/playwright.e2e-webservers.ts`) |
| Web Playwright registry static | **4020** |
| Management Playwright mgmt-api / sidecar / web | **4110** / **4111** / **4112** (`apps/management-web/playwright.config.ts`) |
| Management Playwright registry static | **4120** |

Playwright E2E loads Metaboost test DB on **5632** and Valkey **6579** via env embedded in configs.

### Podverse defaults (proposal — implement in Makefile + Playwright + `check-test-requirements`)

Pick a **fixed separate band** and document it in Makefile / `ENV.md` / test setup:

| Concern | Podverse (proposal) |
| -------- | --------------------- |
| Test Postgres host port | **5732** (+100 vs Metaboost **5632**) |
| Test Valkey host port | **6679** (+100 vs Metaboost **6579**) |
| Postgres container name | `podverse_test_postgres` |
| Valkey container name | `podverse_test_valkey` |
| Web Playwright API / sidecar / web | **4030** / **4031** / **4032** |
| Web Playwright registry static | **4040** |
| Management Playwright mgmt-api / sidecar / web | **4130** / **4131** / **4132** |
| Management Playwright registry static | **4140** |

**Mailpit / SMTP:** If Podverse reuses a compose file pattern like Metaboost’s E2E mail server, map **different host ports** than Metaboost (e.g. avoid binding the same `1025`/`8025` on the host if both stacks can run together). Prefer a dedicated `infra/docker/e2e/` compose for Podverse with explicit host port overrides.

**check-test-requirements.mjs:** Podverse’s script must default to **5732** / **6679** (and document overrides via env). Metaboost keeps **5632** / **6579**.

### Verification

With both repos’ test containers up, `lsof` / `docker ps` should show **no shared published ports** between Metaboost and Podverse test stacks.

## Execution order (phase files)

Phase plans live beside this file:

1. [`01-metaboost-npm-and-make-wrappers.md`](./01-metaboost-npm-and-make-wrappers.md) — Root `package.json` script matrix; thin wrappers around existing Make targets.
2. [`02-podverse-makefile-test-deps-and-ports.md`](./02-podverse-makefile-test-deps-and-ports.md) — Podverse `Makefile.local.test.mk`, container names, **5732** / **6679**, DB init aligned with migrations.
3. [`03-podverse-check-requirements-and-run-workspaces.md`](./03-podverse-check-requirements-and-run-workspaces.md) — `check-test-requirements.mjs`, `run-workspaces.mjs --exclude`, `test:unit`.
4. [`04-podverse-api-vitest-integration-setup.md`](./04-podverse-api-vitest-integration-setup.md) — `apps/api` / `apps/management-api` test setup parity with Metaboost (env, globalSetup if needed).
5. [`05-podverse-playwright-and-seed-foundations.md`](./05-podverse-playwright-and-seed-foundations.md) — Playwright **403x** / **413x**, Makefile E2E targets, **Metaboost-equivalent HTML report pipeline** (`e2e_test_report`, step reporter); minimal seed + smoke specs first, more specs later.

**CI:** Podverse [`.github/workflows/ci.yml`](../../../../.github/workflows/ci.yml) includes a **skipped “Test” step** and PR comment row (mirror Metaboost), reminding maintainers to run tests locally before merge.

Verification commands and agent stubs: [`COPY-PASTA.md`](./COPY-PASTA.md).

## References (Metaboost checkout)

Use the Metaboost monorepo beside Podverse as the authoritative pattern:

- `makefiles/local/Makefile.local.test.mk`
- `makefiles/local/Makefile.local.e2e.mk`
- `scripts/check-test-requirements.mjs`
- `docs/testing/E2E-PAGE-TESTING.md`
