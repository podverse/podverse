# 251-home-row-navigation

**Master step:** 8.12
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Wire row taps on each Home feed to push the correct detail screen in the Home stack (Track 7.2).
- Route map by media type: podcast → podcast detail (9.1), episode → episode detail (9.3),
  clip → clip detail (9.7), artist → artist detail (9.6), album → album detail (9.5),
  track → episode/track detail.
- Pass minimal params (resource id + medium) consistent with web route params.

## Acceptance criteria

- Tapping any row navigates to the matching detail screen with correct params
- Back returns to Home preserving scroll position and selected media type
- No dead-ends; unknown types handled gracefully

## Web parity references

- Web route params: `apps/web/src/app/{podcast,episode,clip,artist,album,track}` route segments
- Mobile nav: [`apps/mobile/src/navigation/index.tsx`](/apps/mobile/src/navigation/index.tsx)

## Verification

```bash
npm run mobile:e2e:test -- home
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
