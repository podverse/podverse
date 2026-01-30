# Workers Env Validation — Plan 03: Documentation

**Phase**: 3A (run in parallel with Plan 05 — tests)  
**Depends on**: Phase 2 complete (config/lazy context and skill in place)  
**Summary**: [workers-env-00-SUMMARY.md](workers-env-00-SUMMARY.md)  
**Execution order**: [workers-env-00-EXECUTION-ORDER.md](workers-env-00-EXECUTION-ORDER.md)

## Objective

Update documentation so the per-job validation approach is clear and maintainable. ENV.md, APPS-WORKERS.md, validation module README/JSDoc, and optionally infra env template and AGENTS.md.

## Scope

- **ENV.md**: State that validation is per-command; for each command (or command group), list which env vars are required vs optional; keep category taxonomy; optionally point to validator source as source of truth.
- **APPS-WORKERS.md**: Per-job env vars; developers see job-specific validation output when vars are missing; link to ENV.md; note that each job validates only what it needs.
- **Validation module**: README or top-level JSDoc explaining command-first bootstrap, per-job validators, shared display; new commands require a new validator and an ENV.md update.
- **infra/config/env-templates/workers.env.example**: If the template is more than a pointer, add a comment that workers validate per-command and not all vars are required for every job; see apps/workers/ENV.md.
- **AGENTS.md**: If there is a "Where to Find Things" or "Startup validation" row, ensure workers is described as per-job validation; otherwise no change unless adding a one-line note.

## Files to create or modify

### 1. `apps/workers/ENV.md`

**Current behavior**: Documents all env vars by category (General, Podcast Index, Message Queue, Database, etc.) and notes that module factories validate config; does not state that validation is per-command.

**Required changes**:

- Add a short "Validation approach" or "Per-command validation" section at the top (or after Overview): state that the workers app validates environment variables **per command**. Each job only validates (and only requires) the env vars it actually uses. Developers see job-specific validation output when running a command; missing required vars for that job are listed in the FATAL message.
- For each command (or group of commands with the same requirements), list which env vars are **required** vs **optional**. You can group by category (e.g. "ORM-only commands: Base + ORM") and list the vars, or list commands and their required/optional vars. Optionally point to the validator source (e.g. `apps/workers/src/lib/startup/validation/` or `validation/validators.ts`) as the source of truth.
- Keep the existing category taxonomy (Base, ORM, MQ, Parser, PodcastIndex, Web/Notifications) and map commands to the vars they need. A table or subsection per command group is fine.

### 2. `apps/workers/APPS-WORKERS.md`

**Current behavior**: Describes worker types, environment configuration, links to ENV.md.

**Required changes**:

- In "Environment Configuration" (or equivalent): state that **required env vars are per-job**. When you run a specific command, only the env vars needed for that command are validated; developers see **job-specific validation output** when vars are missing (FATAL message and list of missing vars for that job). Link to ENV.md for the full list of vars per command.
- Add a short note that each job validates only what it needs, so e.g. an ORM-only cron job does not need MQ or Podcast Index vars set.

### 3. Validation module README or JSDoc

**Location**: Either a short README at `apps/workers/src/lib/startup/validation/README.md` or top-level JSDoc in `apps/workers/src/lib/startup/validation.ts` (or the main validation entry file).

**Content**:

- Workers use **command-first** bootstrap: the running command is determined from argv before any validation or config loading.
- **Per-job validators**: Each command has its own validator (required/optional env vars). Only that command’s vars are validated and displayed.
- **Shared display**: Validation output uses the same format as api/management-api (categories, checkmarks, summary, FATAL on missing required).
- **Adding a new command**: Add a validator for that command, register it, and update ENV.md with that command’s env requirements. Ensure index.ts only builds/creates the contexts that command needs.

### 4. `infra/config/env-templates/workers.env.example`

**Current behavior**: Short pointer to apps/workers/.env.example and ENV.md.

**Required changes** (if the file is more than a pointer):

- Add a comment that the workers app validates env vars **per-command**; not all variables are required for every job. See `apps/workers/ENV.md` for per-command requirements. If the file is only a pointer, this can be a one-line addition.

### 5. `AGENTS.md` (monorepo root)

**Required changes**:

- If AGENTS.md has a "Where to Find Things" table or a "Startup validation" row, add or update a row for workers: e.g. "Workers startup validation: per-job (see apps/workers/src/lib/startup/validation and ENV.md)". If there is no such row, optionally add a one-line note under a relevant section; otherwise leave unchanged.

## Implementation steps

1. Update ENV.md: add per-command validation section; list required/optional vars per command (or command group); point to validator source if desired.
2. Update APPS-WORKERS.md: per-job env vars, job-specific validation output, link to ENV.md, note that each job validates only what it needs.
3. Add README or JSDoc to the validation module (validation/README.md or top-level block in validation.ts).
4. If workers.env.example has more than a pointer, add the per-command comment and reference to ENV.md.
5. If AGENTS.md has a relevant table/row, add or update the workers startup validation entry.

## Verification

- ENV.md clearly states per-command validation and lists (or points to) required/optional vars per command.
- APPS-WORKERS.md mentions per-job env vars and job-specific validation output and links to ENV.md.
- Validation module has README or JSDoc describing command-first, per-job validators, and adding new command.
- Markdown and line length follow project conventions (see docs and .prettierrc).

## Out of scope for this plan

- Implementing validation or config (Plans 01, 02).
- Creating the workers skill (Plan 04).
- Tests (Plan 05).
