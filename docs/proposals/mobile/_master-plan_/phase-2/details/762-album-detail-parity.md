# 762-album-detail-parity

**Master step:** P2.1.2
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Rebuild [`AlbumDetailScreen`](apps/mobile/src/screens/album/AlbumDetailScreen.tsx) on the
channel-detail shell from [761](761-channel-detail-shell-and-prefs.md) to match web album UX minus
boosts.

Depends on: [760](760-shared-medium-route-kind.md), [761](761-channel-detail-shell-and-prefs.md).

### Tabs (painted order)

Match web [`AlbumPageListHeader.tsx`](apps/web/src/app/album/[channel_id]/AlbumPageListHeader.tsx),
**not** the union array order:

| Order | Tab        | Always / evidence                         |
| ----- | ---------- | ----------------------------------------- |
| 1     | `tracks`   | Always-on                                 |
| 2     | `about`    | Always-on (empty description is a real answer) |
| 3     | `podroll`  | Evidence — when channel has podroll       |
| 4     | `settings` | Signed-in                                 |

No `boosts` tab (Phase 3). Persist tab / sort / range via album prefs from 761.

### Tracks list

- Online: `reqItemGetManyByChannelBySeason` with `forward` | `backward` | `top` (+ range when top).
  Choosing `top` seeds range to `week` if unset (web behavior).
- Page 1 prepends live items the way `AlbumPageContext` does.
- Offline: local `channelItemsRepository` with forward→oldest / backward→recent mapping; hide
  `top` or show unavailable for offline-incompatible panes.
- Rows: `HomeFeedRow` with `mediaType="tracks"`; press → `TrackDetail`.

### Header

`ChannelHeader` with album artwork, title, author subtitle, shell actions (subscribe, bell, RSS,
website, share). Description lives in About pane, not stacked under the header as a second card.

### First paint

Pass preview title / image from list navigators
([`mobile-image-loading`](/.cursor/rules/mobile-image-loading.mdc)). Section chrome cache for
podroll evidence
([`mobile-section-chrome-cache`](/.cursor/rules/mobile-section-chrome-cache.mdc)).

## Acceptance criteria

- Shell + chips; no monolithic `ScrollView` of cards.
- Season sort includes `top` with range; prefs restore on reopen.
- Live items on page 1 when online; offline tracks still list when cached.
- Settings gated like podcast; boosts absent.
- E2E covers open album → tracks → open track (placeholder OK until 764 lands if sequenced before).

## Web parity references

- [`apps/web/src/app/album/[channel_id]/`](apps/web/src/app/album/[channel_id]/)
- [`AlbumPageDropdownConfig.ts`](apps/web/src/app/album/[channel_id]/AlbumPageDropdownConfig.ts)
- [`QUERY_PARAMS_CHANNEL_MUSIC_ALBUM_*`](packages/helpers-requests/src/api/queryParams.ts)

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- album
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
