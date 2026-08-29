# 211-e2e-logout

**Master step:** 6.12
**Model (author + implement):** Auto
**Status:** done

## Prerequisites

Harness **5.17–5.20** `done`; login flow **6.11** implemented (or co-authored in same prompt).
Logout UI from **6.5** available (button with `testID`, e.g. `logout-submit`).

## Scope

- Maestro flow `apps/mobile/e2e/auth-logout.yaml`.
- Login with seeded user (run steps or `runFlow` include from auth-login), then logout.
- Assert return to login **or** anonymous shell (per 6.9 choice); authenticated markers gone.
- Screenshot post-logout UI.

## Acceptance criteria

- `npm run mobile:e2e:test -- auth-logout` passes on iOS + Android E2E devices
- Revoke/wipe behavior exercised end-to-end
- Uses mobile E2E API @ 4230 + seed

## Verification

```bash
npm run mobile:e2e:test -- auth-logout
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
