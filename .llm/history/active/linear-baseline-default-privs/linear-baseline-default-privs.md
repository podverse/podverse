# linear-baseline-default-privs

**Started:** 2026-04-29
**Context:** Regenerate 0003a/0003b/0004 so management baseline uses `FOR ROLE podverse_management_migrator` in `ALTER DEFAULT PRIVILEGES` (fix init failure on `podverse-db-0`).

### Session 1 - 2026-04-29

#### Prompt (Developer)

Fix `permission denied to change default privileges` on `podverse-db-0`

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Regenerated `0003a`/`0003b`/`0004` with `make db_regen_linear_baseline`; new `0003b` uses `ALTER DEFAULT PRIVILEGES FOR ROLE podverse_management_migrator`, matching `0003_apply_linear_baselines.sh` (loads as migrator).
- `make db_verify_linear_baseline` passed.

#### Files Created/Modified

- `infra/k8s/base/db/source/bootstrap/0003a_app_linear_baseline.sql.gz`
- `infra/k8s/base/db/source/bootstrap/0003b_management_linear_baseline.sql.gz`
- `.llm/history/active/linear-baseline-default-privs/linear-baseline-default-privs.md`

### Session 2 - 2026-04-29

#### Prompt (Developer)

implement

#### Key Decisions

- `ci-verify-bootstrap-contract.sh` now treats `pg_isready` as transport readiness only and polls bootstrap contract predicates until they become true (bounded timeout), eliminating the initdb race in CI.
- Added `check_query_or_false` so transient "DB not ready yet" query failures during init do not abort the script under `set -e`; they retry as `f`.
- Verified locally with `bash scripts/database/ci-verify-bootstrap-contract.sh` (passed).

#### Files Created/Modified

- `scripts/database/ci-verify-bootstrap-contract.sh`
- `.llm/history/active/linear-baseline-default-privs/linear-baseline-default-privs.md`

### Session 3 - 2026-04-29

#### Prompt (Developer)

fix

#### Key Decisions

- Hardened `check-no-runtime-create-extension.sh` to avoid false-green in CI when `rg` is missing: use `rg` when available, otherwise fall back to `grep -R -E -i` with the same pattern.
- Fallback path emits a warning and still fails on matches; it no longer silently passes because a command is unavailable.
- Verified both paths locally (normal path and fallback with `PATH` excluding `rg`), both passing with no matches.

#### Files Created/Modified

- `scripts/database/check-no-runtime-create-extension.sh`
- `.llm/history/active/linear-baseline-default-privs/linear-baseline-default-privs.md`

### Session 4 - 2026-04-29

#### Prompt (Developer)

Debug and fix `local_db_init` uuid-ossp verification failure

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added explicit local-only extension setup in `local_db_init` so both app and management DBs run `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` before contract verification.
- While validating, found a secondary false failure source: `verify-bootstrap-contract.sh` counted tables via `information_schema.tables`, which can hide tables from the current role; switched to `pg_catalog.pg_tables` for existence checks.
- Verified end-to-end with `./scripts/nix/with-env make local_db_init` (now passes through final bootstrap contract verification).
- No docs update needed for this change because behavior remains internal to `local_db_init` and existing user-facing flow is unchanged.

#### Files Created/Modified

- `makefiles/local/Makefile.local.infra.mk`
- `infra/k8s/base/ops/source/database/runner/verify-bootstrap-contract.sh`
- `.llm/history/active/linear-baseline-default-privs/linear-baseline-default-privs.md`

### Session 5 - 2026-04-29

#### Prompt (Developer)

do it

#### Key Decisions

- Cleaned up `WARNING: no privileges were granted for "public"` by making schema `USAGE` grants conditional in bootstrap `0001`/`0002` using `has_schema_privilege(...)` checks before issuing `GRANT`.
- Chose the low-risk/no-behavior-change approach (no revoke/hardening changes), so this removes log noise without changing effective access semantics.
- Re-ran `./scripts/nix/with-env make local_db_init`; warning lines are gone and final bootstrap verification still passes.

#### Files Created/Modified

- `infra/k8s/base/db/source/bootstrap/0001_create_app_db_users.sh`
- `infra/k8s/base/db/source/bootstrap/0002_create_management_db_users.sh`
- `.llm/history/active/linear-baseline-default-privs/linear-baseline-default-privs.md`

### Session 6 - 2026-04-29

#### Prompt (Developer)

Root-Cause Fix Plan: Linear Baseline + Migration History Consistency

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Removed bootstrap dependency on `0004_seed_linear_migration_history.sql`; `0003a`/`0003b` now include deterministic `linear_migration_history` inserts directly.
- Switched baseline generation from schema-only dumps to materialized schema+data dumps while excluding `linear_migration_history` table data and appending checksum rows deterministically from migration files.
- Added timestamp normalization during baseline generation (with `session_replication_role = replica`) to keep generated archives stable across runs.
- Strengthened bootstrap verification to assert management role seed invariants (`admin_account_role` ids 1/2) and query them with read_write credentials to avoid ownership-grant assumptions.
- Updated docs/rules/skills to reflect the new 0003-only bootstrap contract and removed 0004 parity checks from the validate workflow.
- Verified end-to-end with `./scripts/nix/with-env make db_verify_linear_baseline` and `bash scripts/database/ci-verify-bootstrap-contract.sh`.

#### Files Created/Modified

- `scripts/database/generate-linear-baseline.sh`
- `scripts/database/verify-linear-baseline.sh`
- `scripts/database/ci-verify-bootstrap-contract.sh`
- `makefiles/local/Makefile.local.validate.mk`
- `infra/k8s/base/db/kustomization.yaml`
- `infra/k8s/base/db/statefulset.yaml`
- `infra/k8s/base/ops/source/database/runner/verify-bootstrap-contract.sh`
- `infra/k8s/base/db/source/bootstrap/0003a_app_linear_baseline.sql.gz`
- `infra/k8s/base/db/source/bootstrap/0003b_management_linear_baseline.sql.gz`
- `docs/operations/LINEAR-MIGRATIONS.md`
- `docs/operations/DB-MIGRATIONS.md`
- `.cursor/rules/linear-baseline-0003.mdc`
- `.cursor/skills/k8s/SKILL.md`
- `AGENTS.md`
- `.llm/history/active/linear-baseline-default-privs/linear-baseline-default-privs.md`

### Session 7 - 2026-04-29

#### Prompt (Developer)

add them

#### Key Decisions

- Added post-bootstrap migration replay checks in `ci-verify-bootstrap-contract.sh` to execute `run-linear-migrations.sh --database app` and `--database management` against the ephemeral DB container and fail on any mismatch/reapply error.
- Added an end-to-end management superuser smoke test in CI by running `create-superuser.mjs --random-password` in a `node:24-slim` container sharing the DB container network namespace.
- Added a strict post-smoke assertion that exactly one `admin_account` row has `admin_account_role_id = 1`.
- Verified locally with `bash scripts/database/ci-verify-bootstrap-contract.sh` (passed; migration replay showed all `SKIP`, superuser creation succeeded).

#### Files Created/Modified

- `scripts/database/ci-verify-bootstrap-contract.sh`
- `.llm/history/active/linear-baseline-default-privs/linear-baseline-default-privs.md`
