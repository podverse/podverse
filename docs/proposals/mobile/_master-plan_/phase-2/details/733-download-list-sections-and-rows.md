# 733-download-list-sections-and-rows

**Master step:** P2.1.5
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Reshape [`LibraryDownloadsScreen`](apps/mobile/src/screens/library/LibraryDownloadsScreen.tsx) into a
monitor-only list. Storage controls move to Settings ([732](732-downloads-settings-storage.md)).

### Master controls

- **Pause all** / **Resume all** at the top (see [734](734-download-pause-resume-concurrency.md)).
- **Clear all finished** — sets `dismissedFromList` on complete rows. Files stay, stay playable,
  still count toward storage and Home downloaded counts. No orphans.

### Sections (only when non-empty)

1. **In progress** — `queued` / `downloading` / `paused`
2. **Failed** — `failed` (tap retries)
3. **Completed** — `complete` and not dismissed

### Rows

Efficient layout consistent with episode rows, without Play:

- `LIST_ROW_ARTWORK_SIZE` artwork
- Channel title, item title
- Status label
- `ProgressTrack` only while queued / downloading / paused
- No per-row Remove chrome — swipe reveals Remove ([735](735-swipe-action-row.md))

### Tap behavior

| Status | Tap |
| ------ | --- |
| queued / downloading / paused | Pause or resume that job |
| failed | Retry (re-queue) |
| complete | Open episode detail (track later) |

### Channel identity

Persist `channelIdText` + `channelTitle` (+ artwork fallback) on the download row at enqueue so
unsubscribed items still show a channel name without a live join.

## Acceptance criteria

- No in-body Downloads heading; no Play; no storage section on this screen.
- Sections appear only when they have rows.
- Clear all finished hides completes without deleting files; episode play still prefers local file.
- Rows show art, channel, title, status, and progress when transferring.

## Web parity references

- Mobile-only. Row visual family: [`HomeFeedRow`](apps/mobile/src/screens/home/HomeFeedRow.tsx).

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- library-downloads
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
