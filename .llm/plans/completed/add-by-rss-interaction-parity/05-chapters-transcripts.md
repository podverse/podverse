# Subplan 5: Chapters and Transcripts for Add-by-RSS

## Implementation order

Execute in this order; audit after each.

1. **05a – Backend**: Implement on-demand API endpoint for chapters/transcript (client calls when opening tabs or episode load). See [05a-backend-chapters-transcript.md](05a-backend-chapters-transcript.md).
2. **05b – Client**: Mappers (bundle/API → DTOItemChapter-like, TranscriptRow[]) and Chapters/Transcript tabs on the add-by-RSS episode page. See [05b-client-mappers-tabs.md](05b-client-mappers-tabs.md).
3. **05c – Chapter seek**: Wire chapter list to seek when now playing is add-by-RSS. See [05c-chapter-seek.md](05c-chapter-seek.md).

---

## Goal

Add-by-RSS episode detail page has “Chapters” and “Transcript” tabs. Data
comes from the **parsed feed bundle** (already in IndexedDB or populated by
backend), not from the database. Reuse existing chapter/transcript UI
components where possible.

**CORS constraint**: Parsing chapters (fetching the chapters feed URL) and
parsing transcripts (fetching transcript URL or content) **must happen via a
backend process** to avoid CORS issues. The client must not fetch those URLs
directly from the browser. The backend exposes an **on-demand endpoint** that
fetches and parses chapters/transcript server-side and returns parsed data to
the client.

**Reuse**: Transcript and chapter rendering in the browser must reuse the same
logic and components as the core episode page (e.g. `ItemTranscript`,
`ListItemChapters`, `ListItemChapterRow`). Differences only where play/link
behavior differs (no DTOChannel/DTOItem for add-by-RSS). See 05b for the reuse
subsection and allowed differences.

## Prerequisites

- Add-by-RSS episode page loads the index item (and bundle) from IndexedDB;
  see `apps/web/src/app/add-by-rss/episode/AddByRSSEpisodePageClient.tsx` and
  `getAddByRSSItemByIdText`.
- Core episode page: chapters via `reqItemParseAndGetChapters(item_id)`,
  transcript via `reqItemTranscriptGet(item_id)` in
  `apps/web/src/app/episode/[item_id]/EpisodePageContext.tsx`.

---

## Step 1: Source chapters and transcript from the bundle

The add-by-RSS index item has a `bundle` (parsed feed item). The parser and
parser-mapping packages produce chapter and transcript structures; for
add-by-RSS, that parsed item is in `episode.bundle`.

1. **Bundle shape** (from `ParsedRSSFeedCompatBundle` in parser-mapping): Each
   bundle item has `chaptersFeed` (url + type, or null) and `transcripts`
   (array of transcript DTOs from `compatItemTranscriptDtos`). Parsed chapter
   rows are **not** stored in the bundle by default—only the chapters feed
   URL. **Parser-mapping**: `PIChapter[]` and `compatParsedChapters` in
   `packages/parser-mapping/src/compat/chapters/chapters.ts` map to
   `DTOItemChapterCreate[]`.

2. **Backend does the parsing (CORS)**: Fetching the chapters feed URL and
   transcript URL **must** be done in a backend process (e.g. during add-by-RSS
   parse, or an API that fetches and returns parsed chapters/transcript for an
   add-by-RSS item). The backend returns parsed chapters (e.g. DTOItemChapter-like
   or PIChapter[] mapped to DTO shape) and transcript rows (or transcript text
   to map client-side to rows). The client then receives this data via API or
   from a bundle that was populated at parse time on the server. Do not fetch
   chapters/transcript URLs from the client.

3. **Client**: From `episode.bundle` (or API response), use pre-parsed
   chapters and transcript when available. Map to DTOItemChapter-like and
   `TranscriptRow[]` for existing UI components. If the bundle already
   contains parsed chapters/transcript (populated by backend during parse),
   derive on demand; otherwise request from an API that performs the fetch
   server-side and returns parsed data.

4. **Optional cache**: Cache derived chapters/transcript in IndexedDB keyed by
   add-by-RSS item idText so repeat visits don’t re-request. Invalidate or
   version when the feed is re-parsed.

**Audit**: For an add-by-RSS episode that has chapters/transcript in the feed,
verify the client receives parsed data (from API or server-populated bundle)
and the UI displays it correctly. No client-side fetch of chapters/transcript
URLs.

---

## Step 2: Map to shapes expected by existing UI

