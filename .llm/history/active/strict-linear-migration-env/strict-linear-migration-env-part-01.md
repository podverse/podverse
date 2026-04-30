# strict-linear-migration-env

## Metadata

- Started: 2026-04-29
- Author: LLM session

### Session 1 - 2026-04-29

#### Prompt (Developer)

Strict linear migration credentials (Podverse + Metaboost)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- `run-linear-migrations.sh` (Podverse + Metaboost): prefixed admin keys plus optional
  `infra/config/local/db.env` when those keys are unset.
- `run-linear-migrations-k8s.sh`: validates prefixed keys; Podverse keeps `LINEAR_MIGRATIONS_*` exports;
  Metaboost wrappers match Podverse validation (management CronJob uses `DB_MANAGEMENT_ADMIN_*`).
- Metaboost: `db-migrate-management.cronjob.yaml` env names `DB_MANAGEMENT_ADMIN_*`;
  `print-linear-migrations-status-k8s.sh` uses prefixed vars per database;
  `generate-linear-migrations` INNER block exports prefixed credentials only.
- Docs/skills: Podverse `DB-MIGRATIONS.md`, `k8s` SKILL; Lighthouse TS + `TOOLS-WEB-PERF-LIGHTHOUSE.md`;
  Metaboost `linear-db-migrations` SKILL.

#### Files Created/Modified

- infra/k8s/base/ops/source/database/runner/run-linear-migrations.sh
- infra/k8s/base/ops/source/database/runner/run-linear-migrations-k8s.sh

### Session 3 - 2026-04-29

#### Prompt (Developer)

Clean long-term fix: strict DB role separation for migrations

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Enforced strict role separation: bootstrap/admin uses `DB_APP_ADMIN_*`, forward migrations use per-DB
  `DB_*_MIGRATOR_*` credentials only.
- Removed extension creation from forward `0000_init_helpers.sql`; extension installation is bootstrap-only in
  `0003_apply_linear_baselines.sh`.
- Added dedicated manual repair path (`ops-db-repair-linear-migration-ownership`) for existing PVCs with ownership
  or extension drift, separate from normal migration jobs.
- Regenerated `0003a`/`0003b` baselines and `0004_seed_linear_migration_history.sql` after migration and bootstrap changes.

#### Files Created/Modified

- infra/config/env-templates/db.env.example
- infra/k8s/scripts/secret-generators/create_db_secret.sh
- infra/k8s/scripts/secret-generators/create_management_db_secret.sh
- infra/k8s/base/db/source/bootstrap/0001_create_app_db_users.sh
- infra/k8s/base/db/source/bootstrap/0002_create_management_db_users.sh
- infra/k8s/base/db/source/bootstrap/0003_apply_linear_baselines.sh
- infra/k8s/base/ops/source/database/linear-migrations/app/0000_init_helpers.sql
- infra/k8s/base/ops/source/database/linear-migrations/management/0000_init_helpers.sql
- infra/k8s/base/ops/source/database/runner/run-linear-migrations.sh
- infra/k8s/base/ops/source/database/runner/run-linear-migrations-k8s.sh
- infra/k8s/base/ops/source/database/runner/repair-linear-migration-ownership.sh
- infra/k8s/base/ops/db-migrate-app.cronjob.yaml
- infra/k8s/base/ops/db-migrate-management.cronjob.yaml
- infra/k8s/base/ops/db-repair-linear-migration-ownership.cronjob.yaml
- infra/k8s/base/ops/kustomization.yaml
- scripts/database/db.generate-baseline.env
- scripts/database/generate-linear-baseline.sh
- scripts/database/print-linear-migrations-status-k8s.sh
- scripts/database/validate-linear-migrations.sh
- infra/k8s/base/db/source/bootstrap/0003a_app_linear_baseline.sql.gz
- infra/k8s/base/db/source/bootstrap/0003b_management_linear_baseline.sql.gz
- infra/k8s/base/db/source/bootstrap/0004_seed_linear_migration_history.sql
- docs/operations/DB-MIGRATIONS.md
- docs/operations/LINEAR-MIGRATIONS.md
- .cursor/skills/k8s/SKILL.md

