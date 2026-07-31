# 04 — Simulator checklist + iOS QA gate (12.18, 12.19 iOS) — final

**Cursor model:** Auto
**Details:**
[397-carplay-simulator-checklist](/docs/proposals/mobile/_master-plan_/details/397-carplay-simulator-checklist.md),
[398-car-manual-qa-gate](/docs/proposals/mobile/_master-plan_/details/398-car-manual-qa-gate.md)

## Goal

Finish operator docs so CarPlay Simulator browse+play is the release gate counterpart to the Android
DHU checklist. Archive this plan set when done.

## Do

1. Refresh
   [`CARPLAY-SIMULATOR-CHECKLIST.md`](/apps/mobile/modules/podverse-media-engine/CARPLAY-SIMULATOR-CHECKLIST.md)
   so steps match the implemented Library/Downloads templates (seed → force-quit → CarPlay display →
   browse → play).
2. Update release runbook / `GO-NO-GO.md` / detail **398** so iOS CarPlay QA is no longer “_TBD_”
   once checklist + scene exist (Android portion stays done).
3. Cross-link entitlement + checklist from module README.
4. Mark **12.18**, **12.19 iOS** + Appendix C **397** (+ 398 iOS) → `done`.
5. Archive `.llm/plans/active/mobile-pg8-car-carplay/` → `completed/` per **plan-completion**.
6. Update master plan “Current status / next up” so PG-8 iOS CarPlay is no longer “next up” if
   steps are done (operator may still need to run Simulator proof).

## Do not

- Do not implement UX-parity browse redesign.
- Do not run Simulator during agent work — instruct the operator.
- Do not run tests during agent work.

## Operator verify (after all prompts)

```bash
# Mobile — rebuild iOS, then CarPlay Simulator
npm run mobile:prebuild
npm run mobile:ios -- --device "iPhone 17 Pro"
# Simulator: I/O ▸ External Displays ▸ CarPlay
# Follow apps/mobile/modules/podverse-media-engine/CARPLAY-SIMULATOR-CHECKLIST.md
```
