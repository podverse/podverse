# 05 — Home footer and download banner

**Cursor model:** Codex 5.3
**Reasoning:** medium

## Scope

Details: [736](/docs/proposals/mobile/_master-plan_/phase-2/details/736-home-unsubscribed-downloads-section.md),
banner portion of [734](/docs/proposals/mobile/_master-plan_/phase-2/details/734-download-pause-resume-concurrency.md).

1. Home Podcasts: append “Downloaded, not subscribed” section when unsubscribed channels have
   complete downloads.
2. Extend bottom activity chrome so in-progress downloads show “Downloading X of Y” alongside
   (not inside) the sync queue bar.

## Files

- `apps/mobile/src/screens/home/homeFeedData.ts`
- `apps/mobile/src/screens/home/HomeScreen.tsx`
- `apps/mobile/src/data/repositories/downloadsRepository.ts` (list unsubscribed channels helper)
- `apps/mobile/src/components/feedback/SyncProgressBar.tsx` or new `ActivityProgressBar.tsx`
- `apps/mobile/src/navigation/index.tsx` (wire banner)

## Do not

- Do not enqueue downloads on the serial sync queue.
- Do not run tests during agent work.

## Verification (operator)

```bash
# Mobile Maestro
npm run mobile:e2e:test -- home-podcasts,library-downloads
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
