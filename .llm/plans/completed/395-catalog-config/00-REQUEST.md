# Request — Web instance catalog config

## Request

https://github.com/podverse/podverse/issues/395 Do we have enough information now to complete the work? If yes, create the plan. If not, tell me what to ask.

Issue: https://github.com/podverse/podverse/issues/395

Title: Web: instance-level catalog config (podcast allowlist and per-medium toggles)

Author: suorcd. State: open. Label: more info needed.

Issue body:

## Problem Statement

A self-hosted instance can present the whole directory, or the parts of it each visitor chooses to filter. There is no way for an operator to say what the instance itself is about.

The immediate case is a small branded instance built around a handful of shows. The operator wants the web app to offer only those shows and to leave out medium types that do not apply (music and clips, for example), so the catalog reads as a curated app rather than as a full directory with a preference applied.

What exists today:

- **Category filtering** (`apps/web/src/components/Category/CategoriesChip.tsx`, `CategoriesList.tsx`) is a per-view control, and its values come from the feed's category tag. It can express "a category", not "these eleven shows".
- **Medium filtering already exists in the request layer.** `reqChannelGetMany` takes a `medium` and threads it through every branch (`packages/helpers-requests/src/api/channel/channel.ts:166` onwards, covering the `/channel/category/*` and `/channel/global/*` helpers below it). The web app always asks for what a given view wants rather than for what the instance permits.
- **The public web config** builds brand, locale, theme, integrations and a few feature booleans from `NEXT_PUBLIC_*` (`apps/web/src/config/index.ts`). Nothing in it is a catalog policy.

## Proposed Solution

Two optional settings, each useful alone, both defaulting to today's behavior.

**1. Medium policy.** `NEXT_PUBLIC_FEATURES_ENABLED_MEDIUMS`, comma-delimited, default `all-available`, accepting any subset of the RSS-able medium values in `packages/helpers/src/lib/medium.ts` (`podcast`, `video`, `music`, `publisher`). Set to `podcast`, the app stops offering music, albums, artists, tracks, clips and livestreams across chips, sections, routes and search facets.

**2. Channel allowlist.** `NEXT_PUBLIC_CHANNEL_ALLOWLIST`, either a comma-delimited list of channel `id_text` values or an absolute URL to a JSON document holding them, so an operator can maintain the list without a rebuild. When set, the lists that surface the directory (browse, category, global recent and top, search) return only allowlisted channels.

Where this has to be threaded:

- **Chips.** `SUBSCRIBED_CHIPS`, `BROWSE_CHIPS`, `ADD_BY_RSS_CHIPS` and `RECOMMENDATION_CHIPS` (`apps/web/src/utils/mediaListChips.ts:18-40`) are where media kinds become visible, so filtering them is the visible half of the medium policy.
- **Requests.** Pass the policy's medium into the existing `medium` param rather than adding new API surface.
- **Config.** A new block under `public` in `apps/web/src/config/index.ts`, beside `features`.
- **Runtime override.** Any new key has to join the `WebRuntimeConfigEnvKey` union and `webRuntimeConfigEnvKeys` in `apps/web/src/config/runtime-config.ts`, and the allowlist in `apps/web/sidecar/src/server.ts`. Without that it is build-time only, and a self-hoster cannot change it without a rebuild, which defeats the purpose.
- **Docs.** `apps/web/ENV.md`, in the Web Configuration section.

## Alternatives Considered

- **Category filter.** Already exists, per-user, and cannot name an arbitrary set of shows.
- **Blocking API paths at the reverse proxy.** Brittle, and leaves the UI offering links that 404.
- **Forking the web app.** What an operator does today.

## Open Questions

1. **Enforcement point.** Presentation only in the web app, or should the API honor an allowlist so excluded data is not served at all? Presentation is cheap and probably sufficient for a branded app; the API-level version is the stronger promise.
2. **Deep links into excluded content.** 404, redirect to the instance root, or serve the item without the surrounding directory?
3. **Excluded mediums.** Gone entirely, or still reachable by direct URL for people who already have the link?
4. **Subscriptions and Add by RSS.** Scoped by the allowlist, or deliberately left to the visitor? A five-show instance probably still wants people to subscribe.
5. **Identity.** `id_text` or feed URL for shows that are not in the directory?

## Additional Context

Reported against a self-hosted PV NG instance. The driving use case is a companion web app for one publisher's catalog (a branded, single-show instance rather than a general directory).

Assisted-by: Hermes Agent (deepseek-v4.1-flash)

Comment from mitchdowney:

@suorcd this seems potentially complicated if there is an expectation that the custom mobile app API should work with a self-hosted website. We can add environment variables to web, but if the mobile app is also supposed to disable these features, then perhaps it would be possible by making a special request for environment config information from the custom API server that can inform the mobile app what features or feeds should be limited to. Could you elaborate on what functionality you would like?

Comment from suorcd:

I want to setup a custom front end for a specific interest.
So for me Linux and Open Source podcasts; with the Podcast IDs baked into the env file.
I would also want to turn off things like Music and add-by-rss as they are not needed.

