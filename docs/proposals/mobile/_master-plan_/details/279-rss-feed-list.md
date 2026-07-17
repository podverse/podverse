# 279-rss-feed-list

**Master step:** 9.20
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- List of added RSS feeds from local/RN state, mirroring web AddByRSSList context.
- Persist added feeds in device state consistent with web's client-side add-by-rss list semantics.
- Row → add-by-rss resource detail/play (9.21); remove affordance.

## Acceptance criteria

- Added feeds persist across launches and render in a list
- Semantics mirror web AddByRSSList context (client-side list)
- Remove works; loading/empty/error via 8.11

## Web parity references

- [`apps/web/src/components/AddByRSS`](/apps/web/src/components/AddByRSS) (AddByRSSList context)
- Parity skills: **add-by-rss-parity-sync**, **add-by-rss-components-sync**
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:e2e:test -- add-by-rss
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
