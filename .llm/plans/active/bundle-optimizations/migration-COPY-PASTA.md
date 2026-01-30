# Bundle Optimizations - Copy-Pasta Prompts for Parallel Execution

**Status (2026-01-29)**: All core plans (01–09) are **complete**. Plan 05 (lazy-dnd) was already implemented: QueuesList, PlaylistList, PlaylistEditList use next/dynamic for the DnD list components. No remaining core prompts; optional plans 10 and 11 only. Completed plan files are in `.llm/plans/completed/bundle-optimizations/`.

## CRITICAL: Execution Rules

**SEQUENTIAL PHASES** — Each phase must **complete** before the next starts:

```
Phase 1 → WAIT → Phase 2 → WAIT → Phase 3 → WAIT → Phase 4a → WAIT → Phase 4b → Verify
```

**DO NOT** run phases simultaneously:

- Do not start Phase 2 while Phase 1 is running.
- Do not start Phase 3 while Phase 2 is running.
- Do not start Phase 4 until Phase 3 is done.

**DO** run agents **within** Phase 2 in parallel (2 agents), and **within** Phase 4b in parallel (4 agents).

## How to Use

1. **Phase 1**: Copy prompt → paste into 1 agent → execute → **WAIT FOR COMPLETION**.
2. **Phase 2**: Open 2 agents → paste prompts 2A and 2B (one per agent) → execute **both** simultaneously → **WAIT FOR BOTH TO COMPLETE**.
3. **Phase 3**: Copy prompt → paste into 1 agent → execute → **WAIT FOR COMPLETION**.
4. **Phase 4a**: Copy prompt → paste into 1 agent → execute → **WAIT FOR COMPLETION**.
5. **Phase 4b**: Open 4 agents → paste prompts 4B–4E (one per agent) → execute **all four** simultaneously → **WAIT FOR ALL TO COMPLETE**.
6. **Verify**: Run bundle analyzer, compare reports, confirm builds and lint pass.

---

## PHASE 1: Foundation (Single Agent)

### Agent 1: Fix Bundle Measurement

```
Read and execute .llm/plans/active/bundle-optimizations/01-fix-bundle-measurement.md

Use client/server totalAssetSize from stats JSON as the primary "bundle size" in reports and comparisons instead of HTML file size.

After changes, verify:
- cd tools/web-perf/bundle-analyzer && npm run analyze
- Check that report JSON clientBundleSize / serverBundleSize reflect total asset size, not HTML size.
```

---

## PHASE 2: Tree-Shaking (Parallel — 2 Agents)

### Agent 2A: sideEffects in Helper Packages

```
Read and execute .llm/plans/active/bundle-optimizations/02-side-effects-packages.md

Add "sideEffects": false to helpers, helpers-requests, helpers-validation, helpers-browser.

Verify: npm run build:packages && npm run lint && cd apps/web && npm run build
```

### Agent 2B: date-fns Optimization (Helpers + apps/web)

```
Read and execute .llm/plans/active/bundle-optimizations/03-date-fns-optimization.md

Use date-fns subpath imports and SUPPORTED_LOCALES-only locales; restrict next-intl/date-fns in apps/web to same locales.

Verify: npm run build:packages && npm run lint && cd apps/web && npm run build
```

---

## PHASE 3: Remove joi from Client (Single Agent)

### Agent 3: Remove joi from Client Bundle

```
Read and execute .llm/plans/active/bundle-optimizations/09-joi-client.md

Remove joi from web app client bundle (split helpers-validation or use zod for client). Keep API/server validation on joi.

Verify: npm run build:packages && npm run lint && cd apps/web && npm run build
Run bundle analyzer; confirm joi not in client treemap.
```

---

## PHASE 4a: Lazy-Load Discovery (Single Agent)

### Agent 4A: Lazy-Load Heavy UI (Pattern + Discovery)

```
Read and execute .llm/plans/active/bundle-optimizations/04-lazy-load-heavy-ui.md

Identify heavy components via bundle treemap, then lazy-load them with next/dynamic. Use loading fallbacks where appropriate.

Do not lazy-load Settings panels (General, Account, Profile, Notifications); see plan 04 "Out of scope" section.

Verify: npm run build:packages && npm run lint && cd apps/web && npm run build
Run bundle analyzer and confirm initial client bundle size decreased.
```

---

## PHASE 4b: Lazy-Load Specific Targets (Parallel — 4 Agents)

### Agent 4B: Lazy-load DnD

```
Read and execute .llm/plans/active/bundle-optimizations/05-lazy-dnd.md

Lazy-load @hello-pangea/dnd for ListQueueResources / ListPlaylistResources via next/dynamic.

Verify: npm run build:packages && npm run lint && cd apps/web && npm run build
```

### Agent 4C: Lazy-load or Replace Toast

```
Read and execute .llm/plans/active/bundle-optimizations/06-toast.md

Lazy-load or replace react-hot-toast to reduce main bundle.

Verify: npm run build:packages && npm run lint && cd apps/web && npm run build
```

### Agent 4D: Lazy-load Virtuoso

```
Read and execute .llm/plans/active/bundle-optimizations/07-virtuoso.md

Lazy-load react-virtuoso (VirtualizedList / ItemTranscript) when transcript is used.

Verify: npm run build:packages && npm run lint && cd apps/web && npm run build
```

### Agent 4E: Defer Parsing Libs

```
Read and execute .llm/plans/active/bundle-optimizations/08-parsing-libs.md

Lazy-load or slim he, @xmldom/xmldom, etc. for transcript/description/updates.

Verify: npm run build:packages && npm run lint && cd apps/web && npm run build
```

---

## Verification (After All Phases)

```
cd tools/web-perf/bundle-analyzer && npm run analyze
# Compare new report to baseline (post–Phase 1). Confirm client bundle size uses totalAssetSize and that Phase 2–4 optimizations reduced size.

npm run build:packages && npm run lint
cd apps/web && npm run build
```

---

## Optional (Run Later, Not Part of Main Phases)

### ESM Helpers

```
Read and execute .llm/plans/active/bundle-optimizations/10-esm-helpers-optional.md
```

### Audit Helpers Surface

```
Read and execute .llm/plans/active/bundle-optimizations/11-audit-helpers-surface-optional.md
```
