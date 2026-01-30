# Workers Per-Job Env Validation — Copy-Pasta Prompts for Parallel Execution

**Parent**: [workers-env-00-EXECUTION-ORDER.md](workers-env-00-EXECUTION-ORDER.md)

## CRITICAL: Execution Rules

**SEQUENTIAL PHASES** — Each phase must **COMPLETE** before the next:

- **Phase 1** → WAIT FOR COMPLETION → **Phase 2** → WAIT FOR COMPLETION → **Phase 3**

**DO NOT** run phases simultaneously.  
**DO** run agents **within** Phase 2 in parallel (2 agents).  
**DO** run agents **within** Phase 3 in parallel (2 agents).

## How to Use

1. **Phase 1**: Copy the Phase 1 prompt → paste into one agent → execute → **WAIT FOR COMPLETION**.
2. **Phase 2**: Copy both Phase 2 prompts → paste into two agents → execute both in parallel → **WAIT FOR BOTH TO COMPLETE**.
3. **Phase 3**: Copy both Phase 3 prompts → paste into two agents → execute both in parallel → **WAIT FOR BOTH TO COMPLETE**.
4. Run verification (build, lint, manual checks) after each phase.

---

## PHASE 1: Command-first and per-job validation (1 agent)

### Agent 1: Command-first and per-job validation

```
Read and execute .llm/plans/active/workers-env-validation/workers-env-01-command-first-validation.md

Implement command-first bootstrap and per-job env validation for the workers app. Parse command from argv before validation; add a validator per command; shared display; validateStartupRequirements(commandName); unknown command fails fast.

Verify: npm run build:packages && npm run build -w apps/workers && npm run lint. Then run node apps/workers/dist/index.js statsUpdateAggregated with only Base+ORM env set (validation should pass); run with unknown command (should exit with clear message).
```

---

## PHASE 2: Config/skill (2 agents — run in parallel)

### Agent 2A: Category-scoped config and lazy context creation

```
Read and execute .llm/plans/active/workers-env-validation/workers-env-02-config-lazy-context.md

Refactor workers config to category-scoped getters and index.ts to build/create only the contexts the running command needs. Unused env vars must not be read or used.

Verify: npm run build:packages && npm run build -w apps/workers && npm run lint. Run an ORM-only command with only Base+ORM env; confirm no MQ/Web/PodcastIndex read; only ORM context created.
```

### Agent 2B: Workers skill

```
Read and execute .llm/plans/active/workers-env-validation/workers-env-04-workers-skill.md

Create .cursor/skills/workers/SKILL.md documenting per-job validation, command-first bootstrap, and the checklist for adding a new worker command. When to use, core rules, categories, references to ENV.md.

Verify: File exists at .cursor/skills/workers/SKILL.md and contains when to use, core rules, adding new command, categories.
```

---

## PHASE 3: Documentation and tests (2 agents — run in parallel)

### Agent 3A: Documentation

```
Read and execute .llm/plans/active/workers-env-validation/workers-env-03-documentation.md

Update ENV.md (per-command validation, required/optional vars per command), APPS-WORKERS.md (per-job env vars, link to ENV.md), validation module README/JSDoc; optionally workers.env.example and AGENTS.md.

Verify: ENV.md and APPS-WORKERS.md updated; validation module has README or JSDoc; markdown follows project conventions.
```

### Agent 3B: Tests

```
Read and execute .llm/plans/active/workers-env-validation/workers-env-05-tests.md

Add tests for per-job validation: unknown command fails; known command returns only that command's vars; required missing causes throw; all required set passes. Use env save/restore where needed.

Verify: npm run test -w apps/workers && npm run lint.
```

---

## Verification (after all phases)

```bash
npm run build:packages
npm run build -w apps/workers
npm run test -w apps/workers
npm run lint
```

- Run `node apps/workers/dist/index.js statsUpdateAggregated` with only Base+ORM env: should pass validation and run (or exit after DB init).
- Run with a required var unset: should see job-specific FATAL and list of missing vars.
- Run with unknown command: should exit immediately with clear message.
- Confirm .cursor/skills/workers/SKILL.md exists and ENV.md/APPS-WORKERS.md describe per-job validation.
