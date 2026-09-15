# 04 — Downloads list screen

**Cursor model:** Codex 5.3
**Reasoning:** medium

## Scope

Detail: [733](/docs/proposals/mobile/_master-plan_/phase-2/details/733-download-list-sections-and-rows.md).

Rewrite `LibraryDownloadsScreen`:

- Master Pause all / Resume all + Clear all finished
- SectionList for In progress / Failed / Completed (omit empty)
- Compact download rows (art, channel, title, status, ProgressTrack)
- SwipeActionRow for Remove
- Tap: pause/resume, retry, or navigate to episode
- No storage chrome; no in-body title; no Play

## Files

- `apps/mobile/src/screens/library/LibraryDownloadsScreen.tsx`
- `apps/mobile/src/components/download/DownloadMonitorRow.tsx` (new, optional)
- `apps/mobile/src/downloads/useDownloads.ts` (hooks for pause state / sections)

## Do not

- Do not run tests during agent work.

## Verification (operator)

```bash
# Mobile Maestro
npm run mobile:e2e:test -- library-downloads
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
