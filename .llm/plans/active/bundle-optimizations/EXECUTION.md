# Bundle Optimizations - Execution Guide

Use this file with [migration-COPY-PASTA.md](migration-COPY-PASTA.md) for parallel execution.

Content from the former `bundle-optimization/` (singular) directory has been merged into this directory; that directory has been archived.

## Status (2026-01-29)

All core phases (1–3, 4a, 4b) are **complete**. Plan 05 (lazy-dnd) was already implemented: QueuesList, PlaylistList, PlaylistEditList use next/dynamic for the DnD list components. Completed plans live in [.llm/plans/completed/bundle-optimizations/](../../completed/bundle-optimizations/).

## Phases

| Phase    | Plans                                                                                                                                                                                                                                                                            | Status  | When                                             |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------ |
| 1        | [01-fix-bundle-measurement](../../completed/bundle-optimizations/01-fix-bundle-measurement.md)                                                                                                                                                                                   | ✅ Done | —                                                |
| 2        | [02-side-effects-packages](../../completed/bundle-optimizations/02-side-effects-packages.md), [03-date-fns-optimization](../../completed/bundle-optimizations/03-date-fns-optimization.md)                                                                                       | ✅ Done | —                                                |
| 3        | [09-joi-client](../../completed/bundle-optimizations/09-joi-client.md)                                                                                                                                                                                                           | ✅ Done | —                                                |
| 4a       | [04-lazy-load-heavy-ui](../../completed/bundle-optimizations/04-lazy-load-heavy-ui.md)                                                                                                                                                                                           | ✅ Done | —                                                |
| 4b       | [05-lazy-dnd](../../completed/bundle-optimizations/05-lazy-dnd.md), [06-toast](../../completed/bundle-optimizations/06-toast.md), [07-virtuoso](../../completed/bundle-optimizations/07-virtuoso.md), [08-parsing-libs](../../completed/bundle-optimizations/08-parsing-libs.md) | ✅ Done | —                                                |
| Optional | [10-esm-helpers-optional](10-esm-helpers-optional.md), [11-audit-helpers-surface-optional](11-audit-helpers-surface-optional.md)                                                                                                                                                 | —       | Run later if you need further bundle reductions. |

## Rules

- **Phases are sequential**: Finish Phase 1 before Phase 2; finish Phase 2 before Phase 3; finish Phase 3 before Phase 4a; finish Phase 4a before Phase 4b.
- **Phase 2 is parallel**: Execute 02 and 03 in separate agents at the same time.
- **Phase 4b is parallel**: Execute 05, 06, 07, 08 in four agents at the same time.
- **Copy-pasta**: Use [migration-COPY-PASTA.md](migration-COPY-PASTA.md) for ready-to-paste prompts. Do not duplicate plan content there; prompts reference the plan files.

## Verification

After each phase (and after all phases): `npm run build:packages`, `npm run lint`, `apps/web` build, and bundle analyzer run. Compare client bundle size using the new metric (post–Phase 1).

## Optional

- [10-esm-helpers-optional](10-esm-helpers-optional.md)
- [11-audit-helpers-surface-optional](11-audit-helpers-surface-optional.md)

Run these later if you need further bundle reductions.
