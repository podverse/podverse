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

### Channel and stack header actions

Web's [`HeaderButtons`](apps/web/src/components/Media/Header/HeaderButtons.tsx) groups subscribe,
bell, RSS, website, share, funding, and boost in the media header because web has no stack title
bar. Mobile does. Follow [`mobile-screen-layout`](/.cursor/rules/mobile-screen-layout.mdc): share
and the notification bell (and podcast settings) use `HeaderBarAction` in the stack
`headerRight`. `ChannelHeader` `actions` is subscribe plus optional outbound links only. Do not
copy web `HeaderButtons` into the identity block.

| Action    | Where                                         | When shown                         | Notes                  |
| --------- | --------------------------------------------- | ---------------------------------- | ---------------------- |
| Bell      | Stack `headerRight`                           | Always                             | Icon reflects on/off   |
| Share     | Stack `headerRight`                           | Always                             | Existing share helpers |
| Settings  | Stack `headerRight` (podcast) or Settings tab | Signed-in and subscribed (podcast) | Album/artist use a tab |
| Subscribe | `ChannelHeader` `actions`                     | Always                             | Existing               |
| RSS       | `ChannelHeader` `actions`                     | `channel.feed.url` present         | Opens feed URL         |
| Website   | `ChannelHeader` `actions`                     | `website_link_url` present         | Opens external         |
| Funding   | —                                             | Fundings present                   | Phase 3 — omit         |
| Boost     | —                                             | Deferred                           | Phase 3 — do not add   |

Funding and boost stay out of this detail (Phase 3). RSS / website land on the identity block so
music screens inherit them without a second pass. Bell and share stay in the title bar on
podcast, album, and artist.

### Detail prefs unions

[`detailListPrefs.ts`](apps/mobile/src/prefs/detailListPrefs.ts) today has podcast tabs, album
`forward` / `backward` only, and episode tabs. Extend:

| Pref                         | Values                                                               | Default   |
| ---------------------------- | -------------------------------------------------------------------- | --------- |
| `ALBUM_TABS`                 | `tracks`, `about`, `podroll`, `settings`                             | `tracks`  |
| `ALBUM_TRACK_SORT_OPTIONS`   | Add `top` to existing `forward` / `backward`                         | `forward` |
| `ALBUM_DETAIL_RANGE_OPTIONS` | Same stats ranges as podcast (`day` / `week` / `month` / `all-time`) | `week`    |
| `ARTIST_TABS`                | `albums`, `tracks`, `about`, `podroll`, `settings`                   | `albums`  |
| `TRACK_TABS`                 | `summary`, `transcript`                                              | `summary` |

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
- Stack `headerRight` includes bell and share; `ChannelHeader` includes subscribe plus RSS /
  website when data allows; no boost/funding wiring.
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
