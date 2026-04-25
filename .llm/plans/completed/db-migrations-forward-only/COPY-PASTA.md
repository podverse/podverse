# Podverse DB migrations - COPY-PASTA

Execution model: phases are sequential (`01 -> 02 -> 03 -> 04`).  
Do not begin the next phase until current phase verification is complete.

---

## Phase 1 - Bootstrap and layout

Status: COMPLETED (moved to `.llm/plans/completed/db-migrations-forward-only/01-bootstrap-and-linear-layout.md`).

---

## Phase 2 - Linear scripts and CI cutover

Status: COMPLETED (moved to `.llm/plans/completed/db-migrations-forward-only/02-linear-runner-scripts-and-ci-flow.md`).

---

## Phase 3 - podverse-ops K8s jobs and cache protections

Status: COMPLETED (moved to `.llm/plans/completed/db-migrations-forward-only/03-podverse-ops-k8s-jobs-and-cache-safety.md`).

---

## Phase 4 - docs and cleanup

Status: COMPLETED (moved to `.llm/plans/completed/db-migrations-forward-only/04-docs-makefiles-and-deprecation-cleanup.md`).

---

## Completion checklist

- [x] All four phase files completed.
- [x] Previous non-linear workflow removed from active execution paths.
- [x] Forward-only process documented for first boot + existing DB upgrades.
- [x] podverse-ops migration jobs present and rerunnable/idempotent.
