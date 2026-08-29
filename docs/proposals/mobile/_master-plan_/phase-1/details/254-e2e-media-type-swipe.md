# 254-e2e-media-type-swipe

**Master step:** 8.15
**Model (author + implement):** Auto
**Status:** done

## Scope

- Maestro flow that scrolls/swipes the horizontal media-type selector and asserts the feed content
  changes when a different chip becomes active.
- Screenshot before/after to document the selector interaction in the HTML report.

## Acceptance criteria

- Flow verifies selector swipe/scroll reveals and selects a non-default media type
- Feed content visibly changes after selection (assert a stable feed `testID` or row text)
- Runs on iOS + Android E2E devices

## Web parity references

- **E2E conventions:** `.cursor/skills/mobile-e2e-screenshots/SKILL.md`
- Selector component (Track 8.2), Home feeds (Tracks 8.4–8.9)

## Verification

```bash
npm run mobile:e2e:test -- home
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
