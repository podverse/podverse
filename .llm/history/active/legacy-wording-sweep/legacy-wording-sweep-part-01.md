# Legacy wording sweep

**Started:** 2026-05-05  
**Author:** Agent  
**Context:** Remove “legacy” narrative from working-tree comments/docs/tests/SQL headers per plan.

---

### Session 1 - 2026-05-05

#### Prompt (Developer)

Remove "legacy" narrative from working-tree files

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Left `package-lock.json` and `0027_feed_legacy_flag_drop.sql` filename / `API_EXPECTED_MIGRATION_FILENAME` wiring unchanged per plan.
- Did not edit `.llm/history` archives (plan: minimal).
- `make db_regen_linear_baseline` failed locally (Docker daemon unavailable); user must run it after SQL comment edits when Docker is up, then commit regenerated `0003a`/`0003b` gz per linear-baseline rule.

#### Files Created/Modified

- `packages/orm/src/entities/feed/feedTakedownReason.ts` (prior session)
- `packages/orm/src/services/feed/feedLifecycleState.ts` (prior session)
- `packages/orm/src/lib/feedSpamThresholds.ts` (prior session)
- `packages/orm/src/services/archiver.ts` (prior session)
- `packages/helpers/src/dtos/feed/feedPolicyReason.test.ts`
- `docs/RSS-ARCHIVE-DELETE-LIFECYCLE.md`
- `infra/k8s/scripts/secret-generators/INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0025_feed_lifecycle_state_replacement.sql`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0026_feed_status_table_removal_prep.sql`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0027_feed_legacy_flag_drop.sql`
- `.cursor/skills/env-expiration-naming/SKILL.md`
- `.llm/history/active/legacy-wording-sweep/legacy-wording-sweep-part-01.md`
