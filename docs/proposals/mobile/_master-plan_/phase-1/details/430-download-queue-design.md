# 430-download-queue-design

**Master step:** 13.1
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Design the **download job queue** module for episode enclosure files (not metadata sync).
- Own: enqueue, cancel, retry, concurrency limit, progress events, status machine
  (`queued` → `downloading` → `complete` | `failed` | `cancelled`).
- Persist job state in SQLite via the downloads repository (13.3); files on disk (13.2).
- Screens/hooks call the repository / download manager — never `req*` or raw FileSystem.

## Architecture notes

- Prefer a single `DownloadManager` (or `downloadsRepository` + thin manager) under
  `apps/mobile/src/data/` (or `src/downloads/`) that:
  1. **Eligibility gate** (reject before enqueue — see § Eligibility)
  2. Inserts/updates download rows
  3. Runs the active job(s)
  4. Emits progress to UI (event emitter / store subscription)
  5. Calls `projectDownloadsIndexToNativeCache` on terminal success/delete (13.9)
- Concurrency: start with **1** active download (sketch); document how to raise later.
- Background: iOS/Android background download survival is best-effort in v1 — document OS
  limits; do not block on perfect kill-survival before UI lands.
- Do **not** reuse web `fileDownloader.ts` (DOM `<a download>`).
- Enclosure selection: reuse `@podverse/helpers` `buildLabeledItemEnclosures` + preferred
  media-type resolution (same spirit as web download modal / mobile playback prefs). Prefer
  progressive audio/video sources; never pick an HLS source for offline.

## Eligibility (required)

Pure helper (unit-tested), e.g. `isItemDownloadable(item) → { ok } | { ok: false, reason }`:

| Reject when                                                                    | Reason key (sketch) |
| ------------------------------------------------------------------------------ | ------------------- |
| `item.live_item` set (any `LiveItemStatusEnum`)                                | livestream          |
| Chosen URI ends with `.m3u8` (strip query/hash)                                | hls_playlist        |
| Enclosure `type` is `application/x-mpegurl` or `application/vnd.apple.mpegurl` | hls_playlist        |
| No enclosure source URI                                                        | no_enclosure        |

**Downloadable formats (first-class):** progressive files aligned with
`EXTENSION_MEDIA_TYPE_MAP` / MIME map in
[`itemEnclosure.ts`](/packages/helpers/src/lib/item/itemEnclosure.ts) — audio `mp3` `aac` `opus`
`m4a` `ogg` `wav`; video `mp4` `m4v` `webm` `mov` `mkv`. Unknown progressive MIME may still
enqueue with best-effort extension; livestream / HLS must not.

Full product notes:
[DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md)
§1.1–1.2.

## Edge cases

- Duplicate enqueue for same `item_id` / enclosure hash → no-op or replace in-progress
- App background mid-download → resume or mark failed + retry affordance
- Auth not required for public enclosure URLs; private feeds may need headers later (defer)
- Mixed audio/video enclosures — same queue; engine already plays both; pick one URI via preference
- Alternate enclosures (Podcasting 2.0) — selectable later; v1 may use preferred/default only
- Content-Type response header vs declared enclosure type — prefer declared for ext; do not trust
  HLS Content-Type alone if URI already rejected

## Acceptance criteria

- Written design (this detail + README or module comment) names module path, status enum,
  concurrency, progress API, **and eligibility rules**
- Unit tests cover live_item reject + m3u8 reject + progressive accept
- Clear handoff to 13.2 (storage) and 13.3 (schema)
- No second player invented for downloaded files

## Web parity references

- [DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md) §1–1.2
- [DOCS-MOBILE-DATA-LAYER-OFFLINE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md) Phase F
- Web: livestream UI omits Download; helpers do not MIME-gate (mobile is stricter for offline)

## Verification

```bash
# Design-only: files exist after implementation of 13.1–13.3
test -f apps/mobile/src/data/README.md
npm --prefix apps/mobile run test
```

## Depends on

- Track 9b data layer (`apps/mobile/src/data/`) — done
- Engine local playback (2.26 / 105) — done
