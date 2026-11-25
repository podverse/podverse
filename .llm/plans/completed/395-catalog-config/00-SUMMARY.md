# 395 — Web instance catalog config

Models and run order: see `COPY-PASTA.md` in this set (written by the planning run's Close step).

Web only. Three independent settings, each optional and each useful alone: Music on/off, Add by
RSS on/off, and a Podcast Index id allowlist. Unset keeps today's full site. The request and the
operator's answers are in `00-REQUEST.md`.

## Requirement ledger

Rows quote `00-REQUEST.md`. "Plan" is the plan number from that plan's `## Rows`. Close is the
last implementation prompt, which has no numbered plan.

### Scope and settings

- **R1** (area A) "Web only. Mobile stays as it is." — Plan: 10, 12 (mobile code stays as it is; API and workers enforcement is R52–R79)
- **R2** (area A) "Unset settings keep today's full site." — Plan: 10, 12, 13
- **R3** (area A) "Three independent settings. Music, Add by RSS, and the allowlist. Each useful alone." — Plan: 10, 11, 13
- **R4** (area A) "Do not build the issue's single medium switch." / "Music and Add by RSS are separate on/off settings." — Plan: 10

### Allowlist key

- **R5** (area A) "The allowlist is comma-separated Podcast Index numeric ids in the env file." — Plan: 10
- **R6** (area A) "No remote JSON document." — Plan: 10
- **R7** (area A) "Podverse `id_text` is not the key." — Plan: 10
- **R8** (area A) "A show with no Podcast Index id is outside the list." — Plan: 10

### Config, runtime override, docs

- **R9** (area A) "A new block under `public` in `apps/web/src/config/index.ts`, beside `features`." — Plan: 10
- **R10** (area A) "New keys join the runtime config so a self-hoster can change them without a rebuild" (the `WebRuntimeConfigEnvKey` union and `webRuntimeConfigEnvKeys` in `apps/web/src/config/runtime-config.ts`) — Plan: 10, 11
- **R11** (area A) "and the allowlist in `apps/web/sidecar/src/server.ts`. Without that it is build-time only" — Plan: 10, 11
- **R12** (area A) "they are documented in `apps/web/ENV.md` under Web Configuration." — Plan: 10
- **R13** (area A) "No fallback values in `apps/web/src/config/index.ts`." — Plan: 10, 12
- **R14** (area A) "Unset-means-today is owned by env templates and validation." — Plan: 10, 12, 13

### Music off

- **R15** (area D) "Music off hides artists, albums, tracks, and music livestreams from navigation" — Plan: 40, 43, 45
- **R16** (area D) "[Music off hides artists, albums, tracks, and music livestreams from] chips" — Plan: 40, 43
- **R17** (area D) "[Music off hides artists, albums, tracks, and music livestreams from] search." — Plan: 41
- **R18** (area D) "Chips. `SUBSCRIBED_CHIPS`, `BROWSE_CHIPS`, `ADD_BY_RSS_CHIPS` and `RECOMMENDATION_CHIPS` (`apps/web/src/utils/mediaListChips.ts:18-40`) are where media kinds become visible, so filtering them is the visible half of the medium policy." — Plan: 40
- **R19** (area D) "Requests. Pass the policy's medium into the existing `medium` param rather than adding new API surface." — Plan: 43
- **R20** (area D) "Podcast clips and podcast livestreams stay." — Plan: 40
- **R21** (area C) "A direct URL to those pages is a not-found page, including embeds." (album, artist, track, music livestream, and their embeds) — Plan: not planned; replaced in the first review by R63 and R64.

### Add by RSS off

- **R22** (area E) "Add by RSS off hides the feature." — Plan: 50
- **R23** (area E) "Every `/add-by-rss` URL is a not-found page." — Plan: 50

### Allowlist: lists and search

The first review replaced list filtering with what workers add (R52–R55) and replaced search
(R56–R60). Rows below marked "replaced" have no plan of their own.

- **R24** (area B) "When the allowlist is set, Home ... [contains] only those shows." — Plan: not planned; replaced in the first review by R52–R54.
- **R25** (area B) "[When the allowlist is set,] Browse ... [contains] only those shows." — Plan: not planned; replaced in the first review by R52–R54.
- **R26** (area B) "[When the allowlist is set,] category ... [lists contain] only those shows." — Plan: not planned; replaced in the first review by R52–R54.
- **R27** (area B) "[When the allowlist is set,] global recent and top ... [lists contain] only those shows." — Plan: not planned; replaced in the first review by R52–R54.
- **R28** (area B) "[When the allowlist is set,] search ... [contains] only those shows." — Plan: not planned; replaced in the first review by R56–R60.
- **R29** (area B) "[When the allowlist is set,] recommendations ... [contain] only those shows." — Plan: not planned; replaced in the first review by R52–R54.
- **R30** (area B) "[When the allowlist is set,] subscribed show lists contain only those shows." — Plan: not planned; replaced in the first review by R52–R54.
- **R31** (area B) "A page of results is a full page of allowlisted rows." — Plan: not planned; replaced in the first review by R52–R54.
- **R32** (area B) "Dropping rows after a page returns is not acceptable." — Plan: 23
- **R33** (area B) "Loading the small set by Podcast Index id is acceptable." — Plan: not planned; the first review chose neither option (R52).
- **R34** (area B) "An optional API filter is acceptable only when the request omits it and every other client still receives today's directory." — Plan: not planned; the first review dropped the API filter (R52).

### Allowlist: direct URLs

The first review removed every page and embed not-found gate for the allowlist and Music off
(R61–R64). The "stay" rows still hold and are asserted on the restricted lane.

- **R35** (area C) "A direct URL is a not-found page when the show ... is outside the list." — Plan: not planned; replaced in the first review by R61.
- **R36** (area C) "[... when the] episode ... is outside the list." — Plan: not planned; replaced in the first review by R61.
- **R37** (area C) "[... when the] clip ... is outside the list." — Plan: not planned; replaced in the first review by R61.
- **R38** (area C) "[... when the] official clip ... is outside the list." — Plan: not planned; replaced in the first review by R61.
- **R39** (area C) "[... when the] chapter ... is outside the list." — Plan: not planned; replaced in the first review by R61.
- **R40** (area C) "[... when the] podcast livestream ... is outside the list." — Plan: not planned; replaced in the first review by R61.
- **R41** (area C) "[... when the] podcast-index feed page ... is outside the list." — Plan: not planned; replaced in the first review by R61 and R64.
- **R42** (area C) "[... when the] embed is outside the list." — Plan: not planned; replaced in the first review by R61 and R64.
- **R43** (area A, step 07) "Clips ... stay for shows on the list." — Plan: 11
- **R44** (area A, step 07) "[...] podcast livestreams ... stay for shows on the list." — Plan: 11
- **R45** (area A, step 07) "[...] playlists ... stay for shows on the list." / "A playlist ... page still loads." — Plan: 11
- **R46** (area A, step 07) "[...] user profiles stay for shows on the list." / "[A] profile page still loads." — Plan: 11
- **R47** (area C) "A row on it that opens an excluded show is a not-found page." — Plan: not planned; replaced in the first review by R62.
- **R48** (area A, step 07) "Subscribe stays available on allowlisted shows." — Plan: 11

### First review: what gets added (area F, step 08)

- **R52** (area F, step 08) "Workers add only the allowlisted feeds." — Plan: 60, 61, 63
- **R53** (area F, step 08) "Do not add a podcast_index_ids query parameter. ... List URLs stay as they are. Feeds already stored still appear in lists." — Plan: 60
- **R54** (area F, step 08) "Episode, clip, livestream, and track lists show whatever is already stored. New rows come only from feeds the workers add. Do not filter those lists down to the allowlist." — Plan: 60
- **R55** (area F, step 08) "When a listed Podcast Index id was merged away, workers add the surviving show." — Plan: 60, 61

### First review: search (area B, step 09)

- **R56** (area B, step 09) "With the allowlist set, search is a title match over every channel already stored, in Postgres, with no new database index and no Podcast Index request." — Plan: 23, 24
- **R57** (area B, step 09) "That search endpoint is reachable only while the allowlist is set, so the open-mode server never runs the unindexed query." — Plan: 23
- **R58** (area B, step 09) "With the allowlist unset, search stays the Podcast Index search that ships now." — Plan: 23, 24
- **R59** (area B, step 09) "Search does not offer to add a feed." — Plan: 24
- **R60** (area B, step 09) "Order title matches by closeness. A title that starts with the term comes before a title that only contains it. Newest publish date breaks a tie." — Plan: 23

### First review: no page or embed gates (area A, step 07)

- **R61** (area A, step 07) "A show already stored still opens when its Podcast Index id is not on the allowlist. The allowlist only limits what workers add from now on. Do not return not-found for a stored show, episode, clip, chapter, livestream, or embed because the id is off the list." — Plan: 11
- **R62** (area A, step 07) "After the allowlist is turned on, a show already stored still loads, plays, and opens. Opening a playlist, profile, queue, or history row does not lead to not-found." — Plan: 11
- **R63** (area A, step 07) "Music off does not turn music URLs into not-found pages. Livestream URLs stay as they are now. Do not add a new medium redirect. ... Stored music pages, rows, and playback stay as they are now." — Plan: 11
- **R64** (area A, step 07) "Do not gate the clip edit page." / "Do not force the Podcast Index feed page to not-found for a music feed." / "Do not switch an embed to a not-found shell because of the allowlist or Music off." / "Page and embed not-found gates for the allowlist and for Music off come out of the plans." — Plan: 11
- **R65** (area A, step 07) "No size cap on the allowlist." — Plan: 10, 12

### First review: Music off (areas F and D)

- **R66** (area F, step 08) "Music off stops workers from adding music." — Plan: 60
- **R67** (area D, step 10) "Leave the Livestreams list request as it is. Music rows can still show and still open. Do not switch the request to av or podcasts." — Plan: 40
- **R68** (area D, step 10) "Queues: with Music off, show the Music tab when the active queue is music or the music queue has rows. When that tab is shown, show both tabs. When it is hidden, show no tab row and list the podcast queue." — Plan: 43
- **R69** (area D, step 10) "History: show the Music tab when any music is in history. When there is none, show no tabs and list podcast history." — Plan: 43
- **R70** (area D, step 10) "Playlists: show the Music filter only when that list has a music playlist. A saved Music filter with nothing to show opens All." — Plan: 43
- **R71** (area D, step 10) "With Music off, the player keeps the title link and the artist byline." — Plan: none — the player already does this. Step 10 removed plan 44. Do not add a player plan.

### First review: Add by RSS off (area E, step 11)

- **R72** (area E, step 11) "With Add by RSS off, saved rows still show on Home, queue, history, and playlist pages, and can be removed where the row already has remove." — Plan: 50
- **R73** (area E, step 11) "Refuse the parse routes and the route that creates a new follow. Keep unfollow so removal works." — Plan: 51
- **R74** (area E, step 11) "Hide every way to add a feed." — Plan: 50, 52
- **R75** (area E, step 11) "Assume the operator goes live with Add by RSS already off. If a row was saved anyway, show it and let the visitor remove it." — Plan: 50
- **R76** (area E, step 11) "A playing Add by RSS item keeps playing. The title is plain text. Omit artist links that point at /add-by-rss." — Plan: 50

### First review: Podcast Index Add Feed (area F, step 08)

- **R77** (area F, step 08) "While the allowlist is set, hide the Podcast Index Add Feed button and refuse that on-demand add request." — Plan: 62
- **R78** (area F, step 08) "Open mode keeps the button, even when Add by RSS is off." — Plan: 62
- **R79** (area F, step 08) "Opening the Podcast Index feed page does not add a feed by itself." — Plan: 62

### Superseded by the operator's answers

- **R49** (none) "`NEXT_PUBLIC_FEATURES_ENABLED_MEDIUMS`, comma-delimited, default `all-available`, accepting any subset of the RSS-able medium values" — Plan: not planned; replaced by R3 and R4.
- **R50** (none) "`NEXT_PUBLIC_CHANNEL_ALLOWLIST`, either a comma-delimited list of channel `id_text` values or an absolute URL to a JSON document holding them" — Plan: not planned; replaced by R5, R6, and R7.

### Operator deliverable

- **R51** (last plan) "The last implementation step writes `proposed-reply.md` in the set and repeats it in a fenced `text` block. ... A few sentences for the people in the thread, with no file names or plan names." — Plan: Close

The issue's five open questions are settled by the operator's answers and the first review.
The allowlist and Music off limit what workers add, and the API adds the allowlist-only search,
the Add by RSS refusals, and the on-demand add refusal (R52–R79). Stored pages stay. Every
`/add-by-rss` URL is a not-found page when that switch is off (R23). Subscribing stays (R48).
Identity is the Podcast Index id (R5, R7).

## Areas

Plan number blocks keep area steps from colliding on file names. Every area plans its own tests
(Playwright for web, API integration for any API change) per **feature-implementation-testing**.

### Area A — Catalog config, policy helpers, and E2E setup (plans 10–19)

- Rows: R1–R14.
- Scope: the three env keys (names chosen here), the `public` config block beside `features`,
  build-time validation, runtime config keys, the sidecar allowlist, env templates for local, k8s
  and the Playwright server, `apps/web/ENV.md`, and the helper module every other area reads
  (for example, whether Music is on, whether Add by RSS is on, the parsed allowlist, and whether a
  Podcast Index id is allowed, with a missing id outside the list). It also decides how runtime
  values reach server components and client components, and how Playwright runs the web app with
  non-default catalog settings and seeded Podcast Index ids, so areas B–E can write specs against
  it.
- Starts from: `apps/web/src/config/index.ts`, `apps/web/src/config/runtime-config.ts`,
  `apps/web/sidecar/src/server.ts`, `apps/web/scripts/validate-env.ts`, `apps/web/ENV.md`,
  `apps/web/playwright.e2e-server-env.ts`, `infra/config/local/web-sidecar.env`,
  `infra/k8s/base/web/source/web-sidecar.env`, `scripts/local-env/setup.sh`, and how
  `NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES` flows through all of them.
- Depends on: none.
- Shared files: creates the helper module and E2E settings that B, C, D, and E import. Owns
  `apps/web/playwright.e2e-server-env.ts` and the env templates; a later area that needs another
  E2E setting names the addition in its plan rather than restructuring A's.

### Area B — Allowlisted directory lists and search (plans 20–29)

- Rows: R24–R34.
- Scope: every list that surfaces shows (Home subscribed, Browse, category, global recent and
  top, search, recommendations, subscribed show lists) returns full pages of allowlisted shows
  when the allowlist is set. Chooses between loading the small set by Podcast Index id and an
  optional API filter that other clients never send (R33, R34). Decides whether episode, clip,
  and livestream lists on Home and Browse are scoped to allowlisted shows, and whether the
  allowlist applies to music channels when Music is on; both go in the step's `## Decisions`.
- Starts from: `apps/web/src/app/_media-lists/**` (`*ListSsr.ts`, `*PageContext.tsx`),
  `apps/web/src/app/page.tsx`, `browse/page.tsx`, `recommendations/**`, `search/**`
  (search calls `reqPodcastIndexSearchPodcasts`), `apps/web/src/hooks/useFullSubscribedChannels.ts`,
  `packages/helpers-requests/src/api/channel/channel.ts` (`reqChannelGetMany`,
  `reqChannelGetByPodcastIndexId`), and `apps/api/src/routes/channel.ts` with its controller and
  ORM service if an API filter is chosen.
- Depends on: area A (helper module, E2E settings).
- Shared files: `apps/web/src/app/page.tsx`, `browse/page.tsx`, `recommendations/**`,
  `search/**`, and `_media-lists/livestreams/**` with area D.

### Area C — Direct-URL not-found gating (plans 30–39)

- Rows: R21, R35–R48.
- Scope: one shared gate for detail routes. Music off makes album, artist, track, and music
  livestream routes and their embeds not-found. The allowlist makes show, episode, clip, official
  clip, chapter, podcast livestream, podcast-index feed, and embed routes not-found for shows
  outside the list. Playlists and profiles still load; their rows that open an excluded show land
  on a gated route. Subscribe stays on allowlisted shows.
- Starts from: `apps/web/src/lib/ssr/loadOrNotFound.ts`, `apps/web/src/lib/seo/fetchers.ts`,
  `apps/web/src/app/podcast/[channel_id]/page.tsx` (already calls `notFound()` and reads
  `channel.feed.podcast_index_id`), and the detail and `embed/**` route files listed in
  `00-REQUEST.md` § Orientation.
- Depends on: area A (helper module, E2E settings).
- Shared files: `apps/web/src/app/podcast-index/feed/[podcast_index_id]/page.tsx` with area E if
  that page offers Add by RSS. Detail route pages are owned by this area only.

### Area D — Music off in navigation, chips, search, and lists (plans 40–49)

- Rows: R15–R20.
- Scope: with Music off, no chip, search facet, list, or link offers artists, albums, tracks, or
  music livestreams. Podcast clips and podcast livestreams stay. Lists that mix mediums pass the
  existing `medium` request param. Route not-found for music pages is area C.
- Starts from: `apps/web/src/utils/mediaListChips.ts` and its callers (`app/page.tsx`,
  `browse/page.tsx`, `recommendations/**`, `add-by-rss/page.tsx`),
  `apps/web/src/app/search/SearchPageListHeader.tsx` (music medium tab),
  `apps/web/src/app/_media-lists/livestreams/**`, the embed builder, and components that link to
  music routes (`components/Core/Artist/**`, `components/List/Music/**`,
  `components/Common/Artist/**`, `components/List/LiveItem/**`).
- Depends on: area A (helper module, E2E settings).
- Shared files: `apps/web/src/app/page.tsx`, `browse/page.tsx`, `recommendations/**`,
  `search/**`, and `_media-lists/livestreams/**` with area B; `apps/web/src/app/add-by-rss/page.tsx`
  with area E.

### Area E — Add by RSS off (plans 50–59)

- Rows: R22, R23.
- Scope: with Add by RSS off, nothing offers the feature (sidebar link, buttons, prompts, other
  entry points), and every `/add-by-rss/**` route is a not-found page.
- Starts from: `apps/web/src/components/SideBar/SideBar.tsx`, `apps/web/src/app/add-by-rss/**`,
  `apps/web/src/components/AddByRSS/**`, and every `ROUTES.ADD_BY_RSS*` reference in
  `apps/web/src`.
- Depends on: area A (helper module, E2E settings).
- Shared files: `apps/web/src/app/add-by-rss/page.tsx` with area D (chips);
  `apps/web/src/app/podcast-index/feed/[podcast_index_id]/page.tsx` with area C.
- First review: area E now spans web and API. The API refuses the Add by RSS parse routes and
  the new-follow route and keeps unfollow (R73). Saved rows show and stay removable (R72, R75).

### Area F — What workers and the on-demand add accept (plans 60–69)

Added in the first review.

- Rows: R52–R55, R66, R77–R79.
- Scope: with the allowlist set, workers add only allowlisted Podcast Index feeds, following a
  merge to the surviving show. With Music off, workers add no music. Stored rows are untouched
  and lists are not filtered. While the allowlist is set, the API refuses the on-demand add
  request and the web app hides the Podcast Index Add Feed button; open mode keeps both, even
  with Add by RSS off. Opening the Podcast Index feed page adds nothing by itself.
- Starts from: the feed-adding commands under `apps/workers/src/commands/mq/rss/**`,
  `apps/workers/src/commands/parser/rss/**`, `apps/workers/src/commands/podcastIndex/**`,
  `apps/workers/src/lib/podcastIndex/**`, the parser entry in `apps/workers/src/lib/parser/**`,
  `apps/api/src/routes/mq.ts` with `apps/api/src/controllers/mq/mq.ts` (on-demand add), and
  `apps/web/src/components/PodcastIndex/PodcastIndexFeedInfo.tsx` (`addFeedOnClick`,
  `reqMQRSSAddOnDemand`).
- Depends on: step 07 (the API and workers settings).
- Shared files: `apps/workers/src/config/index.ts` and `lib/startup/validation.ts` and the API
  config, if step 07 leaves the wiring to this area; `PodcastIndexFeedInfo.tsx` with area B
  only if search links there.

### Area C after the first review

Plans 30 and 31 were removed (R61–R64). Area C has no remaining plans. The removed plans are
kept outside the set in `.artifacts/plan-runner/abcplan-395-catalog-config/superseded-plans/`,
with plans 20–22.

## Waves

- Wave 1: area A. Every other area imports its helper module and E2E settings.
- Wave 2: areas B, C, D, E. They write separate plans; their shared files above are ordered at
  Assemble.
- Second pass, wave 1: area A revision (step 07). Wave 2: areas F, B, D, E revisions (steps
  08–11), which read step 07's settings for the API and workers.

## Decisions to review

Collected from each area step's `## Decisions`. Each item gives the choice made, the main
alternative, and where it lives. Numbers are for the operator's answers.

**Reviewed.** The operator's answers are in `00-REQUEST.md` § Review of the first planning
pass. D6, D7, D9–D12, D14–D19, D23–D26, and D29–D31 changed; every other item stands as written.
The new rows are R52–R79.

### Step 02 — Area A (plans 10–11)

- **D1** (plan 10) Settings are `*_DISABLED`, so blank or unset means today's behavior. Alternative: `*_ENABLED` settings, which need a default in code.
- **D2** (plan 10) An invalid catalog value stops the sidecar at startup. Alternative: log a warning and ignore it.
- **D3** (plan 10) An allowlist that is set but has no valid ids allows nothing. Alternative: treat it as no allowlist.
- **D4** (plan 10) The local `web-catalog.env` override wins, and a blank value clears the setting. Alternative: skip blank values, as `web-image.env` does.
- **D5** (plan 11) One restricted E2E lane with all three settings on, with the music album and artist allowlisted so Music off is tested on its own. Alternative: one lane per setting, each with a full Next build.

### Step 03 — Area B (plans 20–23)

- **D6** (plan 20) The API filters the lists through an opt-in `podcast_index_ids` query parameter; omitted means today's results. Alternative: load the small allowed set in the web app and sort there (Top lists rank by server-side stats, and item lists cannot be built that way).
- **D7** (plans 21, 22) Episode, clip, livestream, and track lists are limited to allowed shows. Alternative: leave them unfiltered, which shows rows whose pages are not found.
- **D8** (plans 20, 22) The allowlist applies to music shows too when Music is on. Alternative: limit podcasts only. Matches plan 11's lane and plan 30's gate.
- **D9** (plan 20) A show is in the catalog only when its own feed's id is listed; merge redirects are not followed. Alternative: also match the show a listed feed was merged into.
- **D10** (plans 20, 22) The allowlist is capped at 500 ids, enforced by the API and the sidecar. Alternative: no cap, which risks query strings too long for proxies.
- **D11** (plan 23) With the allowlist set, Search is a title match over the allowed shows instead of a Podcast Index query. Alternative: filter Podcast Index results, which drops rows after the response (R32).
- **D12** (plan 23) Allowlisted search results are listed newest publish first, titles only. Alternative: relevance ranking.
- **D13** (plan 22) Add by RSS rows on Home ignore the allowlist; only the Add by RSS switch controls them. Alternative: hide them whenever the allowlist is set.

### Step 04 — Area C (plans 30–31)

- **D14** (plan 30) The allowlist applies to every kind of show; with Music on, an album or artist must also be on the list. Alternative: the allowlist limits podcasts only.
- **D15** (plan 30) With Music off, every `/album`, `/artist`, `/track`, and `/music/livestream` URL is not found before any request, and a podcast-style URL that leads to music (`/episode/<track>`, `/podcast/<album>`, `/podcast/livestream/<music live item>`) is also not found instead of redirecting. Alternative: only the music routes check, and podcast-style URLs keep redirecting.
- **D16** (plans 30, 31) Playlist, profile, queue, and history pages still show rows for excluded shows, and those rows still play in place; only opening a row leads to not-found. Playlist embeds behave the same. Alternative: hide or disable rows for excluded shows.
- **D17** (plan 30) The clip edit page is gated too; it loads the show only when a catalog setting is active, so default instances make no extra request. Alternative: leave the owner's clip editor ungated.
- **D18** (plan 30) With Music off, the Podcast Index feed page is not found for a music feed even when the show is not in the directory, using the medium Podcast Index reports. Alternative: gate that page only when the show is in the directory.
- **D19** (plan 31) An excluded show's embed returns the not-found shell, not "not available", so the instance does not reveal that the show exists. Alternative: the not-available shell.
- **D20** (plan 31) The `/embed` demo page and `/embed/builder` are not gated. Alternative: hide the builder's source title for excluded shows.

### Step 05 — Area D (plans 40–45)

- **D21** (plan 40) A URL or stored chip for Artists, Albums, or Tracks opens Podcasts and leaves the URL as it is. Alternative: redirect to the clean Podcasts URL.
- **D22** (plan 41) Search removes the whole All / Music row. Alternative: a single All tab.
- **D23** (plan 42) Livestream requests use `av` (podcast and video). Alternative: `podcasts`, which also drops video livestreams.
- **D24** (plan 43) History and Queues open on podcasts even when the active queue is music, and the tab row is hidden. Alternative: keep showing that music queue.
- **D25** (plan 43) A music-only playlist filter becomes All, so music playlists still appear in the full list. Alternative: force podcast playlists only.
- **D26** (plan 44) The player keeps the title and drops the link; the artist byline is omitted. Alternative: the artist name as plain text.
- **D27** (plan 45) The embed demo page drops album and track cards only; episode, clip, chapter, and podcast demos stay.

### Step 06 — Area E (plan 50)

- **D28** (plan 50) Stored follows, credentials, and queue or playlist rows stay; the flag hides them and stops background refresh, and turning the flag back off shows the same library. Alternative: unfollow or wipe device data.
- **D29** (plan 50) Add by RSS queue, history, and playlist rows are omitted in the browser, so a page can be shorter than the server page. Alternative: leave the rows as links into a not-found page.
- **D30** (plan 50) An Add by RSS item that is already playing keeps its player title link, which opens a not-found page; device artist links that point at `/add-by-rss` are omitted. Alternative: change `getMediaPlayerInfoResolution` at every caller.
- **D31** (plan 50) The Podcast Index "Add Feed" button stays; it adds a directory feed, not an Add by RSS feed.

## Order

First planning pass: step 01 split the request into areas A–E.

Second pass after the first review: the allowlist and Music off now limit what workers and the
on-demand add accept, not what the web app shows from the database. Plans 20, 21, 22, 30, and 31
were removed. Step 07 revises area A (settings for API and workers, no cap, lane asserts nothing
is gated). Then steps 08 (new area F, plans 60–69), 09 (area B search, plans 20–29), 10 (area D,
plans 40–49), and 11 (area E, plan 50 and the API refusals) run at once.

Implementation run: six phases in `00-EXECUTION-ORDER.md`. Plan 44 was removed, so plan 50 runs
after 11 only. Plan 63 edits the OPML import before plan 52. Plans 23, then 51, then 62 edit
`apps/api/openapi.yml`. Plan 13 names the local override `catalog.env`; that is the file D4
called `web-catalog.env`.
