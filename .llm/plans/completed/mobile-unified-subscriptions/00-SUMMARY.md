# mobile-unified-subscriptions — merge directory follows + add-by-RSS (app-wide)

**Owner surface:** `apps/mobile` (data layer + Home + Library)
**Master plan tie-in:** new steps **9b.8** (600), **8.16** (601), **9.30** (602)
**Related follow-on:** car step **12.22** (401) consumes this repo — see
`.llm/plans/active/mobile-pg8-car-library-follows/`.

## Why this phase

Legacy podverse-rn treated **subscriptions** as one merged list — directory-followed podcasts +
locally added add-by-RSS feeds shown together everywhere (`combineWithAddByRSSPodcasts`), including
CarPlay. The new app **separates** them: Home "subscribed" fetches directory follows only
(`reqChannelGetMany({ type: 'subscribed' })`), while add-by-RSS lives only in the RSS tab and its
own SQLite repo. That divergence means a user's add-by-RSS feeds never appear alongside their
subscriptions on Home, in Library, or in the car.

**Product decision (master plan Open decisions):** merge add-by-RSS with directory follows **by
default** in every subscribed view, with an optional **filter** to view add-by-RSS only. This phase
builds the shared data layer and wires the two phone surfaces (Home, Library); the car surface
consumes the same repo in the `mobile-pg8-car-library-follows` set.

## Scope

- **9b.8 / 600 — shared repository (foundation).** New
  `apps/mobile/src/data/repositories/subscriptionsRepository.ts`: merge directory follows
  (`account_following_channels`, hydrate display fields) + add-by-RSS follows
  (`addByRssRepository` + `account_following_add_by_rss_channels`) into one deduped, sorted,
  **filterable** (`all` | `addByRss` | `directory`) list. Offline-first cache; `syncFromAccount`
  hydrates directory display fields best-effort on `/auth/me`.
- **8.16 / 601 — Home.** Authenticated Podcasts subscribed view sources from the repo (mixed by
  default) + an add-by-RSS filter chip; persist the filter pref.
- **9.30 / 602 — Library.** New My Library **Subscriptions** list screen (merged, filterable),
  restoring the legacy dedicated subscriptions surface.

## Locked implementation decisions

- **No server change.** `/auth/me` payload unchanged; the client hydrates numeric follows via the
  existing `ApiRequestService` (`reqChannelGetMany`, batch, soft-fail, no raw `fetch`) and caches
  display fields for offline reads.
- **Repository is the single seam.** Home, Library, and car all read
  `subscriptionsRepository.list({ filter })`. Do not re-implement the merge in screens or in
  `accountRepository`.
- **Podcasts medium first.** `SubscribedChannel.medium` is carried for future music mixing
  (artists/albums); wiring music subscribed views is a follow-on.
- **RSS tab stays** as the add-by-RSS management surface; the new Library screen is the merged view.

## Non-goals / follow-on

- Music-medium subscribed mixing (artists/albums), and episode/clip subscribed aggregation.
- Web app parity (web also separates add-by-RSS) — a separate product decision, not in this set.
- Car projection (12.22) — done in `mobile-pg8-car-library-follows` once 9b.8 lands.

## Files

- `00-EXECUTION-ORDER.md` — run order (repo first)
- `01-subscriptions-repository.md` — 9b.8 / 600 (Opus 4.8)
- `02-home-subscribed-mixed-filter.md` — 8.16 / 601 (Codex 5.3)
- `03-library-subscriptions-list.md` — 9.30 / 602 (Codex 5.3)
- `COPY-PASTA.md` — prompts (one per step, model-tagged)

## Definition of done

- `subscriptionsRepository` merges/dedupes/filters directory + add-by-RSS; unit tests pass.
- Home Podcasts subscribed shows the mix by default + working add-by-RSS filter (persisted).
- My Library Subscriptions screen lists the merged, filterable list with correct row routing.
- Master plan 9b.8 / 8.16 / 9.30 flipped to `done` (Tracks + Appendix C); details 600/601/602
  headers → `done`; re-append ` (DONE)` to Tracks 8, 9, 9b headings when their steps are done;
  archive this set to `completed/`.
