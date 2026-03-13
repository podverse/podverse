# Feature: local-env-files (Part 1)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for development, you can delete this file and the containing directory. The history tracking system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 11, create `local-env-files-part-02.md`.

## Metadata

- Started: 2026-03-12
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/115
- Branch: chore/local-env-files
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

[What problem does this solve? What's the goal?]

## Sessions

### Session 1 - 2026-03-12

#### Prompt (Developer)

save the plan files locally

#### Key Decisions

- Saved the generated plan artifacts into `.llm/plans/active/local-env-files/` inside the Podverse repo.
- Kept the plans as separate files (master, env-core, and pgadmin/docs) to match the requested split.

#### Files Changed

- `.llm/history/active/local-env-files/local-env-files-part-01.md` (this entry)
- `.llm/plans/active/local-env-files/00-master-plan.md`
- `.llm/plans/active/local-env-files/01-env-core.md`
- `.llm/plans/active/local-env-files/02-pgadmin-docs.md`

---

### Session 2 - 2026-03-12

#### Prompt (Developer)

implement @podverse/.llm/plans/active/local-env-files/01-env-core.md

#### Key Decisions

- Started implementing the env-core plan by adding local env prepare/setup targets, scripts, and override examples.
- Kept `local_env_setup` non-destructive by creating missing files and only filling empty values.
- Switched `validate` to call `make local_env_setup` instead of copying from nonexistent `apps/*/env/local.env` paths.
- Used docker-friendly defaults for infra app env files (service hostnames) while keeping host-run app env files local.

#### Files Changed

- `.llm/history/active/local-env-files/local-env-files-part-01.md`
- `.gitignore`
- `Makefile`
- `Makefile.local`
- `scripts/local-env/prepare-overrides.sh`
- `scripts/local-env/setup.sh`
- `dev/env-overrides/local/private-services.env.example`
- `dev/env-overrides/local/podcast-index.env.example`
- `dev/env-overrides/local/storage.env.example`
- `dev/env-overrides/local/notifications.env.example`

---

### Session 3 - 2026-03-12

#### Prompt (Developer)

implement @podverse/.llm/plans/active/local-env-files/02-pgadmin-docs.md

#### Key Decisions

- Added pgAdmin to the local DB compose file with preconfigured server mapping and PGPASS-based auth.
- Added `local_pgadmin_up` and `local_pgadmin_down`, and wired pgAdmin into local infra up/down/clean flows.
- Updated Quick Start and README to document `local_env_prepare` -> `local_env_setup` -> `local_setup` and corrected stale env file paths.
- Marked all todos in `.llm/plans/active/local-env-files/02-pgadmin-docs.md` as completed.

#### Files Changed

- `.llm/history/active/local-env-files/local-env-files-part-01.md`
- `.llm/plans/active/local-env-files/02-pgadmin-docs.md`
- `infra/docker/local/db/docker-compose.yml`
- `infra/docker/local/pgadmin/servers.json`
- `Makefile.local`
- `docs/QUICKSTART.md`
- `README.md`

---

## Related Resources

- [Link to PR]
- [Link to related issues]

---

### Session 4 - 2026-03-13

#### Prompt (Developer)

implement

#### Key Decisions

- Started implementation to make local init deterministic so `local_db_init` prepares
  both main and management DBs for `npm run dev:all`.
- Reordered `local_db_init` to run main schema init before role grants so `read` has
  access to newly created tables like `category`.
- Reordered `local_management_db_init` to apply grants after schema creation for the
  same deterministic privilege behavior.
- Added `local_management_db_init` execution to `local_db_init` so the standard local
  command sequence initializes both DBs before app startup.
- Simplified `local_setup` to avoid double-running management init now that it is
  included in `local_db_init`.

#### Files Changed

- `.llm/history/active/local-env-files/local-env-files-part-01.md`
- `makefiles/local/Makefile.local.infra.mk`

---

### Session 5 - 2026-03-13

#### Prompt (Developer)

Monorepo Env Example Normalization

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Started implementation from the attached plan and will complete all listed todos in order.
- Mapped override-capable variables from `dev/env-overrides/local/*.env.example` and
  aligned app env examples so override-capable values are blank by default.
- Hardened `scripts/local-env/setup.sh` to treat placeholders as empty for MQ,
  KeyValDB, and Podcast Index keys, then generate/sync values across app+infra envs.
- Kept Lighthouse API example deterministic for test tooling (`DB_READ_PASSWORD`,
  `DB_READ_WRITE_PASSWORD`, and test Podcast Index values) while applying local-env
  override blanking policy to main app env examples.

#### Files Changed

- `.llm/history/active/local-env-files/local-env-files-part-01.md`
- `scripts/local-env/setup.sh`
- `apps/api/.env.example`
- `apps/workers/.env.example`
- `apps/web/.env.example`
- `apps/management-web/.env.example`
- `tools/web-perf/lighthouse/.env.api.example`

---

### Session 6 - 2026-03-13

#### Prompt (Developer)

implement plan

#### Key Decisions

- Fixed alpha DB init order so schema runs before create-users for both Jenkins and K8s.
- **Jenkins:** Reordered `makefiles/alpha/Makefile.alpha.infra.mk`: `alpha_db_init` and
  `alpha_management_db_init` now run schema (init_database.sql / init_management_database.sql)
  first, then 01-create-users.sh; use POSTGRES_DB from env when running psql.
- **K8s main DB:** Updated `scripts/database/combine-migrations.sh` to emit ConfigMap with
  `00_init_database.sql` then `01-create-users.sh` so Postgres initdb.d runs schema first.
- **K8s management DB:** Renamed key in `infra/k8s/base/management-db/init-scripts.configmap.yaml`
  from `init_management_database.sql` to `00_init_management_database.sql` for same order.
- Regenerated main DB ConfigMap with `bash scripts/database/combine-migrations.sh`.

#### Files Changed

- `makefiles/alpha/Makefile.alpha.infra.mk`
- `scripts/database/combine-migrations.sh`
- `infra/k8s/base/db/init-scripts.configmap.yaml` (regenerated)
- `infra/k8s/base/management-db/init-scripts.configmap.yaml`
- `.llm/history/active/local-env-files/local-env-files-part-01.md`
