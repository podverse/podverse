# Phase 2 - Podverse linear runner scripts and CI flow

## Scope

Use forward-only execution, status, and validation tooling across migration workflows.

## Key files

- `scripts/database/run-linear-migrations.sh` (new)
- `scripts/database/run-linear-migrations-k8s.sh` (new)
- `scripts/database/print-linear-migrations-status-k8s.sh` (new)
- `scripts/database/validate-linear-migrations.sh` (new)
- `package.json`
- `.github/workflows/ci.yml`

## Steps

1. **Introduce canonical linear scripts**
   - Add a runner that:
     - acquires DB lock;
     - discovers unapplied migrations in sorted order;
     - applies one-by-one in transactions;
     - records checksum + applied timestamp.
   - Add validation script for ordering/checksum invariants.
   - Add status script for human-readable applied/pending view.

2. **K8s-friendly runner mode**
   - Add non-interactive shell entrypoint for ops jobs (app and management variants).
   - Ensure deterministic exit codes for Argo/K8s job observability.

3. **Cut over npm + CI commands**
   - Use only forward-only script names in npm/CI paths.
   - Update CI workflow checks to run linear migration validation/status gates.

4. **Cleanup handling**
   - Remove obsolete migration scripts from active usage paths.
   - Ensure no CI/make/doc references require non-linear migration flow.

## Verification

- `npm` scripts run successfully for linear validate/status/execute paths.
- CI config references only linear migration scripts.
- Local dry-run (if implemented) confirms pending migration order without mutating DB.
