# Phase 2 — Music detail (P2.1.2)

Execution order: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md) · Prompts:
[COPY-PASTA.md](COPY-PASTA.md)

**Prerequisite:** medium foundations are complete (760, 761, 770: shell, prefs, and shared route kind).

**Nextgen code today:** `apps/mobile/src/screens/album/AlbumDetailScreen.tsx`,
`apps/mobile/src/screens/artist/ArtistDetailScreen.tsx`, TrackDetail placeholder in
`apps/mobile/src/navigation/index.tsx`

**Web references:** `apps/web/src/app/album/`, `artist/`, `track/`

**Details:**
[762 album](/docs/proposals/mobile/_master-plan_/phase-2/details/762-album-detail-parity.md)
· [763 artist](/docs/proposals/mobile/_master-plan_/phase-2/details/763-artist-detail-parity.md)
· [764 track + library routes](/docs/proposals/mobile/_master-plan_/phase-2/details/764-track-detail-and-library-routes.md)

**Supersedes (music half):**
[729-defer-video-music-channel-visuals](/docs/proposals/mobile/_master-plan_/phase-2/details/729-defer-video-music-channel-visuals.md)
— video half remains deferred (video stays on podcast/episode UX).

## Locked decisions

1. **Full web parity minus boosts.** Album / artist / track get section chips, about, podroll,
   settings; album season sort includes `top`; track transcript uses `info.transcript.lyrics`.
   Boosts stay Phase 3.
2. **Tab painted order follows web ListHeader build order**, not the query-param union array order.
3. **Artist lists are publisher remote items** — added before unadded; no sort UI.
4. **Track detail has no chapters / clips / soundbites** — match web track page.
5. **Library stack gains Album / Artist / Track** so in-flow navigation stays tab-local.
6. **Video is out of this set** — no video screens; foundations already locked Home to no videos chip.

## Cross-surface summary

| Surface       | Changes                                      |
| ------------- | -------------------------------------------- |
| `apps/mobile` | Album, artist, track screens; Library routes |
| `i18n-catalog`| Lyrics / music labels — prefer shared keys   |
| Web / API     | None (read existing endpoints)               |

## Unlocks

Alternate enclosures and player sets do not depend on this set; music detail and enclosures may run
in parallel after foundations.
