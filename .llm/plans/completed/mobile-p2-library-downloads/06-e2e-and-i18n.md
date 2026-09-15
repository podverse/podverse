# 06 — E2E and i18n

**Cursor model:** Codex 5.3
**Reasoning:** medium

## Scope

1. Update `apps/mobile/e2e/library-downloads.yaml` — usage asserts move to settings; list sections /
   rows / clear-finished as needed.
2. Add `apps/mobile/e2e/settings-downloads.yaml` for Settings → Downloads bars / delete-all confirm.
3. Add mobile (+ shared/consumer as needed) catalog keys for all new copy.
4. Update `apps/mobile/src/downloads/README.md` for the new manage-storage home and concurrency.

## Do not

- Do not run tests during agent work; leave operator commands at the end.

## Verification (operator)

```bash
# Mobile Maestro
npm run mobile:e2e:test -- library-downloads,settings-downloads
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
