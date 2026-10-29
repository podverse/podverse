# Remote item stubs — summary

Request: [00-REQUEST.md](00-REQUEST.md). Models and run order: see `COPY-PASTA.md` once Close
writes it.

**Stub** (or **remote stub**) means a minimal placeholder row for a remote item's feed, and
optionally its item, that has not been fully parsed. A stub exists only when the index provider
knows the feed.

## Requirement ledger

A row may name several areas when the ask spans surfaces; each named area plans its own part.

- **R1** (area A) "Investigate how Podverse handles when a feed has remote items and the remote items are not parsed and saved yet." — Plan: 11
- **R2** (areas C, E, F) "we want these to still display in lists" — Plan: 30, 31, 32, 50, 51, 52, 60, 61, 62
- **R3** (area B) "we don't necessarily want to parse and save them to the database yet. We would rather a user manually add that feed to our database." / "We are trying to conserve database storage unless a user actually wants it added to our database. So, we want it to be a more manual opt-in process." — Plan: 20
- **R4** (area A) "I think this is a gap in our mobile and web experience so far." (confirm or correct from the code) — Plan: 11
- **R5** (area B) "some remote items will not contain any information about the remote item except for the feed ID or the feed URL. There may be extra parameters possible, but we don't necessarily want to use them because we may need more information." — Plan: 20
- **R6** (areas E, F) "if a user were to click one of these reference remote items that are not in our system yet, we would want them to be automatically navigated to the podcast, the corresponding podcast index page for that feed ID or feed URL, et cetera, by a lookup in the podcast index." — Plan: 50, 51, 52, 60, 62
- **R7** (area A) "I am wondering if we should have a special table that is dedicated to just the minimal information needed for remote items, or if we should just flag something in our normal tables." / Operator: "Let the planner recommend after researching, and flag it for operator review." — Plan: 11
- **R8** (area B) "a special parse operation for reference items that only parses and saves the bare minimum needed for those reference items to display in a list. As a row with the content you would expect from a normal item that is fully parsed." — Plan: 20
- **R9** (area A) "we just need to flag those rows in our database so we know that those are basically placeholders and not yet fully parsed." — Plan: 11
- **R10** (areas E, F) "those placeholders, when you click them, should navigate the user to the add podcast index search page." — Plan: 50, 51, 52, 60, 62
- **R11** (area C) "if a user navigates to a feed on the website that has remote items and those remote items are not parsed yet and there is not even this minimal placeholder row, then we simply don't want those remote items to display on the website or mobile app because we don't want them returned by the API." — Plan: 31
- **R12** (area B) "We never want these remote items to result in parsing feeds that are not found in Podcast Index" — Plan: 20
- **R13** (area A) "Remote items that are saved to the database need to be saved in this special format." — Plan: 11
- **R14** (area D) "Add by RSS can have a similar experience where only the feed that they parse parses and saves fully, but then if the user clicks a remote item, minimal placeholder." — Plan: 40, 42, 44, 45, 46
- **R15** (area D) "Then it should open a screen that is different but similar to the podcast index search page." — Plan: 41, 42, 43, 44
- **R16** (area D) "maybe we want this search detail page to be a generic component that podcast index is just a provider for, and add by RSS is a separate path to using that component. And both have minimal amounts of information that they will display." / Operator: "Provider search detail and Add by RSS search detail share one generic component; Podcast Index is one provider for that component, Add by RSS is a separate path." — Plan: 41, 42, 43, 44
- **R17** (area B) "If a remote item was attempted to be found in podcast index previously, but it was not found, then the next time we try to parse the original feed that contains remote items. It should try again to see if that feed has been added to Podcast Index since then." — Plan: 20
- **R18** (areas A, D) "make sure we are writing these things in a way where other index service providers can be swapped in in the future." — Plan: 10, 40, 41, 43
- **R19** (area B) "We should not use the shrinking service for these remote items that are not yet fully parsed as feeds in our database and saved yet." — Plan: 20
- **R20** (areas A, C) "these remote items that are not fully parsed yet should not show up in our usual endpoints. That already today display information correctly. For example, if I browse channels, I shouldn't see while browsing channels feeds that are just these stubs from remote items." — Plan: 11, 31
- **R21** (area A) "Perhaps stub is a good word for these, or maybe remote stub. To be specific about these rows' purposes." — Plan: 11
- **R22** (areas D, E, F) "We need it to work consistently on web and mobile." — Plan: 41, 42, 43, 44, 45, 46, 50, 51, 52, 60, 62
- **R23** (area G) "think about any management admin tasks related to this process that we may want manual ability to handle. If that's not necessary, then you don't need to." — Plan: 72, 73
- **R24** (no area) "note the current branch we are on because when we create our work tree, we are going to create the worktree off of this branch." — Plan: n/a — worktree setup, settled in 00-REQUEST § Worktree base branch; this worktree is on `feature/remote-item-stubs`
- **R25** (area B) "Keep that flag in case people don't want stubs, but they do want to just automatically parse, to follow and recursively follow and parse all of the remote items they find. Stubs are the default path; the existing full-parse path stays as an opt-in" — Plan: 20
- **R26** (areas A, B) "We do want item stubs if that is possible. So maybe both channels and items need stubs." — Plan: 11, 20
- **R27** (areas A, B) "Live items could potentially have stubs too, although we won't be showing up-to-date live status for those." — Plan: 11, 20
- **R28** (areas E, F) "If you click an item stub and the item doesn't exist in our database, the user should be directed to the search detail page for adding the channel, not a search detail page for the item itself" — Plan: 50, 52, 60, 61, 62
- **R29** (areas C, E, F) "We do want the stub to be able to show that item, however, in our UI for the item." — Plan: 31, 50, 52, 60, 61, 62
- **R30** (area B) "And then, if those are added, then items for it can show up." (a stubbed feed that is later fully added replaces its stub rows) — Plan: 20
- **R31** (areas A, B) "Note that if you ever save an item stub, there should always be a channel stub with it because we'll need information for both, potentially." — Plan: 11, 20
- **R32** (area G) "bear in mind that the podcast index has a merged process. So, if we save a stub, we may need to handle a redirect in the future if the reference item pointed to one ID in the podcast index, but then later the ID for that changed to something else." — Plan: 70
- **R33** (areas B, C, E, F) "Channel `podcast:remoteItem` lists, publisher/artist albums, and podroll get stubs and stub rows in the UI" — Plan: 20, 30, 31, 32, 50, 51, 52, 60, 61, 62
- **R34** (area B) "Value time splits: save channel and item stubs for them at parse time, but add no new UI in this set." — Plan: 20
- **R35** (area D) "Look the remote item up in the index provider first. If found, create or reuse a normal stub and open the provider search-detail page." — Plan: 40, 45, 46
- **R36** (area D) "If not found, open an Add by RSS search-detail page for the remote feed URL with minimal info and an Add by RSS action." — Plan: 42, 44, 45, 46
- **R37** (area G) "List stubs" — Plan: 72, 73
- **R38** (area G) "re-check against the provider now" — Plan: 71, 72, 73
- **R39** (area G) "promote a stub to a full parse" — Plan: 71, 72, 73
- **R40** (area G) "delete" — Plan: 72, 73
- **R41** (area G) "process handling when remote items change the ID they correspond with in Podcast Index (merge/ID-change). Unsure where in the process the merge handling should happen — planner should place it." — Plan: 70, 71, 72, 73
- **R42** (area A, step 02) "I want you to do stub tables." Episode and track pages stay on `item`. Podroll and Remote Items return the whole reference list in one response. — Plan: 11, 32
- **R43** (area B, step 03) A remote item with a feed URL and no feed GUID stays out of this set, matching today. — Plan: 20
- **R44** (area C, step 04) "Hide it until reparse, and we don't need a backfill command because we intend to wipe the alpha database before this next deploy, anyway." — Plan: 31
- **R45** (area D, step 09) Add by RSS shows podroll, including episode rows, and the channel remote item list. Value time splits stay without a new screen. — Plan: 40, 45, 46
- **R46** (area G, step 08) Podcast Index merges and id changes are applied on the server: the next parse, the hourly merge worker, and admin re-point. — Plan: 70
- **R47** (area D, step 09) "we want to go through the normal podcast index process" on a password-protected Add by RSS tap, and "remote items should not inherit that username and password." The username and password are sent only to the domain of the feed URL they were saved for. — Plan: 40, 45, 46

