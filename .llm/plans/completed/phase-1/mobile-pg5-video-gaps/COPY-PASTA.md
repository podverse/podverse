# PG-5 video gap remediation — COPY-PASTA prompts

Two independent plans. Plan 01 (priority) and Plan 02 can run in parallel (different files).
Paste a prompt to execute it immediately.

---

## Prompt 1 — Fix native surface z-order vs modal full player (priority)

**Cursor model:** Opus 4.8

```
Read and execute .llm/plans/completed/phase-1/mobile-pg5-video-gaps/01-video-surface-reparent.md

The single native video surface is occluded by the React Navigation modal full player because it is
attached to the key window (iOS) / android.R.id.content (Android) and only reframed. Implement a true
reparent onto the RN placeholder's native view (Option A) on both platforms so video renders in the
full player, without creating a second player/surface or resetting the playhead. Verify on-device
(Maestro cannot see occlusion).
```

- [x] Prompt 1 complete — surface reparented into RN-mounted `PodverseVideoSurfaceView` (iOS +
  Android); needs native rebuild + on-device verification.

---

## Prompt 2 — Wire mobile Vitest into a real gate

**Cursor model:** Codex 5.3

```
Read and execute .llm/plans/completed/phase-1/mobile-pg5-video-gaps/02-mobile-unit-test-ci-gate.md

The mobile serialization + error-taxonomy Vitest suites run nowhere (apps/mobile is a standalone
install excluded from root test:unit; CI skips unit tests). Add `npm --prefix apps/mobile run test`
to the operator checklists (ci.yml warning + HOW-TO-RUN / APPS-MOBILE) and, if in scope, a mobile CI
unit step that respects the standalone lockfile. Keep tests Node-only (no Expo imports).
```

- [x] Prompt 2 complete — docs (ci.yml warning + success checklist, HOW-TO-RUN, APPS-MOBILE) +
  non-blocking `mobile-internal.yml` unit step; vitest scope guard confirmed (no Expo import).

---

## After both complete

Assume the operator ran both prompts without running tests. Cumulative verification:

```bash
npm --prefix apps/mobile run test
npm run mobile:e2e:test -- video-transition
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

Plus **manual on-device** check: expand/collapse the full player during video playback and confirm
live frames (not static artwork) with no reload / playhead jump.
