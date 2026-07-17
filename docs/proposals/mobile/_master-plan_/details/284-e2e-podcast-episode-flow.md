# 284-e2e-podcast-episode-flow

**Master step:** 9.25
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Maestro flow `apps/mobile/e2e/podcast-episode.yaml`: from Home (or search), open a podcast, then
  an episode, screenshotting each step.
- Uses seeded test data + E2E API profile (Track 5 harness).

## Acceptance criteria

- Flow navigates Home → podcast detail → episode detail with screenshots at each step
- Runs on iOS + Android E2E devices; screenshots in standard report slots
- Deterministic against seed data

## Web parity references

- **E2E conventions:** `.cursor/skills/mobile-e2e-screenshots/SKILL.md`; **e2e-report-order** skill

## Verification

```bash
npm run mobile:e2e:test -- podcast-episode
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
