# Android Auto UX — parity with podverse-rn

**Status:** proposal (docs only)
**Parent:** [000-OVERVIEW.md](./000-OVERVIEW.md)
**Master plan:** 12.11–12.15 (shipped scaffold), expand for UX parity; 12.17 DHU checklist
**Old source:** `podverse-rn` `src/lib/carplay/PVCarPlay.android.ts` + `helpers.ts`
**New home:**
[`PodverseMediaLibraryService.kt`](/apps/mobile/modules/podverse-media-engine/android/src/main/java/expo/modules/podversemediaengine/PodverseMediaLibraryService.kt)
— Media3 `MediaLibraryService` (not `react-native-track-player`)

## Constraint

Android Auto binds the **foreground media library service**, not the Activity. Browse trees and
play must work with `adb shell am force-stop com.podverse.app.next`. All tree data comes from the
**native cache**.

## Current shipped tree (to restructure)

```text
podverse_root
├── Library      (browsable; flat add-by-RSS nodes only)
└── Downloads    (playable file:// items)
```

`onGetChildren` for `library/{kind}/{idText}` returns **empty** (no episode drill-down yet).
Play resolves download `filePath` or queue `mediaUrl` (often null from JS today).

## Target root tree (old parity + Music)

Mirror old `TabKeys` with a Music node:

```text
podverse_root
├── Podcasts     (browsable)   // was PodcastTab
├── Music        (browsable)   // NEW
├── Queue        (browsable)   // was QueueTab
└── History      (browsable)   // was HistoryTab
```

Omit a root node only when its cache is empty **and** that matches old empty UX (old still showed
tabs with empty placeholder cells). Prefer **always show** the four roots and use empty
placeholder playable=false items inside — closer to old `"No subscribed Podcasts"` cells.

### Content styles (parity with old)

Old: `setBrowseTreeStyle(CategoryGrid, List)` — categories/podcasts as grid, children as list.

New (Media3 equivalents):

| Level                               | Style intent                         |
| ----------------------------------- | ------------------------------------ |
| Root / Podcasts / Music             | Grid / category style when supported |
| Episodes / tracks / queue / history | List style                           |

## Podcasts node

### Children of `Podcasts`

1. Optional **Now Playing** playable item (when AV now-playing id present in cache) — title, pub
   date subtitle, artwork. `mediaId`: `nowplaying/av` or `item/{idText}` with flag.
2. Subscribed AV channels — browsable. `mediaId`: `podcast/{idText}` (prefer stable `id_text` /
   feed_url over old list **index**).

Empty: single non-playable placeholder — **"No subscribed Podcasts"**.

### Children of `podcast/{idText}`

Episode list from **cached children** (not live network):

- title, subtitle = readable pub date
- artwork (episode or channel)
- `mediaId`: `episode/{channelIdText}/{itemIdText}` (stable ids; avoid old index-only scheme)
- `playable`: yes

## Music node

- Children: albums / music channels — browsable, grid style.
- `mediaId`: `album/{idText}` (or `music/{idText}`).
- Children: tracks — list style, `mediaId`: `track/{channelIdText}/{itemIdText}`.
- Empty: **"No followed Music"**.

## Queue node

Old: flat map of queue items → playable rows (`Queue-{episodeId}`).

New: either

- **A (preferred):** two browsable children `queue/av` and `queue/music`, each listing playable
  items, or
- **B:** one list with section headers if the Media3 browser API in use supports subtitle grouping.

Item fields: title, subtitle = channel title, artwork, `mediaId`: `queue/{medium}/{itemIdText}`.

Empty: **"No items in your queue"**.

## History node

- On browse (debounced, same spirit as old 1s debounce): serve cached history (max **20**).
- Rows: title, channel subtitle, artwork; `mediaId`: `history/{itemIdText}`.
- Empty: **"No items in your history"**.
- Native cannot call `getHistoryItems` API without JS — history must be **projected** while the
  phone app is open (see [030](./030-native-cache-extensions.md)).

## Play resolution (`onAddMediaItems` / play)

Old `handlePlayRemoteMediaId` branched on Queue / History / Episode prefixes and loaded via JS
player actions.

New (all native):

1. Parse `mediaId` prefix.
2. Look up entry in the appropriate cache payload (downloads, channel children, queue, history).
3. Prefer local `file://` when a download exists for that `idText`; else remote enclosure `mediaUrl`.
4. Load into **shared** `PodverseAudioEngine.getOrCreatePlayer` / session — same ExoPlayer as phone.

Do **not** start the RN Activity or wake JS for play.

## mediaId scheme (proposed)

| mediaId                                       | Role                    |
| --------------------------------------------- | ----------------------- |
| `podcasts` / `music` / `queue` / `history`    | Root section nodes      |
| `podcast/{channelIdText}`                     | Browsable podcast       |
| `album/{channelIdText}`                       | Browsable album         |
| `episode/{channelIdText}/{itemIdText}`        | Playable episode        |
| `track/{channelIdText}/{itemIdText}`          | Playable track          |
| `queue/av/{itemIdText}` / `queue/music/{...}` | Playable queue item     |
| `history/{itemIdText}`                        | Playable history item   |
| `nowplaying/av` / `nowplaying/music`          | Optional NP shortcut    |
| `download/{itemIdText}`                       | Keep for nested offline |

Stable `idText` replaces old `Podcast-{index}` / `Episode-{id}-{index}` fragility.

## Diff vs current `PodverseMediaLibraryService.kt`

| Area            | Today                           | After parity                                            |
| --------------- | ------------------------------- | ------------------------------------------------------- |
| Root children   | Library, Downloads              | Podcasts, Music, Queue, History                         |
| Library depth   | Flat nodes, empty grandchildren | Channel → episode/track children from cache             |
| Queue / History | Absent                          | Present from new cache payloads                         |
| Now Playing row | Absent                          | Optional under Podcasts (and Music)                     |
| Downloads root  | Top-level                       | Demote; use `file://` on playable ids (optional nested) |
| mediaId         | `library/...`, `download/...`   | Scheme above                                            |
| Allowed callers | Auto / Automotive (keep)        | Unchanged                                               |

Update [ANDROID-AUTO-DHU-CHECKLIST.md](/apps/mobile/modules/podverse-media-engine/ANDROID-AUTO-DHU-CHECKLIST.md)
when implementing: force-stop, browse four roots, podcast→episode play, queue/history play,
offline file play.

## Out of scope

- Draw-over-apps permission prompt from old RN app
- `react-native-track-player` browse tree APIs
- Automotive OS–only UI beyond Media3 browser contract
