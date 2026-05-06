# ci-linear-migration-validate

**Started:** 2026-05-06
**Author:** LLM session
**Context:** Sync ops Kustomize bundle with new linear migrations; verify baselines for CI.

### Session 1 - 2026-05-06

#### Prompt (Developer)

Debug CI failure: Validate linear migration files

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added app migrations `0028`–`0030` and management `0005` to `infra/k8s/base/ops/kustomization.yaml` so `validate-linear-migrations.sh` ops bundle sync passes.
- Ran `make db_regen_linear_baseline` and `make db_verify_linear_baseline`; verify reported OK; committed baselines were already in sync (no change to `0003a`/`0003b` `.sql.gz` in working tree after regen).

#### Files Created/Modified

- [infra/k8s/base/ops/kustomization.yaml](infra/k8s/base/ops/kustomization.yaml)
- [.llm/history/active/ci-linear-migration-validate/ci-linear-migration-validate-part-01.md](.llm/history/active/ci-linear-migration-validate/ci-linear-migration-validate-part-01.md)
