# Podverse DB migrations - execution order

## Sequencing rule

Run phases in order. Do not start a later phase until prior phase verification is complete.

## Phase order

1. **Phase 1 - Bootstrap + linear layout** (`.llm/plans/completed/db-migrations-forward-only/01-bootstrap-and-linear-layout.md`) - COMPLETED
   - Defines canonical migration directories, migration metadata table strategy, and fresh-boot behavior.
2. **Phase 2 - Runner scripts + CI flow** (`.llm/plans/completed/db-migrations-forward-only/02-linear-runner-scripts-and-ci-flow.md`) - COMPLETED
   - Adds linear migration execution/validation scripts and updates CI/package hooks to forward-only commands.
3. **Phase 3 - K8s ops jobs + cache safety** (`.llm/plans/completed/db-migrations-forward-only/03-podverse-ops-k8s-jobs-and-cache-safety.md`) - COMPLETED
   - Adds `podverse-ops` one-off migration job manifests with stale-artifact protections.
4. **Phase 4 - Docs + cleanup** (`.llm/plans/completed/db-migrations-forward-only/04-docs-makefiles-and-deprecation-cleanup.md`) - COMPLETED
   - Final docs/update pass and full removal of old migration process references.

## Parallelization guidance

- Keep phases sequential.
- Within **Phase 4** only, doc text cleanup and Makefile/help text cleanup may run in parallel if file overlap is avoided.

## Completion gate

Before moving this plan set to completed:

- All references to previous non-linear flow are removed from active usage paths.
- Forward-only migration commands work for both app and management DBs.
- K8s ops migration jobs are present in base ops and consumable by alpha ops setup in-repo.
