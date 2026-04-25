# Phase 3 - Podverse ops K8s jobs and cache safety

## Scope

Wire forward-only migration execution into `podverse-ops` as idempotent one-off jobs for app and management DBs.

## Key files

- `infra/k8s/base/ops/kustomization.yaml`
- `infra/k8s/base/ops/db-migrate-app.cronjob.yaml` (new)
- `infra/k8s/base/ops/db-migrate-management.cronjob.yaml` (new)
- `infra/k8s/alpha/ops/kustomization.yaml`
- `infra/k8s/alpha/apps/ops.yaml`
- `apps/api/Dockerfile` (if migration scripts/files must exist in runtime image)

## Steps

1. **Add one-off migration jobs**
   - Add suspended CronJob manifests (`schedule: "* * * * *"`, `suspend: true`) or Job templates for:
     - app DB linear migrations;
     - management DB linear migrations.
   - Use existing DB secrets and explicit env mapping for DB auth.

2. **Wire base + alpha ops**
   - Add new migration manifests to base ops kustomization.
   - Ensure alpha ops points at correct in-repo base path and includes new resources.
   - Keep scope limited to monorepo base/alpha files only.

3. **Cache/staleness protections**
   - Ensure migration job pods do not run stale SQL/script content:
     - use immutable image tags/digests for ops jobs;
     - set `imagePullPolicy: Always` for mutable tags;
     - include migration-bundle checksum annotation/env (from ConfigMap or build metadata) to force rollout when SQL changes.
   - Avoid disabling hash/versioning for migration-only config sources used by jobs.

4. **Idempotency and concurrency**
   - Job entrypoints must be safe to rerun.
   - Enforce DB-level lock in runner script to prevent concurrent migration application.

## Verification

- Manual trigger of each suspended job applies pending migrations and exits cleanly when already up to date.
- Re-running jobs is a no-op with success exit code.
- Updating migration files causes new job pod content to reflect latest SQL/scripts (no stale cache behavior).
