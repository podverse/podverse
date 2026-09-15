# 03 — Settings Downloads

**Cursor model:** Codex 5.3
**Reasoning:** medium

## Scope

Detail: [732](/docs/proposals/mobile/_master-plan_/phase-2/details/732-downloads-settings-storage.md).

1. `MoreSettingsDownloadsScreen` — four ProgressTrack bars, limit nav row, two toggles with
   descriptions, danger Delete all + ConfirmDialog.
2. Limit picker screen via `OptionListScreen`.
3. Wire navigation: `MORE_STACK_ROUTES.MoreSettingsDownloads` (+ limit route), Settings hub row.
4. Storage measurement helpers (device / downloads dir / app data / cache).

## Files

- `apps/mobile/src/screens/more/MoreSettingsDownloadsScreen.tsx` (new)
- `apps/mobile/src/screens/more/MoreSettingsDownloadLimitScreen.tsx` (new)
- `apps/mobile/src/screens/more/MoreSettingsScreen.tsx`
- `apps/mobile/src/navigation/index.tsx`
- `apps/mobile/src/downloads/downloadStorageStats.ts` (new, optional)
- i18n keys (also covered in plan 06)

## Do not

- Do not run tests during agent work.

## Verification (operator)

```bash
# Mobile Maestro
npm run mobile:e2e:test -- settings-downloads
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
