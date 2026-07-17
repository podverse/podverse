# 260-podcast-detail-screen

**Master step:** 9.1
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Podcast (channel) detail screen: channel header (artwork, title, author, subscribe action),
  optional tabs, and a paginated item list via channel + item request wrappers on
  `ApiRequestService`.
- Screen at `apps/mobile/src/screens/podcast/PodcastDetailScreen.tsx`; params: `channel_id` (+ medium).
- Item rows reuse the episode row from Track 8.5; tap → episode detail (9.3).
- Loading/empty/error via shared state components (8.11); pull-to-refresh optional.

## Acceptance criteria

- Channel header + item list load from same endpoint semantics as web podcast page
- Layout mirrors web podcast page (header → item list), adapted to RN, tokenized
- Subscribe/unsubscribe reflects state; pagination works

## Web parity references

- [`apps/web/src/app/podcast/[channel_id]`](/apps/web/src/app/podcast),
  [`apps/web/src/components/List/Podcasts`](/apps/web/src/components/List/Podcasts)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:e2e:test -- podcast-episode
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
