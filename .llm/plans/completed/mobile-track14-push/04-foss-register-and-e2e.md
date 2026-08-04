# 04 — FOSS register doc + E2E push-routing stub (14.7, 14.8) — final

**Cursor model:** Codex 5.3
**Details:** 446, 447
**Ship bar:** Doc + one Maestro flow. Archive the plan set when done.

## Goal

Record FCM/Firebase as a non-FOSS dependency for Track 20, and add an E2E flow that validates tap
routing without a live push server.

## Context (read first)

- Details 446 (FOSS register), 447 (E2E stub).
- Process doc: `docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md` §4.
- Skill: **mobile-fdroid-flavors**; Track 20 details (570, 572).
- `apps/mobile/e2e/HOW-TO-RUN.md`; existing `deep-link-*.yaml` (Track 15.6).
- Skills: **mobile-e2e-screenshots**, **mobile-maestro-timeouts**.

## Tasks

1. **14.7 (doc)** — Add/extend the FOSS register/audit note listing FCM + Firebase as playstore-only
   with the UnifiedPush replacement mapping (cross-ref 445, Track 20.3).
2. **14.8 (E2E)** — Add a Maestro flow that triggers the notification-open code path via a deep link
   mimicking the payload target (reuse Track 15.6 flow) or an E2E-only "simulate open" hook; assert
   the target testID; screenshot into the report. Hermetic E2E-safe `id_text`.
3. Mark **14.7, 14.8** `done` in master plan Tracks + Appendix C; detail 446/447 headers `done`.
4. **Archive** this plan set (`active/` → `completed/`) per **plan-completion**; update
   `.llm/plans/active/LLM-PLANS-ACTIVE.md`.

## Acceptance

- FOSS register doc lists FCM/Firebase exclusion + UnifiedPush replacement.
- E2E flow exercises tap routing and captures a screenshot (ios-phone + android-phone).
