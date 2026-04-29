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
- docs/operations/DB-MIGRATIONS.md
- .cursor/skills/k8s/SKILL.md
- tools/web-perf/lighthouse/src/index.ts
- tools/web-perf/lighthouse/src/database-setup.ts
- tools/web-perf/lighthouse/TOOLS-WEB-PERF-LIGHTHOUSE.md

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
