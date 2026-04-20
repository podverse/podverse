# Podverse Generic Helper Extraction - 00 Execution Order

## Critical Execution Rules
- Phases are sequential. Do not start a later phase before the earlier phase fully completes.
- Inside a phase, tasks marked parallel can run simultaneously.
- Wait for all parallel tasks in a phase to finish before moving to the next phase.

## Phase 1 - Foundation (Sequential)
1. Execute `01-foundation-shared-primitives.md`.
2. Verify new helper APIs and exports compile cleanly.

Why first:
- Other plans depend on canonical helper function names and package export paths.

## Phase 2 - Main Extractions (Parallel)
Run these in parallel after Phase 1:
- `02-v4v-metaboost-helper-extractions.md`
- `03-api-workers-backend-helper-extractions.md`
- `04-web-management-web-browser-helper-extractions.md`
- `05-parser-parser-mapping-orm-helper-extractions.md`

Parallel safety notes:
- `02` primarily touches `packages/v4v-metaboost`.
- `03` primarily touches `apps/api`, `apps/workers`, and `packages/helpers-backend`.
- `04` primarily touches `apps/web`, `apps/management-web`, and `packages/helpers-browser`.
- `05` primarily touches parser/mapping/orm paths and may result in no move for some candidates.

## Phase 3 - Cleanup and Consistency (Sequential)
1. Execute `06-cleanup-exports-imports-and-docs.md`.
2. Confirm imports point to canonical helper packages.
3. Remove now-dead local helper declarations only when behavior is preserved.

## Phase 4 - Final Verification (Sequential)
Run targeted checks from monorepo root:

```bash
npm run lint
```

```bash
npm run type-check
```

If broader verification is desired:

```bash
npm run build:packages
```

## Conflict Avoidance
- If two parallel plans modify the same helper package export file, rebase/merge before cleanup phase.
- Prefer additive helper introduction in Phase 1 so Phase 2 can consume stable imports.
