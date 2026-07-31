# Native cache extensions — enable car UX app-closed

**Status:** proposal (docs only)
**Parent:** [000-OVERVIEW.md](./000-OVERVIEW.md)
**Consumers:** [010-carplay-ios-ux.md](./010-carplay-ios-ux.md),
[020-android-auto-ux.md](./020-android-auto-ux.md)
**Current code:**
[`apps/mobile/src/data/nativeCache/projection.ts`](/apps/mobile/src/data/nativeCache/projection.ts),
repositories under `apps/mobile/src/data/repositories/`,
`PodverseNativeCache` (Swift/Kotlin), `PodverseNativeCacheModel.kt`

## Why this doc exists

CarPlay / Android Auto **cannot call JS or the network** when the phone app is force-stopped. The
old podverse-rn car UX fetched episodes and history at browse time from the live RN store. The new
UX needs the same trees **pre-materialized** in durable JSON that native services already know how
to read.

Today’s cache is a partial scaffold: queue snapshot (upcoming only, `mediaUrl` null), downloads
index, library browse (**add-by-RSS only**, no children). That is enough for a Library/Downloads
demo, not for Podcasts → episodes / Music / Queue / History parity.

## Current payloads (baseline)

| File                        | Role                        | Gaps vs parity UX                                         |
| --------------------------- | --------------------------- | --------------------------------------------------------- |
| `queue-snapshot.json`       | nowPlayingIdText + upcoming | Single queue; no `medium_id`; `mediaUrl` always null      |
| `downloads-index.json`      | completed downloads         | Missing artwork / enclosure fallback on some writers      |
| `library-browse-index.json` | flat follow nodes           | RSS-only; no directory follows; no episode/track children |

Envelope (keep): `schemaVersion`, `updatedAtMs`.

## Proposed extensions

Bump `schemaVersion` when shapes change incompatibly; readers must tolerate missing optional
fields (empty tree, never crash — same as today’s tolerant parsers).

### 1. Library browse — medium split + directory follows + playlists

Extend `NativeCacheBrowseNode`:

```ts
kind: 'podcast' | 'album' | 'artist' | 'playlist' | 'category';
mediumBucket: 'av' | 'music'; // derived from MediumEnum helpers
idText: string; // channel id_text or feed_url
title: string;
artworkUrl?: string | null;
childCount?: number | null;
```

**Writers** (`accountRepository` / follow sync):

- Project `account_following_add_by_rss_channels` (existing) **and** hydrate
  `account_following_channels` + `account_following_playlists` (closes master plan **12.22**).
- Split nodes: AV family → Podcasts tab; Music / MusicL / publisher-music → Music tab.
- Prefer smallest hydration that yields **title** (required) + artwork (optional).

### 2. Channel children (episodes / tracks) — new payload or nested file

Car cannot call `getEpisodesForPodcast`. Cache a window of children per channel:

**Option A (recommended):** `library-children/{channelIdText}.json` (or one
`library-children-index.json` map keyed by `idText`).

```ts
type NativeCacheChannelChildren = {
  schemaVersion: 1;
  updatedAtMs: number;
  channelIdText: string;
  mediumBucket: 'av' | 'music';
  items: Array<{
    idText: string;
    title: string;
    subtitle?: string | null; // pub date or track/season label
    artworkUrl?: string | null;
    mediaUrl: string | null; // enclosure or file:// if downloaded
    durationMs?: number | null;
  }>;
};
```

**Window:** podcasts — most recent **N** (suggest 50); music albums — prefer full album when
small, else season-forward window. Refresh when user opens channel on phone, after sync, or on
download complete for that channel.

**Option B:** embed `children[]` on each browse node — simpler but blows up `library-browse-index`
size; avoid for large libraries.

Native `onGetChildren` / CarPlay push-list reads Option A by `channelIdText`.

### 3. Dual queue snapshots (AV + Music)

Old car had one queue. New product has two (`MediumEnum.AV` / `MediumEnum.Music`).

**Option A (recommended):** two files:

