# Car UX parity — overview (old podverse-rn → new native monorepo)

**Status:** proposal (docs only; not yet implemented)
**Audience:** operators and agents detailing Track 12 CarPlay / Android Auto follow-on work
**Related:** [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md),
master plan Track 12 ([001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)),
[mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc)

**Subscriptions source:** the car **Podcasts** section lists the **merged** subscribed list
(directory follows + add-by-RSS), matching legacy `subscribedPodcasts` (which combined add-by-RSS
via `combineWithAddByRSSPodcasts`). That merged list is the shared
[600 unified subscriptions repository](/docs/proposals/mobile/_master-plan_/details/600-unified-subscriptions-repository.md)
(step 9b.8), consumed by car step 12.22
([401](/docs/proposals/mobile/_master-plan_/details/401-car-library-directory-follows.md)) as well
as Home (8.16) and Library (9.30) — do not build a car-only merge.

## Goal

Make **CarPlay and Android Auto** in the new monorepo as identical as possible to the old
[podverse-rn](https://github.com/podverse/podverse-rn) car UX — same sections, drill-down,
empty states, and play behaviors — while fixing the old limitation that **the phone app had to
be running**.

Naming may differ (old `NowPlayingItem` / `subscribedPodcasts` vs new DTOs / `id_text` /
`MediumEnum`). **UX layout and functionality** must match.

## Hard constraint: native, app-closed

| Era              | Stack                                                                 | Limitation                                              |
| ---------------- | --------------------------------------------------------------------- | ------------------------------------------------------- |
| Old (`podverse-rn`) | JS: `react-native-carplay` + `react-native-track-player` browse tree | Car menus/play needed the JS runtime alive              |
| New (monorepo)   | Native: Swift CarPlay scene + Kotlin `MediaLibraryService`            | Must work with Activity/JS **force-stopped**            |

The new surfaces read a **durable native cache** that JS writes while the phone app is open.
Car services never start JS to browse or play. See the architecture doc linked above.

## Old UX summary (source of truth)

Primary sources in `podverse-rn` (branch `develop`):

- `src/lib/carplay/PVCarPlay.ts` — iOS CarPlay
- `src/lib/carplay/PVCarPlay.android.ts` — Android Auto
- `src/lib/carplay/helpers.ts` — episode fetch + load into player

### Root layout (both platforms)

Three top-level sections:

1. **Podcasts** — subscribed podcasts (grid on Android); **merged** directory follows + add-by-RSS
   (see **Subscriptions source** above)
2. **Queue** — upcoming queue items
3. **History** — recent history (capped at **20** items)

iOS: `TabBarTemplate` with system images `music.note.list`, `list.bullet`, `timer`.
Android Auto: browse-tree root nodes `PodcastTab` / `QueueTab` / `HistoryTab`.

### Podcasts tab detail

- Optional **Now Playing** section pinned at the top (episode title + readable pub date + artwork).
- Below: subscribed podcast list (title + artwork).
- Empty: `"No subscribed Podcasts"` (disabled placeholder cell).
- Select podcast → push episode list (header = podcast title).
- Episodes: title + readable pub date; select → load and show now-playing.

Offline path (helpers): when no network, episodes come from **downloaded** episodes for that
podcast.

### Queue / History tabs

- Flat list of items (title, podcast subtitle/title, artwork).
- Empty: `"No items in your queue"` / `"No items in your history"`.
- Select → load into player.
- History refreshes when entering the History tab (debounced on Android).
- iOS: leaving the now-playing template refreshes Queue and History.

### Player

- iOS: push `NowPlayingTemplate`, `CarPlay.enableNowPlaying(true)`.
- Android: play via track-player / remote media id; now-playing is the system media session.
- Load logic: if already now-playing → toggle play; else convert to now-playing item and load with
  resume position from history.

### Android mediaId scheme (old)

| Prefix / key              | Meaning                                      |
| ------------------------- | -------------------------------------------- |
| `PodcastTab` / `QueueTab` / `HistoryTab` | Root browse nodes                   |
| `Podcast-{index}`         | Subscribed podcast by list index             |
| `Episode-{podcastId}-{index}` | Episode under a podcast (cached)         |
| `Queue-{episodeId}`       | Queue item                                   |
| `History-{episodeId}`     | History item                                 |

Content styles: root/podcasts = `CategoryGrid`; episode lists = `List`.

### Draw-over permission (Android only, old)

Old app asked for “draw over other apps” once for Auto. The new native service path does **not**
need that UX for browse/play with the app closed; do not port it unless a later product need
appears.

## Old → new naming map

| Old (`podverse-rn`)                         | New (monorepo)                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| `reactn` `subscribedPodcasts`               | Account follows + add-by-RSS → **library browse** native-cache nodes           |
| `session.userInfo.queueItems`               | Queue repositories → **queue snapshot(s)** in native cache                     |
| `session.userInfo.historyItems`             | History repository → **history** native-cache payload (new)                    |
| `downloadedPodcasts` / downloads            | `downloadsRepository` → **downloads index** native cache                       |
| `PVAudioPlayer.setBrowseTree(...)`          | `PodverseMediaLibraryService` (`onGetChildren` / playable `MediaItem`s)        |
| `react-native-carplay` templates            | Native Swift `CPTabBarTemplate` / `CPListTemplate` / `CPNowPlayingTemplate`    |
| `react-native-track-player`                 | **Forbidden** — first-party `podverse-media-engine` only                       |
| `TabKeys` / `MediaKeys`                     | Stable `mediaId` / CarPlay item ids (see [020](./020-android-auto-ux.md))      |
| `NowPlayingItem`                            | `DTOQueueResource` / item + channel DTOs; car cache uses `idText` + URLs       |

## Medium model (new schema — UX must honor it)

Web and `@podverse/helpers` already split **podcasts (AV)** from **music**:

- `MediumEnum` — podcast/video family vs `Music` / `MusicL` / `PublisherMusic` (artist)
- Two queue buckets: **AV** and **Music** (`getQueueForMedium`, `QUERY_PARAMS_QUEUE_MEDIUMS`)
- Web sidebar: Podcasts group vs Music group; Library queues/history use **AV | Music** tabs
- Auto-queue: music = **season/track order**; podcast = **pub-date**
- Controls: music = **track previous/next**; podcast = **time jump** (±)

Old car UX only had a single **Podcasts** tab (no music). The new car must stay close to the old
layout **and** support music/albums at a basic level consistent with web.

## Recommended root layout (both surfaces)

Four root sections (CarPlay allows up to five tabs; four is safe):

```text
Podcasts | Music | Queue | History
```

| Section    | Contents (parity intent)                                                                 |
| ---------- | ---------------------------------------------------------------------------------------- |
| **Podcasts** | Pinned **Now Playing** (when AV item playing) + subscribed AV channels → episodes → play |
| **Music**    | Followed albums/artists (music medium) → tracks → play (new “extra tab”)                 |
| **Queue**    | Two sections: **AV** and **Music** (closest to old single Queue while honoring dual queues) |
| **History**  | Recent ~20 items (same cap as old)                                                       |

**Downloads:** old car did not expose a top-level Downloads tab; offline playback appeared when
browsing a podcast with no network (downloaded episodes). New proposal: keep offline via

1. resolved `file://` URLs on cached children / queue / history entries when a download exists, and
2. optionally a **Downloads** child under Podcasts (or Music) later — **not** a fifth root tab in
   v1, so the root stays close to the old three tabs + Music.

Player medium behavior is owned by `@podverse/playback-core` — see
[040-player-medium-parity.md](./040-player-medium-parity.md). Native car code stays thin: browse +
resolve URL + call the shared engine.

## Reconciliation with shipped Android Auto (Track 12)

Shipped today (`PodverseMediaLibraryService.kt`):

- Root: **Library** + **Downloads** (omit empty)
- Library = flat add-by-RSS follow nodes only; **no** episode children
- No Queue / History / Now Playing / Music sections

This proposal **restructures** that browse tree to the four-section layout above. Treat the
Library/Downloads v1 as a **scaffold** that proved app-closed browse+play; UX parity work
supersedes the root IA. Detail docs to expand or revise when implementing:

- [386–389](/docs/proposals/mobile/_master-plan_/details/386-ios-carplay-scene-config.md) (CarPlay)
- [391–394](/docs/proposals/mobile/_master-plan_/details/391-android-auto-browse-tree.md) (Android Auto)
- [401](/docs/proposals/mobile/_master-plan_/details/401-car-library-directory-follows.md) (directory follows — absorbed into library-browse split)

Enabling work is documented in [030-native-cache-extensions.md](./030-native-cache-extensions.md).

## Proposal set index

| Doc                                                         | Focus                                      |
| ----------------------------------------------------------- | ------------------------------------------ |
| [000-OVERVIEW.md](./000-OVERVIEW.md)                        | This document                              |
| [010-carplay-ios-ux.md](./010-carplay-ios-ux.md)            | iOS CarPlay templates + parity             |
| [020-android-auto-ux.md](./020-android-auto-ux.md)          | Android Auto browse tree + parity          |
| [030-native-cache-extensions.md](./030-native-cache-extensions.md) | Cache schema so UX works app-closed |
| [040-player-medium-parity.md](./040-player-medium-parity.md) | Podcast vs music player/autoqueue         |

## Open questions (operator)

1. **History split:** single recent list (old) vs AV | Music sections inside History (web Library
   tabs)? Default in this proposal: **single list** for car simplicity.
2. **Artists:** nest under Music (artist → albums → tracks) or flatten albums only for car v1?
   Default: **albums (+ add-by-RSS music feeds) flattened**; artists optional follow-on.
3. **Downloads root:** confirm **no** top-level Downloads tab in v1 (prefer offline via resolved
   URLs + optional nested node later).
4. **Episode window:** how many episodes/tracks per channel in the native cache (performance vs
   parity)? Suggest **most recent 50** for podcasts; **full album** for music when small, else
   season window.
5. **CarPlay entitlement:** block implementation of 010 until Apple entitlement + App Group are
   provisioned (master plan 12.16 iOS).