As for the mobile side, i would consider that outside of the scope of this request.

## Operator answers

1. Which id goes in the env file? The Podverse id in the podcast URL (`/podcast/<id>`), or the Podcast Index numeric id?

the podcast index numeric id

2. When Music or Add by RSS is turned off, and when a podcast is not on the list, should those pages drop out of Home, Browse, and Search only, with a direct link still opening the page? Or should a direct link show a not-found page?

direct link should show a not-found

3. For the podcasts that stay, which of these should the site still offer: Clips, Livestreams, Playlists, and user profiles?

i think all of them

The operator accepted the plan that settles the rest:

- Web only. Mobile stays as it is. Unset settings keep today's full site.
- Three independent settings. Music, Add by RSS, and the allowlist. Each useful alone.
- Do not build the issue's single medium switch. Set to podcast, that switch would also hide clips and livestreams. Music and Add by RSS are separate on/off settings.
- Music off hides artists, albums, tracks, and music livestreams from navigation, chips, and search. A direct URL to those pages is a not-found page, including embeds. Podcast clips and podcast livestreams stay.
- Add by RSS off hides the feature. Every `/add-by-rss` URL is a not-found page.
- The allowlist is comma-separated Podcast Index numeric ids in the env file. No remote JSON document. Podverse `id_text` is not the key. A show with no Podcast Index id is outside the list.
- When the allowlist is set, Home, Browse, category, global recent and top, search, recommendations, and subscribed show lists contain only those shows. A page of results is a full page of allowlisted rows. Dropping rows after a page returns is not acceptable. Loading the small set by Podcast Index id is acceptable. An optional API filter is acceptable only when the request omits it and every other client still receives today's directory.
- A direct URL is a not-found page when the show, episode, clip, official clip, chapter, podcast livestream, podcast-index feed page, or embed is outside the list.
- Clips, podcast livestreams, playlists, and user profiles stay for shows on the list. A playlist or profile page still loads. A row on it that opens an excluded show is a not-found page.
- Subscribe stays available on allowlisted shows.
- New keys join the runtime config so a self-hoster can change them without a rebuild, and they are documented in `apps/web/ENV.md` under Web Configuration. No fallback values in `apps/web/src/config/index.ts`. Unset-means-today is owned by env templates and validation.

### Review of the first planning pass

The operator reviewed decisions D1–D31 in `00-SUMMARY.md` § Decisions to review. Quoted
verbatim. Every decision not listed under "Changed" stands as the plans wrote it.

Kept: "Leave every other decision as the plans wrote it, including D1, D2, D3, D4, D5, D8, D13, D20, D21, D22, D27, and D28."

Changed:

- **D6** "Do not add a podcast_index_ids query parameter. Workers add only the allowlisted feeds. List URLs stay as they are. Feeds already stored still appear in lists."
- **D7** "Episode, clip, livestream, and track lists show whatever is already stored. New rows come only from feeds the workers add. Do not filter those lists down to the allowlist."
- **D9** "When a listed Podcast Index id was merged away, workers add the surviving show."
- **D10** "No size cap on the allowlist."
- **D11** "With the allowlist set, search is a title match over every channel already stored, in Postgres, with no new database index and no Podcast Index request. That search endpoint is reachable only while the allowlist is set, so the open-mode server never runs the unindexed query. With the allowlist unset, search stays the Podcast Index search that ships now. Search does not offer to add a feed."
- **D12** "Order title matches by closeness. A title that starts with the term comes before a title that only contains it. Newest publish date breaks a tie."
- **D14** "A show already stored still opens when its Podcast Index id is not on the allowlist. The allowlist only limits what workers add from now on. Do not return not-found for a stored show, episode, clip, chapter, livestream, or embed because the id is off the list."
- **D15** "Music off does not turn music URLs into not-found pages. Livestream URLs stay as they are now. Do not add a new medium redirect. Music off stops workers from adding music. Stored music pages, rows, and playback stay as they are now. Music off still hides artists, albums, tracks, and music livestreams from navigation, chips, and search."
- **D16** "After the allowlist is turned on, a show already stored still loads, plays, and opens. Opening a playlist, profile, queue, or history row does not lead to not-found."
- **D17** "Do not gate the clip edit page."
- **D18** "Do not force the Podcast Index feed page to not-found for a music feed."
- **D19** "Do not switch an embed to a not-found shell because of the allowlist or Music off."
- **D23** "Leave the Livestreams list request as it is. Music rows can still show and still open. Do not switch the request to av or podcasts."
- **D24** "Queues: with Music off, show the Music tab when the active queue is music or the music queue has rows. When that tab is shown, show both tabs. When it is hidden, show no tab row and list the podcast queue. History: show the Music tab when any music is in history. When there is none, show no tabs and list podcast history."
- **D25** "Playlists: show the Music filter only when that list has a music playlist. A saved Music filter with nothing to show opens All."
- **D26** "With Music off, the player keeps the title link and the artist byline."
- **D29** "With Add by RSS off, saved rows still show on Home, queue, history, and playlist pages, and can be removed where the row already has remove. Every /add-by-rss page stays not-found. Refuse the parse routes and the route that creates a new follow. Keep unfollow so removal works. Hide every way to add a feed. Assume the operator goes live with Add by RSS already off. If a row was saved anyway, show it and let the visitor remove it."
- **D30** "A playing Add by RSS item keeps playing. The title is plain text. Omit artist links that point at /add-by-rss."
- **D31** "While the allowlist is set, hide the Podcast Index Add Feed button and refuse that on-demand add request. Open mode keeps the button, even when Add by RSS is off. Opening the Podcast Index feed page does not add a feed by itself."

