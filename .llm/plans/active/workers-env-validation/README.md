# Workers Per-Job Env Validation

Subplans for per-job startup validation and lazy config/context in the workers app.

## Quick start

1. **Execution order**: [workers-env-00-EXECUTION-ORDER.md](workers-env-00-EXECUTION-ORDER.md) — phases and parallelization.
2. **Copy-pasta prompts**: [workers-env-COPY-PASTA.md](workers-env-COPY-PASTA.md) — ready-to-paste prompts for each phase/agent.
3. **Summary**: [workers-env-00-SUMMARY.md](workers-env-00-SUMMARY.md) — scope and file inventory.

## Phases

- **Phase 1** (sequential): [workers-env-01-command-first-validation.md](workers-env-01-command-first-validation.md) — command-first entry and per-job validators.
- **Phase 2** (parallel): [workers-env-02-config-lazy-context.md](workers-env-02-config-lazy-context.md), [workers-env-04-workers-skill.md](workers-env-04-workers-skill.md) — config getters + lazy context; workers skill.
- **Phase 3** (parallel): [workers-env-03-documentation.md](workers-env-03-documentation.md), [workers-env-05-tests.md](workers-env-05-tests.md) — docs; tests.

Run Phase 1 first, then Phase 2 (both plans in parallel), then Phase 3 (both plans in parallel).
