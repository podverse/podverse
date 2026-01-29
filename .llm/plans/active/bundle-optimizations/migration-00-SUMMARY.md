# Bundle Optimizations - Summary

## Scope

**11 execution plans** (9 core + 2 optional)

- **Core**: 01 fix measurement, 02 sideEffects, 03 date-fns (helpers + apps/web), 04 lazy-load discovery, 05 lazy-dnd, 06 toast, 07 virtuoso, 08 parsing-libs, 09 joi-client.
- **Optional**: 10 ESM helpers, 11 audit helpers surface.

Content from the former `bundle-optimization/` (singular) directory has been merged here (date-fns locales, joi-client, lazy-dnd, toast, virtuoso, parsing-libs).

## File Counts

### Phase 1: Fix measurement

- `tools/web-perf/bundle-analyzer/src/bundle-analyzer.ts` — derive `clientBundleSize` / `serverBundleSize` from `clientChunkSummary.totalAssetSize` / `serverChunkSummary.totalAssetSize` when stats exist; retain HTML size only for backwards compatibility or drop.
- `tools/web-perf/bundle-analyzer/src/comparison.ts` — compare client/server bundle size using the new metric (from chunk summary) when available.
- `tools/web-perf/bundle-analyzer/src/index.ts` — ensure reported "client bundle size" uses the new metric.
- Optional: `BundleReport` and any summary output (e.g. `openai-summary`) that surfaces "client bundle size" — align with new metric.

**Estimate**: 2–4 files.

### Phase 2a: sideEffects (parallel)

- `packages/helpers/package.json`
- `packages/helpers-requests/package.json`
- `packages/helpers-validation/package.json`
- `packages/helpers-browser/package.json`

**Total**: 4 files.

### Phase 2b: date-fns (parallel)

- `packages/helpers/src/lib/date.ts`
- `packages/helpers/src/lib/i18n/timeFormatter.ts`
- apps/web: next-intl/date-fns locale config (exact files depend on next-intl setup).

**Estimate**: 2–6 files.

### Phase 3: joi-client

- `packages/helpers-validation` — split or client-safe surface; `apps/web` — use client-safe validation only.
- **Estimate**: 5–15+ files (depends on Option A vs B).

### Phase 4: Lazy-load

- **04**: Multiple `apps/web` components (to be identified via bundle treemap). Plan provides pattern and discovery steps.
- **05**: ListQueueResources, ListPlaylistResources, QueuesList, PlaylistList, PlaylistEditList.
- **06**: Toast, MembershipExpirationToast, layout.
- **07**: VirtualizedList, ItemTranscript.
- **08**: transcript.ts, DescriptionRenderer, UpdatesClient.

**Estimate**: 3–15+ files per plan depending on scope.

### Optional

- **ESM helpers**: `packages/helpers` (and optionally `helpers-requests`, etc.) — `tsconfig`, build scripts, `package.json` `module` / `exports`.
- **Audit**: Analysis + refactors across `apps/web` and helpers usage.

## Strategy

1. **Measure first**: Switch bundle reports and comparisons to real JS size (`totalAssetSize`) so all later changes are evaluated correctly.
2. **Low-effort tree-shaking**: `sideEffects: false` and date-fns subpaths + SUPPORTED_LOCALES-only; no semantic changes.
3. **Remove joi from client**: Split helpers-validation or use zod for client-only validation.
4. **Lazy-load**: Reduce initial payload by splitting heavy UI into separate chunks (04 discovery, then 05–08 specific targets).
5. **Optional**: ESM and audit for additional gains when needed.

## Success Criteria

- Bundle analyzer reports and comparison use **client JS total asset size** (or equivalent) as the primary "client bundle size" metric.
- All helper packages above declare `"sideEffects": false`.
- date-fns and next-intl use only SUPPORTED_LOCALES; helpers use subpath imports.
- joi is not in the web app client bundle.
- Selected heavy components are lazy-loaded via `next/dynamic`.
- `npm run lint`, `npm run build:packages`, and `apps/web` production build succeed after each phase.
