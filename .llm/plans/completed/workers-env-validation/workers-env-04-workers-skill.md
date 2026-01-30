# Workers Env Validation — Plan 04: Workers skill (Cursor)

**Phase**: 2B (run in parallel with Plan 02 — config/lazy context)  
**Summary**: [workers-env-00-SUMMARY.md](workers-env-00-SUMMARY.md)  
**Execution order**: [workers-env-00-EXECUTION-ORDER.md](workers-env-00-EXECUTION-ORDER.md)

## Objective

Create a Cursor skill for the workers app so that future work (and AI) consistently handles validation and env vars in workers. The skill documents the per-job validation pattern, command-first bootstrap, and the checklist for adding a new worker command.

## Scope

- **Create** `.cursor/skills/workers/SKILL.md` (under the podverse repo root).
- **Content**: When to use the skill; core rules (per-job validation, command-first, only validate/read env for running command, same logging style as api/management-api); adding a new worker command (validator + ENV.md + index context); categories (Base, ORM, MQ, Parser, PodcastIndex, Web/Notifications); optional links to ENV.md, APPS-WORKERS.md, or the workers env validation plan.

## File to create

### `.cursor/skills/workers/SKILL.md`

**Format**: Use the same frontmatter style as other skills (e.g. api, management-api): `name`, `description`, `version`.

**Required sections**:

1. **When to use**
   - Adding or changing worker commands.
   - Touching workers startup validation (`apps/workers/src/lib/startup/validation*`).
   - Documenting worker env vars (ENV.md, APPS-WORKERS.md).

2. **Core rules**
   - Workers use **per-job** env validation: each command has its own validator; only the env vars required for that command are validated and read.
   - **Command-first**: Parse the running command from argv before any validation or config loading. Do not import full config before validation.
   - Only validate and read the env vars the running command needs. Unused env vars must not pollute or block other jobs.
   - Use the same validation-and-logging style as api and management-api: categories, checkmarks, validation summary, FATAL message and list of missing vars when required vars are missing.

3. **Adding a new worker command**
   - Add a validator for that command (required and optional env vars) and register it in the validation module (or validator registry).
   - Update ENV.md with that command’s env requirements (which vars are required vs optional).
   - Ensure index.ts only builds and creates the module contexts (ORM, Parser, MQ, Firebase, Notifications) that the command needs (use the same command → categories mapping as validation).

4. **Categories**
   - Base: USER_AGENT, LOG_LEVEL, LOG_DIR, LOG_TIMER, NODE_ENV.
   - ORM: DB\_\*, DEFAULT_ACCOUNT_SETTINGS_LOCALE.
   - MQ: MESSAGE*QUEUE*\*.
   - Parser: PARSER\_\*.
   - PodcastIndex: PODCAST*INDEX*\*.
   - Web/Notifications: WEB*\*, BRAND_NAME, WEBPUSH*_, GOOGLE*FIREBASE*_.
   - Reference ENV.md and the validator source (e.g. `apps/workers/src/lib/startup/validation/`) for which commands need which categories.

5. **Monorepo context** (optional but useful)
   - Workers app location: `apps/workers/`.
   - Key packages: `@podverse/helpers-config` (validateRequired, validateOptional), `@podverse/orm`, `@podverse/mq`, `@podverse/parser`, `@podverse/external-services`, `@podverse/notifications`.
   - Validation: `apps/workers/src/lib/startup/validation.ts` (and validators under `validation/` if present).
   - Config: `apps/workers/src/config/index.ts` (category-scoped getters after Plan 02).
   - Entry: `apps/workers/src/index.ts` (command-first, then validate, then load config/contexts by category).

6. **References**
   - Link to `apps/workers/ENV.md` for per-command env requirements.
   - Link to `apps/workers/APPS-WORKERS.md` for overview and env configuration.
   - Optionally link to the workers env validation plan (e.g. `.llm/plans/active/workers-env-validation/workers-env-00-SUMMARY.md`) for full context.

## Implementation steps

1. Create the directory `.cursor/skills/workers/` if it does not exist.
2. Create `SKILL.md` with frontmatter (name, description, version). Use a name like `workers-env-validation` or `podverse-workers-patterns` and a short description (e.g. "Per-job env validation and config patterns for the workers app").
3. Add the sections above: When to use, Core rules, Adding a new worker command, Categories, Monorepo context (optional), References.
4. Keep the skill concise (aim for under 150 lines) so it is easy to scan. Do not duplicate the full ENV.md content; reference it.
5. Verify: Read the skill and confirm a developer (or AI) could follow it to add a new worker command or touch validation correctly.

## Verification

- File exists at `.cursor/skills/workers/SKILL.md`.
- Content includes when to use, core rules, adding new command, categories, and references.
- Format matches other skills (frontmatter, headings, code blocks if needed).

## Out of scope for this plan

- Implementing validation or config (Plans 01, 02).
- Updating ENV.md or APPS-WORKERS.md (Plan 03).
- Tests (Plan 05).
