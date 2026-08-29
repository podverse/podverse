# Track 13 — Offline downloads (episode files)

**Phase slug:** `mobile-track13-downloads`  
**Master steps:** 13.1–13.10  
**Detail IDs:** 430–439  
**Parallel group:** PG-9 (with 14–16; this set is Track 13 only)  
**Ship bar:** Working download queue + library list + local play + quota sketch. No Track 23
polish. Car durable cache storage stays Track 12 — projection stubs OK.

## Prerequisites

- Track 9b offline-first data layer **done** (`apps/mobile/src/data/`)
- Track 2.26 local `file://` playback **done** (detail 105)
- Track 2.35 native cache write contract stubs **done** (detail 114)
- Library Downloads route exists as placeholder (`LibraryDownloadsScreen`)

## Locked decisions

| Topic               | Choice                                                                 |
| ------------------- | ---------------------------------------------------------------------- |
| Metadata store      | SQLite + Drizzle (Phase F) — same DB as queue                          |
| Media files         | App filesystem (prefer Expo FileSystem; confirm in 13.2)               |
| Web downloader      | **Do not** port `apps/web/src/utils/fileDownloader.ts`                 |
| Native cache        | Call `projectDownloadsIndexToNativeCache` now; Track 12 owns storage   |
| Concurrency v1      | Single active download (raise later)                                   |
| Livestreams         | **Not downloadable** — gate on `item.live_item` (any status); hide UI  |
| HLS / m3u8          | **Not downloadable** — reject `.m3u8` URI + mpegurl MIME types         |
| Progressive formats | First-class via helpers `itemEnclosure` maps; reuse labeled enclosures |
| Offline HLS / ice   | Out of v1                                                              |

## Model mix

| Model     | Steps                          |
| --------- | ------------------------------ |
| Opus 4.8  | 13.1, 13.6, 13.9               |
| Codex 5.3 | 13.2–13.5, 13.7–13.8, 13.10    |

## After this phase

- Track 12 car (uses downloads index for offline browse)
- Track 16 settings/OPML, Track 14 push (PG-9 siblings)
