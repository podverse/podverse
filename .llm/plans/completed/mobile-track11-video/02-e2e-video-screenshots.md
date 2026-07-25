# 02 — Maestro video screenshots (11.15–11.17)

**Cursor model:** Opus 4.8  
**Details:** 360, 361, 362  
**Ship bar:** Screenshot smoke + structural asserts only (Maestro cannot prove live frames /
occlusion — operator on-device check remains).

## Goal

Satisfy Track 11 video E2E steps using (or extending) the existing `video-transition` flow so mini,
full, and collapse screenshots are first-class Maestro areas with stable `testID`s.

## Context (read first)

- Details:
  - [360-e2e-video-mini-screenshot](/docs/proposals/mobile/_master-plan_/details/360-e2e-video-mini-screenshot.md)
  - [361-e2e-video-full-screenshot](/docs/proposals/mobile/_master-plan_/details/361-e2e-video-full-screenshot.md)
  - [362-e2e-video-collapse-screenshot](/docs/proposals/mobile/_master-plan_/details/362-e2e-video-collapse-screenshot.md)
- Existing flow: `apps/mobile/e2e/video-transition.yaml`
- Skills: **mobile-e2e-screenshots**, **mobile-maestro-timeouts**, **vscode-terminals-commands**
- HOW-TO-RUN: `apps/mobile/e2e/HOW-TO-RUN.md`

## Tasks

1. Map 11.15–11.17 onto `video-transition.yaml` (or split into focused area YAMLs if the orchestrator
   needs `-- <area>` names — prefer **one** area `video-transition` if it already covers all three
   screenshots: mini / full / collapsed).
2. Ensure asserts:
   - Mini: `mini-player`, `mini-player-video-surface`, `playback-active-e2e`
   - Full: `full-player-screen`, `full-player-video-surface`; playback still active (no reload
     spinner / `playback-active-e2e` remains)
   - Collapse: full player gone; mini + `playback-active-e2e` still visible
3. Document in HOW-TO-RUN / APPS-MOBILE if the area name or prerequisites (test-assets `:2111`,
   E2E API, `e2e-play-video-item`) need a one-line update.
4. Fix broken Verification sections in details 361 / 362 if still wrong (commands in bash fences).
5. Mark **11.15, 11.16, 11.17** `done` in Tracks + Appendix C; detail headers `done`.
6. If this is the **last** prompt in the set: archive
   `.llm/plans/active/mobile-track11-video/` → `completed/` per **plan-completion**; update master
   plan “Current status” (Track 11 video leftover cleared); update `LLM-PLANS-ACTIVE.md`.

## Out of scope

- Proving live video pixels in Maestro (impossible) — leave operator on-device note
- Track 9d / downloads / car

## Acceptance

- `npm run mobile:e2e:test -- video-transition` is the operator command for 11.15–11.17
- Screenshots land in the mobile E2E report slots for iOS + Android

## Cumulative operator verify (whole set)

Leave-running (do **not** paste into one block with Maestro): **Mobile Metro**
`npm run mobile:dev:e2e`, **Mobile E2E API** `npm run mobile:e2e:api`, **Mobile E2E test-assets**
`npm run mobile:e2e:test-assets`, devices via **Mobile iOS** / **Mobile Android**
(`mobile:e2e:ios` / `mobile:e2e:android`) per HOW-TO-RUN.

```bash
# Mobile Maestro
npm run mobile:e2e:test -- video-transition
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
# Optional unit (Node-only mobile vitest)
npm --prefix apps/mobile run test
```
