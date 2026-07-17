# 262-episode-detail-screen

**Master step:** 9.3
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Episode (item) detail screen: metadata (title, channel, pub date, duration), description/HTML,
  enclosure, and play/queue actions via item request wrappers on `ApiRequestService`.
- Screen at `apps/mobile/src/screens/episode/EpisodeDetailScreen.tsx`; params: `item_id`.
- Render sanitized description HTML with an RN-safe renderer; reuse time formatter for duration.
- Play/add-to-queue via the playback stub/hook (Track 10/11 later).

## Acceptance criteria

- Episode metadata + description load from same endpoint semantics as web episode page
- Layout mirrors web episode page hierarchy, adapted to RN, tokenized
- Play/queue actions present with `testID`s; loading/empty/error via 8.11

## Web parity references

- [`apps/web/src/app/episode/[item_id]`](/apps/web/src/app/episode),
  [`apps/web/src/components/Media`](/apps/web/src/components/Media)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:e2e:test -- podcast-episode
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
