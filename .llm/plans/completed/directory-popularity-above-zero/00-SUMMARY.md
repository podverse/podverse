# Directory popularity above zero — summary

Models and prompts: see `COPY-PASTA.md` once the set is assembled.

Every public directory Top list (Browse global and category lists for channels, episodes, clips,
playlists, and profiles) returns only rows whose count for the chosen range is above zero. An
all-zero range is an empty list, and a short ranked page is not padded with Recent rows. Home
subscribed popularity keeps its current behavior. Mobile Browse gains a Recent sort beside the
range chip, so an empty popularity range is not the only view.

## Requirement ledger

Rows R1–R8 quote the request. Rows R9–R16 quote the operator answers in `00-REQUEST.md`. Rows
R17–R21 quote the review of the first planning pass in `00-REQUEST.md`.

- **R1** (area A) "Investigate how the Browse tab returns content from channels and items" — Plan: 10
- **R2** (area A; mobile half in area D) "how it works with the recent filter or the popularity filter" — Plan: 10, 41
- **R3** (area A) "What happens if everything in the database has zero for the popularity?" — Plan: 10
- **R4** (area A) "Does it fall back to returning the most recent for episodes and/or items and channels?" — Plan: 10
- **R5** (area A) "I suppose if popularity finds only zeros, then we want just recent." — Plan: 10
- **R6** (areas A, B) "maybe we don't want zero to show up at all for popularity" — Plan: 10, 20
- **R7** (area A) "We don't want zero number stats to result in content showing for popularity because it's not useful to just show recent content in that case." — Plan: 10
- **R8** (areas A, B, C, D) "Are there any gaps or work you think needs to be done to meet our criteria?" — Plan: 10, 11, 20, 21, 30, 31, 32, 41
- **R9** (areas A, B) "only counts above zero" — Plan: 10, 20
- **R10** (areas A, B, C, D) "An all-zero range is an empty list." — Plan: 10, 11, 20, 21, 31, 32, 41
- **R11** (area A) "Do not fill a short page with Recent." — Plan: 10, 11
- **R12** (area A) "every public directory Top list — channels, episodes" — Plan: 10, 11
- **R13** (area B) "clips, playlists, and profiles" — Plan: 20
- **R14** (areas A, B) "Home subscribed popularity is out of scope and keeps its current behavior." — Plan: 10, 11, 20
- **R15** (area D) "Add a Recent sort on mobile Browse, matching web" — Plan: 40, 41
- **R16** (areas B, C, D) "so an empty popularity range is not the only view" — Plan: 21, 30, 41
- **R17** (area A, step 06) "Browse Livestreams stay live now, then scheduled, and still include zero-count rows. Live Top does not drop zero-count rows." — Plan: 10, 11
- **R18** (area C, step 07; area D, step 08) "Every Browse list on web and mobile opens on Top for the past week until the user changes that media type." — Plan: 31, 41
- **R19** (area C, step 07) "Web Browse Top shows the existing empty message where that media type already has one." — Plan: 32
- **R20** (area C, step 07) "Add an empty message for web artists and profiles." — Plan: 32
- **R21** (area D, step 08) "Each Browse media type remembers its own sort, as Home does." — Plan: 41

### Notes on the rows

- R5 is settled by the operator answers: an all-zero range is an empty list (R10), and Recent is
  a separate sort the user picks (R15), not a fallback inside Top. Area A answers R1–R4 from the
  code in its plan and plans the change R5–R7 and R9–R11 imply.
- R8 is answered per area: each area plan lists the gaps it found in its own surface.
- R10 has an API half (areas A and B return the empty page) and a display half (areas C and D
  show it on web and mobile).
- R16 found a gap during the split: web public playlists offer Top only.
  `getPlaylistsPageSortOptions` in `apps/web/src/app/playlists/PlaylistsPageDropdownConfig.ts`
  returns only Top for `public`, `reqPlaylistGetMany` in
  `packages/helpers-requests/src/api/playlist/playlist.ts` always calls `/playlist/public/top` for
  `type: 'public'`, and `apps/api/src/routes/playlist.ts` has no `/public/recent`. Matching web on
  mobile would leave playlists with no Recent view. Area B decides whether to add a public
  playlists Recent read and records the choice under Decisions; areas C and D build on it.

## Scope defaults for planners

- "Public directory Top list" means the Browse global and category Top reads. Subscribed Top
  (channels, items, clips, profiles) keeps padding and its current zero handling (R14).
- Per-channel and per-item Top lists on detail pages (`ItemController.getManyByChannelTop`,
  `ClipController.getManyByChannelPublicTop`, `getManyByItemPublicTop`) were not named by the
  operator. Keep them unchanged unless the code forces otherwise, and record the choice under
  Decisions.
- Live items: `LiveItemController.getManyGlobalTop` / `getManyCategoryTop` delegate to the item
  filler. Area A states whether they follow the item change and records it under Decisions.
- An empty Top range on web and mobile uses each surface's existing empty-list chrome. New copy
  for it is a Decision for review, not a default, so areas C and D do not both add catalog keys.

