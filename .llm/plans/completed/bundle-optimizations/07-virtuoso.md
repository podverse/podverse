# Plan 07: Lazy-load react-virtuoso (Medium Priority)

## Goal

Reduce client bundle by **~58 KB parsed** (react-virtuoso) by loading it only when a virtualized list is used. Medium priority; execute after Phase 1 (01–03).

## Usage

- [VirtualizedList](apps/web/src/components/VirtualizedList/VirtualizedList.tsx) — uses `Virtuoso`, `VirtuosoHandle` from `react-virtuoso`.
- [ItemTranscript](apps/web/src/components/ItemTranscript/ItemTranscript.tsx) uses `VirtualizedList` for transcript rows.
- ItemTranscript is used on episode/clip pages when transcript is shown. VirtualizedList is not used in layout or global components.

## Scope

- `apps/web/src/components/VirtualizedList/VirtualizedList.tsx`
- `apps/web/src/components/ItemTranscript/ItemTranscript.tsx`
- Any other consumers of `VirtualizedList` or `react-virtuoso`

## Implementation

1. **Lazy-load VirtualizedList or ItemTranscript** when the transcript section is rendered (e.g. when user expands transcript or navigates to a page that shows it).
   - Use `next/dynamic` (or `React.lazy` + `Suspense`) to load `VirtualizedList` or `ItemTranscript` only when needed.
   - Ensure parent components that render transcript pass through props and handle loading state (e.g. skeleton or spinner) until the dynamic component mounts.
2. **No API changes**: VirtualizedList and ItemTranscript keep the same props and behavior; only the import becomes dynamic.

Result: react-virtuoso is loaded only when a virtualized list (e.g. transcript) is actually shown.

## Verification

1. `npm run build:packages` then `npm run build` in `apps/web`.
2. `cd tools/web-perf/bundle-analyzer && npm run analyze:web` with a new report name (e.g. `post-lazy-virtuoso`).
3. Confirm react-virtuoso moves out of the main shared chunk into a lazy or route-specific chunk.
4. Manually test: episode/clip pages with transcript; expand transcript, scroll. Confirm virtualized list works and loading state is acceptable.
5. `npm run lint` passes.

## Success criteria

- react-virtuoso is lazy-loaded only when VirtualizedList / ItemTranscript is used.
- Main client bundle size is reduced; transcript UX and virtualized list behavior unchanged.
