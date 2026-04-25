# Podverse DB migrations - forward-only summary

## Goal

Standardize on a forward-only linear migration process that supports:

- **fresh bootstrap**: first DB startup still reaches latest schema automatically;
- **ongoing upgrades**: existing DB instances can be migrated safely over time;
- **K8s operations**: idempotent one-off migration jobs run through `podverse-ops`;
- **monorepo-only scope**: update Podverse base/alpha and related local files only (no external GitOps repo edits in this plan set).

## Plan files

- `00-EXECUTION-ORDER.md`
- `01-bootstrap-and-linear-layout.md` (completed at `.llm/plans/completed/db-migrations-forward-only/01-bootstrap-and-linear-layout.md`)
- `02-linear-runner-scripts-and-ci-flow.md` (completed at `.llm/plans/completed/db-migrations-forward-only/02-linear-runner-scripts-and-ci-flow.md`)
- `03-podverse-ops-k8s-jobs-and-cache-safety.md` (completed at `.llm/plans/completed/db-migrations-forward-only/03-podverse-ops-k8s-jobs-and-cache-safety.md`)
- `04-docs-makefiles-and-deprecation-cleanup.md` (completed at `.llm/plans/completed/db-migrations-forward-only/04-docs-makefiles-and-deprecation-cleanup.md`)
- `COPY-PASTA.md`

## Scope decisions

- Keep bootstrap SQL artifacts under `infra/k8s/base/db/source/` so first-start behavior remains intact.
- Introduce canonical linear migration directories for app + management schemas (forward-only, additive files).
- Add migration metadata table + locking pattern so reruns are idempotent and safe in concurrent environments.
- Add ops one-off job manifests in `infra/k8s/base/ops/` and wire alpha ops overlay usage.
- Remove references to previous non-linear migration naming/process.

## Explicitly out of scope

- Any deployment-specific domain rollout in external GitOps repositories.
- Production scheduling policy decisions beyond adding safe manual/one-off job templates.
- Full destructive migration rollback framework (we stay forward-only).

## Success criteria

- New migrations are added as timestamped/ordered `.sql` files, never by rebuilding a giant combined file manually.
- Fresh DB initialization still reaches latest schema from repository-defined bootstrap assets.
- Existing DBs can be brought current via linear migration runner scripts and K8s ops jobs.
- CI verifies linear migration integrity/status instead of old combined-file parity checks.
- Docs and Makefile help text consistently describe the forward-only process.
