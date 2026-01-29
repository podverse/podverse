# Bundle Optimizations - Execution Guide

Plans for reducing web app client bundle size. These optimizations address why the helpers split yielded negligible savings: we need to **measure real JS size**, **improve tree-shaking**, **trim or lazy-load** code, and **remove joi from the client**.

Content from the former `bundle-optimization/` (singular) directory has been merged here; that directory has been archived.

## Status (2026-01-29)

**Completed** (moved to `.llm/plans/completed/bundle-optimizations/`): 01 fix measurement, 02 sideEffects, 03 date-fns, 04 lazy-load heavy UI, 05 lazy-dnd, 06 toast, 07 virtuoso, 08 parsing-libs, 09 joi-client.

**Remaining (core)**: None. All core plans are complete. **Optional**: 10 ESM helpers, 11 audit helpers surface.

**Cleanup**: Duplicate plans `05-esm-helpers-optional` and `06-audit-helpers-surface-optional` were removed; they were redundant with 10 and 11.

## Goal

- Use **actual client JS bundle size** (stats `totalAssetSize`) for reports and comparisons, not HTML report file size.
- Enable **tree-shaking** via `sideEffects: false` and leaner dependencies (e.g. date-fns, SUPPORTED_LOCALES-only).
- **Remove joi from client** (split helpers-validation or use zod).
- **Lazy-load** heavy, route-specific UI to cut initial load.

## Execution Order

### Phase 1: Foundation — ✅ Complete

- **01-fix-bundle-measurement** — See [completed/bundle-optimizations/01-fix-bundle-measurement.md](../../completed/bundle-optimizations/01-fix-bundle-measurement.md).

### Phase 2: Tree-shaking — ✅ Complete

- **02-side-effects-packages** — See [completed/bundle-optimizations/02-side-effects-packages.md](../../completed/bundle-optimizations/02-side-effects-packages.md).
- **03-date-fns-optimization** — See [completed/bundle-optimizations/03-date-fns-optimization.md](../../completed/bundle-optimizations/03-date-fns-optimization.md).

### Phase 3: Remove joi from client — ✅ Complete

- **09-joi-client** — See [completed/bundle-optimizations/09-joi-client.md](../../completed/bundle-optimizations/09-joi-client.md).

### Phase 4: Lazy-load — ✅ All complete

- **04-lazy-load-heavy-ui** — ✅ See [completed/bundle-optimizations/04-lazy-load-heavy-ui.md](../../completed/bundle-optimizations/04-lazy-load-heavy-ui.md).
- **05-lazy-dnd** — ✅ See [completed/bundle-optimizations/05-lazy-dnd.md](../../completed/bundle-optimizations/05-lazy-dnd.md) (QueuesList, PlaylistList, PlaylistEditList use next/dynamic for DnD components).
- **06-toast** — ✅ See [completed/bundle-optimizations/06-toast.md](../../completed/bundle-optimizations/06-toast.md).
- **07-virtuoso** — ✅ See [completed/bundle-optimizations/07-virtuoso.md](../../completed/bundle-optimizations/07-virtuoso.md).
- **08-parsing-libs** — ✅ See [completed/bundle-optimizations/08-parsing-libs.md](../../completed/bundle-optimizations/08-parsing-libs.md) (transcript/DescriptionRenderer/UpdatesClient already lazy-loaded).

### Optional (later)

- **10-esm-helpers-optional** — ESM build for helper packages to improve tree-shaking.
- **11-audit-helpers-surface-optional** — Audit web app usage of helpers and trim unused surface.

## Plan Files

| File                                                                                              | Status   | Purpose                                                      |
| ------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------ |
| [migration-00-SUMMARY.md](migration-00-SUMMARY.md)                                                | —        | Scope, file counts, strategy                                 |
| [migration-00-EXECUTION-ORDER.md](migration-00-EXECUTION-ORDER.md)                                | —        | Phases, dependencies, verification                           |
| [01-fix-bundle-measurement.md](../../completed/bundle-optimizations/01-fix-bundle-measurement.md) | ✅ Done  | Bundle analyzer + comparison metric fix                      |
| [02-side-effects-packages.md](../../completed/bundle-optimizations/02-side-effects-packages.md)   | ✅ Done  | `sideEffects: false` in four packages                        |
| [03-date-fns-optimization.md](../../completed/bundle-optimizations/03-date-fns-optimization.md)   | ✅ Done  | date-fns subpaths + SUPPORTED_LOCALES (helpers + apps/web)   |
| [04-lazy-load-heavy-ui.md](../../completed/bundle-optimizations/04-lazy-load-heavy-ui.md)         | ✅ Done  | Discovery/pattern: `next/dynamic` for heavy components       |
| [05-lazy-dnd.md](../../completed/bundle-optimizations/05-lazy-dnd.md)                             | ✅ Done  | Lazy-load @hello-pangea/dnd (queue/playlist)                 |
| [06-toast.md](../../completed/bundle-optimizations/06-toast.md)                                   | ✅ Done  | Lazy-load or replace react-hot-toast                         |
| [07-virtuoso.md](../../completed/bundle-optimizations/07-virtuoso.md)                             | ✅ Done  | Lazy-load react-virtuoso (VirtualizedList/ItemTranscript)    |
| [08-parsing-libs.md](../../completed/bundle-optimizations/08-parsing-libs.md)                     | ✅ Done  | Defer/slim he, xmldom, etc. (transcript/description/updates) |
| [09-joi-client.md](../../completed/bundle-optimizations/09-joi-client.md)                         | ✅ Done  | Remove joi from client bundle                                |
| [10-esm-helpers-optional.md](10-esm-helpers-optional.md)                                          | Optional | ESM build for helpers                                        |
| [11-audit-helpers-surface-optional.md](11-audit-helpers-surface-optional.md)                      | Optional | Audit and trim helpers usage                                 |
| [EXECUTION.md](EXECUTION.md)                                                                      | —        | Phase summary and execution rules                            |
| [migration-COPY-PASTA.md](migration-COPY-PASTA.md)                                                | —        | Copy-pasta prompts for parallel execution                    |

## Verification

After each phase:

1. Run bundle analyzer: `cd tools/web-perf/bundle-analyzer && npm run analyze`
2. Compare reports (post–Phase 1, comparison uses real JS size)
3. `npm run lint` and `npm run build:packages` in monorepo root
4. `npm run build` in `apps/web` (production build succeeds)

## References

- Earlier analysis: why helpers split yielded negligible bundle savings (see bundle-optimization discussion).
- `tools/web-perf/bundle-analyzer/TOOLS-WEB-PERF-BUNDLE-ANALYZER.md` — bundle analyzer usage.
- AGENTS.md — package build order, lint, and verification commands.
