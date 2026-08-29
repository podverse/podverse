# PG-8 (slice) — Track 12 native cache foundation

**Phase slug:** `mobile-pg8-car-native-cache`  
**Master steps:** 12.1–12.6  
**Detail IDs:** 380–385  
**Parallel group:** PG-8 (Track 12) — **first slice** only  
**Ship bar:** Durable native cache + JS write path + read-with-JS-dead spikes. No CarPlay
templates, no Android Auto browse tree UI, no Track 23 polish.

## Prerequisites

- Track 2 audio spike + GO (`GO-NO-GO.md`) **done**; cache write hooks reserved (2.35 / 114)
- Track 10 queue projection to native cache call sites **done** (10.22 / 331)
- Track 13 downloads projection **done** (13.9 / 438)
- Projection stubs live at `apps/mobile/src/data/nativeCache/projection.ts`

## Locked decisions

| Topic              | Choice                                                                 |
| ------------------ | ---------------------------------------------------------------------- |
| Schema ownership   | Detail 380 + TS types in `src/data/nativeCache/`                       |
| Write API          | Existing bridge: `writeQueueSnapshot` / `writeDownloadsIndex` /        |
|                    | `writeLibraryBrowseIndex`                                              |
| iOS storage        | App Group preferred; app container OK for spike if entitlement blocked |
| Android storage    | App-private files (or prefs/Room) readable by MediaLibraryService      |
| Car UI             | **Out of this set** — follow-on `mobile-pg8-car-surfaces` (12.7–12.21) |
| Spike without DHU/ | Document alternate file/service-log proof; do not block storage work   |
| CarPlay Sim        |                                                                        |

## Model mix

| Model    | Steps                |
| -------- | -------------------- |
| Opus 4.8 | 12.1–12.6 (all)      |

## After this phase

- Detail + implement **12.7–12.21** (CarPlay scene, Auto browse, offline tree, QA docs)
- Then rest of PG-9 (Track 14 push, 15 deep links, 16 settings/OPML) as preferred
