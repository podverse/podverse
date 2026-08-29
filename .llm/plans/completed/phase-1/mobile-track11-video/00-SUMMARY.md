# Track 11 video UI / E2E — summary

**Phase slug:** `mobile-track11-video`  
**Master steps:** 11.3, 11.6–11.8, 11.15–11.17  
**Detail IDs:** 342, 351–353, 360–362  
**Ship bar:** Functional video surface wiring + Maestro smoke only. No player layout redesign,
transcript chrome, or clip authoring (Track 21.11 / Track 23).

## Prerequisites (satisfied)

- PG-5 Track 2 video + gap remediation (true reparent) — archived under
  `.llm/plans/completed/phase-1/mobile-pg5-video*`
- Track 11 audio full/mini player **done**
- Engine GO: `apps/mobile/modules/podverse-media-engine/GO-NO-GO.md`

## Already in tree (do not rebuild from scratch)

PG-5 landed most of the RN surface targets:

- `MiniPlayer.tsx` — `PodverseVideoSurfaceView` `targetId="mini"`, `mini-player-video-surface`
- `FullPlayerScreen.tsx` — `targetId="full"`, expand/collapse `animateVideoSurface`
- `PlaybackProvider` — `setVideoSurfaceVisible` for `item-video`
- `e2e/video-transition.yaml` — mini → full → collapse screenshots (feeds 11.15–11.17)

This phase **audits, closes gaps, and marks master-plan steps done** — not a greenfield rewrite.

## Open decisions locked

- E2E: Maestro
- Visual polish: deferred to Track 23
- Player-integrated transcript: deferred (21.11)

## Model mix

| Model     | Steps                                      |
| --------- | ------------------------------------------ |
| Opus 4.8  | 11.3, 11.6–11.8, 11.16–11.17 (prompts 1–2) |
| Codex 5.3 | 11.15 (folded into prompt 2 with Opus)     |

## After this phase

- Track 9d playlist authoring sketches (separate COPY-PASTA)
- Then downloads / car / settings as sequenced in master plan
