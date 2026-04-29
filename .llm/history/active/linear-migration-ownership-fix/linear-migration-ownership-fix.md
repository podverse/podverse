# linear-migration-ownership-fix

**Started:** 2026-04-29  
**Author:** Agent  
**Context:** Implement linear migration management ownership fix (REASSIGN OWNED in 0004, Metaboost baseline + runner alignment).

### Session 1 - 2026-04-29

#### Prompt (Developer)

Linear migrations: management job failure — diagnosis and fix

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Extended `generate-linear-migration-history-seed.sh` (Podverse + Metaboost) to append `REASSIGN OWNED BY app admin TO management admin` after management seed inserts, using `db.generate-baseline.env` role names.
- Metaboost `generate-linear-baseline.sh`: run `run-linear-migrations.sh` for app and management; set `PGHOST`/`PGPORT`; export `DB_USER`/`DB_PASSWORD`/`DB_NAME` per run so `infra/config/local/db.env` is not sourced (avoids `PGHOST=postgres` in Docker baseline).
- Metaboost `run-linear-migrations.sh` (scripts + infra runner): align credential selection with Podverse using `PSQL_USER`/`PSQL_PASSWORD`/`PSQL_DB` and `DB_USER`/`DB_PASSWORD`/`DB_NAME` guard so management migrations use management admin credentials.
- Infra runner `REPO_ROOT`: `git rev-parse` with fallback `cd` to repo root.
- Regenerated `0003_linear_baseline.sql.gz` and `0004_seed_linear_migration_history.sql` in both repos; verified with `make db_verify_linear_baseline`.
- Docs: `LINEAR-MIGRATIONS.md` (Podverse), `DB-MIGRATIONS.md` (Metaboost) — brief `REASSIGN OWNED` note.

#### Files Created/Modified

- `scripts/database/generate-linear-migration-history-seed.sh`
- `scripts/database/generate-linear-baseline.sh` (Metaboost)
- `scripts/database/run-linear-migrations.sh` (Metaboost)
- `infra/k8s/base/ops/source/database/runner/run-linear-migrations.sh` (Metaboost)
- `infra/k8s/base/db/source/bootstrap/0003_linear_baseline.sql.gz` (Podverse, Metaboost)
- `infra/k8s/base/db/source/bootstrap/0004_seed_linear_migration_history.sql` (Podverse, Metaboost)
- `docs/operations/LINEAR-MIGRATIONS.md`
- `metaboost/docs/development/DB-MIGRATIONS.md`

### Session 2 - 2026-04-29

#### Prompt (Developer)

continue

#### Key Decisions

- Replaced single **`0003_linear_baseline.sql.gz`** with **`0003a_app_linear_baseline.sql.gz`** and **`0003b_management_linear_baseline.sql.gz`**, applied by **`0003_apply_linear_baselines.sh`** so each baseline runs as the correct DB owner (no **`REASSIGN OWNED`** in **`0004`**).
- Baselines mounted under **`/linear-baseline/`** in containers; shell script pipes **`gunzip -c`** to **`psql`** with app vs management admin credentials.
- **`generate-linear-baseline.sh`** emits both gz files; **`verify-linear-baseline.sh`** compares both plus **`0004`**; **`generate-linear-migration-history-seed.sh`** no longer appends ownership repair.
- Podverse + Metaboost: K8s (`kustomization`, StatefulSet/Deployment), Metaboost Compose/stack aligned; docs **`INFRA-DOCKER-LOCAL`**, **`REMOTE-K8S-POSTGRES-REINIT`**, **`INFRA-K8S`**, checklist **05a** updated.

#### Files Created/Modified

- `infra/k8s/base/db/source/bootstrap/0003_apply_linear_baselines.sh` (Podverse, Metaboost)
- `infra/k8s/base/db/source/bootstrap/0003a_app_linear_baseline.sql.gz`, `0003b_management_linear_baseline.sql.gz` (Podverse, Metaboost); removed `0003_linear_baseline.sql.gz`
- `infra/k8s/base/db/source/bootstrap/0004_seed_linear_migration_history.sql` (Podverse, Metaboost)
- `scripts/database/generate-linear-baseline.sh`, `verify-linear-baseline.sh`, `generate-linear-migration-history-seed.sh` (Podverse, Metaboost)
- `infra/k8s/base/db/kustomization.yaml`, `statefulset.yaml` / `deployment-postgres.yaml`, Metaboost `stack/workloads.yaml`, `docker-compose.yml`
- `metaboost/infra/docker/local/INFRA-DOCKER-LOCAL.md`, `metaboost/docs/development/k8s/REMOTE-K8S-POSTGRES-REINIT.md`, `metaboost/infra/k8s/INFRA-K8S.md`, `metaboost/docs/development/repo-management/LINEAR-MIGRATIONS-REFERENCE-ALIGNMENT-CHECKLIST-05A.md`

### Session 3 - 2026-04-29

#### Prompt (Developer)

my understanding is that the app migrations should be handled by the DB_APP_ADMIN_USER and the management migrations should be handled by the DB_MANAGEMENT_ADMIN_USER

is that correctly setup in the code that you see? if it is, how can i debug this? if it isn't, can you make the changes needed to fix it?

#### Key Decisions

- Intended wiring used admin keys, but `${DB_USER:-${DB_*_ADMIN_*}}` let a generic `DB_USER` from merged
  `envFrom` override admin; fixed `run-linear-migrations-k8s.sh` to export admin-only pairs and
  `run-linear-migrations.sh` to prefer `DB_*_ADMIN_*` when set before falling back to `DB_USER`.
- Updated `docs/operations/DB-MIGRATIONS.md` credentials paragraph.

#### Files Created/Modified

- `infra/k8s/base/ops/source/database/runner/run-linear-migrations.sh`
- `infra/k8s/base/ops/source/database/runner/run-linear-migrations-k8s.sh`
- `docs/operations/DB-MIGRATIONS.md`
