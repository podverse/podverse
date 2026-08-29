# 248-home-tracks-feed

**Master step:** 8.9
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Tracks view of Home: music tracks/items list, mirroring web music item browsing.
- Reusable track row (artwork + title + artist/album + duration + play action stub).
- Reuse item request wrappers (music medium) on `ApiRequestService`.

## Acceptance criteria

- Track list loads with the same endpoint semantics as web music item browsing
- Row layout mirrors web track rows, adapted to RN, tokenized
- Duration via shared formatter; loading/empty/error via 8.11

## Web parity references

- [`apps/web/src/app/tracks`](/apps/web/src/app/tracks),
  [`apps/web/src/app/track`](/apps/web/src/app/track),
  [`apps/web/src/components/List/Music`](/apps/web/src/components/List/Music)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:e2e:test -- home
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
