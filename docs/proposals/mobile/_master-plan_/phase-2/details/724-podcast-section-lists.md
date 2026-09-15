# 724-podcast-section-lists

**Master step:** P2.1.2
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Fill each podcast section chip with the correct list or pane, matching website data sources where
practical while keeping Episodes offline-first.

### Sections

| Chip               | Data source                                                               | Offline             |
| ------------------ | ------------------------------------------------------------------------- | ------------------- |
| **Episodes**       | Local `channelItemsRepository` + sync; live items prepended               | Yes (stored window) |
| **Official Clips** | `reqItemSoundbiteGetManyByChannelIdText` (only if channel has soundbites) | Online-only         |
| **Clips**          | Channel clips API (website `ListClips` path)                              | Online-only         |
| **About**          | Already-fetched `DTOChannel` (description, people)                        | Yes                 |
| **Podroll**        | Channel podroll remote items when present                                 | Online-only         |

No Boosts pane (Phase 3). Settings is the gear screen ([726](726-podcast-settings-and-header-bell.md)).

### Episodes + live

- Fetch live via `reqLiveItemGetManyByChannel` (same as website podcast page).
- Eligible live rows appear at the **top** of the Episodes list with a Live badge.
- Do **not** keep a separate “Livestreams” heading above the list.
- Keep load-more / extend window for stored episodes.
- Title filter narrows the visible episode rows (and other list sections that are title-filterable)
  without hitting the network.

### Empty / loading / error

Reuse `ListLoading` / `ListEmpty` / `ListError`. Online-only sections show a clear offline or error
state when the request fails; Episodes still paint from storage on open.

## Acceptance criteria

- Switching chips loads the matching section without leaving the podcast screen.
- Episodes remain offline-first; live eligible items pin to the top with a Live badge.
- Official Clips chip is absent when the channel has no soundbites; Podroll chip absent when empty.
- About shows full description / people from the channel DTO without a network round-trip.
- Clips and Official Clips use virtualized lists (`FlatList`) and i18n strings.
- E2E: open podcast → Episodes list → switch to Clips (or About) → back to Episodes.

## Web parity references

- [`PodcastPageList.tsx`](apps/web/src/app/podcast/[channel_id]/PodcastPageList.tsx)
- [`page.tsx`](apps/web/src/app/podcast/[channel_id]/page.tsx) — live prepend + soundbite presence
- [`ContentAbout`](apps/web/src/components/Content/About/ContentAbout.tsx)
- [`ContentPodroll`](apps/web/src/components/Content/Podroll/ContentPodroll.tsx)
- Mobile: [`channelItemsRepository`](apps/mobile/src/data/repositories/channelItemsRepository.ts)

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- podcast-episode
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
