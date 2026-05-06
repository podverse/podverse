## Metadata

- **Started:** 2026-05-05
- **Author:** Cursor agent
- **Context:** NOTICE cleanup in app linear SQL + deterministic billing seed for baseline verify

---

### Session 1 - 2026-05-05

#### Prompt (Developer)

Linear migration output assessment and NOTICE cleanup

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Replaced `DROP CONSTRAINT IF EXISTS` / `DROP TRIGGER IF EXISTS` with **`DO $$ ... $$`** blocks that consult **`pg_catalog`** (`pg_constraint` + `pg_namespace` + `pg_class`, or `pg_trigger`) and only execute **`DROP`** when the object exists—avoids PostgreSQL **NOTICE** on greenfield applies while keeping upgrade paths safe.
- **`0028_billing_pricing_catalog.sql`**: Seed inserts used **`NOW()`** for `effective_from`, making **`make db_verify_linear_baseline`** fail (two generator runs produced different dump bytes). Switched seed **`effective_from`** to **`TIMESTAMP '2000-01-01 00:00:00'`** to match normalized seed timestamps and make baselines reproducible.
- Regenerated and verified **`0003a_app_linear_baseline.sql.gz`** and **`0003b_management_linear_baseline.sql.gz`**.

#### Files Created/Modified

- `infra/k8s/base/ops/source/database/linear-migrations/app/0018_spam_permit.sql`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0019_feed_spam_item_limit_override.sql`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0021_account_trust_and_entitlement_overrides.sql`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0022_account_membership_tier_trial_premium.sql`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0023_remove_account_trust_tier.sql`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0024_feed_policy_split.sql`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0025_feed_lifecycle_state_replacement.sql`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0027_feed_legacy_flag_drop.sql`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0028_billing_pricing_catalog.sql`
- `infra/k8s/base/db/source/bootstrap/0003a_app_linear_baseline.sql.gz`
- `infra/k8s/base/db/source/bootstrap/0003b_management_linear_baseline.sql.gz`
- `.llm/history/active/linear-migration-notice-cleanup/linear-migration-notice-cleanup-part-01.md`
