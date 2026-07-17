# 246-home-artists-feed

**Master step:** 8.7
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Artists view of Home: music artist channels browse, mirroring web artist routes.
- Reusable artist row/card (artwork + name); tap → artist detail (Track 9.6).
- Reuse the music channel request wrappers (medium = music) on `ApiRequestService`.

## Acceptance criteria

- Artist browse loads with the same endpoint semantics as web music artist routes
- Card/row layout mirrors web artist browsing, adapted to RN, tokenized
- Loading/empty/error via 8.11

## Web parity references

- [`apps/web/src/app/artists`](/apps/web/src/app/artists),
  [`apps/web/src/app/artist/[channel_id]`](/apps/web/src/app/artist),
  [`apps/web/src/components/List/Music`](/apps/web/src/components/List/Music)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:e2e:test -- home
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
