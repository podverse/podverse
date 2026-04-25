# Podverse linear migrations contract

## Canonical migration directories

Podverse forward-only SQL migration files are canonical in:

- `infra/k8s/base/db/source/app` (app database)
- `infra/k8s/base/db/source/management` (management database)

Bootstrap-only DB/user setup scripts live in:

- `infra/k8s/base/db/source/bootstrap`

## Migration history metadata

Both app and management schemas include `linear_migration_history` with:

- `migration_filename` (unique)
- `migration_checksum`
- `applied_at`

## Operating model

- First deploy on a brand-new DB runs migration jobs for app and management after DB/bootstrap readiness.
- Subsequent deploys rerun the same jobs; already-applied migrations are skipped via checksum-tracked history.
- There is no existing-database baseline onboarding flow in this model.
