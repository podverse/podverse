# Query Param DRY - Copy-Pasta Execution Prompts

This file contains ready-to-use prompts for parallel agent execution of the query-param-dry
migration. Each prompt is designed to be copied directly into a separate agent session.

## Execution Strategy

Execute migrations **sequentially** by phase because they have dependencies:

1. Migration 01 (Helpers Dedupe) - Creates base constants
2. Migration 02 (API Joi Refactor) - Split into subplans
   - Phase 2A: Shared schemas (sequential, required first)
   - Phase 2B: Controller refactors (parallel, after 2A)
3. Migration 03 (Web Verification) - Split into parallel verification subplans

---

## Agent 1: Helpers Query Param Deduplication

### Prerequisites

- Read: `.llm/plans/active/query-param-dry/migration-01-helpers-dedupe.md`
- Branch: `chore/query-param-dry` or create new branch

### Prompt

```
Read and execute .llm/plans/active/query-param-dry/migration-01-helpers-dedupe.md

CRITICAL REQUIREMENTS:
1. Follow the plan EXACTLY - it specifies precise line numbers and replacements
2. Add the three base constants at the top of the file (after imports)
3. Replace all 9 duplicate constant definitions with references to base constants
4. Maintain all existing export names (no breaking changes)
5. Fix the missing 'as const' on line 243 (QUERY_PARAMS_CLIPS_BY_CHANNEL_SORT_VALUES)

FILE TO MODIFY:
- packages/helpers-requests/src/api/queryParams.ts

VERIFICATION:
- Run: npm run build:packages
- Confirm: All 3 base constants exported
- Confirm: 9 constants now reference base constants
- Confirm: No TypeScript errors
- Confirm: Types still infer correctly

UPDATE HISTORY:
- .llm/history/active/query-param-dry/query-param-dry.md
```

---

## Phase 2A: API Shared Schemas (Sequential)

### Agent 2A: Shared Joi Schemas

```
Read and execute .llm/plans/active/query-param-dry/migration-02a-api-shared-schemas.md

CRITICAL REQUIREMENTS:
1. Create shared Joi schema exports in apps/api/src/lib/validation/querySchemas.ts
2. Re-export shared schemas from apps/api/src/lib/validation/index.ts
3. Use shared query param constants for any Joi.valid arrays
```

---

## Phase 2B: API Controller Refactor (Parallel)

### Agent 2B: Channel + Item

```
Read and execute .llm/plans/active/query-param-dry/migration-02b-api-channel-item.md

Core rule: replace reusable schemas with shared imports, inline the rest.
```

### Agent 2C: Clip + Playlist

```
Read and execute .llm/plans/active/query-param-dry/migration-02c-api-clip-playlist.md

Core rule: replace reusable schemas with shared imports, inline the rest.
```

### Agent 2D: Playlist Resources

```
Read and execute .llm/plans/active/query-param-dry/migration-02d-api-playlist-resources.md

Core rule: replace reusable schemas with shared imports, inline the rest.
```

### Agent 2E: Item Soundbite + Queue

```
Read and execute .llm/plans/active/query-param-dry/migration-02e-api-item-soundbite-queue.md

Core rule: replace reusable schemas with shared imports, inline the rest.
```

### Agent 2F: Queue Resources

```
Read and execute .llm/plans/active/query-param-dry/migration-02f-api-queue-resources.md

Core rule: replace reusable schemas with shared imports, inline the rest.
```

### Agent 2G: Account Core

```
Read and execute .llm/plans/active/query-param-dry/migration-02g-api-account-core.md

Core rule: replace reusable schemas with shared imports, inline the rest.
```

### Agent 2H: Account Devices + Settings

```
Read and execute .llm/plans/active/query-param-dry/migration-02h-api-account-devices-settings.md

Core rule: replace reusable schemas with shared imports, inline the rest.
```

### Agent 2I: Account Notifications + Following

```
Read and execute .llm/plans/active/query-param-dry/migration-02i-api-account-notification-following.md

Core rule: replace reusable schemas with shared imports, inline the rest.
```

### Agent 2J: Misc Content

```
Read and execute .llm/plans/active/query-param-dry/migration-02j-api-misc-content.md

Core rule: replace reusable schemas with shared imports, inline the rest.
```

### Agent 2K: Misc Services

```
Read and execute .llm/plans/active/query-param-dry/migration-02k-api-misc-services.md

Core rule: replace reusable schemas with shared imports, inline the rest.
```

### Agent 2L: Stats Controllers

```
Read and execute .llm/plans/active/query-param-dry/migration-02l-api-stats-controllers.md

Core rule: inline stats schemas, remove top-level definitions.
```

---

## Phase 3: Web Verification (Parallel)

### Agent 3A: Podcasts + Tracks

```
Read and execute .llm/plans/active/query-param-dry/migration-03a-web-podcasts-tracks.md

Core rule: verification-only, no code changes expected.
```

### Agent 3B: Profiles + Queues

```
Read and execute .llm/plans/active/query-param-dry/migration-03b-web-profiles-queues.md

Core rule: verification-only, no code changes expected.
```

---

## Execution Checklist

### Migration 01: Helpers Dedupe

- [ ] Agent started with copy-pasta prompt
- [ ] Base constants added to queryParams.ts
- [ ] 9 duplicate constants replaced with references
- [ ] Missing 'as const' fixed
- [ ] npm run build:packages succeeds
- [ ] TypeScript types infer correctly
- [ ] History updated

### Migration 02: API Joi Refactor

- [ ] Phase 2A complete (shared schemas)
- [ ] All Phase 2B controller groups complete
- [ ] npm run build:packages succeeds
- [ ] apps/api builds successfully
- [ ] Manual endpoint tests pass
- [ ] History updated

### Migration 03: Web Verification

- [ ] Agents started with copy-pasta prompts
- [ ] All 4 web pages type-check correctly
- [ ] apps/web builds successfully
- [ ] Manual browser tests pass for all 4 pages
- [ ] Invalid query params handled gracefully
- [ ] No console errors observed
- [ ] History updated

---

## Notes

- Execute migrations **sequentially** - each depends on the previous
- The detailed plan files contain exact line numbers and code snippets
- Migration 03 should require **zero code changes** (verification only)
- Total expected code changes: ~12 lines across 3 files
- All existing exports maintain backward compatibility
