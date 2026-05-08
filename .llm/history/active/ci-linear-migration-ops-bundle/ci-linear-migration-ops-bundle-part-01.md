## Metadata

- **Started:** 2026-05-08
- **Author:** Cursor agent
- **Context:** CI failed on validate-linear-migrations (ops kustomization out of sync for management 0006)

---

### Session 1 - 2026-05-08

#### Prompt (Developer)

Debug GitHub Actions run 25532703651 (Linear migration files valid)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Reproduced CI locally: `validate-linear-migrations.sh` reported **Missing management migration in ops kustomization: 0006_bucket_permissions.sql**.
- Added **`- source/database/linear-migrations/management/0006_bucket_permissions.sql`** to **`podverse-ops-management-linear-migrations`** in [`infra/k8s/base/ops/kustomization.yaml`](infra/k8s/base/ops/kustomization.yaml).
- Ran **`scripts/database/verify-linear-baseline.sh`**: committed **`0003a`/`0003b`** baselines already match generated output—**no** `make db_regen_linear_baseline` required.

#### Files Created/Modified

- [`infra/k8s/base/ops/kustomization.yaml`](infra/k8s/base/ops/kustomization.yaml)
- [`.llm/history/active/ci-linear-migration-ops-bundle/ci-linear-migration-ops-bundle-part-01.md`](.llm/history/active/ci-linear-migration-ops-bundle/ci-linear-migration-ops-bundle-part-01.md)
