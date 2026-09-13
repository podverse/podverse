# 738-browse-podcast-host-names

**Master step:** P2.1.1 follow-up
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Browse Podcasts list rows should match Search: **host name → title → date**. Home subscribed
podcast rows stay without host names (title → date → badges only).

Search already maps Podcast Index `feed.author` into `HomeFeedRow.subtitle`. Browse Podcasts uses
the same row component but `normalizeChannelRows` never reads `channel_about.author` (the field the
API already returns on `DTOChannelAbout`). That is the only mapping gap.

Because `normalizeChannelRows` also feeds Browse Videos / Artists / Albums and Home Artists /
Albums, author inclusion is an **opt-in flag**, not a global default.

### Locked decisions

- Browse **Podcasts only** get the host-name line.
- Web directory `/podcasts` rows stay title + last-pub date (mobile-only divergence).
- Missing author: omit the line (same as Search).
- No new i18n; author text is feed data.
- No API / ORM / DTO work; no author field on the local `SubscribedChannel` record.

## Acceptance criteria

- Browse Podcasts rows show `channel_about.author` (when present) above the title and date.
- Browse Videos / Artists / Albums and Home Artists / Albums do **not** gain a host line.
- Home subscribed podcast rows and unsubscribed-download footer rows stay `subtitle: null`.
- Empty / missing author omits the subtitle line.
- `HomeFeedRow` exposes a stable subtitle `testID` for E2E.
- Unit tests cover `includeAuthor` on / off / empty author.
- E2E Browse Podcasts screenshot still captures the settled list.

## Web parity references

- Mobile Search: `apps/mobile/src/screens/search/SearchScreen.tsx` (`feed.author` → subtitle)
- Shared row: `apps/mobile/src/screens/home/HomeFeedRow.tsx`
- Channel mapper: `apps/mobile/src/screens/home/homeFeedData.ts` (`normalizeChannelRows`)
- Browse fetch: `apps/mobile/src/screens/browse/browseFeedData.ts`
- DTO: `packages/helpers/src/dtos/channel/channelAbout.ts` (`author`)
- Web stays unchanged: `apps/web/src/components/Core/Podcast/CorePodcastRow.tsx`

## Verification

```bash
npm --prefix apps/mobile run test -- src/screens/home/homeFeedData.test.ts
npm run mobile:e2e:test -- browse
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
