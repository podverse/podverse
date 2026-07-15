# 210-e2e-login-screenshot

**Master step:** 6.11
**Model (author + implement):** Codex 5.3
**Status:** done

## Prerequisites

Track 5 API + DB harness **5.17–5.20** is `done` (`apiMobileE2e` @ **4230**). Steps **6.1–6.6**
must be implemented so the login UI exists.

## Scope

- Maestro flow `apps/mobile/e2e/auth-login.yaml`.
- Seeded account: `e2e-user@example.com` / `Test!1Aa` ([TEST-ENV.md](/apps/mobile/e2e/TEST-ENV.md)).
- Enter credentials via `testID`s, submit, assert authenticated shell (login CTA gone **or**
  account marker / home placeholder visible).
- `takeScreenshot` on authenticated shell for HTML report.
- Operator path: `mobile_e2e_deps` + `mobile_e2e_seed` + `mobile:dev:e2e` + devices +
  `mobile:e2e:api` (see [HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md)).

## Acceptance criteria

- Area name `auth-login` works with `npm run mobile:e2e:test -- auth-login`
- Uses port **4230** hosts (not Playwright 4030)
- Slot HTML report includes authenticated screenshot

## Web parity references

- Web E2E login helpers / seed user (same credentials)
- Mobile harness docs: TEST-ENV / HOW-TO-RUN

## Verification

```bash
npm run mobile:e2e:test -- auth-login
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
