# 730-podcast-header-and-item-row-density

**Master step:** P2.1.2
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Follow-up density pass on the podcast screen and shared item rows after
[723](723-podcast-channel-header-and-section-chips.md) /
[725](725-podcast-row-actions-and-download.md).

### Channel header

- Rebuild [`ChannelHeader`](apps/mobile/src/components/channel/ChannelHeader.tsx) to the legacy
  row: **78×78** art left, title (2 lines) + Subscribe stacked on the right.
- **No description in the header** on podcast detail — full text lives on About.
- Keep stack-header Share / Bell / Gear, section chips, and the always-visible filter.

### Adaptive item rows

Shared [`HomeFeedRow`](apps/mobile/src/screens/home/HomeFeedRow.tsx) gains `showChannelContext`
and a three-band layout matching legacy Home Episodes / in-channel podcast lists:

| Context                  | Top band                                                      | Middle             | Bottom                           |
| ------------------------ | ------------------------------------------------------------- | ------------------ | -------------------------------- |
| Channel context (`true`) | Art + channel name → title → date; download top-right         | 2-line description | Play + duration left; More right |
| In-channel (`false`)     | Title → date only (no art / channel name); download top-right | Same               | Same                             |

Artwork uses existing item-then-channel helpers (`getItemPrimaryImageUrl` /
`primaryListArtworkUrl`). Play / More are nextgen icon-only controls (not labeled pills; not the
legacy `TimeRemainingWidget`).

## Acceptance criteria

- Podcast header is a horizontal art + title/Subscribe row with no description under it.
- In-channel episode lists omit per-row artwork and channel title.
- Home / Search / Library item lists keep artwork and channel title when present.
- Episode rows show pub date, stripped 2-line description, duration beside Play, download top-right.
- E2E `podcast-episode` still reaches header, episode row, play / more / download.

## Web parity references

- Artwork merge: [`packages/helpers/src/lib/image.ts`](packages/helpers/src/lib/image.ts)
  (`primaryListArtworkUrl`, `mergeDTOItemThenChannelImageCandidates`)
- Legacy inspiration: `../podverse-rn/src/components/PodcastTableHeader.tsx`,
  `../podverse-rn/src/components/EpisodeTableCell.tsx`
- Mobile: [`ChannelHeader.tsx`](apps/mobile/src/components/channel/ChannelHeader.tsx),
  [`HomeFeedRow.tsx`](apps/mobile/src/screens/home/HomeFeedRow.tsx)

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- podcast-episode
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