## Areas

### Area A — Stub data model and index provider

- **Rows:** R1, R4, R7, R9, R13, R18, R20, R21, R26, R27, R31
- **Owns:** the investigation write-up of today's behavior (parser, API per-request lookups, web
  and mobile unadded rows); the storage recommendation (dedicated stub tables versus a flag on
  `channel` / `item` / live item rows), reported under `## Decisions` for operator review; the
  schema and linear migration; ORM entities and services, including "upsert channel stub" and
  "upsert item stub" (an item stub always has its channel stub) and the contract for replacing
  stubs when the feed is fully parsed; the index-provider abstraction ("resolve a remote
  reference by feed GUID or feed URL", "look up a provider feed id"), with Podcast Index as the
  first implementation; the stub DTO in `@podverse/helpers` other areas consume; ORM-level
  exclusion of stubs from normal channel and item queries when the flag model is chosen.
- **Starts from:** `packages/orm/src/entities/channel/channelRemoteItem.ts` and the podroll,
  publisher, and `itemValueTimeSplitRemoteItem` entities; `packages/orm/src/services/base/baseRemoteItemsService.ts`;
  `packages/external-services-podcast-index/src/index.ts`; `packages/helpers/src/dtos/remoteItem.ts`;
  `packages/helpers/src/lib/podcastIndexFeedReference.ts`; `infra/k8s/base/ops/source/database/linear-migrations/`.
- **Depends on:** none.
- **Shares files with:** B, C, D, G (`packages/helpers/src/dtos/remoteItem.ts`, ORM services,
  provider package); G (linear migrations, if G adds columns).
- **Plan block:** 10–19.

### Area B — Parser stub path

- **Rows:** R3, R5, R8, R12, R17, R19, R25, R26, R27, R30, R31, R33, R34
- **Owns:** the default parse path that writes stubs (never full parses) for channel
  `podcast:remoteItem`, publisher/artist albums, podroll, and value time split references, using
  area A's provider resolve and upsert services; references with only a feed GUID or feed URL;
  no stub when the provider does not know the feed, and a fresh lookup on the next parse of the
  source feed; no `imageShrink` queueing for stubs; keeping `config.parser.addRemoteItemsToMQ`
  as the opt-in full recursive parse; item and live item stubs; replacing stub rows when a
  stubbed feed is fully parsed (user add or promotion).
- **Starts from:** `packages/parser/src/lib/rss/remoteItemParser.ts`, `packages/parser/src/lib/rss/parser.ts`
  (~line 542, and its `imageShrink` queueing), `packages/parser/src/config/types.ts`,
  `apps/workers/src/lib/parser/buildWorkersParserConfig.ts`,
  `packages/parser/src/lib/notifications/handleNewRemoteItemNotifications.ts`.
- **Depends on:** A.
- **Shares files with:** G (re-check and promote reuse B's stub resolve path; merge handling may
  hook the re-parse lookup).
- **Plan block:** 20–29.

### Area C — API read path for stubs

- **Rows:** R2, R11, R20, R29, R33
- **Owns:** replacing the per-request Podcast Index lookups in `buildRemoteItemsFinalResult`
  with stub-backed results for podroll, publisher feed / artist albums, and channel remote item
  lists; references with no stub and no full row are not returned; stubs stay out of browse,
  search, category, top, recent, and other usual channel and item endpoints; item stub fields
  in responses; OpenAPI and API integration tests.
- **Starts from:** `apps/api/src/lib/remoteItems.ts`, `apps/api/src/controllers/podroll.ts`,
  `apps/api/src/controllers/publisherFeed.ts`, `apps/api/src/routes/publisherFeed.ts`,
  `apps/api/openapi.yml`, `apps/api/src/test/publisher-feed-verified.integration.test.ts`.
- **Depends on:** A.
- **Shares files with:** D, G (`apps/api/openapi.yml`); G (`apps/api/src/lib/remoteItems.ts`,
  `apps/api/src/controllers/helpers/mergedInto.ts`); A (`packages/helpers/src/dtos/remoteItem.ts`).
- **Plan block:** 30–39.

### Area D — Generic search detail and Add by RSS remote items

- **Rows:** R14, R15, R16, R18, R22, R35, R36
- **Owns:** one generic search-detail component with Podcast Index as a provider and Add by RSS
  as a separate path, on web and mobile; the Add by RSS remote item click flow (provider lookup,
  create or reuse a stub, open the provider search detail; otherwise open the Add by RSS search
  detail for the remote feed URL with an Add by RSS action); the API endpoint that performs the
  lookup; keeping the existing provider search-detail route and screen as the click target the
  list areas link to.
- **Starts from:** `apps/web/src/app/podcast-index/feed/[podcast_index_id]/` (page, client,
  header), `apps/web/src/components/PodcastIndex/PodcastIndexFeedInfo.tsx`,
  `apps/mobile/src/screens/search/PodcastIndexFeedPreviewScreen.tsx` and
  `podcastIndexFeedPreview.ts`, `apps/api/src/controllers/account/accountAddByRSSParse.ts`,
  `apps/api/src/controllers/externalServices/podcastIndex.ts`,
  `apps/mobile/src/lib/addByRss/publisherRefs.ts`, `apps/web/src/utils/addByRSS/publisherLinks.ts`,
  `apps/mobile/src/screens/home/AddByRssHomeDetailScreen.tsx`.
- **Depends on:** A.
- **Shares files with:** C, G (`apps/api/openapi.yml`); E (web search-detail route); F
  (`apps/mobile/src/navigation/index.tsx`, the mobile search-detail screen); E, F, G (i18n
  catalogs).
- **Plan block:** 40–49.

### Area E — Web stub rows in lists

- **Rows:** R2, R6, R10, R22, R28, R29, R33
- **Owns:** web rendering of channel and item stub rows in podroll, artist albums, and channel
  remote item lists; click on a channel or item stub opens the provider search detail for the
  channel; item stub rows show the item; Playwright coverage.
- **Starts from:** `apps/web/src/components/Content/Podroll/*`,
  `apps/web/src/components/List/Music/Albums/ListAlbumRowRemoteItemUnadded.tsx`,
  `ListAlbumGridNodeUnadded.tsx`, `ListAlbumRemoteItemNodes.tsx`,
  `apps/web/src/app/artist/[channel_id]/` (page, `ArtistPageList.tsx`,
  `ArtistPageAlbumSections.tsx`), `apps/web/src/app/podcast/[channel_id]/page.tsx`,
  `apps/web/src/app/album/[channel_id]/page.tsx`.
- **Depends on:** C (response shape), D (search-detail route).
- **Shares files with:** D (web search-detail route, i18n catalogs); F (shared i18n keys).
- **Plan block:** 50–59.

### Area F — Mobile stub rows in lists

- **Rows:** R2, R6, R10, R22, R28, R29, R33
- **Owns:** mobile rendering of channel and item stub rows in podroll, artist albums, and channel
  remote item lists; click target (provider search detail for the channel); the on-device
  persistence of remote item DTOs (`apps/mobile/src/data/db/schema.ts` stores them, so DTO
  changes are device data migrations); offline behavior of stub rows; Maestro or unit coverage.
- **Starts from:** `apps/mobile/src/screens/podcast/sections/PodcastPodrollSection.tsx`,
  `podcastSections.ts`, `usePodcastSectionRows.ts`, `apps/mobile/src/screens/artist/ArtistDetailScreen.tsx`,
  `apps/mobile/src/screens/album/AlbumDetailScreen.tsx`, `apps/mobile/src/data/db/schema.ts`,
  `apps/mobile/src/lib/offlineModeViews.ts`.
- **Depends on:** C (response shape), D (search-detail screen and navigation).
- **Shares files with:** D (`apps/mobile/src/navigation/index.tsx`); G (`apps/mobile/src/lib/mergeRedirect.ts`);
  E (shared i18n keys).
- **Plan block:** 60–69.

### Area G — Stub lifecycle: merges and management tooling

- **Rows:** R23, R32, R37, R38, R39, R40, R41
- **Owns:** where Podcast Index merges and feed id changes are applied to stubs (the `deadFeeds`
  merge worker, re-parse lookup, read-time redirect, or a combination), and any client redirect
  that follows; management-api routes and management-web pages to list stubs, re-check one
  against the provider now, promote a stub to a full parse, delete, and handle merge or id
  changes; management-api integration tests and management-web Playwright coverage.
- **Starts from:** `apps/workers/src/commands/podcastIndex/deadFeeds/flagAndMerge.ts`,
  `applyDuplicateMerges.ts`, `apps/api/src/controllers/helpers/mergedInto.ts`,
  `apps/mobile/src/lib/mergeRedirect.ts`, `packages/orm/src/entities/channel/channelMerge.ts`,
  `apps/management-api/src/routes/`, `apps/management-web/src/app/(management)/feeds/`
  (including `merge-review/`).
- **Depends on:** A, B, C.
- **Shares files with:** B (stub resolve path); C (`apps/api/src/lib/remoteItems.ts`,
  `mergedInto.ts`, `apps/api/openapi.yml`); F (`apps/mobile/src/lib/mergeRedirect.ts`); A (linear
  migrations, ORM services).
- **Plan block:** 70–79.

## Order

- **Wave 1:** A. Every other area builds on its storage model, services, provider abstraction,
  and DTO.
- **Wave 2:** B, C, D. Each builds on A only; they touch separate code (parser, API read path,
  search detail and Add by RSS).
- **Wave 3:** E, F, G. E and F render C's response shape and link to D's search detail. G reuses
  B's stub resolve path for re-check and promotion and may change C's read path for merges.

### First review

The operator settled D1–D51. Plans 11, 20, 31, and 70 already match R42, R43, R44, and R46.
Plan 74 is removed. The second pass amends plans 40, 45, and 46 for R45 and R47.

### Close

- Run order and phases: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md) and `COPY-PASTA.md`.
- Web and mobile share one label for the channel remote item list: `info.remote_items` is
  "Remote Items" (plan 52 adds it; the operator's review called the list "Remote Items"). Plan 62
  reuses it instead of adding "From Other Feeds" (D40), adds only `info.no_remote_items_found`,
  and now runs after plan 52.
- Plan 61's fixture feeds moved to Podcast Index ids 876543227 and 876543228. Plan 73's
  management seed writes stubs with 876543250–876543252 into the same app database.
- Plans 50 and 61 both seed remote item fixtures and both stay: plan 50's channels hold stub-only
  lists for the web specs, and plan 61's hold parsed rows beside stubs for the mobile flow.

## Decisions to review

Collected from the `## Decisions` sections of planning steps 02–08. Each item gives the choice
made, the main alternative, the step, and the plan. The first review settled these. Where a D
item below disagrees, `00-REQUEST.md` § Review of the first planning pass and rows R42–R47 win.

### Step 02 — area A, stub data model and index provider

- **D1** (step 02, plan 11) Storage model: dedicated stub tables, not a flag on `channel`, `item`, or `feed`. A flagged channel needs a `feed` row, and `mqRSSAddAll` plus the recently-updated Podcast Index sync would then fully parse it; about 46 query sites would each need an exclusion. Separate tables keep stubs out of usual endpoints and image shrinking with no extra work (R7, R20). Alternative: a flag column on `feed`, `channel`, and `item` with exclusions everywhere. Operator asked to review this one (R7).
- **D2** (step 02, plan 11) An alias table records every reference GUID or URL that resolved to a stub, so URL-resolved publisher albums keep working and a key moves to a new stub after a provider merge (latest resolution wins). Alternative: match only on the provider's own GUID and URL.
- **D3** (step 02, plan 11) Stubs store provider metadata only: title, author, image, medium; for items, title, image, publish date, duration. No description, enclosure, or live status, and nothing is fetched from the remote RSS feed. Alternative: store more fields for a richer row.
- **D4** (step 02, plan 11) A live item reference gets an ordinary item stub when the provider resolves its GUID; no live status is stored (R27). Alternative: live-specific columns.
- **D5** (step 02, plan 11) When the full feed is parsed, its stub is deleted through `deleteForParsedFeed`, taking its aliases and item stubs with it. Alternative: keep the stub with a `promoted_channel_id` so aliases keep routing.
- **D6** (step 02, plan 11) No negative cache: a reference without a stub is looked up again on the next parse. Alternative: store "not found" rows with a retry time.
- **D7** (step 02, plan 10) The provider feed id is stored as text, so non-numeric providers stay possible. Alternative: a numeric column.
- **D8** (step 02, plan 10) The provider lookup separates "not in the index" from "could not check", so a failed lookup never deletes a stub. Alternative: return null for both.

### Step 03 — area B, parser stub path

- **D9** (step 03, plan 20) References with only a feed URL are out of scope: `podverse-partytime` drops any `podcast:remoteItem` without a `feedGuid`, and all four reference tables require `feed_guid`. GUID-only references are fully supported; the resolver still accepts a null GUID for API callers resolving by URL. Alternative: change partytime upstream, make `feed_guid` nullable on four tables, and update every reader. Bears on R5.
- **D10** (step 03, plan 20) A stub is re-resolved after 7 days, and each parse makes at most 100 single-feed or item lookups, leaving the rest for the next parse. Both are code constants. Alternative: env vars, or no automatic refresh (area G's re-check only).
- **D11** (step 03, plan 20) A feed the provider marks dead gets no new stub; an existing stub is left for area G's merge handling. Alternative: stub it and show it.
- **D12** (step 03, plan 20) Resolution also runs after a "no changes" skip, so a missing reference is retried on every parse attempt of its source feed; it does not run after spam, policy, or lifecycle stops. Alternative: run only after successful parses (fewer lookups, but a retry waits until the source feed changes).
- **D13** (step 03, plan 20) Stub resolution runs inside the parser worker after the feed's own writes. Alternative: a new message-queue job per channel.
- **D14** (step 03, plan 20) Stubs are deleted only after a fully successful parse. Alternative: delete as soon as the channel row is saved.
- **D15** (step 03, plan 20) Remote items inside a live item get no stubs (today they are parsed but never stored); live items count only as the target of an item reference. Alternative: add a reference table for them.
- **D16** (step 03, plan 20) Small change to the opt-in full-parse path: feed GUIDs are deduped across sources, and the monthly on-demand remote-item limit is checked once per source feed instead of once per source list. Alternative: leave the opt-in path unchanged.

### Step 04 — area C, API read path

- **D17** (step 04, plan 31) `channelsUnadded` and `itemsUnadded` keep their names but now hold stub objects; an older client reading the old Podcast Index fields shows rows without links rather than crashing. Alternative: new field names (`channelStubs` / `itemStubs`).
- **D18** (step 04, plan 31) No fallback lookup at read time (R11, R44). A reference with no stub stays hidden until its source feed is parsed again. There is no backfill command. The alpha database will be wiped before this deploy. Alternative that was rejected: a lazy provider lookup on read, or Podcast Index as a temporary fallback.
- **D19** (step 04, plan 32) Channel remote item lists return four arrays, not one ordered list; parsed rows and stub rows are not interleaved, and each array keeps feed order. Alternative: one ordered list mixing both kinds of row.
- **D20** (step 04, plan 32) The new channel remote item endpoint returns every reference whatever the channel's medium, and has no merge redirect (410), like podroll. Alternative: limit it to list mediums or fold it into `GET /channel`.
- **D21** (step 04, plan 30) When a channel is fully parsed but the referenced item is not, the item reference is hidden. Alternative: show the parsed channel in its place.
- **D22** (step 04, plan 31) A failed stub lookup returns 500, like the parsed lookups beside it; today a failed Podcast Index lookup quietly returns empty lists. Alternative: keep returning empty lists on failure.

### Step 05 — area D, generic search detail and Add by RSS

- **D23** (step 05, plans 45, 46) The click point for Add by RSS remote items is a new Podroll list on Add by RSS feeds, web and mobile. Alternative: add no list (the existing artist and album links never show a clickable reference).
- **D24** (step 05, plans 45, 46) Only channel-level podroll entries show on Add by RSS; item references, `podcast:remoteItem` channel lists, and value time splits do not. Alternative: also match area C's directory remote item list. The planner flagged this one for operator review.
- **D25** (step 05, no plan) The Add by RSS artist fan-out stays as it is: listed albums still auto-parse, and unresolved ones stay hidden. Alternative: send them through resolve (unresolved albums have no feed URL, so a click would lead nowhere).
- **D26** (step 05, plan 40) No stubs at Add by RSS parse time; a stub is written only on click. Alternative: stub every reference at parse, which sends a private feed's references to Podcast Index and adds load.
- **D27** (step 05, plan 40) Both new endpoints need sign-in, sit under `/account/add-by-rss/` with API-key permission `add_by_rss:read`, and resolve is rate-limited per account. Alternative: public endpoints limited by IP, next to `/channel/directory-match`.
- **D28** (step 05, plan 40) Resolve reuses plan 20's stub resolver; when it reports `parsed` (in Podverse but not a public parsed channel), the client shows a notice instead of guessing a destination. Alternative: extend plan 20's result with the provider feed id.
- **D29** (step 05, plans 40, 45, 46) An explicit tap can send one reference from a password-protected feed to the index provider; the lookup endpoint itself never contacts the provider. Alternative: skip the provider for those feeds and open the Add by RSS page directly.
- **D30** (step 05, plan 40) Feeds the provider marks as no longer updating count as not found: no stub, and the Add by RSS page opens when the reference has a feed URL (matches plan 20). Alternative: treat them as found.
- **D31** (step 05, plan 42) The web Add by RSS search-detail page takes the feed URL as a query parameter. Alternative: encode the URL into the path, or pass it in client state.
- **D32** (step 05, plans 41, 43) The shared search-detail components live in each app, not `packages/ui`, because web and mobile render differently. Alternative: one component in `packages/ui`.
- **D33** (step 05, plan 45) The web Add by RSS Podroll tab shows at every width and the Add by RSS side column stays empty, unlike directory pages, where Podroll moves to a side accordion on desktop. Alternative: match the directory pages' desktop accordion.
- **D34** (step 05, plan 40) Shared copy, the podroll fixture, and the reference helper sit in plan 40 so the web and mobile plans can run at the same time. Alternative: each client plan adds its own.

### Step 06 — area E, web stub rows

- **D35** (step 06, plan 52) Remote Items is a podcast and album page section (sidebar accordion plus a narrow-width chip) reusing the podroll stub rows. The artist page stays on `/publisher-feed`, so its albums are not listed twice. Alternative: also call `/remote-item/channel/:id` on the artist page, repeating Verified Albums and Not Yet Added.

### Step 07 — area F, mobile stub rows

- **D36** (step 07, plan 60) Stub rows look like parsed rows, with no heading, in podroll and remote lists, ordered parsed channels, channel stubs, parsed items, item stubs; the artist's existing Not Yet Added heading stays. Alternative: a separate "not yet added" group in every list.
- **D37** (step 07, plan 60) Item stub rows show title, image (falling back to the channel stub's), and the channel stub title as subtitle; no publish date or duration, matching parsed podroll item rows. Alternative: show date and duration on stub rows only.
- **D38** (step 07, plan 60) Parsed podroll entries route by medium (album, artist, track, or episode); today they always open the podcast or episode screen. Alternative: keep podcast-only routing.
- **D39** (step 07, plan 60) Album and artist podroll rows gain artwork from the shared row. Alternative: keep text-only rows there.
- **D40** (step 07, plan 62) A new section, "From Other Feeds", on the podcast and album screens, not the artist screen (whose remote items are its albums). Alternative: merge the list into the Episodes or Tracks section.
- **D41** (step 07, plan 62) The default section stays Episodes or Tracks, even for list feeds. Alternative: open list mediums on the new section.
- **D42** (step 07, plan 61) Mobile E2E fixtures are their own plan, on two new channels rather than the existing podcast channel, so existing chip-row flows stay unchanged. Alternative: add a podroll to `e2ePodChnl001`.

### Step 08 — area G, merges and management tooling

- **D43** (step 08, plan 70) Merge and id-change handling (R32, R41) happens on the server in the stub layer at three points: re-parsing a source feed moves aliases to the new stub and deletes an orphaned old stub in the same transaction; the hourly dead-feed worker re-points a stub to the survivor's stub (items moved over as stale) when the survivor is live and unparsed, and deletes it when Podverse parses the survivor or the feed retired with no survivor; and admins re-check, re-point, or delete manually (plans 71–73). `mergedInto.ts` and the mobile `mergeRedirect.ts` stay unchanged; stubs have no `id_text`, so no 410 and no client redirect. Alternative: check merges when a stub is read, or follow them on the client (a provider call per request).
- **D44** (step 08, plan 70) The stub merge pass is controlled by the existing `PODCAST_INDEX_DUPLICATE_MERGE_MODE` (`off`, `dry_run`, `apply`); a failure in it is caught and logged so the existing merge and retire passes still run. Alternative: a new env var.
- **D45** (step 08, plans 70, 71) A stub whose merge survivor Podverse already parses is deleted, which can hide a reference whose GUID and URL don't match the parsed channel (consistent with plan 30's matching). Alternative: keep stubs that point at parsed feeds.
- **D46** (step 08, plans 71, 72) Admin actions run as scheduled jobs through `scheduledJobsRunDue` within about 5 minutes, so management-api needs no Podcast Index credentials and no `@podverse/parser` dependency. Alternative: a synchronous re-check inside management-api.
- **D47** (step 08, plan 71) Re-check decides it refreshed the stub by comparing `resolved_at` with the re-check start time, because the resolver also returns a stale stub as `stub` when the provider is unavailable. Alternative: rely on the lookup outcome.
- **D48** (step 08, plan 71) Promotion is a forced full parse reusing `parsePodcastIndexFeedDirectly`, with the force-reparse job's lifecycle check and new-item side effects suppressed for older items; the successful parse deletes the stub. Alternative: a separate promote path.
- **D49** (step 08, plans 72, 73) Delete keeps no block list; a deleted stub returns on the next parse of a referencing feed if the provider still lists it. Alternative: a block table.
- **D50** (step 08, plan 72) Permissions: promote needs feeds `create`, re-check and re-point need `update`, delete needs `delete`. Alternative: `update` for all three queued actions.
- **D51** (step 08, plans 72, 73) R23 manual tools: list, view details, re-check, re-point, promote, and delete stubs. No backfill command (R44). Bulk actions and a block list are left out. Alternative: include bulk actions and a block list.
