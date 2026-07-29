# CarPlay (iOS) UX — parity with podverse-rn

**Status:** proposal (docs only)
**Parent:** [000-OVERVIEW.md](./000-OVERVIEW.md)
**Master plan:** 12.7–12.10, 12.16 (iOS entitlement), 12.18
**Old source:** `podverse-rn` `src/lib/carplay/PVCarPlay.ts` + `helpers.ts`
**New home:** native Swift under `apps/mobile/modules/podverse-media-engine/ios/` (and app scene
config) — **not** `react-native-carplay`

## Constraint

CarPlay templates run in a **CarPlay scene**. They must build lists from the **native cache** and
bind now-playing / remotes to **`PodverseAudioEngine.shared`** (single `AVPlayer`). JS must not be
required after the phone app has written the cache.

**Gate:** Apple CarPlay entitlement + App Group (12.16 iOS). Until provisioned, scene config and
simulator checklist stay blocked; cache + engine work can still proceed.

## Root: `CPTabBarTemplate` (four tabs)

Old: three tabs — Podcasts, Queue, History (`TabBarTemplate`).

New (parity + music):

| Tab      | System image (parity) | Template type    |
| -------- | --------------------- | ---------------- |
| Podcasts | `music.note.list`     | `CPListTemplate` |
| Music    | e.g. `music.note`     | `CPListTemplate` |
| Queue    | `list.bullet`         | `CPListTemplate` |
| History  | `timer`               | `CPListTemplate` |

`onTemplateSelect` / `onAppear` equivalents:

- **Queue** — refresh from queue native-cache payload(s).
- **History** — refresh from history native-cache payload (old refreshed on tab select).
- **Podcasts / Music** — refresh channel lists from library-browse cache (split by medium).

## Podcasts tab (parity with old)

### Sections

1. **Now Playing** (optional) — when an AV item is current:
   - Primary text: episode title (fallback: Untitled Episode)
   - Detail: readable pub date / live start
   - Image: podcast/episode artwork from cache
   - Select → show now-playing (or resume) without changing item if already loaded
2. **Podcasts** — subscribed AV channels (directory follows + add-by-RSS podcast/video family):
   - Primary: channel title
   - Image: artwork
   - Empty: disabled row **"No subscribed Podcasts"** (old string)

### Drill-down: episodes

`CarPlay.pushTemplate` with a `CPListTemplate`:

- Header / section header: podcast title
- Rows: episode title + readable pub date (old `detailText`)
- Empty / loading: old used `"Loading..."` empty variants while fetching; new reads **pre-cached**
  children — if empty, show a disabled **"No episodes"** row (no network fetch from CarPlay)

Select episode → load via shared engine + push now-playing (below).

## Music tab (new; same interaction pattern)

- List followed **albums** (and music add-by-RSS) with artwork.
- Optional later: artists as intermediate nodes.
- Drill-down: **tracks** (title + track/season detail, not pub-date-first).
- Empty: **"No followed Music"** (or i18n equivalent).
- Select track → load Music queue / engine + now-playing.

## Queue tab (parity + dual queues)

Old: one flat list from `session.userInfo.queueItems`.

New: **two sections** in one `CPListTemplate`:

| Section | Source                       |
| ------- | ---------------------------- |
| AV      | AV queue snapshot entries    |
| Music   | Music queue snapshot entries |

Row fields (match old NPI rows):

- Primary: item title
- Detail: channel / podcast title
- Image: artwork when present

Empty: if both empty, one disabled row **"No items in your queue"**.

Select → resolve `mediaUrl` from cache entry (file:// preferred) → load engine → now-playing.

## History tab

- Flat list, **most recent 20** (hard cap, same as old).
- Row: title + channel title + artwork.
- Empty: **"No items in your history"**.
- Select → play + optionally refresh history projection when returning.

## Now playing: `CPNowPlayingTemplate`

Old:

```text
new NowPlayingTemplate({ id, onWillDisappear: refresh queue + history })
CarPlay.pushTemplate(playerTemplate)
CarPlay.enableNowPlaying(true)
```

New:

- Push `CPNowPlayingTemplate` (or rely on system Now Playing when session is configured — prefer
  explicit parity with old push behavior where CarPlay APIs allow).
- Bind metadata to **`MPNowPlayingInfoCenter`** already owned by `PodverseAudioEngine`.
- Remote commands: **one** shared `MPRemoteCommandCenter` registration on the engine (phone lock
  screen + CarPlay). Do not register a second command center in the CarPlay scene.
- On dismiss / `willDisappear`: refresh Queue and History templates from cache (old behavior).

## Field-by-field parity checklist

| Old behavior                                 | New CarPlay                                              |
| -------------------------------------------- | -------------------------------------------------------- |
| Root tab bar Podcasts / Queue / History      | Same + **Music** tab                                     |
| Now Playing section on Podcasts              | Same for AV; optional Now Playing on Music when music NP |
| Podcast → episodes list                      | Same; children from native cache                         |
| Episode / queue / history → play             | Same; URL from cache, shared AVPlayer                    |
| History limit 20                             | Same                                                     |
| Empty strings for podcasts / queue / history | Same copy (via i18n keys later)                          |
| Loading empty view while network fetch       | Replaced by cache (no JS fetch); show empty if missing   |
| `enableNowPlaying(true)`                     | Engine + CarPlay now-playing enabled                     |
| App must be running                          | **Must not** — scene reads cache only                    |

## Files / integration points (when implementing)

- Scene / entitlement: Info.plist CarPlay scene, entitlements (12.7 / 12.16)
- Templates: new Swift types beside `PodverseNativeCache.swift` / `PodverseAudioEngine.swift`
- Cache readers: extended schemas in [030-native-cache-extensions.md](./030-native-cache-extensions.md)
- Manual QA: CarPlay simulator checklist (12.18) — mirror old connect/disconnect + background launch

## Out of scope

- CarPlay **video** (deferred master plan 21.8)
- Porting `react-native-carplay` or keeping a JS CarPlay bridge
- Pixel-perfect artwork sizing beyond CarPlay list conventions
