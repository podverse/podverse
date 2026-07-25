# 01 — Design + storage + schema (13.1–13.3)

**Cursor model:** Opus 4.8  
**Details:** 430, 431, 432  
**Ship bar:** Architecture + schema only — no full UI polish.

## Goal

Lock download job-queue design, choose filesystem/download API, and land SQLite downloads
index + repository (Phase F).

## Context (read first)

- Details 430–432
- [DOCS-MOBILE-DATA-LAYER-OFFLINE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md) Phase F
- [DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md) §1–1.2
- `packages/helpers/src/lib/item/itemEnclosure.ts` (format maps + labeled enclosures)
- `apps/mobile/src/data/db/schema.ts`, `migrations.ts`, `repositories/`
- `apps/mobile/src/data/nativeCache/projection.ts` (`projectDownloadsIndexToNativeCache`)
- Skills: **mobile-data-layer**, **mobile-expo-monorepo** (Expo install peers)
- Rules: **mobile-react-native**, **mobile-carplay-android-auto** (projection on mutate)

## Tasks

1. **Design (13.1)** — Add `DownloadManager` (or equivalent) documenting status machine,
   concurrency (1), progress API, cancel/retry, and **`isItemDownloadable` eligibility**
   (reject `live_item`, HLS/m3u8, missing URI). Unit-test the helper. Point screens at
   repository/manager only. Reuse `@podverse/helpers` enclosure labeling for URI + ext selection.
2. **Storage (13.2)** — Choose Expo FileSystem (preferred) or document alternative; add deps via
   `npm --prefix apps/mobile exec -- expo install …`; define on-disk path layout **with
   progressive file extensions** (never `.m3u8` as the stored media).
3. **Schema (13.3)** — Drizzle table + migration including `enclosure_mime` / `media_type` /
   `file_extension`; `downloadsRepository` CRUD; call projection stub on mutate; update
   `apps/mobile/src/data/README.md`.
4. Mark **13.1–13.3** `done` in master plan Tracks + Appendix C; detail headers `done`.

## Out of scope

- Full episode UI / library list (02)
- Track 12 durable native cache storage
- Porting web `fileDownloader.ts`
- Offline HLS segment caching / ice streams

## Acceptance

- Design + storage decision recorded, including format + livestream gates
- DB migration applies; repository usable by later prompts
- Eligibility unit tests green (operator runs tests)
