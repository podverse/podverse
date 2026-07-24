# COPY-PASTA — mobile-track11-video (Track 11 video leftover)

Run prompts **1 → 2** in order. Each prompt: read its plan file + detail docs, implement, mark
master-plan steps + Appendix C + detail headers `done`, check the box. **Do not run tests during
agent work.**

**Ship bar:** functional video wiring + Maestro smoke only — no player redesign / transcripts /
clip UI (Track 21.11 / Track 23).

Follow **mobile-playback**, **mobile-e2e-screenshots**, master plan **Ship bar**.

Prerequisite: PG-5 video + reparent gaps complete; Track 11 audio done.

---

## Step 1 — RN video UI audit + continuity

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-track11-video/01-rn-video-ui-and-continuity.md
Also read details 342, 351–353. Implement / verify master steps 11.3, 11.6–11.8.
Much of the RN wiring may already exist from PG-5 — audit and close gaps only; do not redesign.
Mark done when finished. Do not run tests during agent work.
```

---

## Step 2 — Maestro video screenshots (final)

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-track11-video/02-e2e-video-screenshots.md
Also read details 360–362. Implement master steps 11.15–11.17 (prefer extending e2e/video-transition.yaml).
Archive this plan set when finished. Do not run tests during agent work.
```

---

## After both complete (operator)

Assume prompts ran back-to-back without tests. Leave Metro / E2E API / test-assets / devices up per
`apps/mobile/e2e/HOW-TO-RUN.md` and **vscode-terminals-commands**, then:

```bash
npm run mobile:e2e:test -- video-transition
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
npm --prefix apps/mobile run test
```
