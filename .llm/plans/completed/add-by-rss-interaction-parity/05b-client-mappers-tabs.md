# Subplan 05b: Client – Mappers and Chapters/Transcript Tabs

## Goal

Map bundle or API response to shapes expected by existing chapter and transcript UI. Add Chapters and Transcript tabs to the add-by-RSS episode page and render content (or empty state). Depends on 05a for data source (API or server-populated bundle).

## Prerequisites

- 05a: Backend provides parsed chapters and transcript (API or bundle/cache).
- Add-by-RSS episode page loads index item and bundle: `AddByRSSEpisodePageClient.tsx`, `getAddByRSSItemByIdText`.
- Core UI: `ListItemChapters`, `ListItemChapterRow` use DTOItemChapter-like (id_text, start_time, title, table_of_contents). `ItemTranscript` and `apps/web/src/utils/transcript.ts` use `TranscriptRow[]`.

## Reuse (same logic as core)

Transcript and chapter rendering must reuse the same components and logic as the core episode page; differences only where the data source or play/navigation behavior differs (no DTOChannel/DTOItem for add-by-RSS).

1. **Transcript**: Use the same `ItemTranscript` component and `TranscriptRow[]`; no add-by-RSS-specific transcript UI. Map add-by-RSS transcript data to the same row shape; seek and highlight use the same events/code paths.
2. **Chapters**: Use the same `ListItemChapters` and `ListItemChapterRow`; feed them DTOItemChapter-like data and, where needed, minimal channel/item-like data for display. Only play and link behavior may differ: support an optional add-by-RSS path (e.g. `onPlayChapter` and/or `getChapterHref`) so the same row component can be used for both core and add-by-RSS without duplicating layout or styling. Play: when channel/item are absent, use a callback that starts add-by-RSS playback if needed and seeks to chapter start. Link: point to the add-by-RSS episode page (or omit) instead of the core chapter route.

## Step 1: Mappers

1. **Chapters**: Map parser/bundle chapter format (or API response) to DTOItemChapter-like array so `ListItemChapters` and `ListItemChapterRow` can be reused. Use `compatParsedChapters` output shape or equivalent (e.g. id_text, start_time, title, table_of_contents).
2. **Transcript**: Map bundle transcript metadata + content (or API transcript string) to `TranscriptRow[]`. Reuse `getTranscriptRowsFromTranscriptString` in `apps/web/src/utils/transcript.ts` if backend returns raw transcript text.

**Deliverable**: Mapper functions or one module (e.g. `apps/web/src/utils/addByRSS/chaptersTranscript.ts`): bundle or API response → chapter-like array; bundle or transcript string → transcript rows. Types compatible with `ListItemChapters` and `ItemTranscript`.

## Step 2: Tabs and content on Add-by-RSS episode page

1. **Tabs**: In `AddByRSSEpisodePageClient.tsx`, add “Chapters” and “Transcript” to the tab list. Mirror `apps/web/src/app/episode/[item_id]/EpisodePageListHeader.tsx` (same `Tabs` component, tab keys e.g. `chapters`, `transcript`).
2. **State**: Add state for selected tab and for chapters/transcript data (or derive on demand when tab is selected). Optionally use a small context for the episode page holding `itemChapters` and `transcriptRows`.
3. **Content**: When “Chapters” is selected, render `ListItemChapters` with the mapped chapter array and appropriate props (e.g. add-by-RSS channel title/image from feed). When “Transcript” is selected, render `ItemTranscript` with mapped transcript rows and `autoScrollOn` if desired.
4. **Missing data**: If the episode has no chapters or no transcript, hide the corresponding tab or show an empty state. Do not show tabs that would be empty unless design explicitly shows “No chapters” / “No transcript”.

## Deliverables

- [ ] Mappers: bundle/API → DTOItemChapter-like array; bundle/transcript string → TranscriptRow[].
- [ ] Add-by-RSS episode page has Chapters and Transcript tabs with correct content; empty state when missing.
- [ ] Reuse ListItemChapters and ItemTranscript; types compatible with existing components.

## Files reference

| Area | Path |
| ---- | ---- |
| Add-by-RSS episode page | `apps/web/src/app/add-by-rss/episode/AddByRSSEpisodePageClient.tsx` |
| Core episode list header | `apps/web/src/app/episode/[item_id]/EpisodePageListHeader.tsx` |
| Core episode list | `apps/web/src/app/episode/[item_id]/EpisodePageList.tsx` |
| ListItemChapters | `apps/web/src/components/List/ItemChapters/` |
| ItemTranscript, transcript utils | `apps/web/src/utils/transcript.ts` |
| Mapper util | `apps/web/src/utils/addByRSS/chaptersTranscript.ts` (new or existing) |

## Audit

Open an add-by-RSS episode that has chapters/transcript in the feed; switch to Chapters and Transcript tabs; confirm content matches feed and formatting is correct.
