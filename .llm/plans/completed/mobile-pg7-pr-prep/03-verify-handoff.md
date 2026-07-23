# 03 — Verify handoff + archive (final)

## Goal

Finish PR-prep: cumulative operator verification commands, remind what to include in the commit,
archive this plan set, and refresh the active/completed plan indexes.

## Do

1. **Confirm prior steps:** `01` i18n validate green; `02` Close confirmed or fixed.
2. **Update indexes:**
   - Move `.llm/plans/active/mobile-pg7-pr-prep/` → `.llm/plans/completed/mobile-pg7-pr-prep/`
   - Update `.llm/plans/active/LLM-PLANS-ACTIVE.md` (remove this active entry / note completed)
   - Add a short entry under `.llm/plans/completed/LLM-PLANS-COMPLETED.md`
3. **Do not run tests.** End with **all** cumulative operator commands for the whole set
   (dedupe; order: build → i18n → unit → mobile E2E focused).
4. **Commit guidance (operator-only):** Agents must **not** `git commit` unless the user
   explicitly asks. In the final response, list what to stage (all PG-7 / media-row / i18n /
   ORM / playback-core / e2e untracked sources — no secrets, no `.direnv`). Suggest 1–3 logical
   commits or one feature commit on `feature/mobile-app-init-6`.

## Cumulative operator verification (whole set)

Leave-running (do not paste into the one-shot block): **Mobile Metro** `npm run mobile:dev:e2e`,
**Mobile E2E API** `npm run mobile:e2e:api`, **Mobile E2E test-assets**
`npm run mobile:e2e:test-assets` — see `apps/mobile/e2e/HOW-TO-RUN.md`.

```bash
npm run build:packages
npm run i18n:validate
npm run test -w @podverse/playback-core
npm run mobile:e2e:test -- play-mini-player,queue-add,auto-queue-advance
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

Optional broader check: `npm run mobile:e2e:test:all`.

## Done when

- Plan directory archived under `completed/`
- Indexes updated
- Final response includes cumulative verify commands + commit staging guidance
- COPY-PASTA step 3 marked done

## Out of scope

- Opening the GitHub PR (`gh pr create`) unless the operator asks
- Implementing deferred video Track 11 steps