1. **Chapters**: Core UI uses `DTOItemChapter`-like objects (e.g. id_text,
   start_time, title, table_of_contents). Map parser/bundle chapter format to
   that shape so `ListItemChapters` and `ListItemChapterRow` can be reused.
   See `apps/web/src/components/List/ItemChapters/` and
   `apps/web/src/app/episode/[item_id]/EpisodePageList.tsx` (item_chapters
   prop).

2. **Transcript**: Core uses `TranscriptRow[]` from
   `apps/web/src/utils/transcript.ts` and `ItemTranscript` component. Map
   bundle transcript (or fetched transcript string) to that row format.

**Deliverable**: Two mapper functions (or one module): bundle → chapter-like
array; bundle (or transcript string) → transcript rows. Types compatible with
existing list/transcript components.

---

## Step 3: Add Chapters and Transcript tabs to Add-by-RSS episode page

1. **Tabs**: In `AddByRSSEpisodePageClient.tsx`, add “Chapters” and
   “Transcript” to the tab list (mirroring
   `apps/web/src/app/episode/[item_id]/EpisodePageListHeader.tsx`). Use the
   same `Tabs` component and tab keys (e.g. `chapters`, `transcript`).

2. **State**: Add state for the selected tab and for chapters/transcript data
   (or derive on demand when the tab is selected). If using context (e.g. an
   AddByRSS episode page context), hold `itemChapters` and `transcriptRows`
   there.

3. **Content**: When “Chapters” is selected, render `ListItemChapters` (or the
   same list component used by core) with the mapped chapter array and
   appropriate props (e.g. channel for link; use add-by-RSS channel title/image
   from feed). When “Transcript” is selected, render `ItemTranscript` with the
   mapped transcript rows and `autoScrollOn` if desired.

4. **Missing data**: If the episode has no chapters or no transcript, hide the
   corresponding tab or show an empty state. Do not show tabs that would be
   empty unless the design explicitly shows “No chapters” / “No transcript”.

**Files to touch**:
- `apps/web/src/app/add-by-rss/episode/AddByRSSEpisodePageClient.tsx`: tabs,
  state, and content for chapters/transcript.
- New or existing util: e.g. `apps/web/src/utils/addByRSS/chaptersTranscript.ts`
  (derive + map from bundle).

**Audit**: Open an add-by-RSS episode that has chapters/transcript in the
feed; switch to Chapters and Transcript tabs; confirm content matches feed and
formatting is correct.

---

## Step 4: Media player chapter seek (add-by-RSS)

If the user seeks via a chapter (e.g. clicks a chapter in the list) while
playing an add-by-RSS episode, the player’s current time and chapter
highlight should stay in sync. This is the same behavior as core; the only
difference is the chapter list source (bundle vs API). Ensure:
- Chapter list is passed to the player or to a component that can trigger
  seek (e.g. set current time when chapter is clicked).
- When “now playing” is add-by-RSS and the episode has chapters, the same
  chapter-seek logic applies (e.g. setMPCurrentTime, setMPItemChapter if
  used).

**Audit**: Play an add-by-RSS episode with chapters; click a chapter; playback
seeks to that time and UI updates.

---

## Deliverables checklist

- [ ] Chapters and transcript from backend-parsed data (API or
  server-populated bundle); optionally cached in IndexedDB. No client fetch of
  chapters/transcript URLs (CORS).
- [ ] Mappers to DTOItemChapter-like and TranscriptRow[]; reuse
  ListItemChapters and ItemTranscript.
- [ ] Add-by-RSS episode page has Chapters and Transcript tabs with correct
  content; empty state when missing.
- [ ] Chapter seek from add-by-RSS episode page works when that episode is
  playing.

---

## Files reference

| Area              | Path |
| ----------------- | ---- |
| Add-by-RSS episode page | `apps/web/src/app/add-by-rss/episode/AddByRSSEpisodePageClient.tsx` |
| Core episode list | `apps/web/src/app/episode/[item_id]/EpisodePageList.tsx` |
| Core episode context | `apps/web/src/app/episode/[item_id]/EpisodePageContext.tsx` |
| ListItemChapters  | `apps/web/src/components/List/ItemChapters/` |
| ItemTranscript    | `apps/web/src/utils/transcript.ts` + component |
| Add-by-RSS types  | `apps/web/src/utils/addByRSS/types.ts` |
| Parser-mapping    | `packages/parser-mapping/src/compat/chapters/` |
