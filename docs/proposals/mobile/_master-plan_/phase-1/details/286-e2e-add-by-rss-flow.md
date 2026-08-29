# 286-e2e-add-by-rss-flow

**Master step:** 9.27
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Maestro flow `apps/mobile/e2e/add-by-rss.yaml`: open RSS tab, add a fixture feed URL, verify it
  appears in the added-feeds list, screenshotting the happy path.
- Use a stable fixture feed URL (local/deterministic) to avoid network flakiness.

**List-only scope for this step.** Playback against `tools/test-assets` (tap Play + assert engine
state) is tracked in [288-e2e-addbyrss-playback-test-assets](./288-e2e-addbyrss-playback-test-assets.md)
(master step 9.29).

## Acceptance criteria

- Flow adds a feed and shows it in the list with screenshots
- Runs on iOS + Android E2E devices; screenshots in standard report slots
- Deterministic (fixture feed, not live remote)

## Web parity references

- **E2E conventions:** `.cursor/skills/mobile-e2e-screenshots/SKILL.md`
- Add-by-rss parity: **add-by-rss-parity-sync** skill

## Verification

```bash
npm run mobile:e2e:test -- add-by-rss
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
