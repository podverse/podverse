---
name: AddByRSS episodes list parity
overview: Rebuild add-by-RSS episodes list (plural) to mirror the non-add-by-RSS episodes page with recent/oldest sort and pagination.
todos:
  - id: episodes-client
    content: Create AddByRSSEpisodesPageClient mirroring /episodes layout
    status: pending
  - id: filters-sort
    content: Add recent/oldest sort and pagination controls
    status: pending
  - id: route-params
    content: Wire add-by-RSS episodes page to use query params
    status: pending
  - id: verify-list
    content: Verify list parity and run web lint/tsc
    status: pending
isProject: false
---

# AddByRSS Episodes List Parity

## Goal
Make `/add-by-rss/episodes` match the non-add-by-RSS episodes list UX while using local data and only `recent`/`oldest` sorting.

## Files to touch
- [apps/web/src/app/add-by-rss/episodes/page.tsx](apps/web/src/app/add-by-rss/episodes/page.tsx)
- New client component for add-by-RSS episodes list (e.g. [apps/web/src/app/add-by-rss/episodes/AddByRSSEpisodesPageClient.tsx](apps/web/src/app/add-by-rss/episodes/AddByRSSEpisodesPageClient.tsx))
- Add-by-RSS episode components in [apps/web/src/components/AddByRSS/Podcast/Episode/](apps/web/src/components/AddByRSS/Podcast/Episode/)
- Reference layout: [apps/web/src/app/episodes/page.tsx](apps/web/src/app/episodes/page.tsx)

## Tasks
1) Replace `AddByRSSListClient` usage for episodes with `AddByRSSEpisodesPageClient`.
2) Mirror non-add-by-RSS episodes page layout (header + filters + list + pagination) but restrict sort options to `recent` and `oldest`.
3) Reuse existing episode row/grid components and align SCSS paths to common episode list styles.
4) Add query params for `page` and `sort` (recent/oldest) in the add-by-RSS episodes route.

## Verification
- Manual: `/add-by-rss/episodes` shows the same structure as `/episodes` and respects sort/pagination.
- Run `npx tsc --noEmit` and `npm run lint` in `apps/web`.
