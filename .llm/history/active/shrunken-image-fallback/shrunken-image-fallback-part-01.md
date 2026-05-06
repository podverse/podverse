# shrunken-image-fallback

**Started:** 2026-05-06

**Author:** Cursor Agent

**Context:** Implement client-side fallback when shrunken/CDN artwork fails to load: try list-preferred URL first, then native-sized alternatives from the same DTO rows, then placeholder.

---

### Session 1 - 2026-05-06

#### Prompt (Developer)

Shrunken image load failure: current behavior and path to fallback chain

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added `buildDTOItemImageLoadCandidates`, `buildDTOChannelImageLoadCandidates`, `mergeDTOItemThenChannelImageCandidates`, and `prependDistinctImageCandidate` in `@podverse/helpers` (`packages/helpers/src/lib/image.ts`) with unit tests.
- Extended `Image` to accept optional `candidates` or `fallbackControl` (shared index for paired desktop/mobile images); advances on `onError` before placeholder.
- Updated `ImagesPerView` to own shared fallback state and pass `fallbackControl` to both child `Image` components (with a short gate to avoid double-bump from two `onError` callbacks in one frame).
- Replaced single-URL `findDTO*ForList` + `src` usage with merged candidate arrays across list/grid/common episode/track rows; chapter rows prepend chapter image URL.
- Aligned `buildMediaPlayerArtworkImageCandidates` with the same merge + chapter prepend behavior.

#### Files Created/Modified

- `packages/helpers/src/lib/image.ts`
- `packages/helpers/src/lib/image.test.ts`
- `apps/web/src/components/Image/Image.tsx`
- `apps/web/src/components/Image/ImagesPerView.tsx`
- `apps/web/src/utils/mediaPlayer/mediaPlayerArtwork.ts`
- `apps/web/src/components/List/Podcasts/Episodes/ListEpisodeRow.tsx`
- `apps/web/src/components/List/Podcasts/Episodes/ListEpisodeGridNode.tsx`
- `apps/web/src/components/List/LiveItem/ListLiveItemRow.tsx`
- `apps/web/src/components/List/LiveItem/ListLiveItemGridNode.tsx`
- `apps/web/src/components/List/Clips/ListClipRow.tsx`
- `apps/web/src/components/List/Music/Albums/Tracks/ListTrackRow.tsx`
- `apps/web/src/components/List/Music/Albums/Tracks/ListTrackGridNode.tsx`
- `apps/web/src/components/List/ItemChapters/ListItemChapterRow.tsx`
- `apps/web/src/components/List/ItemSoundbites/ListItemSoundbiteRow.tsx`
- `apps/web/src/components/List/Music/Artists/ListArtistGridNode.tsx`
- `apps/web/src/components/List/Music/Artists/ListArtistRow.tsx`
- `apps/web/src/components/List/Music/Albums/ListAlbumGridNode.tsx`
- `apps/web/src/components/List/Music/Albums/ListAlbumRow.tsx`
- `apps/web/src/components/Common/Podcast/Episode/CommonEpisodeRow.tsx`
- `apps/web/src/components/Common/Artist/Album/Track/CommonTrackListRow.tsx`

---

### Session 2 - 2026-05-06

#### Prompt (Developer)

Full-channel/item image candidate fallback (web)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- **`CommonItemHeader`**: optional `imageCandidates`; dual square `Image` components share the same ordered chain.
- **Episode/track/chapter/clip headers**: `itemHeaderSquareArtworkCandidates()` prepends legacy sized primary (`findDTOItemImageBySize` + `[0]`) then `buildDTOItemImageLoadCandidates` chain.
- **`MediaHeaderMini`**: `mergeDTOItemThenChannelImageCandidates` when `item` exists; else channel-only candidates.
- **Discovery/search/podroll/queues/playlists**: podroll + PI feed surfaces use `buildDTO*` / merged helpers or deduped multi-URL lists; queue/playlist Add-by-RSS uses `addByRSSResourceMergedArtworkCandidates` with coerced stored image rows.
- **Add-by-RSS**: channel headers use `addByRSSChannelHeaderBreakpointCandidates` (three breakpoints); grids/rows align with list/grid `SIZE_FIND_TARGET` + `lesser`/`greater` per surface; livestream row/grid dedupe item vs channel string URLs.
- **Verification**: `npm run lint -w @podverse/web`, `npm run build -w @podverse/web` (optional E2E smoke per plan).

#### Files Created/Modified

