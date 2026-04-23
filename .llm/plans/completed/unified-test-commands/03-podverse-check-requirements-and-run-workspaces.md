# Phase 03 — Podverse: check-test-requirements, run-workspaces `--exclude`, `test:unit`

## Prerequisites

- Phase 02 (`make test_deps`) defines **5732** / **6679** and DB availability.

## Goal

1. **`scripts/check-test-requirements.mjs`** — Same behavior as Metaboost [`scripts/check-test-requirements.mjs`](../../../../../metaboost/scripts/check-test-requirements.mjs): TCP connect to Postgres + Valkey; on failure print **actionable** message (`make test_deps` from Podverse root) and `exit 1`.

   - Default Postgres port check: **5732** (override via env — pick one naming scheme and document).
   - Default Valkey: **6679**.
   - Message text must say **Podverse** container/ports, not Metaboost.

2. **`scripts/ci/run-workspaces.mjs`** — Extend CLI:

   - `--exclude <workspace-path>` repeatable (e.g. `--exclude apps/api --exclude apps/management-api`).
   - When resolving workspaces for `--script test`, skip excluded paths (normalize to repo-relative paths matching [`package.json`](../../../../package.json) workspaces).

3. **Root [`package.json`](../../../../package.json)** scripts:

   - `test:unit` — `node scripts/ci/run-workspaces.mjs --script test --all --exclude apps/api --exclude apps/management-api` (adjust if other DB-backed workspaces appear later).
   - `test:e2e:api` — `node scripts/check-test-requirements.mjs && npm run test -w apps/api && npm run test -w apps/management-api` (workspace names match `@podverse/api` etc.).
   - Keep existing `test` behavior until phase 05 defines full `npm test` chain; optional interim: point `test` at `test:unit` only until E2E lands.

4. **FORCE_COLOR** — Existing [`run-workspaces.mjs`](../../../../scripts/ci/run-workspaces.mjs) behavior for piped Vitest output should remain intact.

## Edge cases

- Workspaces **without** a `test` script: `--if-present` behavior unchanged.
- **Nix:** Document `./scripts/nix/with-env npm run test:unit` in AGENTS.md if required for agents.

## Verification

```bash
# Without Docker test stack — should fail fast with clear message
node scripts/check-test-requirements.mjs
# Expect exit 1 and instructions to run make test_deps

make test_deps   # phase 02
node scripts/check-test-requirements.mjs
# Expect exit 0

npm run test:unit
npm run test -w apps/api   # after phase 04 setup
```

## Definition of done

- `check-test-requirements.mjs` exists under Podverse `scripts/` with Podverse defaults **5732** / **6679**.
- `run-workspaces.mjs` supports `--exclude`; `npm run test:unit` excludes both API apps.
- No regression to non-test uses of `run-workspaces.mjs` (build, lint chains).
