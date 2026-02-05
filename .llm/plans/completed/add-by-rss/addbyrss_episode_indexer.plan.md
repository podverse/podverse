---
name: AddByRSS episode indexer
overview: Add IndexedDB-based episode index + background sorting to keep add-by-RSS episodes list fast and paginated.
todos:
  - id: db-store
    content: Add IndexedDB store for flattened add-by-RSS episode records
    status: pending
  - id: fast-first-page
    content: Implement first-page scan and render without full index
    status: pending
  - id: background-index
    content: Build full index in background and persist for later pages
    status: pending
  - id: medium-filter
    content: Filter to podcast/video or missing medium
    status: pending
  - id: verify-index
    content: Verify performance and run web lint/tsc
    status: pending
isProject: false
---

# AddByRSS Episode Indexer

## Goal
Index add-by-RSS episodes in IndexedDB with fast first render and background indexing for later pages; filter to podcast/video or missing medium.

## Files to touch
- [apps/web/src/utils/addByRSS/storage.ts](apps/web/src/utils/addByRSS/storage.ts)
- New index helpers (e.g. [apps/web/src/utils/addByRSS/episodeIndex.ts](apps/web/src/utils/addByRSS/episodeIndex.ts))
- Add-by-RSS episodes client from list parity plan

## Tasks
1) Bump IndexedDB version and add a new object store for flattened episode records.
2) Implement helpers to:
   - Read page 1 quickly (scan feeds until page filled if index missing).
   - Build a full sorted index (recent/oldest) in background and persist to IndexedDB.
   - Read paginated pages from the stored index for later pages.
3) Apply medium filtering during indexing: include only feeds with no medium tag or medium `podcast`/`video`.
4) Add an “index ready” flag (store or local state) to avoid repeated full rebuilds.

## Verification
- Manual: first page loads fast, later pages load from index; no UI hangs during background build.
- Run `npx tsc --noEmit` and `npm run lint` in `apps/web`.
