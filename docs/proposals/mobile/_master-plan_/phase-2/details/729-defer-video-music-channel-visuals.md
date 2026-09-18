# 729-defer-video-music-channel-visuals

**Master step:** P2.3 (operational backlog — new)
**Model (author + implement):** Auto
**Status:** music half superseded by 762–764; video half deferred

## Scope

Nextgen website already varies channel chrome by medium (podcast / video / album / artist). Legacy
mobile had **no** dedicated video or music channel screens. Phase 2 podcast work extracts shared
`ChannelHeader` + section-chip primitives with medium slots
([723](723-podcast-channel-header-and-section-chips.md)) but only implements the **podcast** medium.

### Music half — superseded

Album / artist / track detail parity is implemented under
[762](762-album-detail-parity.md)–[764](764-track-detail-and-library-routes.md) and
`.llm/plans/completed/04-mobile-p2-music-detail/`, after medium foundations
([760](760-shared-medium-route-kind.md), [761](761-channel-detail-shell-and-prefs.md)).

### Video half — still deferred

Video-medium channels stay on podcast / episode detail (match web today: no `/video` detail pages;
`/videos` is "Coming soon"). Real video divergence is enclosure selection and the player surface
([765](765-enclosure-selection-session-state.md)–[768](768-enclosure-driven-video-surface.md)), not
dedicated video screens. No Home `videos` chip.

## Acceptance criteria (video half, when reconsidered)

- Only reconsider dedicated video screens if web ships a real video browse / channel UX.
- Until then, keep Video medium on podcast/episode routes.

## Web parity references

- [`apps/web/src/app/album/`](apps/web/src/app/album/)
- [`apps/web/src/app/artist/`](apps/web/src/app/artist/)
- [`apps/web/src/app/videos/page.tsx`](apps/web/src/app/videos/page.tsx)
- Mobile sketches: [`AlbumDetailScreen.tsx`](apps/mobile/src/screens/album/AlbumDetailScreen.tsx),
  [`ArtistDetailScreen.tsx`](apps/mobile/src/screens/artist/ArtistDetailScreen.tsx)

## Verification

```bash
# Mobile Maestro (when music set implements)
npm run mobile:e2e:test -- album
```