## Areas

### Area A — API channel and item directory Top

- **Rows:** R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R14
- **Starts from:** `packages/helpers/src/lib/topListFill.ts` (`fillTopPage`, `planTopPageFill`)
  and its test; `apps/api/src/controllers/channel.ts` (`loadFilledTopChannels`, `getManyGlobalTop`,
  `getManyCategoryTop`, `getManySubscribedTop`); `apps/api/src/controllers/item.ts`
  (`loadFilledTopItems`, `getManyGlobalTop`, `getManyCategoryTop`, `getManySubscribedTop`,
  `getManyByChannelTop`); `apps/api/src/controllers/liveItem.ts`;
  `packages/orm/src/services/stats/popularity/statsPopularityChannel.ts` and
  `statsPopularityItem.ts` (`minCountField`); `apps/api/src/test/category-channel-item-read.test.ts`;
  `docs/features/POPULARITY-AND-TASTE-PROFILE.md` § Public range sorts.
- **Depends on:** none.
- **Shared files:** owns `docs/features/POPULARITY-AND-TASTE-PROFILE.md` for all five list types;
  area B does not edit it. Area B may read but should not edit `topListFill.ts`.
- **Plan block:** 10–19

### Area B — API clip, playlist, and profile public Top

- **Rows:** R6, R8, R9, R10, R13, R14, R16
- **Starts from:** `apps/api/src/controllers/clip.ts` (`getManyPublicTop`,
  `getManyByCategoryPublicTop`); `apps/api/src/controllers/playlist/playlist.ts`
  (`getManyPublicTop`); `apps/api/src/controllers/account/account.ts` (`getManyPublicTop`);
  `packages/orm/src/services/stats/popularity/statsPopularityClip.ts`,
  `statsPopularityPlaylist.ts`, `statsPopularityAccount.ts`; `apps/api/src/routes/playlist.ts`;
  `packages/helpers-requests/src/api/playlist/playlist.ts` (`reqPlaylistGetMany`) for the public
  playlists Recent gap.
- **Depends on:** none.
- **Shared files:** owns `packages/helpers-requests/src/api/playlist/playlist.ts` and any new
  public playlists Recent route, service, and OpenAPI entry; areas C and D consume them. API test
  files for clip, playlist, and account Top.
- **Plan block:** 20–29

### Area C — Web Browse Top empty range and playlists Recent

- **Rows:** R8, R10, R16
- **Starts from:** `apps/web/src/app/browse/page.tsx`; the `_media-lists/*/…PageClient` and
  `…ListSsr` files for podcasts, episodes, clips, artists, albums, tracks;
  `apps/web/src/app/playlists/PlaylistsPageDropdownConfig.ts` and `playlistsListSsr.ts`;
  `apps/web/src/app/profiles/`; web Playwright specs that cover Browse Top and the E2E seed's
  popularity rows.
- **Depends on:** areas A and B (steps 02, 03). Web E2E expectations follow the API behavior
  those plans set, and the playlists Recent sort uses area B's route if B adds it.
- **Shared files:** E2E seed scripts (also possibly area D); i18n catalogs only if a Decision adds
  copy.
- **Plan block:** 30–39

### Area D — Mobile Browse Recent sort and empty Top range

- **Rows:** R2 (mobile half), R8, R10, R15, R16
- **Starts from:** `apps/mobile/src/screens/browse/BrowseSortChip.tsx`, `browseFeedData.ts`
  (`fetchBrowseFeedRows`, every type sends `sort: 'top'`), `browseListPrefs.ts`
  (`BrowseListPrefs`, `BROWSE_ROOT_SCOPE`), `browseTypes.ts`, `BrowseScreen.tsx`, their unit tests,
  and the Browse Maestro flows under `apps/mobile/e2e/`. Web parity source:
  `apps/web/src/app/_media-lists/podcasts/PodcastsPageDropdownConfig.ts` and siblings.
- **Depends on:** areas A and B (steps 02, 03). Playlists Recent uses area B's request helper if
  B adds it; seeded Maestro expectations follow the API behavior A and B set.
