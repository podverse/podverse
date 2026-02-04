---
name: AddByRSS episodes rework
overview: Align add-by-RSS episode detail and episodes list with the non-add-by-RSS UX, using IndexedDB-backed episode indexing (recent/oldest only) with fast first render and background indexing, while keeping podcast pages as-is.
todos:
  - id: episode-detail-parity
    content: Swap add-by-RSS episode detail to mirror EpisodePageClient with local data adapter
    status: pending
  - id: episodes-list-rework
    content: Build add-by-RSS episodes list UI with recent/oldest + pagination
    status: pending
  - id: indexeddb-indexing
    content: Add episodes index store and background indexing for fast first page
    status: pending
  - id: medium-filtering
    content: Filter indexed episodes to podcast/video or missing medium
    status: pending
  - id: verify-web
    content: Web typecheck, lint, and manual verification
    status: pending
isProject: false
---

# Add-by-RSS Episodes Rework Plan

## Scope and goals

- Bring add-by-RSS episode **detail** UI in line with the non-add-by-RSS episode page (no embedded episodes list).
- Rework add-by-RSS **episodes list** to match the non-add-by-RSS episodes page UX, but using local IndexedDB data, supporting only `recent` and `oldest` sort, with pagination and background indexing to avoid blocking initial render.
- Keep add-by-RSS podcast pages as-is; defer music medium handling (artists/albums/tracks).

## Key files to touch

- Add-by-RSS entrypoints: [apps/web/src/app/add-by-rss/episode/[id]/page.tsx](apps/web/src/app/add-by-rss/episode/[id]/page.tsx), [apps/web/src/app/add-by-rss/episodes/page.tsx](apps/web/src/app/add-by-rss/episodes/page.tsx)
- Add-by-RSS detail client: [apps/web/src/app/add-by-rss/AddByRSSDetailPageClient.tsx](apps/web/src/app/add-by-rss/AddByRSSDetailPageClient.tsx)
- Add-by-RSS episode components: [apps/web/src/components/AddByRSS/Podcast/Episode/](apps/web/src/components/AddByRSS/Podcast/Episode/)
- Add-by-RSS storage and parsing: [apps/web/src/utils/addByRSS/storage.ts](apps/web/src/utils/addByRSS/storage.ts), [apps/web/src/utils/addByRSS/actions.ts](apps/web/src/utils/addByRSS/actions.ts)
- Non-add-by-RSS episode page reference: [apps/web/src/app/episode/[item_id]/EpisodePageClient.tsx](apps/web/src/app/episode/[item_id]/EpisodePageClient.tsx), [apps/web/src/app/episodes/page.tsx](apps/web/src/app/episodes/page.tsx)

## Plan

### 1) Episode detail page parity (add-by-RSS)

- Replace the add-by-RSS episode detail rendering in `AddByRSSDetailPageClient` with a dedicated **AddByRSSEpisodePageClient** that mirrors the structure of `EpisodePageClient` (header + episode header + list header + list), but backed by local feed data.
- Build a lightweight adapter to transform `AddByRSSMappedFeed`/feed item into the **minimum DTO shape** expected by `CorePodcastHeader`, `EpisodeHeader`, and `EpisodePageList`.
  - Use only the fields these components read; avoid a full DTO conversion.
- Remove the current “items list” section in `AddByRSSDetailPageClient` for `resourceType === 'episodes'`.

### 2) Episodes list (plural) rework for add-by-RSS

- Create a new **AddByRSSEpisodesPageClient** and stop using `AddByRSSListClient` for `resourceType="episodes"`.
- Match the non-add-by-RSS episodes page layout (header, filters, list, pagination) while restricting sort options to `recent` and `oldest`.
- Define a page-size constant (reuse existing default if available in web helpers) and apply consistent pagination UI.

### 3) IndexedDB episode index + background processing

- Add a new IndexedDB **episodes index store** (new DB version) in `storage.ts` to store flattened episode records with:
  - feedIdText, feedTitle, feedImageUrl, item guid/id_text, pub_date, and any fields needed to render list rows.
- Implement a **fast first render** path:
  - If an index exists, read only page 1 from the index immediately.
  - If no index exists, scan feeds until page 1 is filled (minimal work), render page 1, then schedule background indexing.
- Implement **background indexing** (client worker / async job):
  - Build the full sorted index in the background (requestIdleCallback or a web worker module), then persist to IndexedDB for later pages.
  - Keep a simple “index ready” flag in IndexedDB or in-memory state to avoid repeated full rebuilds.

### 4) Medium filtering rules

- During index build, only include feeds whose channel medium is **missing** or `podcast`/`video`.
  - Use the compat mapped channel medium field from `mappedFeed.channel.channel` (verify exact field and normalize).
- Exclude music feeds (medium `music`) for now.

### 5) UI and parity alignment

- Ensure add-by-RSS episode rows/grid use the same SCSS modules as non-add-by-RSS episode list components.
- Align header and list controls to match the non-add-by-RSS episodes page while keeping add-by-RSS branding label.

### 6) Verification

- Run `npx tsc --noEmit` and `npm run lint` in `apps/web`.
- Manually verify:
  - Add-by-RSS episode detail page renders the same structure as non-add-by-RSS episode detail.
  - Add-by-RSS episodes list supports only recent/oldest, paginates correctly, and first render is fast.
  - Background indexing populates later pages without blocking initial load.

## Subplans (if needed)

- **Subplan A**: Episode detail parity only (data adapter + UI swap).
- **Subplan B**: Episodes list UI parity and sort/pagination shell.
- **Subplan C**: IndexedDB episode index + background build and medium filtering.

If you want this split into separate plan files under `.llm/plans/active/`, I can do that before implementation.
