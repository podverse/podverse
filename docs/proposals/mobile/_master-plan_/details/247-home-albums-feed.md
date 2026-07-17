# 247-home-albums-feed

**Master step:** 8.8
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Albums view of Home: music album channels browse, mirroring web album routes.
- Reusable album card (artwork + title + artist); tap → album detail (Track 9.5).
- Reuse the music channel request wrappers (medium = music) on `ApiRequestService`.

## Acceptance criteria

- Album browse loads with the same endpoint semantics as web music album routes
- Card layout mirrors web album browsing, adapted to RN, tokenized
- Loading/empty/error via 8.11

## Web parity references

- [`apps/web/src/app/albums`](/apps/web/src/app/albums),
  [`apps/web/src/app/album/[channel_id]`](/apps/web/src/app/album),
  [`apps/web/src/components/List/Music`](/apps/web/src/components/List/Music)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:e2e:test -- home
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