- `apps/web/src/utils/image/itemHeaderArtworkCandidates.ts`
- `apps/web/src/utils/image/addByRSSResourceArtworkCandidates.ts`
- `apps/web/src/utils/image/addByRSSChannelHeaderCandidates.ts`
- `apps/web/src/components/Common/Item/CommonItemHeader.tsx`
- `apps/web/src/components/Core/Podcast/Episodes/CoreEpisodeHeader.tsx`
- `apps/web/src/components/Core/Artist/Album/Track/CoreTrackHeader.tsx`
- `apps/web/src/components/Media/Clip/ClipHeader.tsx`
- `apps/web/src/components/Media/ItemChapter/ItemChapterHeader.tsx`
- `apps/web/src/components/MediaHeaderMini/MediaHeaderMini.tsx`
- `apps/web/src/components/Content/Podroll/ContentPodrollChannelRow.tsx`
- `apps/web/src/components/Content/Podroll/ContentPodrollItemRow.tsx`
- `apps/web/src/components/Content/Podroll/ContentPodrollChannelUnaddedRow.tsx`
- `apps/web/src/components/Content/Podroll/ContentPodrollItemUnaddedRow.tsx`
- `apps/web/src/components/PodcastIndex/PodcastIndexFeedInfo.tsx`
- `apps/web/src/components/List/SearchResults/ListSearchResultPodcastIndexFeedRow.tsx`
- `apps/web/src/components/Common/Artist/Album/Track/CommonTrackGridNode.tsx`
- `apps/web/src/components/Common/Artist/Album/Track/CommonTrackGridNodeSimple.tsx`
- `apps/web/src/components/List/Queues/ListQueueResourceRow.tsx`
- `apps/web/src/components/List/Playlists/ListPlaylistResourceRow.tsx`
- `apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastHeader.tsx`
- `apps/web/src/components/AddByRSS/Artist/AddByRSSArtistHeader.tsx`
- `apps/web/src/components/AddByRSS/Artist/Album/AddByRSSAlbumHeader.tsx`
- `apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeRow.tsx`
- `apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeGridCard.tsx`
- `apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeGridNode.tsx`
- `apps/web/src/components/AddByRSS/Artist/Album/Track/AddByRSSTrackGridNode.tsx`
- `apps/web/src/components/AddByRSS/Artist/Album/Track/AddByRSSTrackGridCard.tsx`
- `apps/web/src/components/AddByRSS/Livestream/AddByRSSLivestreamFeedGridNode.tsx`
- `apps/web/src/components/AddByRSS/Livestream/AddByRSSLivestreamFeedRow.tsx`
- `apps/web/src/components/AddByRSS/Livestream/AddByRSSLivestreamGridNode.tsx`
- `apps/web/src/components/AddByRSS/Livestream/AddByRSSLivestreamRow.tsx`
- `apps/web/src/components/AddByRSS/Detail/AddByRSSDetailClient.tsx`

---

### Session 3 - 2026-05-06

#### Prompt (Developer)

implement

#### Key Decisions

- Replaced four inline feed/livestream image URL dedupe IIFEs with `dedupedTrimmedUrlCandidates` (Podcast Index, search row, Add-by-RSS livestream row/grid).
- Add-by-RSS episode/track grid/row card channel tail uses `appendDistinctImageCandidate` from `@podverse/helpers`.
- `ItemImagePartial` optional width: added `itemImageHasNumericWidth` / `itemImageWidthUnset` type guards in `image.ts` so `tsc` and dist export `appendDistinctImageCandidate` cleanly; rebuilt `packages/helpers` dist.
- `addByRSSResourceArtworkCandidates` JSDoc: **prepend** (not append) for `channel_image_url`; web test expectations aligned.
- `AddByRSSEpisodeDetailHeader` and `AddByRSSTrackDetailHeader`: `CommonItemHeader` now takes `imageCandidates` via `itemHeaderSquareArtworkCandidates` (Core parity), not `imageUrl`.
- Unit tests: `appendDistinctImageCandidate` in `packages/helpers/src/lib/image.test.ts`; `apps/web/src/utils/image/imageCandidates.test.ts` for shared image utils.

#### Files Created/Modified

