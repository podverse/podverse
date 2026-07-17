# 285-e2e-search-flow

**Master step:** 9.26
**Model (author + implement):** Auto
**Status:** done

## Scope

- Maestro flow `apps/mobile/e2e/search.yaml`: enter a query, screenshot results, tap a result,
  screenshot the detail screen.
- Uses seeded/deterministic search where possible; E2E API profile (Track 5 harness).

## Acceptance criteria

- Flow performs a query, screenshots results, and opens a result
- Runs on iOS + Android E2E devices; screenshots in standard report slots

## Web parity references

- **E2E conventions:** `.cursor/skills/mobile-e2e-screenshots/SKILL.md`

## Verification

```bash
npm run mobile:e2e:test -- search
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
