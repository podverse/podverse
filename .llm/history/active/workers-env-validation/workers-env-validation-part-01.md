# Workers per-job env validation

**Started**: 2025-01-30  
**Context**: Phase 1 of workers-env-validation plan (command-first bootstrap, per-job validation)

---

### Session 1 - 2025-01-30

#### Prompt (Developer)

@workers-env-COPY-PASTA.md (26-34)

#### Key Decisions

- Command resolved from `process.argv.slice(2)[0]` at top of index before any validation/config import.
- KNOWN_COMMANDS list lives in `apps/workers/src/commands/commandNames.ts` (no config/command impl imports).
- Unknown or missing command exits immediately with FATAL message; no validation run.
- Per-job validators in validation.ts: category helpers (Base, ORM, MQ, Parser, PodcastIndex, WebNotifications) and command→categories mapping (Base+ORM, Base+ORM+PodcastIndex, Base+ORM+MQ, Base+ORM+Parser+PodcastIndex+Web, full stack).
- Config and commands loaded after validation via dynamic `require()` so they are not hoisted and do not run before `validateStartupRequirements(commandName)`.

#### Files Created/Modified

- `apps/workers/src/commands/commandNames.ts` (created)
- `apps/workers/src/index.ts` (command-first bootstrap, require after validation)
- `apps/workers/src/lib/startup/validation.ts` (validateStartupRequirements(commandName), per-command validators, shared display)
- `apps/workers/src/index.ts` (Prettier)

---

### Session 2 - 2025-01-30

#### Prompt (Developer)

@workers-env-COPY-PASTA.md (50-58)

#### Key Decisions

- Created Cursor skill at `.cursor/skills/workers/SKILL.md` per Plan 04 (workers-env-04-workers-skill.md).
- Skill documents per-job validation, command-first bootstrap, adding new command checklist, categories, and references to ENV.md / APPS-WORKERS.md.

#### Files Created/Modified

- `.cursor/skills/workers/SKILL.md` (created)

---

### Session 3 - 2025-01-30

#### Prompt (Developer)

@workers-env-COPY-PASTA.md (40-48)

#### Key Decisions

- Shared command→categories in `lib/startup/categoriesForCommand.ts`; validation uses `getCategoriesForCommand()` so only those validators run.
- Config replaced with category-scoped getters: `getBaseConfig()`, `getMQConfig()`, `getPodcastIndexConfig()`, `getExternalServicesConfig()`, `getNotificationsConfig()`. No default `config` export; env vars read only when a getter is called.
- Factories refactored to settable/gettable: `setLoggerService`/`getLoggerService`, `setLogger`/`getLogger`, `setTimerManager`/`getTimerManager`, `setActiveMQArtemisService`/`getActiveMQArtemisService`, `setPodcastIndexService`/`getPodcastIndexService`. Services created in `runApp()` after categories are known; commands use getters at runtime.
- Index: after `getCategoriesForCommand(commandName)`, only base config + logger/timer set (always); ORM/WebNotifications/Parser/MQ/PodcastIndex configs and contexts built/created only when category is in set. DBs initialized only when ORM context exists.
- `lib/winston.ts` uses `getBaseConfig()` at call time for `createDailyRotateLogger` so only Base env is read when that command runs.

#### Files Created/Modified

- `apps/workers/src/lib/startup/categoriesForCommand.ts` (created)
- `apps/workers/src/config/index.ts` (getters only, no default config)
- `apps/workers/src/lib/startup/validation.ts` (use getCategoriesForCommand)
- `apps/workers/src/factories/loggerService.ts`, `logger.ts`, `timerManager.ts`, `activeMQArtemisService.ts`, `podcastIndexService.ts` (setters/getters)
- `apps/workers/src/index.ts` (lazy config/context by category)
- `apps/workers/src/lib/winston.ts` (getBaseConfig())
- All command files that used loggerService/logger/activeMQArtemisService/podcastIndexService/timerManager (switched to getters)

---

### Session 4 - 2025-01-30

#### Prompt (Developer)

@workers-env-COPY-PASTA.md (64-72)

#### Key Decisions

- ENV.md: Added "Per-command validation" section and "Command groups and env categories" table; source of truth points to validation.ts and categoriesForCommand.ts. Kept category taxonomy; updated "Module configuration validation" and "Adding new environment variables" to reference validation. Base: USER_AGENT and LOG_LEVEL required (aligned with validation.ts). MQ vars documented as Required for MQ commands.
- APPS-WORKERS.md: Environment configuration now states required env vars are per-job, job-specific validation output, link to ENV.md, and note that each job validates only what it needs (e.g. ORM-only vs full stack).
- validation.ts: Expanded top-level JSDoc for command-first bootstrap, per-job validators, shared display, and adding a new command (KNOWN_COMMANDS, categoriesForCommand, ENV.md, index.ts contexts).
- workers.env.example: Added comment that workers validate per-command and not all vars required for every job; see apps/workers/ENV.md.
- AGENTS.md: Added "Workers startup validation" row to "Where to Find Things" table with path to validation.ts and ENV.md.

#### Files Created/Modified

- `apps/workers/ENV.md`
- `apps/workers/APPS-WORKERS.md`
- `apps/workers/src/lib/startup/validation.ts` (JSDoc)
- `infra/config/env-templates/workers.env.example`
- `AGENTS.md`
