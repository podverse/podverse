# QueryParams Migration - Copy-Pasta Prompts for Parallel Execution

## How to Use This File

1. **Phase 1**: Copy the Phase 1 prompt → paste into Cursor agent → execute
2. **Phase 2**: Open 4 agents → paste Phase 2A-D prompts (one per agent) → execute all simultaneously
3. **Phase 3**: Open 2 agents → paste Phase 3A-B prompts (one per agent) → execute both simultaneously
4. **Verify**: Copy verification prompt → paste into agent → execute

Each prompt references the detailed plan files for full context.

---

## 🚨 PHASE 1: CRITICAL FIX (Execute First, Single Agent)

### Agent 1: Critical Album Client Fix

````
Read and execute the critical fix from .llm/plans/active/helpers-split/migration-11-music-album-artist.md

Execute ONLY item #2 (AlbumClient.tsx) from that plan.

This fixes the build error: Type error: Module '"@podverse/helpers"' has no exported member 'QueryParamsChannelMusicAlbum'.

After making the change, verify:
```bash
cd apps/web && npx tsc --noEmit
````

```

---

## ⚡ PHASE 2: PAGE COMPONENTS (Execute in Parallel - 4 Agents)

### Agent 2A: Podcast Pages Migration

```

Read and execute .llm/plans/active/helpers-split/migration-08-podcast-pages.md

Follow all instructions to update 5 podcast-related files.

Core rule: QueryParamsQueueMedium stays in @podverse/helpers. All other QueryParams move to @podverse/helpers-requests.

```

### Agent 2B: Episodes & Clips Migration

```

Read and execute .llm/plans/active/helpers-split/migration-09-episodes-clips-contexts.md

Follow all instructions to update 4 episode/clip context files.

Core pattern: DTOs and utilities stay in @podverse/helpers, QueryParams move to @podverse/helpers-requests.

```

### Agent 2C: Queues, History & Home Migration

```

Read and execute .llm/plans/active/helpers-split/migration-10-queues-history-home.md

Follow all instructions to update 4 queue/history/home/profile files.

Core rule: QueryParamsMedium stays in @podverse/helpers. All other QueryParams move to @podverse/helpers-requests.

```

### Agent 2D: Music Pages Migration

```

Read and execute .llm/plans/active/helpers-split/migration-11-music-album-artist.md

Execute items #1, #3, and #4 from that plan (skip #2 - already completed in Phase 1).

Update album dropdown config and artist pages.

```

---

## 🎯 PHASE 3: COMPONENTS & UTILS (Execute in Parallel - 2 Agents)

### Agent 3A: Playlists & List Components

```

Read and execute .llm/plans/active/helpers-split/migration-12-playlists-components.md

Follow all instructions to update 3 playlist/list component files.

Note: Plan mentions some files don't need changes (they only use QueryParamsQueueMedium which stays in helpers).

```

### Agent 3B: Utility Files

```

Read and execute .llm/plans/active/helpers-split/migration-13-utils.md

Follow all instructions to update 2 utility files.

Special note: utils/localSettings/localSettings.ts imports 9 QueryParams types - the most complex file!

Core rule: QueryParamsMedium and QueryParamsQueueMedium stay in @podverse/helpers. All others move to @podverse/helpers-requests.

```

---

## ✅ FINAL VERIFICATION (After All Phases Complete)

### Verification Agent

```

Verify the complete QueryParams migration is successful.

Run these commands in sequence:

1. Build packages:

```bash
cd /Users/mitcheldowney/repos/pv/podverse && npm run build:packages
```

2. Type-check web app:

```bash
cd apps/web && npx tsc --noEmit
```

3. Lint web app:

```bash
cd /Users/mitcheldowney/repos/pv/podverse && npm run lint -- apps/web/src
```

4. Test bundle analyzer (original issue):

```bash
cd /Users/mitcheldowney/repos/pv/podverse/tools/web-perf/bundle-analyzer && npm run analyze:web
```

All should complete without QueryParams import errors. Report any errors found.

```

---

## 📊 Execution Summary

| Phase | Agents | Parallel | Files | Duration |
|-------|--------|----------|-------|----------|
| 1 | 1 | No | 1 | 2 min |
| 2 | 4 | Yes | 17 | 5-8 min |
| 3 | 2 | Yes | 5 | 3-5 min |
| Verify | 1 | No | All | 2-3 min |
| **Total** | **8** | **Mixed** | **23** | **12-18 min** |

## 🎯 Quick Execution Checklist

- [ ] Phase 1: Paste prompt into 1 agent → Execute → Wait for completion
- [ ] Phase 2: Paste 4 prompts into 4 agents → Execute all → Wait for completion
- [ ] Phase 3: Paste 2 prompts into 2 agents → Execute both → Wait for completion
- [ ] Verify: Paste verification prompt into 1 agent → Execute → Confirm all passes

**Maximum parallelization**: 4 agents simultaneously in Phase 2!

## 📁 Referenced Plan Files

All detailed instructions are in:
- `.llm/plans/active/helpers-split/migration-00-EXECUTION-ORDER.md` - Master guide
- `.llm/plans/active/helpers-split/migration-00-SUMMARY.md` - Complete scope
- `.llm/plans/active/helpers-split/migration-08-*.md` through `migration-13-*.md` - Execution plans

## ⚡ Efficiency Notes

- Prompts reference plan files (DRY - single source of truth)
- Each plan file has full context and detailed change lists
- This file provides minimal copy-pasta for maximum parallelization
- Total time with parallelization: ~12-18 minutes vs 45-60 minutes sequential
```