Overall: "Page and embed not-found gates for the allowlist and for Music off come out of the plans."

What this changes for the planners:

- The allowlist and Music off now limit what gets **added** (workers, and the API's on-demand
  add), not what the web app shows from the database. Stored content keeps every page, row,
  embed, and playback it has today.
- "Web only" (R1) no longer holds for enforcement. The workers and the API read catalog settings
  too: workers for what they add (D6, D9, D15), the API for the allowlist-only search endpoint
  (D11), the Add by RSS refusals (D29), and the on-demand add refusal (D31). Mobile code stays
  as it is; a mobile client pointed at a configured API meets the same API refusals.
- The `/add-by-rss` not-found (R23) stays. Music pages and off-list shows are not gated.

## Glossary

- not-found page: the web app's existing not-found result for a route, the same result a missing show already gets
- Podcast Index numeric id: `feed.podcast_index_id`, not the Podverse id in `/podcast/<id>`
- add-by-rss: Add by RSS

## Orientation

Facts checked in this checkout. Area steps do the detailed research.

- `apps/web/src/config/index.ts` — `public.features` today is locales only. The file comment says env is validated at build time in `scripts/validate-env.ts`. Config files do not set fallback values.
- `apps/web/src/config/runtime-config.ts` — `WebRuntimeConfigEnvKey` and `webRuntimeConfigEnvKeys` (`required` and `optional`).
- `apps/web/sidecar/src/server.ts` — a fixed allowlist of `NEXT_PUBLIC_*` keys the sidecar will serve.
- `apps/web/ENV.md` — Web Configuration section, including `NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES`.
- `apps/web/src/utils/mediaListChips.ts` — `SUBSCRIBED_CHIPS` is podcasts, episodes, clips, artists, albums, tracks, livestreams. `BROWSE_CHIPS` adds playlists and users. `ADD_BY_RSS_CHIPS` is podcasts, episodes, artists, albums, tracks, livestreams. `RECOMMENDATION_CHIPS` is podcasts, albums, artists.
- `packages/helpers/src/lib/medium.ts` — `RSS_FEED_MEDIUM_VALUES` is podcast, video, music, publisher. That list is not the switch to build.
- `packages/helpers/src/dtos/feed/feed.ts` — `podcast_index_id: number` on the feed DTO.
- `packages/helpers-requests/src/api/channel/channel.ts` — `reqChannelGetMany` branches on type, sort, range, category, page, and medium. It does not take a podcast-index allowlist.
- `apps/web/src/lib/seo/fetchers.ts` — `getChannelByPodcastIndexIdForSeoPage` and `getInternalFeedForSeoPage` already load by Podcast Index id.
- `apps/web/src/app/podcast/[channel_id]/page.tsx` — already calls `notFound()`. It also reads `channel.feed.podcast_index_id` when the feed is not public.
- `apps/web/src/lib/ssr/loadOrNotFound.ts` — shared not-found path for a failed load.
- Route files that exist and this policy touches: `apps/web/src/app/page.tsx`, `browse/page.tsx`, `search/page.tsx`, `recommendations/page.tsx`, `podcast/[channel_id]/page.tsx`, `episode/[item_id]/page.tsx`, `clip/[clip_id]/page.tsx`, `official-clip/[item_soundbite_id]/page.tsx`, `chapter/[item_chapter_id_text]/page.tsx`, `podcast/livestream/[item_id]/page.tsx`, `podcast-index/feed/[podcast_index_id]/page.tsx`, `album/[channel_id]/page.tsx`, `artist/[channel_id]/page.tsx`, `track/[item_id]/page.tsx`, `music/livestream/[item_id]/page.tsx`, `playlists/page.tsx`, `playlist/[playlist_id]/page.tsx`, `profiles/page.tsx`, `profile/[id_text]/page.tsx`, `add-by-rss/page.tsx` and the other `add-by-rss/**/page.tsx` routes, and the `embed/**/page.tsx` routes for podcast, episode, clip, official clip, chapter, album, playlist, and track.

## Ticket reply

This is an operator deliverable, not a product change. The last implementation step writes `proposed-reply.md` in the set and repeats it in a fenced `text` block. The operator pastes it after the pull request is on `develop`. Do not post it. A few sentences for the people in the thread, with no file names or plan names.

- **Ticket reply** The last plan covers this row.
