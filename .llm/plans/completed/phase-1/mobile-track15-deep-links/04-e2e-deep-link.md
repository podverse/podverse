# 04 — E2E deep-link screenshot (15.6) — final

**Cursor model:** Codex 5.3
**Detail:** 455
**Ship bar:** One Maestro deep-link flow + report screenshot. Archive the plan set when done.

## Goal

Prove the 452 path map + 453 cold-start replay on device via a Maestro flow that opens the app with
a test deep link and screenshots the target screen.

## Context (read first)

- Detail 455.
- `apps/mobile/e2e/locale-switch-home-smoke.yaml` (flow pattern), `apps/mobile/e2e/HOW-TO-RUN.md`.
- Skills: **mobile-e2e-screenshots**, **mobile-maestro-timeouts**, **mobile-ios-simulator**.

## Tasks

1. Add `apps/mobile/e2e/deep-link-*.yaml`: open a custom-scheme URL
   (`podverse-next://podcast/<E2E id_text>` or `.../more/settings`) from closed/backgrounded state;
   assert a stable target testID; capture a screenshot.
2. Register the flow in the Maestro area/report list; use hermetic E2E-safe `id_text`.
3. Mark **15.6** `done` in master plan Tracks + Appendix C; detail 455 header `done`.
4. **Archive** this plan set (`active/` → `completed/`) per **plan-completion**; update
   `.llm/plans/active/LLM-PLANS-ACTIVE.md`.

## Acceptance

- Flow launches via deep link and lands on the expected screen (testID asserted).
- Screenshot appears in ios-phone + android-phone report slots.
