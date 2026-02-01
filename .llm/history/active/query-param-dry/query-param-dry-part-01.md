# Feature: query-param-dry (Part 1)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for
> development, you can delete this file and the containing directory. The history
> tracking system helps document LLM-assisted decisions but is not required for
> contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session
> 11, create `query-param-dry-part-02.md`.

## Metadata

- Started: 2026-01-31
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: None
- Branch: chore/query-param-type-cleanup
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

Reduce duplicate query param value sets in helpers to keep API/web validation consistent.

## Sessions

### Session 1 - 2026-01-31

#### Prompt (Developer)

@plan-execution-autopilot-prompt.md (10-23)

@migration-COPY-PASTA.md (1-37)

#### Key Decisions

- Introduced shared base arrays and type aliases for identical value sets.
- Kept existing exports, pointing them at shared arrays to avoid consumer changes.

#### Files Changed

- packages/helpers-requests/src/api/queryParams.ts
- .llm/history/active/query-param-dry/query-param-dry-part-01.md

---

### Session 2 - 2026-01-31

#### Prompt (Developer)

```markdown
You are running in autopilot mode to execute a set of plans end-to-end without human
interaction. Treat every approval as granted. Do not ask questions or request confirmation.

Rules:

- Treat the plan content that follows this prompt as the source of truth, regardless of
  filenames or prefixes.
- Execute each plan to completion before moving to the next.
- Follow repository rules and required workflows exactly.
- Use non-interactive command flags only; avoid any step that requires prompts.
- If a step would block on interactive input, choose a non-interactive alternative and
  continue. Record any assumption in LLM history.
- Keep going through errors by fixing them and retrying until the plans complete.
- Run tests or verification steps explicitly called for in the plans.
- Update LLM history before and after file changes as required.
```

# Query Param DRY Refactor - Copy-Pasta Prompts

## Critical Execution Rules

- Phases are sequential. Wait for each phase to finish before starting the next.
- Agents within a phase can run in parallel.

## Phase 1: Helpers Foundation (Sequential)

### Agent 1

```
Read and execute .llm/plans/active/query-param-dry/migration-01-helpers-dedupe.md

Focus on shared query param arrays and generic types.

Verify: no duplicate value arrays remain in helpers.
```

## Phase 2: Dependent Updates (Parallel)

### Agent 2A: API Joi Refactor

```
Read and execute .llm/plans/active/query-param-dry/migration-02-api-joi-refactor.md

Core rule: use shared constants for all query param validation.
```

### Agent 2B: Web Updates

```
Read and execute .llm/plans/active/query-param-dry/migration-03-web-updates.md

Core rule: align imports and types with shared helpers.
```

#### Key Decisions

- Added Joi helpers for common enum and page patterns.
- Moved controller Joi schemas inline and aligned enum validation with shared constants.
- Updated web query param enums to use shared generic constants.

#### Files Changed

- apps/api/src/lib/validation/index.ts
- apps/api/src/controllers/itemSoundbite.ts
- apps/api/src/controllers/playlist/playlistResource.ts
- apps/api/src/controllers/item.ts
- apps/api/src/controllers/channel.ts
- apps/api/src/controllers/playlist/playlist.ts
- apps/api/src/controllers/clip.ts
- apps/web/src/app/podcasts/page.tsx
- apps/web/src/app/profiles/page.tsx
- .llm/history/active/query-param-dry/query-param-dry-part-01.md

---

## Related Resources

- [Link to PR]
- [Link to related issues]
