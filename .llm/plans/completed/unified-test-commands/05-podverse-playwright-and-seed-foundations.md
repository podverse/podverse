# Phase 05 — Podverse: Playwright + seeds + reports (foundations)

## Prerequisites

- Phases 02–04: test DB stack and API integration tests stable.
- [`00-master-plan.md`](./00-master-plan.md) — Playwright ports **4030–4032**, registry **4040** (web); **4130–4132**, registry **4140** (management). Do not overlap Metaboost **401x** / **411x** / **4020** / **4120**.

## Goal

Establish Podverse web + management-web E2E so that **foundations match Metaboost**: Playwright wiring, seeds, **and** report generation that is **the same or intentionally equivalent** to Metaboost (not a stripped-down reporter story).

### Required parity with Metaboost (report pipeline)

Metaboost full report flow uses `make e2e_test_report` and related targets in [`Makefile.local.e2e.mk`](../../../../../metaboost/makefiles/local/Makefile.local.e2e.mk): env such as `E2E_STEP_SCREENSHOTS=true`, `PLAYWRIGHT_HTML_OPEN=never`, `PLAYWRIGHT_HTML_OUTPUT_DIR`, `E2E_SPEC_ORDER`, and Playwright invoked with `--reporter=../../scripts/e2e-html-steps-reporter.ts` (paths adjusted for Podverse repo root).

**Podverse must:**

1. **Port or share** [`scripts/e2e-html-steps-reporter.ts`](../../../../../metaboost/scripts/e2e-html-steps-reporter.ts) under Podverse `scripts/` (copy and adapt imports if needed, or document a shared package — default is **copy into Podverse** for a self-contained repo).

2. **Add Makefile E2E layer** mirroring Metaboost: `e2e_deps`, `e2e_seed`, `e2e_test`, `e2e_test_report`, scoped report targets, optional `e2e-spec-order-*.txt` files — same **shape** as Metaboost; Podverse ports and report **output directories** are Podverse-specific.

3. **Wire npm** — `npm run test:e2e:web:reports` → `make e2e_test_report` (or equivalent); `npm run test:reports` chains unit + api + web reports like the master plan.

4. **Playwright configs** — Start from Metaboost [`apps/web`](../../../../../metaboost/apps/web) / [`management-web`](../../../../../metaboost/apps/management-web) configs and env builders; remap to Podverse ports **403x** / **413x**, registry **4040** / **4140**, DB **5732**, Valkey **6679**.

### Minimal **spec** count (does not excuse skipping report machinery)

- **Smoke:** At least **one** spec per app for the first milestone (e.g. `e2e/smoke.spec.ts`). Additional specs and extra Playwright configs (signup-enabled, Mailpit, admin-only-email) follow **Metaboost’s** layout as product needs dictate; future plans add **more tests**, not a different report stack.

### Daily / list runs

- **`test:e2e`** may use default `list` reporter for speed; **report runs** must use the Metaboost-equivalent HTML step reporter + env contract above.

### Optional

**`E2E_API_GATE_MODE`** — Same conditional API run before E2E as Metaboost ([`Makefile.local.e2e.mk`](../../../../../metaboost/makefiles/local/Makefile.local.e2e.mk)); copy pattern for Podverse.

## Verification

```bash
make test_deps && make e2e_seed   # once targets exist
npm run test:e2e -w apps/web -- --list
npm run test:e2e -w apps/management-web -- --list
make e2e_test_report   # Metaboost-equivalent HTML + step screenshots; open report dirs under .artifacts/ or as in E2E-PAGE-TESTING
```

## Definition of done

- Playwright configs use **403x** / **413x** only; with Metaboost E2E running, `docker ps` / `lsof` shows no duplicate binds.
- At least one passing smoke spec per app OR explicitly skipped with documented blocker (prefer passing).
- **`make e2e_test_report`** (and npm `test:e2e:web:reports` / `test:reports`) produces HTML reports via the same mechanism as Metaboost (step reporter + directory layout conventions documented in Podverse [`AGENTS.md`](../../../../AGENTS.md) / `docs/testing/`).
- Root scripts from master plan wired; [`AGENTS.md`](../../../../AGENTS.md) documents Metaboost alignment for local test and report commands.
