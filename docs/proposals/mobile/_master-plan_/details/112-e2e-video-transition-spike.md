# 112-e2e-video-transition-spike

**Master step:** 2.33
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- E2E (Maestro) flow: play a sample **video** item, expand mini→full, assert playback does not
  restart (position continuity) and capture screenshots.
- Aligns with Track 11.15–11.17; this step is the engine/spike-oriented flow — may share fixtures
  with those details once video surfaces land.

## Architecture notes

- Requires test-assets video enclosure reachable from simulators (`:2111` / Android rewrite).
- Assert no reload spinner / no second video mount (anti-pattern 11.18).
- Position assert: read accessibility label or debug testID if exposed; else screenshot + timing
  heuristic documented honestly.

## Edge cases

- No video fixture: fail with clear skip message — do not soft-pass.
- Android host rewrite for media URLs (5.23) must apply.

## Acceptance criteria

- Flow exercises mini→full without `load` restart.
- Screenshots in report slots for iOS + Android when devices available.
- Depends on 2.14–2.22 landing first.

## Web parity references

- [360-e2e-video-mini-screenshot](./360-e2e-video-mini-screenshot.md)
- [361-e2e-video-full-screenshot](./361-e2e-video-full-screenshot.md)
- [362-e2e-video-collapse-screenshot](./362-e2e-video-collapse-screenshot.md)
- **mobile-e2e-screenshots** skill

## Verification

```bash
npm run mobile:e2e:test -- video-transition
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

## Depends on

- 2.14–2.22; test-assets video sample
