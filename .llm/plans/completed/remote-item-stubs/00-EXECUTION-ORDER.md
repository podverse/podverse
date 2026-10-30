# Remote item stubs — execution order

Prompts and models: [COPY-PASTA.md](COPY-PASTA.md). Request and settled review answers:
[00-REQUEST.md](00-REQUEST.md). Ledger and decisions: [00-SUMMARY.md](00-SUMMARY.md).

Phases run one after another. Prompts inside one phase run at once and own disjoint files. Only
prompts 11 and 46 write `release-notes/scratchpad.md`, because each runs alone in its phase. Every
other prompt puts its entry in its final message under "Release notes entry", and prompt 46, which
runs alone last, appends them all.

Docker must be running for phase 2: plan 11 adds the app migration and regenerates the linear
baseline archives.

## Why nine phases

The spine is the storage model (11), then the resolver and read path (20, 31), then the Add by RSS
API (40), then the search-detail components (41, 43), then the list rows (50, 60), then the
channel remote item sections (52, 62), then the Add by RSS lists that reuse their label (45, 46).
Area G's chain (70, 71, 72, 73) and the fixtures (61) fit beside that spine.

## Dependency graph

From each plan's `## Runs after`. Rows marked "ordering" also wait for a plan because Close chose
that order for a shared file or key.

| Plan | Runs after |
| --- | --- |
| 10 index provider | none |
| 11 remote stub storage | 10 |
| 20 parser remote stub path | 10, 11 |
| 30 remote item reference matching | none; ordering: before 11, which edits the same DTO file and ORM index |
| 31 stub-backed remote item responses | 11, 30 |
| 32 channel remote item list endpoint | 31 |
| 40 Add by RSS remote item API | 10, 11, 20 |
| 41 web generic search detail | 40 |
| 42 web Add by RSS search detail | 40, 41 |
| 43 mobile generic search detail | 40 |
| 44 mobile Add by RSS search detail | 43 |
| 45 web Add by RSS remote lists | 31, 40, 41, 42, 52 |
| 46 mobile Add by RSS remote lists, closes the set | 31, 40, 43, 44, 62 |
| 50 web podroll stub rows | 31, 40; ordering: after 61, which edits the same seed files |
| 51 web artist album stub rows | 31, 40, 50 |
| 52 web channel remote item list | 32, 40, 50 |
| 60 mobile stub rows in podroll and artist albums | 31, 43 |
| 61 E2E podroll and remote list fixtures | 31 |
| 62 mobile channel remote items section | 32, 52, 60, 61 |
| 70 remote stub merge handling | 10, 11, 20 |
| 71 remote stub admin jobs | 11, 20, 70 |
| 72 management remote stubs API | 71 |
| 73 management-web remote stubs pages | 72 |

## Phases

| Phase | Prompts | Model and reasoning |
| --- | --- | --- |
| 1 | 10, 30 | Codex 5.3 high |
| 2 | 11 | Opus 5.5 high |
| 3 | 20, 31 | 20 Opus 5.5 high; 31 Codex 5.3 high |
| 4 | 40, 61, 70 | 40 Codex 5.3 high; 61 Cursor Grok 4.7 high; 70 Opus 5.5 high |
| 5 | 32, 41, 43, 71 | 32, 41, 43 Cursor Grok 4.7 high; 71 Codex 5.3 high |
| 6 | 42, 44, 50, 60, 72 | 42, 44, 50, 72 Cursor Grok 4.7 high; 60 Cursor Grok 4.7 extra high |
| 7 | 51, 52, 73 | Cursor Grok 4.7 high |
| 8 | 45, 62 | 45 Cursor Grok 4.7 high; 62 Cursor Grok 4.7 extra high |
| 9 | 46 | Cursor Grok 4.7 high |

## File ownership per phase

Each prompt owns exactly the files in its plan's `## Files`, minus `release-notes/scratchpad.md`
in phases with several prompts.

### Phase 1

- **10:** `packages/helpers/src/lib/indexProvider.ts`, `packages/helpers/src/index.ts`,
  `packages/external-services-podcast-index/src/` (`index.ts`, `podcastIndexProvider.ts`, its
  test), `apps/api/src/factories/indexProvider.ts`, `apps/workers/src/factories/indexProvider.ts`.
- **30:** `packages/helpers/src/dtos/remoteItem.ts`,
  `packages/orm/src/services/remoteItemReference/`, `packages/orm/src/services/channel/channelPodroll.ts`,
  `packages/orm/src/services/publisherFeed.ts`, `packages/orm/src/index.ts`.

### Phase 3

- **20:** `packages/parser/src/` (context, factory, index, `lib/rss/remoteItemRefs*`,
  `lib/rss/remoteItemStubs*`, `remoteItemParser.ts`, `parser.ts`, the four parser tests),
  `apps/workers/.env.example`, `apps/workers/ENV.md`.
