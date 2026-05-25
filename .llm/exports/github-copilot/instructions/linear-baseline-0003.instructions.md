---
description: "Generated DB bootstrap 0003a/0003b and linear ops migrations — do not hand-edit generated bootstrap SQL"
applyTo:
  - "infra/k8s/base/ops/source/database/linear-migrations/**"
  - "infra/k8s/base/db/source/bootstrap/**"
  - "scripts/database/generate-linear-baseline.sh"
  - "scripts/database/verify-linear-baseline.sh"
---

# Linear baseline `0003a`/`0003b`

- **Do not edit** `infra/k8s/base/db/source/bootstrap/0003a_app_linear_baseline.sql.gz` or `0003b_management_linear_baseline.sql.gz` by hand. They are produced by `scripts/database/generate-linear-baseline.sh` (or `make db_regen_linear_baseline`) from `infra/k8s/base/ops/source/database/linear-migrations` migrations, after bootstrap `0001` and `0002` shell steps, using synthetic credentials in `scripts/database/db.generate-baseline.env`. **`0003_apply_linear_baselines.sh`** is maintained by hand and loads those archives as the app vs management DB owner at init.
- After changing a SQL file under `infra/k8s/base/ops/source/database/linear-migrations/`, run `make db_regen_linear_baseline`, commit the updated `0003a_` and `0003b_` files, and have a maintainer run **`/test` on the PR** so GitHub Actions runs `verify-linear-baseline.sh`. There is no automatic commit of generated bootstrap SQL to `develop`.
- Individual `NNNN_*.sql` migration files remain the **source of truth**; `0003a`/`0003b` are generated snapshots for init and CI drift checks and include deterministic `linear_migration_history` seeds aligned with `run-linear-migrations.sh`.
- **Authoring:** Write migrations as **greenfield-only** ordered chains (assume prior files applied); avoid `IF EXISTS` / `IF NOT EXISTS` / seed `ON CONFLICT` / `WHERE NOT EXISTS` guards unless a predecessor in the same chain truly leaves ambiguity. See `.llm/exports/github-copilot/skills/linear-sql-greenfield-only/SKILL.md`.
