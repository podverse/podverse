# 113-engine-spike-gate

**Master step:** 2.34
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Define go/no-go criteria for the audio engine spike before Tracks 10/11/12 player UI / car work.
- Minimum **go** (phone engine readiness):
  - Single-engine audio play/pause/seek on iOS + Android
  - Background survival on both platforms (2.12)
  - Lock-screen / media-session controls on the **same** player instance
  - JS events including `ended`; no `react-native-track-player`
  - **Car foundation constraints satisfied** (see below) — even though CarPlay/AA UI is not built
- Document no-go remediation paths (revise Track 2 steps with operator).
- Explicitly separate this gate from **seamless car acceptance** (Track 12).

## Car foundation (required for “go”, not full car)

Seamless CarPlay / Android Auto is a **hard product requirement**. PG-2b does not prove it, but a
**go** must confirm the spike did not paint the car layer into a corner:

| Constraint                                                        | Detail refs            |
| ----------------------------------------------------------------- | ---------------------- |
| One process-wide player; car now-playing will bind to it          | 083, 086, 12.9         |
| Shared `MPRemoteCommandCenter` / Media3 session (no second owner) | 085, 088, 12.10        |
| Android uses `MediaLibraryService` (stub browse OK)               | 087 → 12.11–12.13      |
| Native cache write hooks reserved (stubs OK)                      | 114 / 2.35 → 12.1–12.4 |
| Deferred seamless proofs listed in gate doc                       | 12.5–12.6, 12.17–12.18 |

## Deferred — seamless car (NOT this gate)

Do **not** mark car “done” at 2.34. Operator acceptance for seamless UX remains:

- **12.5** / **12.6** — native cache read with JS dead / app force-stopped
- **12.17** / **12.18** — DHU + CarPlay simulator manual checklists
- Full Track 12 browse trees, entitlements, offline items in tree

## Acceptance criteria

- Step 2.34 complete per master plan
- Gate checklist written and linked from APPS-MOBILE or module README
- Checklist includes phone engine items **and** car-foundation constraints
- Checklist states Tracks 10/11/12 require this gate `done`, and seamless car still requires Track 12
- Master plan / phase notes remain risk-first (no Track 10/11/12 before go)

## Web parity references

- [mobile-master-plan-phasing](/.cursor/skills/mobile-master-plan-phasing/SKILL.md) risk-first overrides
- [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)
- Phase note: `/.llm/plans/completed/phase-1/mobile-pg2b-media-engine-spike/00-CAR-FOUNDATION.md`
- Gate decision: [`GO-NO-GO.md`](/apps/mobile/modules/podverse-media-engine/GO-NO-GO.md) — **GO**
  (2026-07-13)

## Verification

```bash
rg -n 'go/no-go|spike gate|MediaLibraryService|writeQueueSnapshot|12\.5|12\.17' apps/mobile docs/proposals/mobile/_master-plan_/phase-1/details/113-engine-spike-gate.md
```
