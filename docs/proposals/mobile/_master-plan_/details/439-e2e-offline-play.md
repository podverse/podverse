# 439-e2e-offline-play

**Master step:** 13.10
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Maestro flow: download an episode (seed/fixture with **progressive** enclosure — prefer E2E
  test-assets mp3/mp4), wait for complete, disable network (or use airplane / Maestro airplane if
  available; otherwise assert `file://` play path / offline banner), play from Downloads list,
  screenshot mini or full player.
- Area file: `apps/mobile/e2e/library-downloads.yaml` (or extend closest library area).
- Stable `testID`s from 13.4–13.6.
- Fixture must **not** be a livestream (`live_item`) or HLS / m3u8 URL.

## Acceptance criteria

- Flow runs on iOS and Android E2E devices via `npm run mobile:e2e:test -- library-downloads`
- Step screenshots land in mobile E2E HTML report
- Documents any platform limitation if true airplane mode is unavailable in Maestro
- Optional: assert Download control absent on a livestream fixture if one exists in seed

## Web parity references

- None — mobile Maestro only (**mobile-e2e-screenshots**)
- Eligibility:
  [DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md)
  §1.1–1.2

## Verification

```bash
npm run mobile:e2e:test -- library-downloads
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
