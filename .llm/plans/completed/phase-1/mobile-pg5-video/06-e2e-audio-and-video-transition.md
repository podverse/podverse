# 06 — E2E audio evidence + video transition (2.32–2.33)

**Cursor model:** Opus 4.8  
**Details:** [111](../../../../docs/proposals/mobile/_master-plan_/phase-1/details/111-e2e-audio-spike-screenshot.md),
[112](../../../../docs/proposals/mobile/_master-plan_/phase-1/details/112-e2e-video-transition-spike.md)

## Goal

Durable Maestro evidence for audio playback, plus a video mini→full transition flow that asserts
no reload (feeds Track 11.15–11.17).

## Implement

1. Audio: extend `play-mini-player` or add `engine-audio-spike` flow with screenshot steps; document
   simulator lock-screen limits.
2. Video: add flow (e.g. `video-transition.yaml`) using test-assets video; expand/collapse; screenshots.
3. Ensure Android media host rewrite (5.23) applies to video URLs.
4. If Track 11.15–11.17 can be satisfied by the same flows, mark those done too; otherwise leave
   planned and note follow-on.

## Do not

- Run tests during agent work — instruct operator only.
- Soft-pass when video fixture is missing.

## Done when

- Steps 2.32–2.33 `done`.
- Archive this plan set to `.llm/plans/completed/phase-1/mobile-pg5-video/` per **plan-completion** when
  all PG-5 implement steps are `done`.

## Verification (operator)

```bash
# Mobile Maestro — Metro + devices already up (HOW-TO-RUN)
npm run mobile:e2e:test -- play-mini-player
npm run mobile:e2e:test -- video-transition
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
