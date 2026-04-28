# Podverse linear migrations contract

## Canonical migration directories

Podverse forward-only SQL migration files are canonical in:

- `infra/k8s/base/ops/source/database/linear-migrations/app` (app database)
- `infra/k8s/base/ops/source/database/linear-migrations/management` (management database)

Bootstrap-only DB/user setup scripts live in:

- `infra/k8s/base/db/source/bootstrap` (`0001_*.sh`, `0002_*.sh`, the generated `0003_linear_baseline.sql.gz`, and the generated `0004_seed_linear_migration_history.sql`)

## Generated init snapshot `0003_linear_baseline.sql.gz`

- After `0001` and `0002` (role and database creation), a **generated** `0003_linear_baseline.sql.gz` is applied in `docker-entrypoint-initdb` order (Postgres treats `.sql.gz` like `.sql`). Uncompressed content is the same as running the full linear app and management migration chains in a throwaway container, then `pg_dump` of each database, combined with `psql` `\connect` lines. It is **not** a hand-edited file.
- **Regenerate** after any change under `infra/k8s/base/ops/source/database/linear-migrations/` from the repo root:

  `make db_regen_linear_baseline` (Docker for `0003`, then checksum seed for `0004`; uses synthetic credentials from `scripts/database/db.generate-baseline.env` only). Then `make db_verify_linear_baseline` and commit the updated `0003_` and `0004_` files.

- **Do not** edit `0003` manually. There is no bot that auto-commits 0003. A maintainer **`/test` comment** on a pull request runs the same `verify` step; merge only after 0003 matches. The linear `NNNN_*.sql` files remain the **source of truth**; `0003` is a materialized snapshot for first-start init and drift checks.

## Migration history metadata

Both app and management schemas include `linear_migration_history` with:

- `migration_filename` (unique)
- `migration_checksum`
- `applied_at`

## Generated init seed `0004_seed_linear_migration_history.sql`

- After `0003` applies the materialized schema (including empty `linear_migration_history`), **`0004` inserts one row per `NNNN_*.sql` file** with a SHA-256 checksum matching `run-linear-migrations.sh`, so forward-only ops jobs **skip** duplicate DDL on fresh clusters.
- **Regenerate** when any file under `linear-migrations/app` or `linear-migrations/management` changes: `make db_regen_linear_baseline` (runs `scripts/database/generate-linear-migration-history-seed.sh` after rebuilding `0003`). Commit both generated files; CI verifies them via `verify-linear-baseline.sh`.
- **Do not** edit `0004` manually.

## Operating model

- First deploy on a brand-new DB runs init scripts in order (`0001` → `0002` → `0003` → `0004`), then (if needed) migration jobs for app and management; with `0003` + `0004` in place, migration jobs should find all files already applied and **skip** them.
- Subsequent deploys rerun the same jobs; already-applied migrations are skipped via checksum-tracked history.
- **PVCs created before `0004` existed:** `docker-entrypoint-initdb.d` does not re-run on existing data directories. Databases that already have baseline schema but empty or partial `linear_migration_history` need a **one-time** fix (run the current `0004` SQL against each DB with admin credentials, or replace the volume / restore from a dump)—otherwise ops migration jobs may still try to re-apply early migrations.
- There is no existing-database baseline onboarding flow in this model.
