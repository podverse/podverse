# Podverse DB Migrations

Podverse uses forward-only SQL migrations with one canonical source tree:

- app migrations: `infra/k8s/base/ops/source/database/linear-migrations/app`
- management migrations: `infra/k8s/base/ops/source/database/linear-migrations/management`
- bootstrap and generated init SQL: `infra/k8s/base/db/source/bootstrap` (see [LINEAR-MIGRATIONS.md](LINEAR-MIGRATIONS.md) for `0003a`/`0003b` baselines)

## First-run contract (brand-new DB)

1. Bring up Postgres and `docker-entrypoint-initdb` order: `0001_` (app users) and `0002_` (management DB and users) and `0003_apply_linear_baselines.sh` + generated `0003a`/`0003b` (full schema; see [LINEAR-MIGRATIONS.md](LINEAR-MIGRATIONS.md)).
2. Wait for DB readiness.
3. If `0003` is present and matches the repo, migration jobs should be no-ops (checksums in `linear_migration_history`); otherwise run app and management migration jobs.
4. Create or update the management superuser.
5. Verify all steps succeed before app workload rollout.

There is no existing-DB baseline onboarding flow in this model.

## Create a migration

Add a new `NNNN_description.sql` file to the correct source directory.

- app: `infra/k8s/base/ops/source/database/linear-migrations/app/NNNN_description.sql`
- management: `infra/k8s/base/ops/source/database/linear-migrations/management/NNNN_description.sql`

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

Path contract for linear migration jobs:

- `run-linear-migrations-k8s.sh` resolves SQL paths via environment variables, not by walking parent directories.
- `LINEAR_MIGRATIONS_BASE_DIR` should point to the mounted parent directory containing `app/` and `management/`.
- `LINEAR_MIGRATIONS_DIR` (optional) overrides the fully resolved directory for the selected database.

Current ops jobs mount SQL at `/opt/infra/k8s/base/ops/source/database/linear-migrations/<database>` and set:

```bash
LINEAR_MIGRATIONS_BASE_DIR="/opt/infra/k8s/base/ops/source/database/linear-migrations"
```

When adapting to other clusters/repositories, keep mounts and `LINEAR_MIGRATIONS_*` env values aligned.

**Credentials:** Forward migration jobs run with dedicated migrator roles. **`run-linear-migrations.sh`** requires: for **`--database app`**, `DB_APP_MIGRATOR_USER`, `DB_APP_MIGRATOR_PASSWORD`, `DB_APP_NAME`, `DB_HOST`, and `DB_PORT`; for **`--database management`**, `DB_MANAGEMENT_MIGRATOR_USER`, `DB_MANAGEMENT_MIGRATOR_PASSWORD`, `DB_MANAGEMENT_NAME`, `DB_HOST`, and `DB_PORT`. If required values are missing, the script may **`source`** `infra/config/local/db.env` when that file exists. **`run-linear-migrations-k8s.sh`** runs the same runner and expects the same variable names from cluster Secrets and env.

**Privileged bootstrap:** `0003_apply_linear_baselines.sh` uses `DB_APP_OWNER_USER` / `DB_MANAGEMENT_OWNER_USER` for extension installation and then applies baseline archives as the migrator roles.

**Fresh PVC / initdb:** Cluster Postgres runs `0003` then **`0004_seed_linear_migration_history.sql`** so `linear_migration_history` lists every migration with the correct checksum before ops jobs run (see [LINEAR-MIGRATIONS.md](LINEAR-MIGRATIONS.md) § generated seed).

After merging these manifests, bump the immutable `?ref=` on remote ops bases in GitOps repos (for example `k.podcastdj.com/apps/podverse-alpha/ops/kustomization.yaml`) to a Podverse tag that includes the change.

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
