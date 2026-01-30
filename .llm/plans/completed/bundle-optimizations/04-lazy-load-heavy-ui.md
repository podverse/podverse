# Plan 04: Lazy-Load Heavy UI

## Goal

Reduce initial client JS by lazy-loading heavy, below-the-fold or route-specific components with `next/dynamic`, so their code ships in separate chunks and loads only when needed.

## Scope

- Components in `apps/web` (exact list to be identified via bundle treemap).
- No changes to shared layout or critical above-the-fold UI unless clearly beneficial.

## Out of scope (do not lazy-load)

- **Settings panels** (`apps/web/src/components/Settings/`): The General, Account, Profile, and Notifications panels are small and the Settings page is not an initial landing page. Lazy-loading them caused visible flicker (dropdowns appearing, disappearing, reappearing) and added complexity for minimal bundle savings. Keep direct imports for these panels.

## Prerequisites

- Phase 1 (fix bundle measurement) done, so we measure real JS size.
- Bundle analyzer available: `cd tools/web-perf/bundle-analyzer && npm run analyze`. Use the **client** treemap to find the largest chunks and which components or routes they correspond to.

## Implementation

### 1. Identify targets

1. Run the bundle analyzer and open the **client** HTML report.
2. Note the **largest chunks** (e.g. main app chunks, big vendor or route-specific bundles).
3. Map chunks to **routes or components** (e.g. by route segment, lazy-loaded Modal, media player, heavy lists, charts, etc.). Prefer:
   - Below-the-fold content
   - Route-specific pages or sections
   - Heavy third-party UI (e.g. video player, drag-and-drop, complex tables)
   - Modals or tabs that are not needed on first paint

Keep a short list of 3–7 high-impact candidates (per parallel-plan guidelines).

### 2. Apply `next/dynamic`

For each target component:

- Import it with `next/dynamic` and `{ ssr: false }` only when it truly never needs SSR (e.g. client-only widgets). Otherwise use `next/dynamic` without disabling SSR.
- Add a `loading` fallback (e.g. spinner, skeleton) where it improves perceived performance.
- Ensure the component is still rendered in the same place and same UX; only the loading boundary and code-splitting change.

Example pattern:

```tsx
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(
  () => import('@/components/HeavyComponent').then((m) => m.HeavyComponent),
  { loading: () => <div>Loading…</div>, ssr: false }
);
```

Use `ssr: false` only when necessary.

### 3. Verify

- No layout shift or broken flows from lazy-loading.
- `npm run lint` and `npm run build` (in `apps/web`) succeed.
- Run the bundle analyzer again and compare client bundle size and chunk breakdown to confirm initial load decreased and new chunks appear for lazy-loaded components.

## Verification

1. `npm run build:packages` and `npm run lint` at monorepo root.
2. `cd apps/web && npm run build`.
3. Manual smoke test of affected routes/components (loading, interaction).
4. Bundle analyzer: new client report vs baseline; initial bundle smaller, new async chunks for lazy-loaded code.

## Success Criteria

- At least 3–7 high-impact components (or equivalent route-level splits) lazy-loaded via `next/dynamic`.
- Initial client bundle size reduced vs baseline; no regressions in behavior or layout.
- Lint and production build pass.
