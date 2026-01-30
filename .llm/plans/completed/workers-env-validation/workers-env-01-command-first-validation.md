# Workers Env Validation — Plan 01: Command-first and per-job validation

**Phase**: 1 (must run first; blocks Phase 2 and 3)  
**Summary**: [workers-env-00-SUMMARY.md](workers-env-00-SUMMARY.md)  
**Execution order**: [workers-env-00-EXECUTION-ORDER.md](workers-env-00-EXECUTION-ORDER.md)

## Objective

Implement command-first bootstrap and per-job environment variable validation in the workers app. The running command is determined from `argv` before any validation or config loading. Each command has its own validator (required/optional env vars). Validation output uses the same style as api/management-api (categories, checkmarks, summary, FATAL on missing required). Unknown command fails fast.

## Scope

- **Entry**: Parse command from argv at the very top of the worker entry path; call `validateStartupRequirements(commandName)`; do not import full config before validation.
- **Validation module**: Replace current “validate everything” with command-scoped validation: dispatch to per-job validator, shared display, throw if required missing.
- **Per-job validators**: One validator per command (18 commands); each returns `ValidationResult[]` for that job only.

## Files to create or modify

### 1. `apps/workers/src/index.ts`

**Current behavior**: Imports validation, calls `validateStartupRequirements()` (no args), then imports config and commands, parses args, runs command.

**Required changes**:

- At the very top (after the dotenv block), parse argv to get the command name **without** importing validation or config. Use only `parseArgs` (or a minimal parser that does not pull in config). Example: `const argv = process.argv.slice(2); const commandName = (argv[0] as string) ?? '';` or use existing `parseArgs` if it has no heavy imports.
- Resolve command name: first positional arg is the command (e.g. `statsUpdateAggregated`, `mqRSSRunParser`).
- If `!commandName` or command not in the known commands list, exit with a clear message (e.g. `console.error('FATAL: Missing or unknown command. Usage: node index.js <command> [args]'); process.exit(1);`). Do not run validation for unknown/missing command.
- **Then** import and call `validateStartupRequirements(commandName)`.
- Keep the rest of the file as-is for this plan (full config/context creation can remain for now; Phase 2 will make it lazy). Ensure no import of `config` or commands happens before `validateStartupRequirements(commandName)` so that validation runs with only the env vars that the per-job validator checks.

**Constraint**: Validation must run before any code that reads `process.env` for vars outside the current command’s validator (so no full config import before validation).

### 2. `apps/workers/src/lib/startup/validation.ts`

**Current behavior**: Exports `validateStartupRequirements()` with no args; validates all env vars (Config, Podcast Index, MQ, Database, Web, Notifications, Parser); uses `displayValidationResults`.

**Required changes**:

- Change signature to `validateStartupRequirements(commandName: string): void`.
- Accept only known command names. If `commandName` is not in the registry of validators, throw or exit with a clear message (e.g. "Unknown command for validation: ...").
- Get the validator for `commandName` (e.g. from a registry or map). Run only that validator to obtain `ValidationResult[]`.
- Build a `ValidationSummary` from those results (total, passed, failed, requiredMissing, skipped, defaultsUsed). Reuse the same summary calculation as current code (see existing `validateAllEnvironmentVariables` tail).
- Call a shared `displayValidationResults(summary)` (same format as api/management-api: by category, checkmarks, summary, list failed vars).
- If `summary.requiredMissing > 0`, log the same FATAL message as today and throw.
- Log "Startup validation completed successfully" when validation passes.
- **Do not** validate env vars that are not part of the current command’s validator.

**Option A — Validators in same file**: Define a map `COMMAND_VALIDATORS: Record<string, () => ValidationResult[]>` and one function per command that pushes `validateRequired`/`validateOptional` results (grouped by category).  
**Option B — Validators in subfolder**: Create `apps/workers/src/lib/startup/validation/validators.ts` (or one file per command under `validation/commands/`) and export a function `getValidationResultsForCommand(commandName: string): ValidationResult[]`. Main `validation.ts` imports that and calls it.

Choose based on maintainability; keep each job’s required/optional vars explicit and easy to find.

### 3. Per-job validators (new or inside validation)

Each command must have a validator that returns only the `ValidationResult[]` for that job.

**Categories** (reuse from current validation and ENV.md):

