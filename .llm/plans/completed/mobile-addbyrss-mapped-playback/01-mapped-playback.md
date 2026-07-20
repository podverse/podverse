# 01 — Wire mapped feed into add-by-RSS playback

Close detail **494** playback acceptance: full mapped `AddByRSSResourceData`, not slim preview only.

## Detail docs

- [494-data-layer-add-by-rss-parser-mapping](/docs/proposals/mobile/_master-plan_/details/494-data-layer-add-by-rss-parser-mapping.md)
- Web pattern: `apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeRow.tsx`
  (`buildAddByRSSResourceData` / index item)
- Skills: **add-by-rss-parity-sync**, **mobile-data-layer**

## Tasks

1. In `apps/mobile/src/hooks/useAddByRssPlayback.ts` (and/or a helper in
   `apps/mobile/src/lib/addByRss/domain.ts`):
   - `await addByRssRepository.getMappedFeedByUrl(feed.feedUrl)`
   - If a mapped bundle exists: build an index item for the first playable item via
     `@podverse/parser-mapping` (`toIndexItem` + `buildAddByRSSResourceData` — same intent as web)
   - Merge `playback_position` from the SQLite `MobileAddByRSSFeedRecord` when present
   - If no mapped bundle: fall back to existing `toAddByRssResourceData(feed)`
2. Keep E2E enclosure rewrite (`resolveE2eMediaUrl`) unchanged.
3. Do **not** import `@podverse/parser` or the helpers barrel for runtime hash/crypto paths beyond
   what Metro already shims.
4. Optionally clarify in detail 494 that playback now uses mapped data (status remains `done`).

## Acceptance

- After a successful parse (mapped JSON in SQLite), play uses full mapped `AddByRSSResourceData`
- Offline play still works when only slim record exists (fallback)
- No `@podverse/parser` on mobile
- Operator verify: `npm run mobile:e2e:test -- add-by-rss`

Do not run tests during agent work.