- `packages/helpers/src/lib/image.ts`
- `packages/helpers/src/lib/image.test.ts`
- `apps/web/src/utils/image/imageCandidates.test.ts`
- `apps/web/src/utils/image/addByRSSResourceArtworkCandidates.ts`
- `apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeRow.tsx`
- `apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeGridCard.tsx`
- `apps/web/src/components/AddByRSS/Artist/Album/Track/AddByRSSTrackGridCard.tsx`
- `apps/web/src/components/PodcastIndex/PodcastIndexFeedInfo.tsx`
- `apps/web/src/components/List/SearchResults/ListSearchResultPodcastIndexFeedRow.tsx`
- `apps/web/src/components/AddByRSS/Livestream/AddByRSSLivestreamRow.tsx`
- `apps/web/src/components/AddByRSS/Livestream/AddByRSSLivestreamGridNode.tsx`
- `apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeDetailHeader.tsx`
- `apps/web/src/components/AddByRSS/Artist/Album/Track/AddByRSSTrackDetailHeader.tsx`

---

### Session 4 - 2026-05-06

#### Prompt (Developer)

Your conversation was summarized due to context constraints. Here is the summary of the conversation so far:

## Conversation summary (for handoff)

### User request

Implement the attached plan **"Fix Shrunken Image Source Overwrite"** without editing the plan file. Use existing todos; mark them in progress/completed; finish all items.

### Intent of the plan

- **Worker:** Stop mutating the RSS-origin `channel_image` / `item_image` row when saving a shrunken CDN URL. Insert a **new** resized row (`whereKeys: ['url']`, no `existingEntity` unless updating that same CDN row in place).
- **Helpers:** Extend `buildDTOImageLoadCandidates` so **every** non-resized (`is_resized !== true`) URL is included in the fallback chain in a defined order, not only the single "native best" URL.
- **Tests:** Worker-side behavior + helpers behavior + verification builds/tests.

### Completed work

**1.** `apps/workers/src/commands/imageShrink/batch.ts` — `saveResizedRow` calls `_update` with `['url']` and passes `existingEntity` only when the persisted row is already the same resized CDN URL.
**2.** `apps/workers/src/commands/imageShrink/existingEntityForResizedSave.ts` (new) — pure helper for insert-vs-update semantics.
**3.** `apps/workers/src/commands/imageShrink/existingEntityForResizedSave.test.ts` (new) — four Vitest cases.
**4.** `packages/helpers/src/lib/image.ts` — `orderNonResizedUrlsForFallbackChain` and loop over ordered non-resized URLs.
**5.** `packages/helpers/src/lib/image.test.ts` — new test for resized + two non-resized URLs.

### What remains

1. **Fix workers typing** in `batch.ts`: call `existingEntityForResizedSave` inside each branch so TS narrows.
2. Re-run `npm run build -w @podverse/workers` until clean.
3. Run `npm run test:unit` from repo root.
4. **LLM history** — append session.
5. Mark the **verify** todo completed.

If the task is complete, respond to the user. Otherwise, continue working on the task.

#### Key Decisions

- Resolved `saveResizedRow` typing: call `existingEntityForResizedSave` **inside** the `channel` and `item` branches so `persisted.row` narrows and `_update` receives `ChannelImage | undefined` or `ItemImage | undefined` (not a union).
- Verified `npm run build -w @podverse/workers` and `npm run test:unit` succeed.

#### Files Created/Modified

- `apps/workers/src/commands/imageShrink/batch.ts`

---

### Session 5 - 2026-05-06

#### Prompt (Developer)

implement

[Plan: `image-shrink-rotation-cleanup` — trimmed to helper rotation only. Restores the orphan sweeper's ability to reclaim stale resized S3 objects after source content changes. The previous helper returned undefined when the persisted resized row's URL differed from the new CDN URL, causing `_update` to insert a second resized row alongside the old one; the sweeper then saw both URLs as referenced and never freed the old object, leaking one DB row + one S3 object per content rotation permanently.]

#### Key Decisions

- Simplified `existingEntityForResizedSave(persistedRow)`: returns the row whenever `is_resized === true` (rotates in place); returns `undefined` for source rows. Dropped the `newCdnUrl` parameter.
- Kept source-row protection from Session 4 (non-resized rows are never mutated).
- Skipped inline S3 `deleteImageByKey` on rotation; relying on existing `imageShrinkCleanupOrphans` sweeper as the cleanup path now that DB rows rotate correctly.
- Updated tests: dropped `newCdnUrl` arg, added explicit "is_resized + URL differs (rotation case)" → returns row.
- Verified `npm run test:unit` (full monorepo) and `npm run build -w @podverse/workers`.

#### Files Created/Modified

- `apps/workers/src/commands/imageShrink/existingEntityForResizedSave.ts`
- `apps/workers/src/commands/imageShrink/existingEntityForResizedSave.test.ts`
- `apps/workers/src/commands/imageShrink/batch.ts`
