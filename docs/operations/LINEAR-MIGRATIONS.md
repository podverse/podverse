# Podverse linear migrations contract

## Canonical migration directories

Podverse forward-only SQL migration files are canonical in:

- `infra/k8s/base/ops/source/database/linear-migrations/app` (app database)
- `infra/k8s/base/ops/source/database/linear-migrations/management` (management database)

Bootstrap-only DB/user setup scripts live in:

- `infra/k8s/base/db/source/bootstrap` (`0001_*.sh`, `0002_*.sh`, `0003_apply_linear_baselines.sh`, generated `0003a_*` / `0003b_*`, and generated `0004_seed_linear_migration_history.sql`)

## Generated init snapshots `0003a_app_linear_baseline.sql.gz` and `0003b_management_linear_baseline.sql.gz`

- After `0001` and `0002` (role and database creation), **`0003_apply_linear_baselines.sh`** runs in `docker-entrypoint-initdb` order. It installs required extensions as **`DB_APP_OWNER_USER`** (app DB) and **`DB_MANAGEMENT_OWNER_USER`** (management DB), then loads **`0003a_*.sql.gz`** into the app database as **`DB_APP_MIGRATOR_USER`** and **`0003b_*.sql.gz`** into the management database as **`DB_MANAGEMENT_MIGRATOR_USER`** (archives are mounted under `/linear-baseline/`, not as raw `.sql.gz` in `docker-entrypoint-initdb.d`, so Postgres does not apply both as the bootstrap superuser).
- Uncompressed content matches running the full linear app and management migration chains in a throwaway container, then **`pg_dump --schema-only --no-owner`** of each database (two files, no combined `\connect` artifact). These files are **not** hand-edited.
- **Regenerate** after any change under `infra/k8s/base/ops/source/database/linear-migrations/` from the repo root:

  `make db_regen_linear_baseline` (Docker for `0003a`/`0003b`, then checksum seed for `0004`; uses synthetic credentials from `scripts/database/db.generate-baseline.env` only). Then `make db_verify_linear_baseline` and commit the updated `0003a_`, `0003b_`, and `0004_` files.

- **Do not** edit `0003a`/`0003b` manually. A maintainer **`/test` comment** on a pull request runs the same `verify` step; merge only after baselines match. The linear `NNNN_*.sql` files remain the **source of truth**; `0003a`/`0003b` are materialized snapshots for first-start init and drift checks.

## Migration history metadata

Both app and management schemas include `linear_migration_history` with:

- `migration_filename` (unique)
- `migration_checksum`
- `applied_at`

## Generated init seed `0004_seed_linear_migration_history.sql`

- After `0003` applies the materialized schema (including empty `linear_migration_history`), **`0004` inserts one row per `NNNN_*.sql` file** with a SHA-256 checksum matching `run-linear-migrations.sh`, so forward-only ops jobs **skip** duplicate DDL on fresh clusters.
- **Regenerate** when any file under `linear-migrations/app` or `linear-migrations/management` changes: `make db_regen_linear_baseline` (runs `scripts/database/generate-linear-migration-history-seed.sh` after rebuilding `0003a`/`0003b`). Commit generated files; CI verifies them via `verify-linear-baseline.sh`.
- **Do not** edit `0004` manually.

## Operating model

- First deploy on a brand-new DB runs init scripts in order (`0001` → `0002` → `0003_apply` + archives → `0004`), then (if needed) migration jobs for app and management; with baselines + `0004` in place, migration jobs should find all files already applied and **skip** them.
- Subsequent deploys rerun the same jobs; already-applied migrations are skipped via checksum-tracked history.
- There is no existing-database baseline onboarding flow in this model.
