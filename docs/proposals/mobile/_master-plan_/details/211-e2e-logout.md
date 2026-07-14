# 211-e2e-logout

**Master step:** 6.12
**Model (author + implement):** Auto
**Status:** draft

## Blocked until

Track 5 API + DB harness is **`done`**: steps **5.17–5.20** (details **076–079**), and login
flow **6.11** is implemented or co-authored in the same phase. Do **not** implement while the
harness is only `planned`.

Executable harness plan:
[`.llm/plans/active/mobile-e2e-api-db-harness/`](/.llm/plans/active/mobile-e2e-api-db-harness/).

## Scope (when unblocked)

- Maestro logout flow returning to login (or anonymous) screen.
- Same API/seed/deps prerequisites as 6.11.

## Acceptance criteria

- Flow under `apps/mobile/e2e/` asserting post-logout UI
- Uses mobile E2E API @ 4230 + seeded session from login step

## Verification

```bash
npm run mobile:e2e:test -- auth-logout
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
