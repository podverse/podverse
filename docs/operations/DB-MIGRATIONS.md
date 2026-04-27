# Podverse DB Migrations

Podverse uses forward-only SQL migrations with one canonical source tree:

- app migrations: `infra/k8s/ops/source/app`
- management migrations: `infra/k8s/ops/source/management`
- bootstrap and generated init SQL: `infra/k8s/base/db/source/bootstrap` (see [LINEAR-MIGRATIONS.md](LINEAR-MIGRATIONS.md) for `0003_linear_baseline.sql`)

## First-run contract (brand-new DB)

1. Bring up Postgres and `docker-entrypoint-initdb` order: `0001_` (app users) and `0002_` (management DB and users) and generated `0003_linear_baseline.sql` (full schema; see [LINEAR-MIGRATIONS.md](LINEAR-MIGRATIONS.md)).
2. Wait for DB readiness.
3. If `0003` is present and matches the repo, migration jobs should be no-ops (checksums in `linear_migration_history`); otherwise run app and management migration jobs.
4. Create or update the management superuser.
5. Verify all steps succeed before app workload rollout.

There is no existing-DB baseline onboarding flow in this model.

## Create a migration

Add a new `NNNN_description.sql` file to the correct source directory.

- app: `infra/k8s/ops/source/app/NNNN_description.sql`
- management: `infra/k8s/ops/source/management/NNNN_description.sql`

Rules:

- Prefix must be four digits and ordered lexically.
- Filename format must match `^[0-9]{4}_[a-z0-9_]+\.sql$`.
- Do not edit already-applied migration files.

## Validate

```bash
bash scripts/database/validate-linear-migrations.sh
```

Optional DB checksum verification:

```bash
bash scripts/database/validate-linear-migrations.sh --check-db
```

## Run locally

```bash
bash scripts/database/run-linear-migrations.sh --database app
bash scripts/database/run-linear-migrations.sh --database management
bash scripts/management/create-superuser.sh --random-password
```

Dry run:

```bash
bash scripts/database/run-linear-migrations.sh --database app --dry-run
```

## K8s one-off migration jobs

Suspended CronJobs are defined in:

- `infra/k8s/base/ops/db-migrate-app.cronjob.yaml`
- `infra/k8s/base/ops/db-migrate-management.cronjob.yaml`
- `infra/k8s/base/ops/management-superuser-create.cronjob.yaml`
- `infra/k8s/base/ops/management-superuser-update.cronjob.yaml`

Trigger one-off jobs from those CronJobs during first deploy and on subsequent schema updates.

Example on-demand triggers:

```bash
K8S_NAMESPACE=<namespace> npm run management:superuser:create:k8s
K8S_NAMESPACE=<namespace> npm run management:superuser:update:k8s
```

## Staleness protection

- migration scripts and SQL are mounted via ConfigMaps in `infra/k8s/base/ops/kustomization.yaml`;
- Kustomize hash-based names force fresh pod templates on content change;
- jobs use `imagePullPolicy: Always` and expose `MIGRATION_BUNDLE_SHA`.
