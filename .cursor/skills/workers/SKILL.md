---
name: podverse-workers-patterns
description: Per-job env validation and config patterns for the workers app. Use when adding or
  changing worker commands, touching workers startup validation, or documenting worker env vars.
version: 1.0.0
---

# Podverse Workers Patterns

Per-job env validation, command-first bootstrap, and checklist for adding worker commands.

## When to use

- Adding or changing worker commands (include validation: commandNames, categoriesForCommand, ENV.md).
- Touching workers startup validation (`apps/workers/src/lib/startup/validation.ts`).
- Documenting worker env vars (ENV.md, APPS-WORKERS.md).

## Core rules

- **In-app imports**: use `@workers/*` for paths under `apps/workers/src` (full directory name). See `.cursor/rules/app-internal-import-aliases.mdc`.
- **Per-job validation**: Each command has its own validator; only the env vars required for that
  command are validated and read.
- **Command-first**: Parse the running command from argv before any validation or config loading.
  Do not import full config before validation.
- Only validate and read the env vars the running command needs. Unused env vars must not pollute
  or block other jobs.
- Use the same validation-and-logging style as api and management-api: categories, checkmarks,
  validation summary, FATAL message and list of missing vars when required vars are missing.

## Adding a new worker command

1. Add the command to `KNOWN_COMMANDS` in
   [commandNames.ts](/apps/workers/src/commands/commandNames.ts).
2. Add the command to the appropriate **group** in
   [categoriesForCommand.ts](/apps/workers/src/lib/startup/categoriesForCommand.ts) (e.g.
   `BASE_ORM_COMMANDS`, `FULL_STACK_COMMANDS`) so it gets the right categories—validation then runs
   the existing category validators for that command. Only add a new category and `validate*`
   function in [validation.ts](/apps/workers/src/lib/startup/validation.ts) if the command
   needs env vars that don't fit existing categories.
3. Update [ENV.md](/apps/workers/ENV.md): if the command fits an existing group, ensure the
   "Command groups and env categories" table or examples still reflect it; if you added a new
   category, document required/optional vars for it.
4. Ensure [index.ts](/apps/workers/src/index.ts) only builds contexts for the command's
   categories (it already uses the same categoriesForCommand mapping; no change unless you added
   a new category).

## Categories

| Category          | Env vars / scope                                    |
| ----------------- | --------------------------------------------------- |
| Base              | USER_AGENT, LOG_LEVEL, LOG_DIR, LOG_TIMER, NODE_ENV |
| ORM               | DB\_\*, DEFAULT_ACCOUNT_SETTINGS_LOCALE             |
| MQ                | MESSAGE*QUEUE*\*                                    |
| Parser            | PARSER\_\*                                          |
| PodcastIndex      | PODCAST*INDEX*\*                                    |
| Web/Notifications | WEB*\*, BRAND_NAME, WEBPUSH*\_, GOOGLE*FIREBASE*_   |

Reference [ENV.md](/apps/workers/ENV.md) and
[validation.ts](/apps/workers/src/lib/startup/validation.ts) for which commands need which
categories.

## Monorepo context

- **Workers app**: `apps/workers/`.
- **Key packages**: `@podverse/helpers-config` (validateRequired, validateOptional), `@podverse/orm`,
  `@podverse/mq`, `@podverse/parser`, `@podverse/external-services`, `@podverse/notifications`.
- **Validation**: `apps/workers/src/lib/startup/validation.ts`.
- **Config**: `apps/workers/src/config/index.ts` (category-scoped getters).
- **Entry**: `apps/workers/src/index.ts` (command-first, then validate, then load config/contexts
  by category).

## References

- [apps/workers/ENV.md](/apps/workers/ENV.md) — per-command env requirements.
- [apps/workers/APPS-WORKERS.md](/apps/workers/APPS-WORKERS.md) — overview and env config.
- [apps/workers/ENV.md](/apps/workers/ENV.md) — worker env reference
  — full workers env validation plan (optional).
