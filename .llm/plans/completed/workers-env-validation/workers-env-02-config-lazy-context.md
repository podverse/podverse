# Workers Env Validation — Plan 02: Category-scoped config and lazy context creation

**Phase**: 2A (run in parallel with Plan 04 — workers skill)  
**Depends on**: Plan 01 (command-first and per-job validation) complete  
**Summary**: [workers-env-00-SUMMARY.md](workers-env-00-SUMMARY.md)  
**Execution order**: [workers-env-00-EXECUTION-ORDER.md](workers-env-00-EXECUTION-ORDER.md)

## Objective

Refactor workers config so only the env vars required by the running command are read. Refactor `index.ts` so it builds module configs and creates contexts only for the command’s categories (e.g. ORM-only command does not build Parser/Firebase/Notifications config or create those contexts). Unused env vars must not be read or used for the current job.

## Scope

- **Config**: Replace the single `config` export that reads everything at import time with category-scoped getters (e.g. `getBaseConfig()`, `getORMConfig()`, `getMQConfig()`, `getParserConfig()`, `getPodcastIndexConfig()`, `getWebNotificationsConfig()`). Each getter reads only its env vars. Call only the getters for the command’s categories.
- **Index**: After command is known, determine which categories the command needs (reuse the same mapping as validation — e.g. a shared `getCategoriesForCommand(commandName)` or derive from validator registry). Build only the module configs (ormConfig, externalServicesConfig, notificationsConfig, parserConfig) for those categories; validate only those configs; create and initialize only those contexts.
- **No top-level full config**: Do not import a single `config` that reads all env vars; load config (or config slices) only after command is known and only for the command’s categories.

## Files to create or modify

### 1. `apps/workers/src/config/index.ts`

**Current behavior**: Exports a single `config` object built at module load time from `process.env` (userAgent, log, podcastIndex, queue). All env vars for those slices are read on import.

**Required changes**:

- Remove or replace the single `config` export so that nothing reads all env vars at import time.
- Add category-scoped getters. Each getter only reads the env vars for that category. Use `/* eslint-disable @typescript-eslint/no-non-null-assertion */` with a comment that env vars are validated at startup for the running command.
- **Suggested getters**:
  - `getBaseConfig()`: USER_AGENT, LOG_LEVEL, LOG_DIR, LOG_TIMER. Returns `{ userAgent, log: { level, dir, timer } }`.
  - `getORMConfig()`: not needed as a separate object if ORM config is built in index.ts from env; alternatively `getORMConfig()` returns the slice used for ORM (DB\_\*, DEFAULT_ACCOUNT_SETTINGS_LOCALE, plus log from base). Prefer building ormConfig in index.ts from `getBaseConfig()` + env for DB so that index only calls getters for categories the command needs.
  - `getMQConfig()`: MESSAGE*QUEUE*\* only. Returns `{ protocol, host, username, password, port }`.
  - `getPodcastIndexConfig()`: PODCAST*INDEX*\* only.
  - `getParserConfig(baseConfig, ...)`: PARSER\_\*, plus base log/userAgent and optional podcastIndex/firebase/defaults — or build in index from getBaseConfig() + env.
  - `getWebNotificationsConfig()` / external services: WEB*\*, BRAND_NAME, WEBPUSH*_, GOOGLE*FIREBASE*_.

- **Simpler approach**: Keep a single `config` module but make it a function `getConfig(categories: Set<string>)` that returns only the slices for the given categories (each slice only reads its env vars when that category is requested). Then index.ts calls `getConfig(categoriesForCommand)` after command is known.
- **Alternative**: Export only getters (getBaseConfig, getMQConfig, getPodcastIndexConfig, etc.) and no default export. Index.ts imports only the getters it needs for the command and calls them.

Ensure that calling a getter does not read env vars for other categories (no side effects on process.env for other vars).

### 2. Command → categories (shared with validation)

**Requirement**: Index.ts must know which categories the running command needs so it can call only the right getters and create only the right contexts.

- **Option A**: Export from the validation module a function `getCategoriesForCommand(commandName: string): Set<string>` (or array) that returns e.g. `['Base', 'ORM']` for `statsUpdateAggregated`, `['Base', 'ORM', 'MQ', 'Parser', 'PodcastIndex']` for `mqRSSRunParser`, etc. Validation already has a per-command notion; the same mapping can be reused.
- **Option B**: A small module `apps/workers/src/lib/startup/categoriesForCommand.ts` that defines the map command → categories. Validation and index both import it.

Use the same category names as in Plan 01: Base, ORM, MQ, Parser, PodcastIndex, WebNotifications (or Web/Notifications). Index.ts then checks e.g. `categories.has('ORM')` before building ormConfig and creating ORM context, etc.

### 3. `apps/workers/src/index.ts`

**Current behavior** (after Plan 01): Command resolved first; `validateStartupRequirements(commandName)`; then imports config, commands, helpers-config, orm, external-services, notifications, parser; parses args again for command; builds all ormConfig, externalServicesConfig, notificationsConfig, parserConfig; validates all; creates all contexts; initializes both DBs; runs command.

