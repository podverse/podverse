# Example: QueryParams Import Migration

This is a real-world example of applying the parallel-plan-execution skill to migrate QueryParams imports across a codebase after a package split.

## Context

**Task**: After splitting `@podverse/helpers` into specialized packages, 72 QueryParams types moved to `@podverse/helpers-requests`, but 39 files still imported from the old package.

**Challenge**:

- 28 files needed actual migration
- 11 files were already correct
- Mixed import patterns (some types stayed, some moved)
- Blocking critical path (bundle analyzer couldn't build)

## Scope Analysis Results

```
Total files importing from @podverse/helpers: 279
Files importing QueryParams types: 39
  ├─ Already correct (use Medium/QueueMedium): 11 files ✅
  └─ Need migration (use other QueryParams): 28 files ⚠️

Time estimate:
  Sequential: 45-60 minutes
  Parallel (4 agents): 12-18 minutes (~70% savings)
```

## Plan Structure Created

```
.llm/plans/active/helpers-split/
├── migration-00-EXECUTION-ORDER.md     # Master orchestration
├── migration-00-SUMMARY.md             # 39 files analyzed, 28 need changes
├── migration-01-music-pages.md         # Verification (already correct)
├── migration-02-playlists.md           # Verification (already correct)
├── migration-03-home-page.md           # Verification (already correct)
├── migration-04-list-components.md     # Verification (already correct)
├── migration-05-livestream-header.md   # Verification (already correct)
├── migration-06-album-client-CRITICAL.md  # Phase 1 (superseded by 11)
├── migration-08-podcast-pages.md       # Phase 2A (5 files)
├── migration-09-episodes-clips-contexts.md  # Phase 2B (4 files)
├── migration-10-queues-history-home.md # Phase 2C (4 files)
├── migration-11-music-album-artist.md  # Phase 2D (4 files, includes critical)
├── migration-12-playlists-components.md  # Phase 3A (3 files)
├── migration-13-utils.md               # Phase 3B (2 files)
└── migration-COPY-PASTA.md             # 8 prompts (1+4+2+1 verify)
```

## Execution Phases Designed

### Phase 1: Critical Fix (Sequential)

**Files**: 1 (`AlbumClient.tsx`)
**Why first**: Blocking bundle analyzer build
**Agent**: 1
**Duration**: 2 minutes

### Phase 2: Page Components (Parallel)

**Files**: 17 (grouped into 4 logical areas)
**Why parallel**: Independent feature areas, no file conflicts
**Agents**: 4 simultaneously
**Duration**: 5-8 minutes total

Groups:

- 2A: Podcast pages (5 files)
- 2B: Episodes/clips (4 files)
- 2C: Queues/history/home (4 files)
- 2D: Music pages (4 files)

### Phase 3: Components & Utils (Parallel)

**Files**: 5 (grouped into 2 areas)
**Why parallel**: Different directories, independent changes
**Agents**: 2 simultaneously
**Duration**: 3-5 minutes total

Groups:

- 3A: List components & playlists (3 files)
- 3B: Utilities (2 files, including complex localSettings)

## Copy-Pasta Prompt Example

**Before** (redundant, 330 lines):

````markdown
### Agent 2A: Podcast Pages

Update these 5 files:

1. apps/web/src/app/podcast/[channel_id]/PodcastDropdownConfig.ts
   Current:
   ```typescript
   import { QueryParamsChannelType... } from '@podverse/helpers';
   ```
````

Fixed:

```typescript
import { QueryParamsChannelType... } from '@podverse/helpers-requests';
```

2. [... detailed instructions for 4 more files ...]

````

**After** (DRY, 140 lines):
```markdown
### Agent 2A: Podcast Pages

````

Read and execute .llm/plans/active/helpers-split/migration-08-podcast-pages.md

Follow all instructions to update 5 podcast-related files.

Core rule: QueryParamsQueueMedium stays in @podverse/helpers. All other QueryParams move to @podverse/helpers-requests.

```

```

## Key Decisions

### 1. Grouping Strategy

**Decision**: Group by feature area (podcast, music, episodes, etc.)
**Why**: Files in same feature area likely to be opened together anyway, easier mental model
**Alternative considered**: Group by directory depth (rejected - mixes unrelated features)

### 2. Critical Path Identification

**Decision**: Fix `AlbumClient.tsx` first in Phase 1
**Why**:

- Blocking bundle analyzer (the original goal)
- Quick win to unblock testing
- Validates migration approach before full rollout

### 3. Plan File Granularity

**Decision**: 3-5 files per execution plan
**Why**:

- Not too granular (1 file = too many plans)
- Not too coarse (15 files = hard to review/verify)
- Sweet spot for parallel execution

### 4. Copy-Pasta References vs Duplication

**Decision**: Reference plan files, don't duplicate details
**Why**:

- DRY principle
- Easier to maintain
- Still copy-paste friendly
- Agent can read referenced files for full context

## Metrics

| Metric                      | Value       |
| --------------------------- | ----------- |
| Total files analyzed        | 39          |
| Files needing changes       | 28          |
| Execution phases            | 3           |
| Maximum parallel agents     | 4 (Phase 2) |
| Plan files created          | 13          |
| Copy-pasta prompts          | 8           |
| Estimated time (sequential) | 45-60 min   |
| Estimated time (parallel)   | 12-18 min   |
| Time savings                | ~70%        |

## Verification Strategy

Each phase included verification:

- **Phase 1**: `cd apps/web && npx tsc --noEmit`
- **Phase 2 groups**: TypeScript check on affected directories
- **Phase 3 groups**: TypeScript check on affected directories
- **Final**: Full build, lint, and bundle analyzer test

## Lessons Learned

### What Worked Well

✅ Breaking into focused, feature-based groups
✅ Clear dependency phases (1 → 2 → 3)
✅ DRY copy-pasta file (references, not duplication)
✅ Comprehensive summary upfront (39 files analyzed)
✅ Including "already correct" files in documentation

### What Could Be Improved

- Initial estimate was 105 files (actual: 39) - could have been more precise earlier
- Some plan files ended up with "no changes needed" - could consolidate
- Could have included regex patterns for bulk find/replace as alternative approach

## Reusable Patterns

This migration established patterns for:

1. **Package refactoring**: Moving exports between packages
2. **Import splitting**: Separating types that stay vs move
3. **Core rule identification**: "QueryParamsMedium stays, others move"
4. **Verification hierarchy**: Quick checks → directory checks → full build

## User Experience

**User action required**:

1. Copy 1 prompt → paste → execute (Phase 1)
2. Copy 4 prompts → paste into 4 agents → execute all (Phase 2)
3. Copy 2 prompts → paste into 2 agents → execute both (Phase 3)
4. Copy 1 prompt → paste → execute (Verify)

**Total user actions**: 8 copy-paste operations
**Total time**: ~15 minutes
**Parallelization benefit**: 4x speedup in Phase 2

## Files for Reference

See actual implementation at:

- `/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/helpers-split/`

All files created during this migration serve as templates for future similar work.
