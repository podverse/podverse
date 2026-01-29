# Plan 05: Lazy-load @hello-pangea/dnd

## Goal

Remove **@hello-pangea/dnd** (~81 KB parsed) from the main client bundle by loading it only when users hit queue or playlist UI. No change to behavior; slight delay before first drag-and-drop on those pages.

## Usage

- [ListQueueResources](apps/web/src/components/List/Queues/ListQueueResources.tsx) — queue drag-and-drop.
- [ListPlaylistResources](apps/web/src/components/List/Playlists/ListPlaylistResources.tsx) — playlist drag-and-drop.

Consumers:

- [QueuesList](apps/web/src/app/queues/QueuesList.tsx) → `ListQueueResources`
- [PlaylistList](apps/web/src/app/playlist/[playlist_id]/PlaylistList.tsx) → `ListPlaylistResources`
- [PlaylistEditList](apps/web/src/app/playlist/edit/[playlist_id]/PlaylistEditList.tsx) → `ListPlaylistResources`

All are page-level; DnD is not used in layout or global components.

## Scope

- `apps/web/src/components/List/Queues/ListQueueResources.tsx`
- `apps/web/src/components/List/Playlists/ListPlaylistResources.tsx`
- `apps/web/src/app/queues/QueuesList.tsx`
- `apps/web/src/app/playlist/[playlist_id]/PlaylistList.tsx`
- `apps/web/src/app/playlist/edit/[playlist_id]/PlaylistEditList.tsx`

## Implementation

1. **Lazy-load the DnD list components** using `next/dynamic`:
   - Dynamically import `ListQueueResources` and `ListPlaylistResources` with `ssr: false` (or `ssr: true` if you keep server render for those pages) and a simple loading fallback (e.g. skeleton or spinner) where appropriate.
2. **Route-level usage**: Keep using `ListQueueResources` / `ListPlaylistResources` on the same routes as today; only the import becomes dynamic. No change to props or rendering logic.
3. **ListHistoryResources** imports styles from `ListQueueResources`; ensure that shared style import still works and doesn't pull DnD into the main bundle.

Result: `@hello-pangea/dnd` is loaded only when a user visits a queue or playlist page that renders the DnD list.

## Verification

1. `npm run build:packages` then `npm run build` in `apps/web`.
2. `cd tools/web-perf/bundle-analyzer && npm run analyze:web` with a new report name (e.g. `post-lazy-dnd`).
3. Confirm `@hello-pangea/dnd` (or equivalent) no longer appears in the main shared chunk; it should move to a route-specific or lazy chunk.
4. Manually test: queues page (reorder queue), playlist view, playlist edit (reorder). Confirm drag-and-drop works; loading state is acceptable.
5. `npm run lint` passes.

## Success criteria

- DnD code is lazy-loaded only on queue/playlist routes.
- Main client bundle size (via analyzer) is reduced.
- Queue and playlist reordering behave as before; no functional regressions.
