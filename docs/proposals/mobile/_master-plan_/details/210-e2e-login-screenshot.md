# 210-e2e-login-screenshot

**Master step:** 6.11
**Model (author + implement):** Codex 5.3
**Status:** draft

## Blocked until

Track 5 API + DB harness is **`done`**: steps **5.17–5.20** (details **076–079**). Do **not**
implement this Maestro flow while those steps are `planned` or `_TBD_`.

Executable harness plan:
[`.llm/plans/active/mobile-e2e-api-db-harness/`](/.llm/plans/active/mobile-e2e-api-db-harness/).

## Scope (when unblocked)

- Maestro login flow against seeded account + API @ **4230**.
- Screenshot authenticated home shell (or Track 6 home placeholder).
- Operator path: `mobile_e2e_deps` + `mobile_e2e_seed` + mobile API lifecycle + Metro + devices.

## Acceptance criteria

- Flow under `apps/mobile/e2e/` (area name TBD, e.g. `auth-login`)
- Uses harness documented in TEST-ENV (not Playwright 4030)
- Slot HTML report captures authenticated shell screenshot

## Verification

```bash
# After harness done — operator only; agents do not run E2E during implement
npm run mobile:e2e:test -- auth-login
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
