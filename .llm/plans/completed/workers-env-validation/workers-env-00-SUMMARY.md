# Workers Per-Job Env Validation — Summary

**Created**: 2026-01-29  
**Parent plan**: [Workers Env Validation Plan](file:///Users/mitcheldowney/.cursor/plans/workers_env_validation_plan_6fa6767c.plan.md)  
**Scope**: Per-job startup validation and lazy config/context in `apps/workers`; single env file; docs and skill.

## Goals

1. **Single env file** — No split env files; no Ansible changes.
2. **Unused vars do not pollute** — Only validate and read env vars the running command needs; lazy context creation.
3. **Per-job validation** — Each command has its own validator; same logging style as api/management-api.
4. **Documentation and skill** — ENV.md, APPS-WORKERS.md, validation README/JSDoc, infra template note; `.cursor/skills/workers/SKILL.md`.

## File Inventory

### Phase 1 — Command-first and per-job validation (blocker)

| File                                             | Change                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `apps/workers/src/index.ts`                      | Parse command from argv first; call `validateStartupRequirements(commandName)`; no full config import before validation.        |
| `apps/workers/src/commands/parseArgs.ts`         | May stay as-is; used at top of entry.                                                                                           |
| `apps/workers/src/lib/startup/validation.ts`     | Replace with command-scoped entry: `validateStartupRequirements(commandName)`, dispatch to per-job validator, shared display.   |
| `apps/workers/src/lib/startup/validation/` (new) | Per-job validators (one file per command or one registry); shared `displayValidationResults`; map command → ValidationResult[]. |

### Phase 2 — Config and lazy context (depends on Phase 1)

| File                               | Change                                                                                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/workers/src/config/index.ts` | Refactor to category-scoped getters (e.g. `getBaseConfig()`, `getORMConfig()`, `getMQConfig()`) or partial config; no top-level read-all. |
| `apps/workers/src/index.ts`        | Build configs and create contexts only for command’s categories; conditional ORM, Parser, Firebase, Notifications.                        |

### Phase 2 (parallel) — Workers skill

| File                              | Change                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `.cursor/skills/workers/SKILL.md` | Create: when to use, per-job validation rules, command-first, adding new command checklist, categories. |

### Phase 3 — Documentation (depends on Phase 2)

| File                                                                   | Change                                                                                          |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `apps/workers/ENV.md`                                                  | Per-command validation; list required/optional env vars per command (or point to validators).   |
| `apps/workers/APPS-WORKERS.md`                                         | Per-job env vars; link to ENV.md; job-specific validation output.                               |
| `apps/workers/src/lib/startup/validation.ts` or `validation/README.md` | README or top-level JSDoc: command-first, per-job validators, new command = validator + ENV.md. |
| `infra/config/env-templates/workers.env.example`                       | Optional comment: per-command validation; see apps/workers/ENV.md.                              |
| `AGENTS.md`                                                            | Optional: workers row for “Startup validation” or “Where to Find Things” = per-job.             |

### Phase 3 (parallel) — Tests

| File                                                            | Change                                                                         |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `apps/workers/src/lib/startup/validation/__tests__/` or similar | Tests: required vars per command; unknown command fails; display output shape. |

## Commands (18) — for validator coverage

From `apps/workers/src/commands/index.ts`:

- `archiveAll`
- `ormFeedUpdateFlagStatus`
- `parserRSSParseFeed`
- `podcastIndexDeadFeedsDeleteCache`, `podcastIndexDeadFeedsFlagAndMerge`
- `podcastIndexTrendingPodcastsGet`
- `podcastIndexValueUpdateAll`
- `mqRSSAdd`, `mqRSSAddAll`, `mqRSSRunDlqConsumer`, `mqRSSRunParser`, `mqRSSRunLiveItemListener`, `mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex`
- `statsUpdateAggregated`, `statsUpdateAggregatedRolling`
- `generateOnDemandParserEventReports`, `deleteOutdatedOnDemandParserEvent`

## Categories (for validators)

- **Base**: USER_AGENT, LOG_LEVEL, LOG_DIR, LOG_TIMER, NODE_ENV
- **ORM**: DB\_\*, DEFAULT_ACCOUNT_SETTINGS_LOCALE
- **MQ**: MESSAGE*QUEUE*\*
- **Parser**: PARSER\_\*
- **PodcastIndex**: PODCAST*INDEX*\*
- **Web/Notifications**: WEB*\*, BRAND_NAME, WEBPUSH*_, GOOGLE*FIREBASE*_

## Strategy Overview

1. **Phase 1**: Command-first entry; per-job validators with shared display; unknown command fails fast. No config/context changes yet (index.ts can still build all contexts temporarily if needed to unblock Phase 2).
2. **Phase 2**: Category-scoped config getters; index.ts builds/creates only the contexts the command needs. Phase 2 can run **Skill** (04) in parallel with **Config/lazy context** (02).
3. **Phase 3**: Documentation and tests; run **Documentation** (03) and **Tests** (05) in parallel after Phase 2.

## Verification (high level)

- `npm run build:packages` then `npm run build -w apps/workers`; `npm run lint`.
- Run a few worker commands with minimal env (e.g. only Base+ORM for `statsUpdateAggregated`) and confirm they start; run with missing required var and confirm job-specific FATAL message.
