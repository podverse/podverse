# Mobile PG-7b — Track 11 mini/full player (audio-first)

**Master plan:** [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
**Steps implemented in this set:** 11.1–11.2, 11.4–11.5, 11.9–11.14, 11.18
**Detail IDs (all detailed):** 340–363
**Status:** planned (ready after PG-7a)
**Prerequisite plan:** [mobile-pg7a-queue](../mobile-pg7a-queue/) (Track 10)

## Goal

Replace placeholder mini/full player slots with real audio player chrome bound to Track 10
now-playing + native bridge: layout, expand without reload, up-next, segments, speed, optional
sleep stub, share, V4V entry stub, and anti-pattern docs.

## Deferred (detailed, do **not** implement in this COPY-PASTA set)

Stay `planned` until after PG-5 / Track 2 video (2.14+):

| Step | Detail | Topic |
| ---- | ------ | ----- |
| 11.3 | 342 | Mini video placeholder / `targetId=mini` |
| 11.6 | 351 | Full video surface + animate from mini |
| 11.7 | 352 | Collapse surface animation |
| 11.8 | 353 | Position continuity verify (video-focused) |
| 11.15 | 360 | E2E video mini screenshot |
| 11.16 | 361 | E2E video full screenshot |
| 11.17 | 362 | E2E video collapse screenshot |

## Locked decisions

| Item | Decision |
| ---- | -------- |
| Single player | Never mount a second engine/Video on expand (11.18) |
| Navigation | Existing `ROOT_STACK_ROUTES.FullPlayer` / `testID`s retained |
| Audio-first | Artwork + controls; no VideoSurfaceHost registration yet |
| i18n | User-facing strings via mobile i18n catalogs |
| E2E | Maestro; reuse play-mini-player area from PG-7a |

## Out of scope

- PG-5 video surface reparenting
- Track 12 car / Track 15 full deep links / Track 19 full LNURL (stubs only where noted)
- Pixel polish pass

## Critical path

`01` mini UI+layout → `02` expand → `03` full UI → `04` up-next/segments/speed → `05`
sleep/share/v4v → `06` anti-pattern doc.

## References

- Skills: **mobile-playback**, **mobile-theme-parity**, **mobile-e2e-screenshots**
- Placeholders: `apps/mobile/src/navigation/index.tsx` (`mini-player`, `full-player-screen`)
