# PG-8 (slice 2) — Android Auto browse + play

**Phase slug:** `mobile-pg8-car-android-auto`
**Master steps:** 12.11–12.17, 12.19, 12.20 (Android portions)
**Detail IDs to author:** 390, 391, 392, 393, 394, 395 (Android), 396, 398 (Android), 399
**Parallel group:** PG-8 (Track 12) — **second slice** (after `mobile-pg8-car-native-cache`)
**Ship bar:** Android Auto can **browse** the durable native cache and **play** through the shared
engine with the phone app force-stopped (DHU-proven). No iOS CarPlay (12.7–12.10 / 12.18), no
Track 23 polish.

## Why Android first

- `PodverseMediaLibraryService` already exists, connects to the **service not the Activity**, and
  reads the native cache on `onCreate` (`debugDump`, step 12.6). No Apple entitlement gate.
- iOS CarPlay (12.7–12.10) needs an Apple **CarPlay entitlement** (portal approval) → deferred to a
  later slice; the Android Auto **Play Console** declaration (12.16) is an operator checklist here.

## Prerequisites (done)

- Native cache foundation 12.1–12.6 (`mobile-pg8-car-native-cache`, archived)
- Durable Android reader: `PodverseNativeCache.read(context, kind)` (12.3)
- Payload shapes: `NativeCacheBrowseNode` / `NativeCacheDownloadEntry` / `NativeCacheQueueEntry`
  (`apps/mobile/src/data/nativeCache/projection.ts`, schema 12.1 / detail 380)
- Shared engine singleton `PodverseAudioEngine` + one `MediaLibrarySession` (Track 2 GO)

## Locked decisions

| Topic                | Choice                                                                       |
| -------------------- | ---------------------------------------------------------------------------- |
| Browse source        | `PodverseNativeCache.read` of `library-browse` + `downloads` JSON (no SQLite) |
| Tree roots (v1)      | **Library** (browse nodes) + **Downloads** (offline items) under one root    |
| Play action          | MediaItem → shared `PodverseAudioEngine` player; policy stays in playback-core |
| URL resolution       | Same as phone: offline `file://` path if present, else remote enclosure      |
| Queue node           | Now-playing/upcoming surfaced later; v1 browse = library + downloads          |
| Entitlement (iOS)    | **Out of this slice** (12.7–12.10 / 12.16 CarPlay / 12.18 later)              |
| Play Console declare | 12.16 Android portion = operator checklist doc (agent documents, you submit) |
| Proof                | Android Auto **DHU**; if unavailable, force-stop + service-log fallback       |

## Model mix

| Model    | Steps                          |
| -------- | ------------------------------ |
| Opus 4.8 | 12.11–12.15 (implementation)   |
| Auto     | 12.16 / 12.17 / 12.19 (docs)   |
| Codex 5.3| 12.20 (abcmemory rule)         |

## After this slice

- iOS CarPlay scene + templates + now-playing + remote commands (12.7–12.10) once the CarPlay
  entitlement is provisioned (12.16 iOS portion), + CarPlay simulator checklist (12.18).
- Then rest of PG-9 (Track 14 push, 15 deep links, 16 settings/OPML).
