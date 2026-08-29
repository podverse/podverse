# 261-podcast-live-items

**Master step:** 9.2
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Live items section on the podcast detail screen where the channel has live items, via the live item
  request wrappers on `ApiRequestService`.
- Show live status badge (live / upcoming / ended) mirroring web live item semantics.
- Play live item routes through the standard playback stub/hook (Track 10/11 later).

## Acceptance criteria

- Live items section appears only when the channel has live items
- Status badges match web semantics and use theme tokens
- Section integrates into the podcast detail layout without breaking the item list

## Web parity references

- [`apps/web/src/components/LiveItem`](/apps/web/src/components/LiveItem),
  [`apps/web/src/app/podcast/livestream`](/apps/web/src/app/podcast/livestream)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:e2e:test -- podcast-episode
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