- **Config/Base**: USER_AGENT, LOG_LEVEL, LOG_DIR, LOG_TIMER, NODE_ENV
- **ORM**: DB_HOST, DB_PORT, DB_READ_USERNAME, DB_READ_PASSWORD, DB_READ_WRITE_USERNAME, DB_READ_WRITE_PASSWORD, DB_DATABASE, DB_SSL_CONNECTION (optional), DEFAULT_ACCOUNT_SETTINGS_LOCALE
- **MQ**: MESSAGE_QUEUE_PROTOCOL, MESSAGE_QUEUE_HOST, MESSAGE_QUEUE_USERNAME, MESSAGE_QUEUE_PASSWORD, MESSAGE_QUEUE_PORT
- **Parser**: PARSER_ADD_REMOTE_ITEMS_TO_MQ (optional)
- **PodcastIndex**: PODCAST_INDEX_AUTH_KEY, PODCAST_INDEX_BASE_URL, PODCAST_INDEX_SECRET_KEY, PODCAST_INDEX_API_RATE_LIMIT_DELAY (optional)
- **Web/Notifications**: WEB*PROTOCOL, WEB_DOMAIN, WEB_ICON_IMAGE_PATH (optional), BRAND_NAME, WEBPUSH*_, GOOGLE*FIREBASE*_ (optional as per current)

**Command → categories (implement these; refine during implementation by inspecting each command’s actual usage)**:

- **Base only** (none; every command needs at least Base).
- **Base + ORM**: archiveAll, ormFeedUpdateFlagStatus, statsUpdateAggregated, statsUpdateAggregatedRolling, generateOnDemandParserEventReports, deleteOutdatedOnDemandParserEvent.
- **Base + ORM + PodcastIndex**: podcastIndexTrendingPodcastsGet, podcastIndexValueUpdateAll, podcastIndexDeadFeedsDeleteCache, podcastIndexDeadFeedsFlagAndMerge (if they use DB; otherwise Base + PodcastIndex only).
- **Base + ORM + Parser + PodcastIndex (+ MQ if remote items)**: parserRSSParseFeed.
- **Base + ORM + MQ**: mqRSSRunDlqConsumer, mqRSSAdd, mqRSSAddAll (and similar MQ-only commands that also need ORM for feed lookup etc.).
- **Base + ORM + MQ + Parser + PodcastIndex**: mqRSSRunParser, mqRSSRunLiveItemListener, mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex.

Audit each command’s imports and service usage in `apps/workers/src/commands/` to finalize which vars are required vs optional for that command. Document in code or ENV.md.

**Shared display**: Keep or extract `displayValidationResults(summary: ValidationSummary): void` so it matches the current workers (and api/management-api) format: group by category, log each result with ✓/✗, then summary (Total, Passed, Skipped, Failed, Required Missing), then list failed vars and skipped optional vars.

### 4. `apps/workers/src/commands/parseArgs.ts`

**Check**: Ensure `parseArgs` does not import config or validation. If it only reads `process.argv`, it can be used at the top of `index.ts` to get the command name. If it pulls in other modules, either keep it and call it after the dotenv block but before validation, or use a minimal inline parse (e.g. `process.argv[2]`) for the command name only.

## Implementation steps

1. Add a minimal command resolution at the top of `index.ts`: get first positional arg as command name; if missing or not in the list of known commands (e.g. from a static list or future registry), exit with clear error. Do not import `config` or the full commands map before this; you may import a list of command names only (e.g. `const KNOWN_COMMANDS = ['archiveAll', 'mqRSSRunParser', ...];`) if that list does not pull in config.
2. Change `validation.ts` to export `validateStartupRequirements(commandName: string)`. Implement a registry or map from command name to a function that returns `ValidationResult[]` for that command.
3. Implement one validator function per command (or one file per command). Each validator uses `validateRequired` and `validateOptional` from `@podverse/helpers-config` and returns only the results for that job’s categories.
4. In `validateStartupRequirements(commandName)`, resolve the validator; if none, throw. Run the validator, build `ValidationSummary`, call `displayValidationResults(summary)`, throw if `requiredMissing > 0`.
5. In `index.ts`, after command resolution, call `validateStartupRequirements(commandName)` before importing config and building contexts.
6. Verify: run `node apps/workers/dist/index.js statsUpdateAggregated` with only Base + ORM env set; validation should pass. Run with a required var (e.g. USER_AGENT) unset; should see job-specific FATAL and list of missing vars. Run with unknown command; should exit with clear message and no validation.

## Verification

```bash
npm run build:packages
npm run build -w apps/workers
npm run lint
```

- With minimal env (e.g. Base + ORM only), run: `node apps/workers/dist/index.js statsUpdateAggregated` (or equivalent). Expect validation to pass (no MQ/PodcastIndex/Web validated).
- Unset a required var for that command (e.g. DB_HOST). Expect FATAL message and list of missing vars.
- Run `node apps/workers/dist/index.js unknownCommand`. Expect immediate exit with clear “unknown command” message, no validation output.

## Out of scope for this plan

- Changing config to category-scoped getters (Phase 2).
- Lazy context creation in index.ts (Phase 2).
- Documentation and skill (Phase 3).
- Tests (Phase 3).
