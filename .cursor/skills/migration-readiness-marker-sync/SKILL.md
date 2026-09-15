---
name: migration-readiness-marker-sync
description: Keep K8s readiness migration marker env vars aligned with latest linear SQL migrations. Use when adding/changing linear migrations or readiness init checks.
---

# Migration Readiness Marker Sync (Podverse)

Use this skill whenever you touch:

- `infra/k8s/base/ops/source/database/linear-migrations/**`
- API or management-api migration wait initContainers
- API or management-api K8s `source/*.env` files containing readiness migration marker vars

## Goal

Ensure readiness startup gates check the latest required migration marker and never lag behind newly added migrations.

## Required alignment

When a new latest migration is added:

1. Regenerate the committed init snapshots in the same change (agents run these, not the operator):
   - `make db_regen_linear_baseline`
   - `make db_verify_linear_baseline`
   - Leave updated `infra/k8s/base/db/source/bootstrap/0004_app_linear_baseline.sql.gz` and `0005_management_linear_baseline.sql.gz` in the working tree. See [linear-baseline-0004](/.cursor/rules/linear-baseline-0004.mdc).
2. Update migration marker env defaults:
   - `infra/k8s/base/api/source/api.env`:
     - `API_EXPECTED_MIGRATION_FILENAME`
   - `infra/k8s/base/management-api/source/management-api.env`:
     - `MANAGEMENT_API_EXPECTED_MIGRATION_FILENAME`
3. Verify initContainer SQL checks in:
   - `infra/k8s/base/api/deployment.yaml`
   - `infra/k8s/base/management-api/deployment.yaml`
     They must reference the marker env vars, not hardcoded stale filenames.
4. Keep overlays/Kustomize wiring intact so updated env values reach Deployments.

## Related skills

- [linear-sql-greenfield-only](/.cursor/skills/linear-sql-greenfield-only/SKILL.md) — strict ordered-chain SQL (no upgrade-only idempotency clutter).

## Migration source of truth

Use latest SQL filenames under:

- `infra/k8s/base/ops/source/database/linear-migrations/app/`
- `infra/k8s/base/ops/source/database/linear-migrations/management/`

If a migration is added for a DB domain that must gate startup, update the corresponding marker in the same change.

## Verification checklist

- `kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/base/api`
- `kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/base/management-api`
- Confirm rendered initContainer SQL checks include the updated env marker variables.
