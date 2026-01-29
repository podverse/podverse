# Bundle Optimizations - Execution Order

## Status (2026-01-29)

**Completed**: All phases. Plans 01–09 moved to [.llm/plans/completed/bundle-optimizations/](../../completed/bundle-optimizations/). Plan 05 (lazy-dnd) was already implemented: QueuesList, PlaylistList, and PlaylistEditList use next/dynamic to load ListQueueResources/ListPlaylistResources, so @hello-pangea/dnd loads only on queue/playlist pages.

**Remaining (core)**: None. **Optional**: [10-esm-helpers-optional.md](10-esm-helpers-optional.md), [11-audit-helpers-surface-optional.md](11-audit-helpers-surface-optional.md).

**Cleanup**: Duplicate files 05-esm-helpers-optional and 06-audit-helpers-surface-optional were removed (redundant with 10 and 11).

## Phases

### Phase 1: Foundation — ✅ Complete

**Plan**: [01-fix-bundle-measurement.md](../../completed/bundle-optimizations/01-fix-bundle-measurement.md)

### Phase 2: Tree-shaking — ✅ Complete

**Plan A**: [02-side-effects-packages.md](../../completed/bundle-optimizations/02-side-effects-packages.md)

**Plan B**: [03-date-fns-optimization.md](../../completed/bundle-optimizations/03-date-fns-optimization.md)

### Phase 3: Remove joi from client — ✅ Complete

**Plan**: [09-joi-client.md](../../completed/bundle-optimizations/09-joi-client.md)

### Phase 4: Lazy-load — ✅ All complete

**Step 4a**: ✅ [04-lazy-load-heavy-ui.md](../../completed/bundle-optimizations/04-lazy-load-heavy-ui.md)

**Step 4b**: ✅ [05-lazy-dnd.md](../../completed/bundle-optimizations/05-lazy-dnd.md), [06-toast.md](../../completed/bundle-optimizations/06-toast.md), [07-virtuoso.md](../../completed/bundle-optimizations/07-virtuoso.md), [08-parsing-libs.md](../../completed/bundle-optimizations/08-parsing-libs.md).

### Optional (later)

- [10-esm-helpers-optional.md](10-esm-helpers-optional.md) — ESM build for helpers.
- [11-audit-helpers-surface-optional.md](11-audit-helpers-surface-optional.md) — Audit and trim helpers usage.

## Execution Rules

- **Phase 1 → Phase 2**: Wait for Phase 1 to complete before starting Phase 2.
- **Phase 2 → Phase 3**: Phase 3 can start as soon as Phase 1 is done; it does not depend on Phase 2.
- **Phase 3 → Phase 4**: Wait for Phase 3 before starting Phase 4.
- **Within Phase 2**: Run 02 and 03 in parallel.
- **Within Phase 4**: Run 04 first (single agent), then run 05, 06, 07, 08 in parallel (four agents).

## Verification

After each phase:

```bash
npm run build:packages
cd apps/web && npm run build
cd tools/web-perf/bundle-analyzer && npm run analyze
```

- Lint: `npm run lint` at monorepo root.
- Compare two analyzer reports (before/after) to confirm size deltas use the new metric post–Phase 1.

## Quick Start (remaining)

All core plans are complete. Optional: execute [10-esm-helpers-optional.md](10-esm-helpers-optional.md) or [11-audit-helpers-surface-optional.md](11-audit-helpers-surface-optional.md) for further bundle reductions.

Use [migration-COPY-PASTA.md](migration-COPY-PASTA.md) for copy-pasta prompts.

## Note

Content from the former `bundle-optimization/` (singular) directory was merged here. That directory has been archived; all bundle optimization plans now live in `bundle-optimizations/`.