- **31:** `packages/helpers/src/dtos/remoteItem.ts`, `apps/api/src/lib/remoteItems.ts` and its
  test, `apps/api/src/controllers/podroll.ts`, `apps/api/src/controllers/publisherFeed.ts`,
  `apps/api/src/lib/e2eArtistAlbumsFixture.ts`, the three API tests, `apps/api/openapi.yml`,
  `tools/web/seed-e2e.mjs`.

### Phase 4

- **40:** the helpers DTO, `dtos/index.ts`, and `appRoutes`; the helpers-requests Add by RSS
  remote item module and `_request.ts`; the API Add by RSS remote item controller, fixture,
  `accountAddByRSSParse.ts`, `routes/account.ts`, config, startup validation, `.env.example`,
  `ENV.md`; `infra/k8s/base/api/source/api.env`; `dev/env-overrides/local/rate-limit.env.example`;
  `scripts/local-env/setup.sh`; `apps/api/openapi.yml`; two API tests; the parser-mapping
  `addByRSS/remoteItemRefs` module and index; the four consumer i18n originals.
- **61:** `tools/web/seed-e2e.mjs`, `apps/web/e2e/helpers/seedConstants.ts`.
- **70:** `packages/orm/src/services/remoteStub/remoteChannelStub.ts` and its test,
  `apps/workers/src/commands/podcastIndex/deadFeeds/` (`remoteStubMerges*`, `flagAndMerge.ts`),
  `apps/workers/.env.example`, `apps/workers/ENV.md`, `infra/k8s/base/workers/source/workers.env`,
  `packages/worker-commands/src/registry.ts`.

### Phase 5

- **32:** the API remote item controller, route, `app.ts`, `apps/api/openapi.yml`, two API tests,
  the helpers-requests remote item module, `_request.ts`, `feedContentApiPathPrefixes.ts`.
- **41:** `apps/web/src/components/SearchDetail/`, `apps/web/src/components/PodcastIndex/PodcastIndexFeedInfo.tsx`,
  and both SCSS modules.
- **43:** `apps/mobile/src/components/searchDetail/SearchDetailView.tsx`,
  `apps/mobile/src/screens/search/PodcastIndexFeedPreviewScreen.tsx`, `podcastIndexFeedPreview.ts`
  and its test, `apps/mobile/src/navigation/searchResultDetailParams.ts` and its test,
  `apps/mobile/src/navigation/index.tsx`.
- **71:** `packages/orm/src/services/remoteStub/remoteStubJobScheduler.ts` and its test,
  `packages/orm/src/index.ts`, `apps/workers/src/lib/remoteStubs/`,
  `apps/workers/src/commands/orm/scheduledJob/runDue.ts` and its test.

### Phase 6

- **42:** `apps/web/src/constants/routes.ts`, `apps/web/src/utils/addByRSS/remoteFeedPath*`,
  `apps/web/src/hooks/useAddByRSSAddFeedFlow.ts`, `apps/web/src/app/add-by-rss/add/AddByRSSAddFeedPageClient.tsx`,
  `apps/web/src/app/add-by-rss/remote-feed/`, `apps/web/e2e/add-by-rss-remote-feed.spec.ts`.
- **44:** `apps/mobile/src/screens/home/addByRss/addByRssStackParams.ts`,
  `apps/mobile/src/screens/rss/AddByRssRemoteFeedScreen.tsx`, `apps/mobile/src/navigation/index.tsx`.
- **50:** `apps/web/src/components/Content/remoteItemStubRow.ts`,
  `apps/web/src/components/Content/Podroll/` (four files), the podcast, artist, and album page
  clients, `apps/api/src/lib/e2eArtistAlbumsFixture.ts`,
  `apps/api/src/controllers/externalServices/podcastIndex.ts`,
  `apps/api/src/test/e2e-artist-albums-fixture.test.ts`, `tools/web/seed-e2e.mjs`,
  `apps/web/e2e/helpers/seedConstants.ts`, `apps/web/e2e/podcast-podroll-stubs.spec.ts`,
  `makefiles/local/e2e-spec-order-web.txt`.
- **60:** `apps/mobile/src/lib/remoteItems/`, `apps/mobile/src/components/content/RemoteItemListRow.tsx`
  and `index.ts`, `apps/mobile/src/hooks/useOpenRemoteItemListEntry.ts`,
  `PodcastPodrollSection.tsx`, `AlbumDetailScreen.tsx`, `ArtistDetailScreen.tsx`.
- **72:** the management-api remote stub schema, app-db lib and its test, route, `routes/feeds.ts`,
  route test, `apps/management-api/openapi.yml`, `packages/management-api-requests/src/feeds.ts`.

### Phase 7

