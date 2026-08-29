# 244-home-episodes-feed

**Master step:** 8.5
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Episodes view of Home: recent episodes from the user's subscriptions, matching web home episode
  logic (item request wrappers on `ApiRequestService`).
- Reusable episode row (artwork + channel/title + pub date + duration + play/queue action stub).
- Reuse `@podverse/helpers` time formatter for duration (Track 17.5) — no ad-hoc formatting.

## Acceptance criteria

- Recent subscription episodes load with the same endpoint semantics as web
- Row layout mirrors web episode list rows, adapted to RN, tokenized
- Duration/date use shared formatters; loading/empty/error via 8.11

## Web parity references

- [`apps/web/src/app/HomePageList.tsx`](/apps/web/src/app/HomePageList.tsx),
  [`apps/web/src/components/Media`](/apps/web/src/components/Media)
- Time: `@podverse/helpers` timeFormatter (see detail 474)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:e2e:test -- home
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
