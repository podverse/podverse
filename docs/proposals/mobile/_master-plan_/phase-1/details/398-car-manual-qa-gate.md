# 398-car-manual-qa-gate

**Master step:** 12.19
**Model (author + implement):** Auto
**Status:** Android done; iOS CarPlay done

## Scope

Car browse+play E2E is not fully automatable (no Maestro/DHU in CI), so it must be a documented
**manual QA gate** in the release runbook. This detail adds the Android Auto gate; the iOS CarPlay
gate follows with the CarPlay slice.

## Android Auto (done)

- Added a **Manual car QA gate — Android Auto** section to
  `docs/operations/mobile/MOBILE-RELEASE-RUNBOOK.md`.
- It is a **pointer** to the DHU browse+play checklist
  (`apps/mobile/modules/podverse-media-engine/ANDROID-AUTO-DHU-CHECKLIST.md`, detail 396) and the
  Play Console declaration doc — steps are **not** duplicated.
- Gate applies to any release that ships/changes the Android Auto surface (media-engine native code,
  browse tree, or media service).

## iOS CarPlay (done)

- Added a **Manual car QA gate — iOS CarPlay** section to
  `docs/operations/mobile/MOBILE-RELEASE-RUNBOOK.md`, a **pointer** to the CarPlay Simulator
  browse+play checklist (`CARPLAY-SIMULATOR-CHECKLIST.md`, detail 397) and the entitlement runbook —
  steps are **not** duplicated.
- Gate applies to any release that ships/changes the CarPlay surface (media-engine native code,
  CarPlay scene/templates, or the engine).

## Acceptance criteria

- Release runbook has an Android Auto manual QA gate that points at the DHU checklist (no duplicated
  steps).
- Release runbook has an iOS CarPlay manual QA gate that points at the Simulator checklist (no
  duplicated steps).
- Marked as required when the car surface changes.

## Web parity references

- [396-dhu-test-checklist](/docs/proposals/mobile/_master-plan_/phase-1/details/396-dhu-test-checklist.md)
- [171-mobile-release-runbook](/docs/proposals/mobile/_master-plan_/phase-1/details/171-mobile-release-runbook.md)

## Verification

```bash
rg -n 'Manual car QA gate|ANDROID-AUTO-DHU-CHECKLIST' docs/operations/mobile/MOBILE-RELEASE-RUNBOOK.md
```

## Depends on

- 12.17 DHU checklist (detail 396) — this phase