- **Shared files:** `packages/helpers` sort-pref scope or value types if the Browse sort needs a
  new field (shared with web's key builder); E2E seed scripts (also possibly area C); i18n
  catalogs only if a Decision adds copy.
- **Plan block:** 40–49

## Waves

| Wave | Step | Area | Rows | Planning model |
| --- | --- | --- | --- | --- |
| 1 | 02 | A — API channel and item directory Top | R1–R12, R14 | Opus 5.5 · high |
| 1 | 03 | B — API clip, playlist, and profile public Top | R6, R8–R10, R13, R14, R16 | Opus 5.5 · high |
| 2 | 04 | C — Web Browse Top empty range and playlists Recent | R8, R10, R16 | Cursor Grok 4.7 · high |
| 2 | 05 | D — Mobile Browse Recent sort and empty Top range | R2, R8, R10, R15, R16 | Opus 5.5 · high |

## Order

- First planning pass: wave 1 plans the API behavior (areas A and B, no shared files). Wave 2
  plans the web and mobile consumers on top of those plans.
- Second pass, after the first review: step 06 revises plans 10 and 11 so live-item Top keeps zero-count rows (R17). Step 07 revises plans 30 and 31, adding plans from 32 as needed, for web Browse opening on Top for the week, empty Top messages, and the E2E seed (R18, R19, R20). Steps 06 and 07 share no plans and run together. Step 08 runs after step 07, because it builds on the seed rows step 07 settles; it revises plan 41, and plan 40 if needed, for mobile Browse opening on Top for the week with a saved sort per media type (R18, R21). Plan 21's description of web playlists was fixed by hand: web public playlists already open on Top for the week.
- Assembled: five implementation phases (10 and 40; 20 and 31; 21 and 32; 30, 11, and 41; Close). See `00-EXECUTION-ORDER.md`.

## Decisions to review

First planning pass. Each item gives the choice made, the main alternative, and its step and plan.
The operator's answers, which settle every item, are in `00-REQUEST.md` § Review of the first
planning pass. D1, D8, D9, D10, and D11 changed and D14 was added; the rest stand as planned.

### Area A — API channel and item directory Top (step 02)

- **D1** (step 02, plan 10) Live items follow the item change: `/live-item/global/top` and `/live-item/category/top` hand off to the item handlers, so they become ranked-only with no extra code. No web or mobile screen calls them today. Alternative: keep padding for live items through a separate path.
- **D2** (step 02, plan 10) A channel's episode Top keeps padding (`/item/channel/top/:id`, the Top sort on podcast and album pages and embeds). A show with no listens in the range still lists its episodes. Alternative: ranked-only there too, which shows an empty episode list for shows with no listens.

### Area B — API clip, playlist, and profile public Top (step 03)

- **D3** (step 03, plan 21) Add a public playlists Recent read (`/playlist/public/recent`). Only Recent is added, not Oldest or A–Z. Alternative: keep public playlists Top-only and accept an empty list when every count is zero.
- **D4** (step 03, plan 21) Public playlists Recent orders by `last_updated`, the same as owner Recent, because playlists have no `created_at`. Alternative: a migration that adds `created_at` for true creation order.
- **D5** (step 03, plan 20) Per-podcast and per-episode clip Top (`/clip/public/channel/top/...`, `/clip/public/item/top/...`) still include zero-count rows. Channel clip Top shares `getManyByChannelsAndCountPublic` with subscribed clip Top, which must not change. Alternative: an opt-in minimum on that read for the detail-page lists only.
- **D6** (step 03, plan 20) Owner and followed playlist Top (`/playlist/private/top`, `/playlist/private/followed/top`) are unchanged, because they are personal lists and not the public directory. Alternative: drop zero-count rows there too.
- **D7** (step 03, plan 21) Public playlist Top responses gain `last_updated` (already on `DTOPlaylist`), and `meta` gains `count: null` and `limit`. Alternative: leave the Top response as it is and give only Recent the fuller shape.

### Area C — Web Browse Top empty range and playlists Recent (step 04)

- **D8** (step 04, plan 30) Web public playlists still open on Top / Week. Recent is added to the menu, and the page resolvers keep passing `top`. Alternative: open on Recent, as the other Browse lists do and as plan 21's note assumed.
- **D9** (step 04, plan 31) An empty web directory Top page stays a blank list, with no new message and no use of the existing "No Podcasts Found" style strings. Alternative: show those catalog strings in the info block livestreams use (artists and profiles have no such string).

### Area D — Mobile Browse Recent sort and empty Top range (step 05)

- **D10** (step 05, plan 41) Mobile Browse opens on Recent, matching web's `defaultGlobalSort: 'recent'`. Installs that saved only a Top window also open on Recent, and choosing Top restores that window. Alternative: keep Top as the default, or keep it for installs that already saved a window (this also breaks the seeded Browse Maestro rows once plan 10 lands).
- **D11** (step 05, plan 41) One Browse sort for every media type, saved in the root `sort.browse` entry like range and category. Alternative: a separate saved sort per media type, as Home does.
- **D12** (step 05, plan 41) The ranked option is labelled "Top" (`filters.sort.top`, web's wording). Alternative: "Popularity", which mobile Home's chip uses.
- **D13** (step 05, plan 41) An empty mobile Top window reuses Browse's existing "Nothing to Show Yet", with no new catalog key. Alternative: a Top-specific message that points the user to Recent.

### Reviewer notes

- D8 and D10 differ: web public playlists open on Top / Week, while mobile Browse (including playlists) opens on Recent. If the answer to D8 is "open on Recent", plan 30 also changes `playlistsListSsr.ts`, `playlists/page.tsx`, `PlaylistsPageChipRow.tsx`, and the Playlists specs that expect `Sort: Week`.
- Plan 21's release-scratchpad entry says web public playlists already default to Recent and will load Recent after the helper change. Under D8 they do not; that entry needs correcting in the second pass whichever way D8 goes.
- D9 and D13 both keep existing empty-list chrome with no new copy, which matches the split's default. Answering either with "add a message" adds catalog keys on both surfaces.
