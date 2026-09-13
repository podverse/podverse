# 732-downloads-settings-storage

**Master step:** P2.1.10 (Settings slice) / P2.1.5
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Move storage management off the Downloads list into **More → Settings → Downloads**.

### Surface

- New `MoreSettingsDownloadsScreen` + limit picker (`OptionListScreen`).
- Settings root gains a Downloads group row.
- Stack title is enough — no in-body "Downloads" heading.

### Four display-only progress bars

Use `typography.title` for usage numbers and [`ProgressTrack`](apps/mobile/src/components/primitives/ProgressTrack.tsx):

1. **Device** — used / total (`getFreeDiskStorageAsync` + `getTotalDiskCapacityAsync`).
2. **Downloaded media** — `downloads/` used / user limit (or "Unlimited").
3. **App data** — `documentDirectory` minus `downloads/` (SQLite, channel/RSS payloads).
4. **Cache** — `cacheDirectory`.

No Clear cache in this pass (deferred in [737](737-defer-storage-cache-precision.md)).

### Limit picker

- Default **10 GB** (was hardcoded 3 GiB).
- Options: 1 / 2 / 5 / 10 / 20 / 50 GB / Unlimited.
- Persist in AsyncStorage via `prefs/downloadPrefs`.

### Two auto-free toggles

1. When my download limit is reached (oldest complete first; no-op if Unlimited).
2. When the phone is low on free space (**1 GB** free threshold). Oldest complete first.

Each toggle has a description. Persist separately (replace the single `downloads.auto_delete` pref).

### Delete all

- Full-width `Button` `variant="danger"`.
- Description: deletes **local media files** and index rows (not “hide from list”).
- [`ConfirmDialog`](apps/mobile/src/components/feedback/ConfirmDialog.tsx) before acting.
- Calls existing `downloadManager.removeAll()`.

## Acceptance criteria

- Downloads list no longer shows storage used / auto-delete / delete-all.
- Settings → Downloads shows four bars, limit row, two toggles, danger Delete all + confirm.
- Default limit is 10 GB; changing it updates the Downloaded media bar denominator.
- Auto-free policies run independently after completions / on storage checks.

## Web parity references

- Mobile-only. Intentional divergence: web has no offline download storage prefs.

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- settings-downloads
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