### Session 2 - 2026-04-29

#### Prompt (Developer)

you do not need to include notes like "it does not use generic" we would rather just be explicit and not even introduce these concepts which are not even being used

#### Key Decisions

- Docs and runner header comments describe only the required variable names for app and management migrations (including host and port).

#### Files Created/Modified

- docs/operations/DB-MIGRATIONS.md
- .cursor/skills/k8s/SKILL.md
- infra/k8s/base/ops/source/database/runner/run-linear-migrations.sh
- infra/k8s/base/ops/source/database/runner/run-linear-migrations-k8s.sh

### Session 4 - 2026-04-29

#### Prompt (Developer)

review your changes. we do NOT need any "legacy repair" steps or documentation. assume a truly green field environment for this.

#### Key Decisions

- Removed all legacy-repair artifacts and references; the branch now assumes green-field only.

#### Files Created/Modified

- infra/k8s/base/ops/kustomization.yaml
- docs/operations/DB-MIGRATIONS.md
- docs/operations/LINEAR-MIGRATIONS.md
- .cursor/skills/k8s/SKILL.md

### Session 5 - 2026-04-29

#### Prompt (Developer)

Strict DB Role Model (Green-Field)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Completed strict owner-first role model across bootstrap, env templates, secret generators, Docker/K8s manifests, and helper scripts by replacing `DB_*_ADMIN_*` with `DB_*_OWNER_*`.
- Kept forward migration execution strictly migrator-only (`DB_*_MIGRATOR_*`) and verified no remaining operational references to admin-style credential keys.
- Regenerated `0003a_app_linear_baseline.sql.gz`, `0003b_management_linear_baseline.sql.gz`, and `0004_seed_linear_migration_history.sql` under the updated owner/migrator contract.
- Updated operations docs and the k8s skill to describe explicit owner vs migrator vs runtime responsibilities with green-field assumptions only.

#### Files Created/Modified

- infra/config/env-templates/db.env.example
- infra/k8s/scripts/secret-generators/create_db_secret.sh
- infra/k8s/scripts/secret-generators/create_management_db_secret.sh
- infra/k8s/base/db/source/bootstrap/0001_create_app_db_users.sh
- infra/k8s/base/db/source/bootstrap/0002_create_management_db_users.sh
- infra/k8s/base/db/source/bootstrap/0003_apply_linear_baselines.sh
- infra/k8s/base/db/source/bootstrap/0003a_app_linear_baseline.sql.gz
- infra/k8s/base/db/source/bootstrap/0003b_management_linear_baseline.sql.gz
- infra/k8s/base/db/source/bootstrap/0004_seed_linear_migration_history.sql
- infra/k8s/base/db/statefulset.yaml
- infra/k8s/base/ops/db-drop-everything.cronjob.yaml
- infra/k8s/base/ops/source/database/management-superuser/create-superuser.mjs
- infra/k8s/base/ops/source/database/management-superuser/update-superuser.mjs
- infra/k8s/scripts/db/db-connect.sh
- scripts/database/db.generate-baseline.env
- scripts/database/generate-linear-baseline.sh
- scripts/database/run-postgres-bootstrap-in-container.sh
- scripts/local-env/setup.sh
- makefiles/local/Makefile.local.infra.mk
- makefiles/alpha/Makefile.alpha.infra.mk
- infra/docker/local/db/docker-compose.yml
- infra/docker/alpha/db/docker-compose.yml
- infra/docker/local/pgadmin/docker-compose.yml
- infra/docker/local/pgadmin/servers.json
- docs/operations/DB-MIGRATIONS.md
- docs/operations/LINEAR-MIGRATIONS.md
- .cursor/skills/k8s/SKILL.md
- infra/k8s/INFRA-K8S.md
- infra/k8s/K8S.md
- infra/k8s/scripts/INFRA-K8S-SCRIPTS.md
- docs/QUICKSTART.md
- tools/web-perf/lighthouse/docker/docker-compose.yml
- tools/web-perf/lighthouse/docker/env/db.env
- tools/web-perf/lighthouse/src/database-setup.ts
- tools/web-perf/lighthouse/src/index.ts
- tools/web-perf/lighthouse/TOOLS-WEB-PERF-LIGHTHOUSE.md

