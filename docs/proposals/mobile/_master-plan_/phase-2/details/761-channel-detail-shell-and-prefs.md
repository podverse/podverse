# 761-channel-detail-shell-and-prefs

**Master step:** P2.4.13
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Extract a medium-agnostic channel-detail shell from the podcast screen so album and artist compose
the same pinned header + section chips + one active pane, and extend detail prefs for music tabs and
album season sort.

Depends on [760](760-shared-medium-route-kind.md) only for vocabulary; the shell work is mobile-local.

### Channel detail shell

Today [`PodcastDetailScreen`](apps/mobile/src/screens/podcast/PodcastDetailScreen.tsx) owns:

- Pinned [`ChannelHeader`](apps/mobile/src/components/channel/ChannelHeader.tsx) +
  [`SectionChipRow`](apps/mobile/src/components/form/SectionChipRow.tsx)
- A `SECTION_COMPONENTS` map from tab → pane
- Per-channel prefs for tab / sort / range

Album and artist are monolithic `ScrollView` cards with neither header nor chips. Extract a shared
shell (name TBD in the plan set — e.g. `ChannelDetailShell`) that accepts:

- Header props (artwork, title, subtitle, actions, description)
- Chip items + selected key + leading (sort / range)
- One active pane as `children` or a render prop

Podcast keeps its panes under `screens/podcast/sections/`; album and artist gain their own pane
modules later ([762](762-album-detail-parity.md), [763](763-artist-detail-parity.md)). This detail
does **not** rebuild album/artist — only the shell and prefs they will use.

### ChannelHeader actions parity

Web's [`HeaderButtons`](apps/web/src/components/Media/Header/HeaderButtons.tsx) offers subscribe,
bell, RSS, website, share, funding, and boost. Mobile podcast header already has subscribe (and
settings / bell via other chrome). Extend the shared `actions` slot so the same affordances are
available for podcast, album, and artist:

| Action    | When shown                                      | Notes                                      |
| --------- | ----------------------------------------------- | ------------------------------------------ |
| Subscribe | Always                                          | Existing                                   |
| Bell      | Always (or signed-in per podcast settings rule) | Match podcast header                       |
| RSS       | `channel.feed.url` present                      | Opens feed URL                             |
| Website   | `channel_about.website_link_url` present        | Opens external                             |
| Share     | Always                                          | Existing share helpers                     |
| Funding   | Fundings present                                | Phase 3 / V4V — placeholder or omit        |
| Boost     | Deferred                                        | Phase 3 — do not add                       |

Funding and boost stay out of this detail (Phase 3). RSS / website / share land here so music
screens inherit them without a second pass.

### Detail prefs unions

[`detailListPrefs.ts`](apps/mobile/src/prefs/detailListPrefs.ts) today has podcast tabs, album
`forward` / `backward` only, and episode tabs. Extend:

| Pref                         | Values                                                              | Default   |
| ---------------------------- | ------------------------------------------------------------------- | --------- |
| `ALBUM_TABS`                 | `tracks`, `about`, `podroll`, `settings`                            | `tracks`  |
| `ALBUM_TRACK_SORT_OPTIONS`   | Add `top` to existing `forward` / `backward`                        | `forward` |
| `ALBUM_DETAIL_RANGE_OPTIONS` | Same stats ranges as podcast (`day` / `week` / `month` / `all-time`) | `week`    |
| `ARTIST_TABS`                | `albums`, `tracks`, `about`, `podroll`, `settings`                  | `albums`  |
| `TRACK_TABS`                 | `summary`, `transcript`                                             | `summary` |

Boosts are intentionally absent (Phase 3). Tab order in the stored union may differ from painted
order — callers reconcile evidence chips the way podcast does
([`mobile-section-chrome-cache`](/.cursor/rules/mobile-section-chrome-cache.mdc)).

Readers/writers: `readAlbumDetailPrefs` gains `tab` + `range`; add `readArtistDetailPrefs` /
`writeArtistDetailTab`; add `readTrackDetailPrefs` / `writeTrackDetailTab`. Scope remains
`channel:` / `item:` per
[`filter-sort-persistence`](/.cursor/rules/filter-sort-persistence.mdc).

### Podcast screen adoption

Refactor `PodcastDetailScreen` onto the shell in the same change so the pattern has one real
consumer before album/artist. Behavior must not regress (chips, offline Downloaded force, section
chrome cache).

## Acceptance criteria

- Shared shell used by podcast; album/artist still their old screens until 762/763.
- Prefs unions and readers exist for album (incl. `top` + range), artist, and track tabs.
- Header actions include RSS / website / share when data allows; no boost/funding wiring.
- No visual inventing — match existing podcast chrome density.

## Web parity references

- [`AlbumPageListHeader.tsx`](apps/web/src/app/album/[channel_id]/AlbumPageListHeader.tsx)
- [`ArtistPageListHeader.tsx`](apps/web/src/app/artist/[channel_id]/ArtistPageListHeader.tsx)
- [`HeaderButtons.tsx`](apps/web/src/components/Media/Header/HeaderButtons.tsx)
- [`queryParams.ts`](packages/helpers-requests/src/api/queryParams.ts) —
  `QUERY_PARAMS_CHANNEL_MUSIC_*`

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- podcast
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
