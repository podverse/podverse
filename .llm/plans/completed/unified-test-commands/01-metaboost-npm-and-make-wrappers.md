# Phase 01 — Metaboost: npm script taxonomy and Make wrappers

## Prerequisites

- Read [`00-master-plan.md`](./00-master-plan.md) for port coexistence rules (Podverse uses different bands; Metaboost keeps **5632** / **6579**).

## Goal

Expose clear root scripts in Metaboost [`package.json`](../../../../../metaboost/package.json) so developers can run:

- `npm run test:unit` — fast Vitest only (no `check-test-requirements`, no API DB suites).
- `npm run test:e2e:api` — API integration tier: `check-test-requirements` then `apps/api` + `apps/management-api` Vitest only (optionally align naming with “both APIs”).
- `npm run test:e2e:web` — thin wrapper around Make (`e2e_test` or split web + management-web per product needs).
- `npm run test:e2e:web:reports` — wrapper around `make e2e_test_report` (or scoped report targets).
- `npm run test:reports` — `test:unit && test:e2e:api && test:e2e:web:reports` (or agreed ordering).
- `npm test` — runs **all three tiers** in sequence: unit → e2e api → e2e web (per master plan).


Document that full `npm test` including Playwright is **slow** and remains **developer-local** in intent; splitting CI vs nightly or omitting Playwright from default CI is **out of scope** for Podverse foundations (Podverse CI uses a skipped-test reminder — see Podverse repo `.github/workflows/ci.yml`).

## Current baseline (do not break without migration note)

Today root `test` is:

```text
npm run test -w @metaboost/helpers && node scripts/check-test-requirements.mjs && npm run test -w apps/api && npm run test -w apps/management-api && npm run test -w metaboost-signing && npm run test -w @metaboost/rss-parser
```

**`test:unit`** should include **helpers + signing + rss-parser + any other workspaces that do not require Postgres/Valkey** for their default Vitest run. Confirm each workspace’s `test` script under [`apps/`](../../../../../metaboost/apps/) and [`packages/`](../../../../../metaboost/packages/).

## Implementation steps

1. **Inventory** every workspace with a `test` script. Classify:
   - **Requires test_deps:** typically `apps/api`, `apps/management-api` (see [`apps/api/src/test/setup.ts`](../../../../../metaboost/apps/api/src/test/setup.ts)).
   - **No test_deps:** `@metaboost/helpers`, `metaboost-signing`, `@metaboost/rss-parser`, `@metaboost/ui` (if present), etc.

2. **Add scripts** to Metaboost root `package.json`:
   - `test:unit` — chain only the no-deps workspaces in a stable order (helpers first, matching current spirit).
   - `test:e2e:api` — `node scripts/check-test-requirements.mjs && npm run test -w apps/api && npm run test -w apps/management-api`.
   - `test:e2e:web` — `make e2e_test` **or** document two-step if product wants separate commands; ensure working directory is repo root.
   - `test:e2e:web:reports` — `make e2e_test_report` (verify target name in [`makefiles/local/Makefile.local.e2e.mk`](../../../../../metaboost/makefiles/local/Makefile.local.e2e.mk)).
   - `test` — `npm run test:unit && npm run test:e2e:api && npm run test:e2e:web`.
   - `test:reports` — `npm run test:unit && npm run test:e2e:api && npm run test:e2e:web:reports`.

3. **Clarify Make target `e2e_test_api`** (runs full `npm run test` today): either rename/document in Makefile comment or add a new target that runs only API workspaces to match npm naming; avoid two conflicting definitions of “api e2e”.

4. **Update** [`AGENTS.md`](../../../../../metaboost/AGENTS.md) § Testing with the new script matrix and when to run `make test_deps`.

5. **Optional:** Add `npm run test:metaboost-packages` alias if splitting signing/rss-parser between unit and api gets awkward — prefer keeping the matrix small.

## Verification

```bash
# From metaboost repo root (with deps)
make test_deps
npm run test:unit
npm run test:e2e:api
# e2e web / reports: use make-backed scripts; confirm no port conflicts with Podverse if both machines’ stacks run
```

## Definition of done

- Root `package.json` exposes the new script names; old behavior is preserved or intentionally replaced with a note in AGENTS.md.
- `node scripts/check-test-requirements.mjs` still runs only for tiers that need DB/Valkey, not for `test:unit`.