### Session 6 - 2026-04-29

#### Prompt (Developer)

create a document that explains very briefly what each of the database users purpose is

#### Key Decisions

- Added a dedicated, concise operations document describing each DB role purpose for app and management databases.

#### Files Created/Modified

- docs/operations/DB-USERS.md

### Session 7 - 2026-04-29

#### Prompt (Developer)

update

#### Key Decisions

- Updated Kubernetes docs to include migrator credentials in DB secret requirements.

#### Files Created/Modified

- infra/k8s/INFRA-K8S.md
- infra/k8s/K8S.md

### Session 8 - 2026-04-29

#### Prompt (Developer)

can you fix/improve it?

#### Key Decisions

- Removed owner-role inheritance from the management migrator (`GRANT owner TO migrator`) to preserve strict least-privilege separation.
- Reduced management owner bootstrap privileges to non-cluster-admin scope (`NOCREATEDB NOCREATEROLE` on existing role updates).
- Documented the separation rule explicitly in DB user docs.

#### Files Created/Modified

- infra/k8s/base/db/source/bootstrap/0002_create_management_db_users.sh
- docs/operations/DB-USERS.md

### Session 9 - 2026-04-29

#### Prompt (Developer)

scan through the files. whenever db users are listed, they should ALWAYS be in this order

owner
migrator
read_write
read

also, assess all the changes you made for podverse. metaboost must have the same handling for its db and migrations processes

#### Key Decisions

- Enforced the DB user listing order `owner`, `migrator`, `read_write`, `read` in Podverse env templates, secret generators, bootstrap scripts, and K8s docs where roles are enumerated together.
- Kept the strict owner/migrator separation while reordering grants and prompts to match the canonical ordering contract.
- Performed a parity sweep in Metaboost for DB bootstrap/migration handling to match Podverse role semantics.

#### Files Created/Modified

- infra/config/env-templates/db.env.example
- infra/k8s/scripts/secret-generators/create_db_secret.sh
- infra/k8s/scripts/secret-generators/create_management_db_secret.sh
- infra/k8s/INFRA-K8S.md
- infra/k8s/K8S.md
- infra/k8s/base/db/source/bootstrap/0001_create_app_db_users.sh
- infra/k8s/base/db/source/bootstrap/0002_create_management_db_users.sh
- scripts/local-env/setup.sh

### Session 10 - 2026-04-29

#### Prompt (Developer)

@podverse/tools/web-perf/lighthouse/docker/env/db.env:1-15 the value naming conventions should be consistent with the rest of the app when possible if there is no risk involved

#### Key Decisions

- Aligned Lighthouse test DB env defaults with the owner/migrator/read_write/read naming contract used across Podverse DB tooling.
- Reordered Lighthouse role declarations in committed test env to keep canonical role order and reduce configuration drift.
- Updated Lighthouse compose healthcheck and migration helper command examples to use the same owner/db defaults, avoiding regressions from renamed values.

#### Files Created/Modified

- tools/web-perf/lighthouse/docker/env/db.env
- tools/web-perf/lighthouse/docker/docker-compose.yml
- tools/web-perf/lighthouse/TOOLS-WEB-PERF-LIGHTHOUSE.md
- tools/web-perf/lighthouse/src/database-setup.ts
- tools/web-perf/lighthouse/src/index.ts
