# Phase 1 - Podverse bootstrap and linear migration layout

## Scope

Define the canonical forward-only migration structure while preserving first-boot full initialization.

## Key files

- `infra/k8s/base/db/source/0001_init_database.sql`
- `infra/k8s/base/db/source/0003_init_management_database.sql`
- `infra/database/migrations/*.sql` (or migrated canonical replacement path)
- `infra/database/management/migrations/*.sql` (or migrated canonical replacement path)
- `infra/migrations/app/` (new canonical path if adopted)
- `infra/migrations/management/` (new canonical path if adopted)

## Steps

1. **Lock canonical layout**
   - Choose and document one canonical linear path set:
     - Option A: keep `infra/database/.../migrations`.
     - Option B: move to `infra/migrations/app` and `infra/migrations/management`.
   - If Option B, add compatibility notes for any scripts still pointing at old paths.

2. **Migration metadata model**
   - Add a migration tracking table for app and management DBs (or shared table per DB), e.g.:
     - migration id / filename
     - checksum
     - applied_at
   - Define idempotency behavior for reruns and checksum drift handling.

3. **Fresh bootstrap contract**
   - Keep `0001_init_database.sql` and `0003_init_management_database.sql` as first-boot authoritative snapshots.
   - Ensure these init files include migration metadata table definitions so post-bootstrap linear runs can continue from a known baseline.
   - Decide how bootstrap marks migrations as already applied (seed rows or baseline marker migration).

4. **Baseline strategy for existing deployments**
   - Define "adopt existing schema into linear history" behavior (baseline marker migration).
   - Require explicit safeguard for non-empty DBs to prevent replaying historical DDL.

## Verification

- Confirm fresh local DB init still succeeds using existing init SQL consumption paths.
- Confirm migration metadata tables exist after bootstrap for both app and management DBs.
- Confirm canonical migration directories are documented and unambiguous.
