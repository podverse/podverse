# Podverse Mobile — Master Plan (Phase 4, watch + TV)

> **Not started.** Detail docs are authored just-in-time when the operator starts this phase.
> Phase index: [PHASES.md](/docs/proposals/mobile/_master-plan_/PHASES.md)

## Scope

Additional device targets beyond phone and tablet. Phone and tablet shipped in Phase 1 (Track 18.1–18.5,
18.15); watch and TV were never started.

**Storage note (carried from Phase 1 Track 18):** tablets share the phone app process and use the same
SQLite repositories. **Watches do not read SQLite.** Wear OS now-playing complications and remote
controls consume **MediaSession / native cache** (or a phone bridge) — the same projection path as
CarPlay / Android Auto. See
[DOCS-MOBILE-DATA-LAYER-OFFLINE.md §7.1](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md).

## Carried from Phase 1

### Watch (Wear OS)

| Step | Carried from | What | Model |
| --- | --- | --- | --- |
| P4.1 | 18.6 | Scope decision: remote control only vs standalone player | Opus 5 |
| P4.2 | 18.7 | MediaSession remote commands from phone engine (play/pause/skip) | Opus 5 |
| P4.3 | 18.8 | Now-playing complication from native cache or MediaSession phone bridge | Opus 5 |
| P4.4 | 18.9 | Document Apple Watch as post-v1 deferral if Wear-only v1 | Auto |

### TV (Android TV)

| Step | Carried from | What | Model |
| --- | --- | --- | --- |
| P4.5 | 18.10 | Leanback launcher entry and banner assets | Codex 5.3 |
| P4.6 | 18.11 | D-pad focus navigation for Home rows and browse lists | Codex 5.3 |
| P4.7 | 18.12 | Full-screen player with remote-friendly controls (no mini player) | Opus 5 |
| P4.8 | 18.13 | Sign-in flow adapted for TV input (QR code or device code OAuth) | Opus 5 |
| P4.9 | 18.14 | TV E2E: screenshot browse row focus state (emulator) | Codex 5.3 |

## Related deferrals

Phase 1 Track 21 already recorded **Apple Watch standalone** (21.1) and **tvOS native** (21.2) as
deferrals. Revisit those decisions when this phase starts rather than assuming they still hold.

## Prerequisites

Phase 2 should be substantially complete — watch and TV surfaces project from the same playback and
cache layers that Phase 2 polish may still be reshaping.

## Detail ID band

**930–969.** The original Phase 1 IDs (520–523 watch, 530–534 TV) were never written as files; reuse
those numbers only if you want continuity with the Phase 1 step tables, otherwise use the 930–969 band.

## Open questions to resolve before detailing

- Is Wear OS still wanted at all, or has the market case changed?
- Android TV vs Google TV targeting, and minimum API level?
- Does TV need offline downloads, or streaming only?
