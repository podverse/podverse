# Podverse linear migrations contract

## Canonical migration directories

Podverse forward-only SQL migration files are canonical in:

- `infra/k8s/ops/source/app` (app database)
- `infra/k8s/ops/source/management` (management database)

Bootstrap-only DB/user setup scripts live in:

- `infra/k8s/base/db/source/bootstrap` (`0001_*.sh`, `0002_*.sh`, and the generated `0003_linear_baseline.sql` below)

## Generated init snapshot `0003_linear_baseline.sql`

- After `0001` and `0002` (role and database creation), a **generated** `0003_linear_baseline.sql` is applied in `docker-entrypoint-initdb` order. It is the result of running the full linear app and management migration chains in a throwaway container, then `pg_dump` of each database, combined with `psql` `\connect` lines. It is **not** a hand-edited file.
- **Regenerate** after any change under `infra/k8s/ops/source/`:

  `bash scripts/database/generate-linear-baseline.sh` (requires Docker; uses synthetic credentials from `scripts/database/db.generate-baseline.env` only).

- **Do not** edit `0003` manually; CI compares it to the generator (see the `Linear SQL baseline` workflow). The linear `NNNN_*.sql` files remain the **source of truth**; `0003` is a materialized snapshot for first-start init and drift checks.

## Migration history metadata

Both app and management schemas include `linear_migration_history` with:

- `migration_filename` (unique)
- `migration_checksum`
- `applied_at`

## Operating model

- First deploy on a brand-new DB runs init scripts in order, then (if needed) migration jobs for app and management; with `0003` in place, migration jobs should find all files already applied and **skip** them.
- Subsequent deploys rerun the same jobs; already-applied migrations are skipped via checksum-tracked history.
- There is no existing-database baseline onboarding flow in this model.
