# PG-5 — Track 2 video / seamless surface reparenting

**Parallel group:** PG-5 (Track 2 remainder after audio spike)
**Master plan:** [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
**Steps:** 2.14–2.28, 2.31–2.33 (implement); **2.29–2.30 already `done`** (reconciled)
**Detail IDs:** 093–112

## Goal

Add seamless **video** to `podverse-media-engine`: one shared AVPlayer / ExoPlayer, one native
**VideoSurfaceHost**, bridge APIs to attach/animate/reparent between RN `mini` and `full` targets,
plus engine polish (`loadAndStart`, `file://`, error mapping, FOSS register, E2E).

**Do not** mount a second RN `Video` / second engine on full-player open (Track 11.18).

## Prerequisites (satisfied)

- Track 1 playback-core `done`
- Track 2 audio spike + GO (`GO-NO-GO.md`) `done`
- PG-7 audio (Track 10 + Track 11 audio UI) `done`
- Track 11 video UI steps 11.3 / 11.6–11.8 / 11.15–11.17 remain `planned` — implement **after** this
  phase’s native + RN registration lands (or in a thin follow-on COPY-PASTA)

## Out of scope

- CarPlay / Android Auto browse (Track 12)
- Episode file download jobs (Track 13) — only engine `file://` support here
- Full pixel polish / look-and-feel
- Re-opening 2.29 README / 2.30 abcmemory as greenfield work (already done)

## Open decisions locked

- EAS + Maestro (unchanged)
- Custom `podverse-media-engine` (no track-player)
- Primitives now; pixel polish later

## Outputs

- Detail docs `093–112` under `docs/proposals/mobile/_master-plan_/details/`
- This plan set under `.llm/plans/active/mobile-pg5-video/`
- Master-plan steps flipped `_TBD_` → `planned` (2.29–2.30 → `done`)

## After this phase

Wire Track 11 video UI/E2E details (342, 351–353, 360–362), then PG-8 car or PG-9 mobile-only.
