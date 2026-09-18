# 763-artist-detail-parity

**Master step:** P2.1.2
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Rebuild [`ArtistDetailScreen`](apps/mobile/src/screens/artist/ArtistDetailScreen.tsx) on the
channel-detail shell from [761](761-channel-detail-shell-and-prefs.md) to match web artist UX minus
boosts.

Depends on: [760](760-shared-medium-route-kind.md), [761](761-channel-detail-shell-and-prefs.md),
preferably [762](762-album-detail-parity.md) for album navigation targets.

### Tabs (painted order)

Match web [`ArtistPageListHeader.tsx`](apps/web/src/app/artist/[channel_id]/ArtistPageListHeader.tsx):

| Order | Tab        | Condition                                      |
| ----- | ---------- | ---------------------------------------------- |
| 1     | `albums`   | When added or unadded albums exist             |
| 2     | `tracks`   | When added or unadded tracks exist             |
| 3     | `about`    | When description exists (or always-on empty)   |
| 4     | `podroll`  | Evidence                                       |
| 5     | `settings` | Signed-in                                      |

No sort control (web has none). Persist tab via artist prefs from 761.

### Data

Single online fetch: `reqPublisherFeedGetRemoteItemsForChannel` (already used). Split into:

- Albums: added then unadded (added → `AlbumDetail`; unadded → Podcast Index feed preview / link
  pattern matching web's remote unadded row)
- Tracks: added then unadded (`HomeFeedRow` / remote unadded row)

Offline: local subscription title + cached tracks if any; albums card may be empty with an honest
offline empty (network-only publisher remote items).

### Header

Same shell actions as album. Author subtitle from `channel_about.author`.

## Acceptance criteria

- Shell + chips; albums and tracks panes; added-before-unadded order.
- No sort UI; tab remembered per artist.
- Album row navigates to rebuilt album detail; track row to TrackDetail.
- Boosts absent; settings signed-in only.

## Web parity references

- [`apps/web/src/app/artist/[channel_id]/`](apps/web/src/app/artist/[channel_id]/)
- [`getPublisherRemoteItemsForChannelSeoPage`](apps/web/src/lib/seo/fetchers.ts) /
  `reqPublisherFeedGetRemoteItemsForChannel`

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- artist
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
