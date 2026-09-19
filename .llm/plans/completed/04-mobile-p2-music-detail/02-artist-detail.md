# 02 — Artist detail

**Cursor model:** Codex 5.3
**Reasoning:** high

Detail: [763](/docs/proposals/mobile/_master-plan_/phase-2/details/763-artist-detail-parity.md) ·
Decisions: [00-SUMMARY.md](00-SUMMARY.md) (1–3)

Rebuild `ArtistDetailScreen` on the shell: albums / tracks / about / podroll / settings from
`reqPublisherFeedGetRemoteItemsForChannel`, added before unadded, no sort UI, offline-honest empties
for network-only remote albums. Album rows → AlbumDetail; tracks → TrackDetail.

Do not implement TrackDetail here.
