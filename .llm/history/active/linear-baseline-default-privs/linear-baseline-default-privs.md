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