- **51:** `apps/web/src/components/List/Music/Albums/` (three files),
  `apps/web/src/app/artist/[channel_id]/` (`ArtistPageAlbumSections.tsx`, `ArtistPageList.tsx`,
  `ArtistPageClient.tsx`).
- **52:** `packages/helpers-requests/src/api/queryParams.ts`, the four consumer i18n originals,
  `apps/web/src/components/Content/RemoteItems/`, the podcast and album page files it lists,
  `apps/web/e2e/channel-remote-item-list.spec.ts`, `makefiles/local/e2e-spec-order-web.txt`.
- **73:** `apps/management-web/` (routes, permissions, Feeds hub, the two remote-stub pages, the
  E2E spec), the four management i18n originals, `tools/management-web/seed-e2e.mjs`,
  `makefiles/local/e2e-spec-order-management-web.txt`.

### Phase 8

- **45:** `apps/web/src/utils/addByRSS/remoteItemRefs*`, `apps/web/src/hooks/useAddByRSSRemoteItemList.ts`,
  `apps/web/src/components/AddByRSS/RemoteItems/`, the Add by RSS podcast, album, and artist list
  headers and clients, `apps/web/e2e/add-by-rss-remote-items.spec.ts`,
  `makefiles/local/e2e-spec-order-web.txt`.
- **62:** `apps/mobile/src/prefs/detailListPrefs.ts`, `podcastSections.ts` and its test,
  `sectionChromeFlags.ts` and its test, `offlineModeViews.ts` and its test,
  `apps/mobile/src/screens/podcast/sections/` (`RemoteItemListPane.tsx`,
  `PodcastPodrollSection.tsx`, `PodcastRemoteItemsSection.tsx`, `index.ts`),
  `PodcastDetailScreen.tsx`, `AlbumDetailScreen.tsx`, the four consumer i18n originals,
  `apps/mobile/e2e/remote-item-stubs.yaml`.

## Shared files and who edits them, in order

| File | Plans, in phase order |
| --- | --- |
| `packages/helpers/src/dtos/remoteItem.ts` | 30, 11, 31 |
| `packages/orm/src/index.ts` | 30, 11, 71 |
| `packages/orm/src/services/remoteStub/remoteChannelStub.ts` and its test | 11 (creates), 70 |
| `infra/k8s/base/api/source/api.env` | 11, 40 |
| `apps/workers/.env.example`, `apps/workers/ENV.md` | 20, 70 |
| `apps/api/openapi.yml` | 31, 40, 32 |
| `packages/helpers-requests/src/api/_request.ts` | 40, 32 |
| `tools/web/seed-e2e.mjs` | 31, 61, 50 |
| `apps/web/e2e/helpers/seedConstants.ts` | 61, 50 |
| `apps/api/src/lib/e2eArtistAlbumsFixture.ts`, `apps/api/src/test/e2e-artist-albums-fixture.test.ts` | 31, 50 |
| `apps/mobile/src/navigation/index.tsx` | 43, 44 |
| `PodcastPodrollSection.tsx`, `AlbumDetailScreen.tsx` (mobile) | 60, 62 |
| `apps/web/src/app/artist/[channel_id]/ArtistPageClient.tsx` | 50, 51 |
| `PodcastPageClient.tsx`, `AlbumPageClient.tsx` (web) | 50, 52 |
| `makefiles/local/e2e-spec-order-web.txt` | 50, 52, 45 |
| Consumer i18n originals (`packages/i18n-catalog/consumer/originals/*.json`) | 40, 52, 62 |
| `apps/mobile/src/prefs/detailListPrefs.ts` | 62, 46 |
| `release-notes/scratchpad.md` | 11, 46 (46 also appends every other prompt's entry) |

Every later editor of a shared file makes targeted insertions and keeps the earlier plans' edits.

## Choices Close made

- **One label for the channel remote item list.** Plan 52 adds `info.remote_items` as "Remote
  Items", the operator's own name for the list in the review. Plan 62 reuses it instead of adding
  "From Other Feeds", adds only `info.no_remote_items_found`, and runs after plan 52.
- **Fixture ids.** Plan 61's two fixture feeds use Podcast Index ids 876543227 and 876543228. Plan
  73's management seed writes stubs with 876543250–876543252 into the same app database.
- **Two fixture sets stay.** Plan 50's channels (`e2eRmtItmCh01`, `e2eRmtItmAl01`) hold stub-only
  lists for the web specs. Plan 61's channels (`e2ePodroll0001`, `e2eRemoteList01`) hold parsed
  rows beside stubs for the mobile flow. They test different things, so neither replaces the other.
- **`unparsedPodcastIndexFeedTarget`** in `@podverse/helpers` may lose every caller after plans 51
  and 60. No plan removes it; prompt 46 reports whether any caller remains.
