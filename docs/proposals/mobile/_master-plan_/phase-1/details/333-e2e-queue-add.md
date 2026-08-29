# 333-e2e-queue-add

**Master step:** 10.24
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Maestro E2E: add to queue and verify queue screen row (screenshot).
- Requires test-assets when play is involved; queue-add may use seeded library data.

## File paths

- Label Mobile Maestro; leave Metro/API/devices running per HOW-TO-RUN.

## Acceptance criteria

- Flow adds item next or last and shows it on Library queue screen
- Screenshots iOS + Android E2E slots
- Uses named E2E devices only

## Web parity references

- Web queue UX for reference only
- Mobile E2E: `apps/mobile/e2e/` + HOW-TO-RUN.md

## Verification

```bash
npm run mobile:e2e:test -- library
# or dedicated queue-add area when added
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

## Depends on

- 10.6; prefer after mini-player visible
