# 253-e2e-home-media-types-screenshots

**Master step:** 8.14
**Model (author + implement):** Auto
**Status:** done

## Scope

- Maestro flow `apps/mobile/e2e/home.yaml` (or `home-media-types.yaml`) that launches the app,
  logs in via the E2E API profile, and screenshots Home for each media-type selection.
- Tap each chip (podcasts → tracks) and `takeScreenshot` per state for the HTML step report.
- Follow **mobile-e2e-screenshots** conventions and existing seed/env from Track 5.

## Acceptance criteria

- Flow runs on iOS + Android E2E devices and produces one screenshot per media type
- Screenshots land in the standard mobile report slots
- Uses seeded test data; no reliance on production content

## Web parity references

- **E2E conventions:** `.cursor/skills/mobile-e2e-screenshots/SKILL.md`;
  Track 5 harness (`.artifacts/mobile-e2e-reports/latest/`)

## Verification

```bash
npm run mobile:e2e:test -- home
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
