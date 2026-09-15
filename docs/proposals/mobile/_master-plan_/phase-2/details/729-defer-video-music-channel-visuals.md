# 729-defer-video-music-channel-visuals

**Master step:** P2.3 (operational backlog — new)
**Model (author + implement):** Auto
**Status:** deferred to a future phase

## Scope

Nextgen website already varies channel chrome by medium (podcast / video / album / artist). Legacy
mobile had **no** dedicated video or music channel screens. Phase 2 podcast work extracts shared
`ChannelHeader` + section-chip primitives with medium slots
([723](723-podcast-channel-header-and-section-chips.md)) but only implements the **podcast** medium.

**Deferred:** deciding and implementing video and music channel visuals.

### When picked up

- Drive from **website** layouts (`apps/web` album / artist / video routes), not from legacy mobile
  screenshots (there are none).
- Reuse the shared primitives; vary chips, sort options, and header actions per medium.
- Album / artist sketches already exist under `apps/mobile/src/screens/album/` and `artist/` —
  rebuild them in their own Phase 2 screenshot batches rather than inside P2.1.2.

## Acceptance criteria (when implemented)

- Video and music channel screens use the shared header / chip shell with medium-specific sections.
- Visual direction is locked from website + operator answers before coding.
- E2E covers at least one album and one artist (or video) path.

## Web parity references

- [`apps/web/src/app/album/`](apps/web/src/app/album/)
- [`apps/web/src/app/artist/`](apps/web/src/app/artist/)
- Mobile sketches: [`AlbumDetailScreen.tsx`](apps/mobile/src/screens/album/AlbumDetailScreen.tsx),
  [`ArtistDetailScreen.tsx`](apps/mobile/src/screens/artist/ArtistDetailScreen.tsx)
- Skill: **mobile-legacy-screenshot-planning** (operator-guided; website as parity source when legacy
  has no screen)

## Verification

```bash
# Mobile Maestro (when implemented)
npm run mobile:e2e:test -- browse
```
