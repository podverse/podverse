# Directory popularity above zero

## Request

Investigate how the Browse tab returns content from channels and items, how it works with the recent filter or the popularity filter. What happens if everything in the database has zero for the popularity? Does it fall back to returning the most recent for episodes and/or items and channels? I suppose if popularity finds only zeros, then we want just recent. I am thinking also that maybe we don't want zero to show up at all for popularity. We don't want zero number stats to result in content showing for popularity because it's not useful to just show recent content in that case. Are there any gaps or work you think needs to be done to meet our criteria?

## Operator answers

- When a popularity list has no count above zero for the chosen range, or only a short set of counts above zero: only counts above zero. An all-zero range is an empty list. Do not fill a short page with Recent.
- Which lists follow that rule: every public directory Top list — channels, episodes, clips, playlists, and profiles. Home subscribed popularity is out of scope and keeps its current behavior.
- Mobile Browse has no Recent sort today. Add a Recent sort on mobile Browse, matching web, so an empty popularity range is not the only view.

### Review of the first planning pass

Answers to D1–D13 in `00-SUMMARY.md` § Decisions to review, plus one new item (D14).

Changed from the first pass:

- **D1:** "Browse Livestreams stay live now, then scheduled, and still include zero-count rows. Live Top does not drop zero-count rows." Live-item global and category Top keep their current behavior instead of following the item change.
- **D8 and D10:** "Every Browse list on web and mobile opens on Top for the past week until the user changes that media type." This applies to every Browse media type on both surfaces, not only public playlists.
- **D9:** "Web Browse Top shows the existing empty message where that media type already has one."
- **D14 (new):** "Add an empty message for web artists and profiles."
- **D11:** "Each Browse media type remembers its own sort, as Home does."

Confirmed as planned:

- **D2:** "A podcast or album page episode Top still lists episodes when none have listens."
- **D3:** "Add a Recent sort for public playlists. Only Recent, not Oldest or A-Z."
- **D4:** "Order public playlists Recent by last updated."
- **D5:** "Podcast and episode clip Top keeps zero-count clips. Detail pages and subscribed lists keep zero-count rows. Browse drops rows with no listens."
- **D6:** "Your own playlists and playlists you follow keep zero-count rows."
- **D7:** "Public playlist Top and Recent share the fuller response: last updated, page size, and a null total count."
- **D12:** "The ranked option is labelled Top."
- **D13:** "Mobile empty Top reuses Nothing to Show Yet."

Out of scope for this set (the operator said to leave them out):

- Fetching one public playlist returns the owner account record.
- The API docs say the public profile lists require login.

## Glossary

- Browse tab: web `/browse` and the mobile Browse tab. Both are public directory lists, not Home subscriptions.
- Popularity filter: web sort Top, and mobile Browse's range chip (day, week, month, all-time), which calls the Top endpoints.
- Recent filter: web sort Recent. Mobile Browse does not offer it yet; this set adds it.

## Orientation

- `packages/helpers/src/lib/topListFill.ts` — `fillTopPage` / `planTopPageFill`. Ranked count 0 returns the recent page. A short ranked page (500 ranked rows or fewer) is padded with recent rows. Page size is `PAGINATION.DEFAULT_LIMIT` (60).
- `apps/api/src/controllers/channel.ts` — `loadFilledTopChannels` uses `fillTopPage` for global, category, and subscribed Top. Ranked reads pass `minCountField` so `MoreThan(0)` already drops zero counts before the pad.
- `apps/api/src/controllers/item.ts` — `loadFilledTopItems` is the same filler for global, category, and subscribed item Top. `LiveItemController.getManyGlobalTop` delegates here.
- `packages/orm/src/services/stats/popularity/statsPopularityChannel.ts` and `statsPopularityItem.ts` — `minCountField` applies `MoreThan(0)`.
- `apps/api/src/controllers/clip.ts` `getManyPublicTop`, `apps/api/src/controllers/playlist/playlist.ts` `getManyPublicTop`, `apps/api/src/controllers/account/account.ts` `getManyPublicTop` — no `fillTopPage` and no `MoreThan(0)`. Zero-count rows are returned, ordered by the range count then entity id. No recent fallback.
- `packages/orm/src/services/stats/popularity/statsPopularityClip.ts`, `statsPopularityPlaylist.ts`, `statsPopularityAccount.ts` — public Top reads with no minimum count.
- `docs/features/POPULARITY-AND-TASTE-PROFILE.md` § Public range sorts — documents the channel/item pad and that clip, playlist, and profile lists do not pad.
- `apps/web/src/app/_media-lists/podcasts/PodcastsPageDropdownConfig.ts` — Browse sort options are Recent and Top. `defaultGlobalSort` is `recent`. Episodes, clips, artists, albums, tracks, playlists, and profiles have the same pair on web.
- `apps/mobile/src/screens/browse/browseFeedData.ts` — every sortable Browse type always sends `sort: 'top'` plus the range. Livestreams are upcoming live items and are not a popularity list.
- `apps/mobile/src/screens/browse/BrowseSortChip.tsx` — range only. No Recent option.
- `apps/api/src/test/category-channel-item-read.test.ts` — expects global Top to pad recent after a short ranked page, and to return recent when no ranked rows exist.
- `packages/helpers/src/lib/topListFill.test.ts` — expects the recent fallback and the hybrid pad.
