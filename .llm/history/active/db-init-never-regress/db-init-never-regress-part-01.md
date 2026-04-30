# db-init-never-regress

## Metadata

- Started: 2026-04-29
- Author: LLM session

### Session 1 - 2026-04-29

#### Prompt (Developer)

Deep Fix Plan: Prevent DB Init Permission Regressions

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Hardened `0003_apply_linear_baselines.sh` to use socket-first transport by default, with explicit readiness wait and fail-fast validation checks for extension and baseline objects.
- Added a reusable bootstrap contract verifier script and wired it into both local DB init flow and a suspended ops CronJob for post-sync checks.
- Added CI gates for bootstrap contract regression (ephemeral initdb bootstrap) and runtime extension creation guard.
- Updated remote GitOps runbook with required preflight checks, postflight DB verification, and deterministic partial-initdb recovery procedure.

#### Files Created/Modified

- `.github/workflows/ci.yml`
- `docs/development/k8s/REMOTE-K8S-GITOPS.md`
- `infra/k8s/base/db/source/bootstrap/0003_apply_linear_baselines.sh`
- `infra/k8s/base/db/statefulset.yaml`
- `infra/k8s/base/ops/db-verify-bootstrap-contract.cronjob.yaml`
- `infra/k8s/base/ops/kustomization.yaml`
- `infra/k8s/base/ops/source/database/runner/verify-bootstrap-contract.sh`
- `makefiles/local/Makefile.local.infra.mk`
- `scripts/database/check-no-runtime-create-extension.sh`
- `scripts/database/ci-verify-bootstrap-contract.sh`
- `scripts/database/verify-bootstrap-contract.sh`
