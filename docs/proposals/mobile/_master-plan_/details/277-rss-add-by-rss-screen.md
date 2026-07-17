# 277-rss-add-by-rss-screen

**Master step:** 9.18
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- RSS tab main screen (Track 7.5 stack root) mirroring web `/add-by-rss` UX, simplified for native.
- Entry point to add a feed (9.19) + list of added feeds (9.20).
- Follow the add-by-rss parity conventions so mobile stays in sync with web behavior.

## Acceptance criteria

- RSS tab shows add affordance + added-feeds list area
- Layout mirrors web add-by-rss page intent, adapted to RN, tokenized
- Localized copy; loading/empty/error via 8.11

## Web parity references

- [`apps/web/src/app/add-by-rss`](/apps/web/src/app/add-by-rss),
  [`apps/web/src/components/AddByRSS`](/apps/web/src/components/AddByRSS)
- Parity skills: **add-by-rss-parity-sync**, **add-by-rss-components-sync**
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:e2e:test -- add-by-rss
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
