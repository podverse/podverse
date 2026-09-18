# 01 — Album detail

**Cursor model:** Codex 5.3
**Reasoning:** high

Detail: [762](/docs/proposals/mobile/_master-plan_/phase-2/details/762-album-detail-parity.md) ·
Decisions: [00-SUMMARY.md](00-SUMMARY.md) (1–3)

Rebuild `AlbumDetailScreen` on the channel-detail shell: chips tracks / about / podroll / settings
(no boosts), season sort forward / backward / top with range under top, live items on page 1,
offline cached tracks, preview params, section chrome for podroll. Rows navigate to TrackDetail
(placeholder OK until prompt 03).

Do not rebuild artist or track in this step.
