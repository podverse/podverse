# Directory popularity above zero — execution order

Prompts and models: [COPY-PASTA.md](COPY-PASTA.md). Request and settled review answers:
[00-REQUEST.md](00-REQUEST.md). Ledger and decisions: [00-SUMMARY.md](00-SUMMARY.md).

Phases run one after another. Prompts inside one phase run at once and own disjoint files. No
implementation prompt writes `release-notes/scratchpad.md`; each puts its entry in its final
message under "Release notes entry", and Close, which runs alone last, appends them all.

No plan adds a migration or a dependency, so no prompt needs Docker and there is no lockfile step.

## Why five phases

`apps/api/openapi.yml` is edited by plans 10, 20, and 21, so each of those needs its own phase.
Plan 21 also follows plan 20 on the playlist controller, the playlist popularity service, and
`playlist.test.ts`. On web, plan 31 creates `browse-directory-top.spec.ts` and rewrites the E2E
seed; plan 32 extends that spec, and plan 30 follows both on `media-list-chips.spec.ts`. Plan 41
needs the API behavior (10, 20, 21), plan 31's seed rows, and plan 40's chip. The last phase runs
three prompts at once, so Close is its own phase.

## Dependency graph

From each plan's `## Runs after`. Rows marked "ordering" also wait for a plan because Close chose
that order for a shared file.

| Plan | Runs after |
| --- | --- |
| 10 API channel and item directory Top ranked-only | none |
| 11 docs: public range sorts above zero | 10, 20, 21 |
| 20 API clip, playlist, profile Top above zero | none; ordering: 10, for `apps/api/openapi.yml` |
| 21 API public playlists Recent | 20 |
| 30 web public playlists Recent sort | 21, 32 |
| 31 web Browse opens on Top / Week, E2E seed | 10 |
| 32 web Browse empty list messages | 20, 31 |
| 40 mobile shared two-step sort chip | none |
| 41 mobile Browse Recent sort, Top / Week, sort per media type | 10, 20, 21, 31, 40 |
| Close | every plan |

## Shared files and who edits them, in order

| File | Plans, in phase order |
| --- | --- |
| `apps/api/openapi.yml` | 10, 20, 21 |
| `apps/api/src/controllers/playlist/playlist.ts` | 20, 21 |
| `packages/orm/src/services/stats/popularity/statsPopularityPlaylist.ts` | 20, 21 |
| `apps/api/src/test/playlist.test.ts` | 20, 21 |
| `apps/web/e2e/browse-directory-top.spec.ts` | 31 (creates), 32 |
| `apps/web/e2e/media-list-chips.spec.ts` | 31, 30 |
| `tools/web/seed-e2e.mjs` | 31 only; plans 30, 32, and 41 rely on its seeded week counts |
| `release-notes/scratchpad.md` | Close only |

## Phase 1 — 10 and 40

- **10** owns `apps/api/src/controllers/channel.ts`, `apps/api/src/controllers/item.ts`,
  `apps/api/src/test/category-channel-item-read.test.ts`, and `apps/api/openapi.yml`.
- **40** owns `apps/mobile/src/components/form/ListSortChip.tsx` (new),
  `apps/mobile/src/components/form/index.ts`, and `apps/mobile/src/screens/home/HomeSortChip.tsx`.
  Contract for plan 41: `ListSortChip` exported from the mobile form components barrel.

## Phase 2 — 20 and 31

- **20** owns `packages/orm/src/services/stats/popularity/statsPopularityClip.ts`,
  `statsPopularityPlaylist.ts`, `statsPopularityAccount.ts`, `apps/api/src/controllers/clip.ts`,
  `apps/api/src/controllers/playlist/playlist.ts`, `apps/api/src/controllers/account/account.ts`,
  `apps/api/openapi.yml`, `apps/api/src/test/stats-popularity-readers.integration.test.ts`,
  `apps/api/src/test/clip.test.ts`, `apps/api/src/test/playlist.test.ts`, and
  `apps/api/src/test/account-follows-notifications.test.ts`.
- **31** owns `apps/web/src/utils/dropdownMenuItems.ts` and its test, the Podcasts, Episodes,
  Tracks, Artists, and Albums `…PageDropdownConfig` files and `…ListSsr.ts` files under
  `apps/web/src/app/_media-lists/` (plus `clipsListSsr.ts`), `apps/web/src/app/profiles/`
  (`ProfilesPageDropdownConfig.ts`, `profilesListSsr.ts`, `ProfilesPageContext.tsx`, `page.tsx`),
  `tools/web/seed-e2e.mjs`, `apps/web/e2e/media-list-chips.spec.ts`,
  `apps/web/e2e/browse-directory-top.spec.ts` (new), and `makefiles/local/e2e-spec-order-web.txt`.
  Contract for plans 30, 32, and 41: the four seeded week counts in plan 31.

## Phase 3 — 21 and 32

- **21** owns `packages/orm/src/services/playlist/publicPlaylistListSelect.ts` (new),
  `packages/orm/src/services/playlist/playlist.ts`, `statsPopularityPlaylist.ts`,
  `apps/api/src/controllers/playlist/playlist.ts`, `apps/api/src/routes/playlist.ts`,
  `apps/api/openapi.yml`, `apps/api/src/lib/docs/registerSwaggerDocs.test.ts`,
  `packages/helpers-requests/src/api/playlist/playlist.ts`, `apps/api/src/test/playlist.test.ts`,
  and `apps/api/src/test/playlist-public-recent.integration.test.ts` (new). Contract for plans 30
  and 41: `reqPlaylistGetMany` with `type: 'public'` and `sort: 'recent'` calls
  `/playlist/public/recent`.
- **32** owns `apps/web/src/utils/mediaListChips.ts` and its test, the eight Browse
  `…PageList.tsx` files (Podcasts, Episodes, Clips, Artists, Albums, Tracks, Playlists, Profiles),
  the four consumer catalog originals (`en-US`, `es`, `fr`, `el-GR`), and
  `apps/web/e2e/browse-directory-top.spec.ts`.

## Phase 4 — 30, 11, and 41

- **30** owns `apps/web/src/app/playlists/PlaylistsPageDropdownConfig.ts` and
  `apps/web/e2e/media-list-chips.spec.ts`.
- **11** owns `docs/features/POPULARITY-AND-TASTE-PROFILE.md`.
- **41** owns `packages/helpers/src/lib/browseListScope.ts` and its test (new),
  `packages/helpers/src/index.ts`, `apps/mobile/src/screens/browse/` (`browseTypes.ts` and its
  test, `browseListPrefs.ts` and its test, `browseFeedData.ts`, `BrowseSortChip.tsx`,
  `BrowseScreen.tsx`), `apps/mobile/e2e/browse.yaml`, and
  `docs/development/mobile/MOBILE-PERF-BASELINES.md`. Its plan lists
  `release-notes/scratchpad.md`; in this phase it puts the entry in its final message instead.

## Phase 5 — Close

Appends the release entries of plans 10, 20, 31, 21, 32, 30, and 41 in that order (plans 11 and
40 have none), archives the set, and ends with the cumulative verification.
