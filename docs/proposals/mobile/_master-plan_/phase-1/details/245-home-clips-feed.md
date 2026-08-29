# 245-home-clips-feed

**Master step:** 8.6
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Clips view of Home: clip discovery feed via clip list/public request wrappers on
  `ApiRequestService`.
- Reusable clip row (artwork + title + source episode + clip start/duration).
- Tap → clip detail (Track 9.7); play action stub (8.13) plays at clip bounds later.

## Acceptance criteria

- Clip discovery feed loads with the same endpoint semantics as web
- Row layout mirrors web clip list rows, adapted to RN, tokenized
- Loading/empty/error via 8.11

## Web parity references

- [`apps/web/src/components/List/Clips`](/apps/web/src/components/List/Clips),
  [`apps/web/src/components/Clip`](/apps/web/src/components/Clip)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:e2e:test -- home
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
