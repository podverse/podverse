### Metadata

- Started: 2026-05-05
- Author: Agent
- Context: Greenfield-only linear SQL migration rewrite (Podverse + Metaboost)

### Session 1 - 2026-05-05

#### Prompt (Developer)

Greenfield-Only Migration Rewrite (Podverse + Metaboost)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Prior segment: app/management `0000_init_helpers` plain `CREATE DOMAIN`; app `0018`–`0023` strict `ALTER`/`INSERT` (no `IF EXISTS` / `ON CONFLICT` / defensive `DO`).
- Completed Podverse app chain 0024–0028: removed conditional DDL/seeds (`IF EXISTS`, `WHERE NOT EXISTS`, guarded `DO` blocks) in favor of strict ordered DDL + inserts.
- Regenerated `0003a_app_linear_baseline.sql.gz` / `0003b_management_linear_baseline.sql.gz`; `make db_verify_linear_baseline` OK.
- Metaboost: removed duplicate `linear_migration_history` DDL from SQL migrations (runner pre-creates table); stripped `IF NOT EXISTS` from management 0001; simplified app 0002–0006 seeds and 0005 drops; regenerated baselines; `verify-linear-baseline.sh` and `validate-linear-migrations.sh` OK.

#### Files Created/Modified

- `infra/k8s/base/ops/source/database/linear-migrations/app/0024_feed_policy_split.sql`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0025_feed_lifecycle_state_replacement.sql`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0026_feed_status_table_removal_prep.sql`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0027_feed_legacy_flag_drop.sql`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0028_billing_pricing_catalog.sql`
- `infra/k8s/base/db/source/bootstrap/0003a_app_linear_baseline.sql.gz`
- `infra/k8s/base/db/source/bootstrap/0003b_management_linear_baseline.sql.gz`

### Session 2 - 2026-05-05

#### Prompt (Developer)

make sure that this choice is in skill files so you remember to follow this standard going forward

#### Key Decisions

- Added Podverse skill `.cursor/skills/linear-sql-greenfield-only/SKILL.md`; linked from `migration-readiness-marker-sync`, `linear-baseline-0003.mdc`, and `docs/operations/database/LINEAR-MIGRATIONS.md`.
- Extended Metaboost `linear-db-migrations` and `linear-baseline-gz-sync` skills with the same greenfield-only authoring standard.

#### Files Created/Modified

- `.cursor/skills/linear-sql-greenfield-only/SKILL.md`
- `.cursor/skills/migration-readiness-marker-sync/SKILL.md`
- `.cursor/rules/linear-baseline-0003.mdc`
- `docs/operations/database/LINEAR-MIGRATIONS.md`
- `.cursor/skills/linear-db-migrations/SKILL.md` (Metaboost)
- `.cursor/skills/linear-baseline-gz-sync/SKILL.md` (Metaboost)
