# Workers Per-Job Env Validation — Execution Order

**Parent**: [workers-env-00-SUMMARY.md](workers-env-00-SUMMARY.md)

## Execution Rules

**SEQUENTIAL PHASES** — Each phase must **complete** before the next:

- **Phase 1** → WAIT → **Phase 2** → WAIT → **Phase 3**

**Within Phase 2**: Run **02** (config/lazy context) and **04** (workers skill) **in parallel** (2 agents).  
**Within Phase 3**: Run **03** (documentation) and **05** (tests) **in parallel** (2 agents).

**DO NOT** start Phase 2 until Phase 1 is done. **DO NOT** start Phase 3 until Phase 2 is done.

## Phases

### Phase 1: Command-first and per-job validation (sequential)

**Single agent.** Must complete before any other plan.

| Plan                                                                                     | Description                                                                                                                                |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [workers-env-01-command-first-validation.md](workers-env-01-command-first-validation.md) | Parse command from argv first; per-job validators; shared display; `validateStartupRequirements(commandName)`; unknown command fails fast. |

### Phase 2: Config/skill (parallel — 2 agents)

**Run 02 and 04 in parallel.**

| Plan                                                                           | Description                                                                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| [workers-env-02-config-lazy-context.md](workers-env-02-config-lazy-context.md) | Category-scoped config getters; index.ts builds/creates only contexts for command’s categories.  |
| [workers-env-04-workers-skill.md](workers-env-04-workers-skill.md)             | Create `.cursor/skills/workers/SKILL.md`: per-job validation, command-first, adding new command. |

### Phase 3: Documentation and tests (parallel — 2 agents)

**Run 03 and 05 in parallel.** Start only after Phase 2 is complete.

| Plan                                                               | Description                                                                              |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| [workers-env-03-documentation.md](workers-env-03-documentation.md) | ENV.md, APPS-WORKERS.md, validation README/JSDoc, optional infra template and AGENTS.md. |
| [workers-env-05-tests.md](workers-env-05-tests.md)                 | Tests for per-job validation (required vars per command; unknown command fails).         |

## Quick reference

| Phase | Plans  | Parallel?      |
| ----- | ------ | -------------- |
| 1     | 01     | No (1 agent)   |
| 2     | 02, 04 | Yes (2 agents) |
| 3     | 03, 05 | Yes (2 agents) |

## Verification after each phase

```bash
npm run build:packages
npm run build -w apps/workers
npm run lint
```

After Phase 1: Run e.g. `node apps/workers/dist/index.js statsUpdateAggregated` with only Base+ORM env set; should pass validation. With MQ vars missing, should still pass (no MQ validation for that command).  
After Phase 2: Same; and ORM-only command should not create Parser/Firebase/Notifications contexts.  
After Phase 3: Run validation tests; docs and skill in place.

## Copy-pasta prompts

Use [workers-env-COPY-PASTA.md](workers-env-COPY-PASTA.md) for ready-to-paste agent prompts.
