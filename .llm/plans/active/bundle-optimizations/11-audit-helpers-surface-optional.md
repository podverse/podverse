# Plan 11 (Optional): Audit and Trim Helpers Surface

## Goal

Identify what the **web app** actually uses from `@podverse/helpers` and `@podverse/helpers-requests`, then remove or lazy-load code paths that are **not** used by the web client, or avoid pulling them into the client bundle.

## Scope

- Analysis: `apps/web` imports from `@podverse/helpers`, `@podverse/helpers-requests`, `@podverse/helpers-validation`, `@podverse/helpers-browser`.
- Refactors: Only as needed (e.g. stop importing unused helpers, split bundles, or move helpers usage to server-only paths).

## Implementation

1. **Audit**: Use static analysis (grep, IDE, or tools) or bundle analyzer to list symbols imported from each helper package in `apps/web`. Cross-check with what each package exports (including re-exports) and what the client bundle includes.
2. **Identify unused surface**: Find exports or modules that are used only by API, workers, management-web, or build scripts — not by the web client. Alternatively, find heavy helper code that the web imports but could be lazy-loaded or moved server-side.
3. **Trim or isolate**:
   - Prefer: avoid importing unused helpers in client code; use more targeted imports or smaller entry points where feasible.
   - Alternatively: lazy-load helper-dependent features, or move logic to server/components / API so helpers stay off the client.  
     Avoid breaking API, workers, or management-web.
4. **Verify**: Full monorepo build, lint, and tests; bundle analyzer to confirm client bundle size improvement.

## Verification

- `npm run build:packages`, `npm run lint`, `apps/web` and other app builds.
- Bundle analyzer before/after; client bundle smaller.

## Success Criteria

- Unused or redundant helpers surface for the web client removed or isolated.
- No regressions in API, workers, or management-web.

## When to Use

Pursue after Plans 01–08 (and optionally 09–10) when you need additional client bundle savings and are willing to invest in audit and refactors.
