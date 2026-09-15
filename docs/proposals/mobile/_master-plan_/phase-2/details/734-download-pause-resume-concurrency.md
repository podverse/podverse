# 734-download-pause-resume-concurrency

**Master step:** P2.1.5
**Model (author + implement):** Opus 5
**Status:** done

## Scope

Extend the download runner beyond concurrency 1 and cancel-only control.

### Status machine

Add `paused` to `DownloadStatus`. Transitions:

- `queued` → `downloading` (when a slot opens)
- `downloading` ↔ `paused` (Expo `DownloadResumable.pauseAsync` / `resumeAsync`)
- `queued` → `paused` (Pause all / per-row pause before transfer starts)
- `paused` → `queued` or `downloading` on resume
- Existing: `failed` → `queued` (retry); cancel/remove delete the row

### Concurrency

- Cap **5** simultaneous `DownloadResumable` transfers. Neither iOS nor Android throttles Expo
  downloads for us; we own the limit.
- User-configurable concurrency is deferred ([737](737-defer-storage-cache-precision.md)).

### Pause all / Resume all

- **Pause all:** pause every in-flight transfer; mark remaining queued jobs `paused` so nothing
  else starts. Master button becomes **Resume all**.
- **Resume all:** unpause paused jobs and restart the runner. Button returns to **Pause all**.
- Individual row resume also returns the master button to **Pause all**.

### Global activity banner

Downloads do **not** enter the serial sync queue. Extend the bottom chrome (same slot as
`SyncProgressBar`, above the mini player) so in-progress downloads show e.g. “Downloading 2 of 7”.
Sync and downloads may appear as two lines. Library tab badge stays.

### Schema / prefs

- SQLite migration: `channel_id_text`, `channel_title`, `dismissed_from_list` on `download`.
- Quota default **10 GiB**; read user limit from prefs for auto-delete-on-limit.
- Second auto-free policy: device free space under **1 GiB**.

## Acceptance criteria

- Up to 5 transfers run at once; sixth waits `queued`.
- Pause all stops active transfers and holds the queue; Resume all / per-row resume restores.
- Banner reflects active download work without joining the sync queue.
- Both auto-free toggles evict oldest completes when their condition fires.

## Web parity references

- Mobile-only. Engine: [`downloadManager.ts`](apps/mobile/src/downloads/downloadManager.ts).

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- library-downloads
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