**Required changes**:

- Do not import the full `config` object. Import only the getters (or `getConfig(categories)`) and call them only for the command’s categories.
- After command is known, get `categories = getCategoriesForCommand(commandName)` (or equivalent).
- **Build configs only for categories**:
  - If categories includes Base: get base config (userAgent, log) for use in ORM/Parser/etc.
  - If categories includes ORM: build ormConfig from env (DB\_\*, DEFAULT_ACCOUNT_SETTINGS_LOCALE) and base log; validate with validateORMConfig; create ormContext; initialize dataSourceRead and dataSourceReadWrite.
  - If categories includes MQ: build queue config from getMQConfig() (or env); use it where activeMQArtemisService is created — ensure the MQ factory only runs when command needs MQ.
  - If categories includes Parser: build parserConfig (userAgent, log, podcastIndex, parser, defaults, firebase) from getters/env; validate with validateParserConfig; create parserContext with notificationsContext and firebaseContext if those are also needed.
  - If categories includes PodcastIndex: ensure podcastIndex slice is available (getPodcastIndexConfig or part of base); used by parser and by podcastIndexService factory.
  - If categories includes Web/Notifications: build externalServicesConfig and notificationsConfig; validate; create firebaseContext and notificationsContext; pass to createParserContext if Parser is also in categories.

- **Create contexts only when needed**: Do not call `createORMContext`, `createFirebaseContext`, `createNotificationsContext`, or `createParserContext` unless the command’s categories include the corresponding category. Do not initialize DBs unless ORM is in categories.
- **Factories**: Factories that depend on config (e.g. loggerService, activeMQArtemisService, podcastIndexService) must only be used when the command needs them. If a factory is used inside a command and that command is only run when the category is present, you may still need to create the context/config before calling the command. So: build and create only the contexts that the command’s categories require; then run the command. The command will use only the contexts that exist (e.g. ORM-only command only uses ORM).
- **Data source initialization**: Only call `ormContext.dataSourceRead.initialize()` and `ormContext.dataSourceReadWrite.initialize()` when ORM context was created.

### 4. Factories and command dependencies

**Check**: Commands import factories (e.g. `loggerService`, `activeMQArtemisService`, `podcastIndexService`). Those factories may read config or global context. Ensure that:

- Logger: Usually needs only base config (LOG_LEVEL, etc.). getBaseConfig() can provide it; call it when any command runs.
- activeMQArtemisService: Should be created only when the command needs MQ. Lazy-create or create inside a guard so that MQ config is only read when command has MQ category.
- podcastIndexService: Only when command needs PodcastIndex.
- createORMContext / ormContext: Only when command needs ORM.

If factories are used at module load time (e.g. `import { loggerService } from './factories/loggerService'` and loggerService reads config at load time), refactor so that logger is created after command is known and only base config is read. Same for other factories: they must not read env for categories the command does not need. Prefer creating contexts and services inside `runApp()` after categories are determined, rather than at top-level import.

## Implementation steps

1. Introduce shared command → categories (e.g. `getCategoriesForCommand(commandName)` in validation or a small shared module). Align with the categories used in Plan 01 validators.
2. Refactor `config/index.ts` to expose category-scoped getters (or `getConfig(categories)`) that only read env for the requested categories. Remove or replace the default `config` export that reads everything.
3. In `index.ts`, after command is known, call `getCategoriesForCommand(commandName)`. Import config getters (or getConfig) and call only for those categories.
4. In `runApp()`, build ormConfig, externalServicesConfig, notificationsConfig, parserConfig only when the corresponding category is in the set. Validate only those configs. Create only those contexts. Initialize DBs only when ORM context exists.
5. Adjust factories (loggerService, activeMQArtemisService, podcastIndexService) so they are created only when needed and do not read env at import time for categories the command does not need. This may require passing config into factories or creating them inside runApp() after categories are known.
6. Verify: Run an ORM-only command (e.g. statsUpdateAggregated) with only Base+ORM env set; confirm no attempt to read MQ or WEB*\* or PODCAST_INDEX*\*; confirm only ORM context is created. Run an MQ command with full env; confirm all needed contexts are created.

## Verification

```bash
npm run build:packages
npm run build -w apps/workers
npm run lint
```

- Run `node apps/workers/dist/index.js statsUpdateAggregated` with only Base + ORM env set. Process should not read MESSAGE*QUEUE*_ or WEB*PROTOCOL or PODCAST_INDEX*_ (e.g. check by temporarily logging or by ensuring no validation for those vars). Only ORM context should be created and initialized.
- Run `node apps/workers/dist/index.js mqRSSRunParser -q rss-slow` (or similar) with full env. All required contexts (ORM, MQ, Parser, etc.) should be created and the command should run.

## Out of scope for this plan

- Per-job validation logic (Plan 01).
- Documentation and skill (Plans 03, 04).
- Tests (Plan 05).