- `queue-snapshot-av.json`
- `queue-snapshot-music.json`

Same shape as today’s snapshot, plus:

```ts
mediumBucket: 'av' | 'music';
nowPlayingIdText: string | null;
entries: NativeCacheQueueEntry[]; // include playable URLs
```

**Option B:** one file with `queues: { av: ..., music: ... }`.

Each `NativeCacheQueueEntry` must set:

- `mediaUrl` — remote enclosure **or** `file://` when a complete download exists for `idText`
- `artworkUrl`, `podcastTitle` / channel title, `durationMs` when known

Wire `queueRepository.projectQueueForQueue` (and now-playing updates) to project **both** buckets
whenever either changes. Soft-fail if bridge unavailable (keep current pattern).

### 4. History payload (new)

```ts
// history-index.json
type HistoryIndexProjection = {
  schemaVersion: 1;
  updatedAtMs: number;
  entries: Array<{
    idText: string;
    title: string;
    channelTitle?: string | null;
    artworkUrl?: string | null;
    mediaUrl: string | null;
    mediumBucket?: 'av' | 'music';
    playedAtMs?: number | null;
  }>; // max 20, most recent first
};
```

**Writer:** history repository after load/page refresh and after play transitions that append
history. Cap at **20** (old CarPlay/Android Auto limit).

Without this file, History tab cannot work app-closed.

### 5. Downloads index (keep + enrich)

Keep `downloads-index.json`. Enrich writer to include `artworkUrl` and optional remote `mediaUrl`
fallback. Play path: car prefers `filePath` → `file://`.

Optional: expose Downloads as a **nested** browsable under Podcasts later; not required for v1 root
IA.

### 6. Pre-resolved URLs at write time

Today queue `mediaUrl` is always `null` in TS projection. Car play for non-download items fails
or no-ops. **Acceptance:** every playable car row written to cache includes a non-null `mediaUrl`
or a download `filePath` that native can turn into `file://`. Resolve enclosure the same way as
the phone engine (Track 12.15 intent).

## Reader / writer matrix

| Layer                                                     | Work                                              |
| --------------------------------------------------------- | ------------------------------------------------- |
| TS `projection.ts`                                        | New types, project helpers, schemaVersion         |
| `accountRepository`                                       | Medium-split nodes + directory/playlist hydration |
| `queueRepository`                                         | Dual snapshots + resolved mediaUrl                |
| History repository                                        | New history projection                            |
| Channel/item sync or detail loaders                       | Write `library-children` windows                  |
| `downloadsRepository`                                     | Artwork + keep complete-only filter               |
| Kotlin `PodverseNativeCache` / `PodverseNativeCacheModel` | Parse new files; empty-safe                       |
| Swift `PodverseNativeCache`                               | Same files for CarPlay scene                      |
| `PodverseMediaLibraryService`                             | Map four roots → payloads (see 020)               |
| CarPlay scene                                             | Same payloads (see 010)                           |

## Soft-fail and privacy

- Bridge write failures remain soft-fail in `__DEV__` warn style; car shows empty sections.
- On logout: clear **all** car cache files (library, children, queues, history, downloads
  projection as today for library).
- Do not put auth tokens in car cache JSON.

## Verification (operator, after implementation)

- Seed phone app (follows, queues AV+Music, history, downloads) → force-stop → DHU / CarPlay
  simulator browse all four roots and play without opening the app.
- Confirm on-disk files under `files/native-cache` (Android) /
  Application Support `native-cache` (iOS).
- Regression: existing download-only play still works.

## Relationship to master plan

| Step        | Note                                                              |
| ----------- | ----------------------------------------------------------------- |
| 12.1–12.6   | Schema/storage/spikes done — **extend**, do not replace wholesale |
| 12.12–12.15 | Browse/play scaffold — restructure per 020                        |
| 12.22       | Directory follows — folded into library-browse extension here     |
| 12.7–12.10  | CarPlay — depends on these payloads                               |

This proposal set does **not** replace Track 12 detail files; it is the UX parity brief those
details should implement against.
