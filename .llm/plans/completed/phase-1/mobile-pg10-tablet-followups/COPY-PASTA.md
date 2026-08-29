# COPY-PASTA — mobile-pg10-tablet-followups

Run prompts **1 → 2 → 3** in order. Each: read its plan file, implement, check the box here, and
move the finished numbered file to `.llm/plans/completed/phase-1/mobile-pg10-tablet-followups/`.
**Agents: implement only — do not run tests.** The operator runs the verification block at the end.

## Leave-running (named tabs — start once, keep up)

**Mobile Metro**

```bash
npm run mobile:dev:e2e
```

**Mobile E2E API**

```bash
npm run mobile:e2e:api
```

**Mobile E2E test-assets** (now required for the tablet run after step 01 — playback fixtures)

```bash
npm run mobile:e2e:test-assets
```

Tablet devices installed once (rebuild after any app code change — e.g. step 03):

```bash
npm run mobile:e2e:ios:tablet
npm run mobile:e2e:android:tablet
```

## Prompts

- [x] **Step 1 — FullPlayer two-column E2E (Track 18.4 coverage).**

**Cursor model:** Codex 5.3 — Maestro flow extension + small `e2e-test.sh` marker change.

```text
Read and execute .llm/plans/active/mobile-pg10-tablet-followups/01-full-player-tablet-e2e.md
Extend apps/mobile/e2e/tablet.yaml to open the full player and assert full-player-two-column +
screenshot (mirror play-mini-player.yaml; iOS full-player-close / Android Back). Add `tablet` to
flow_needs_test_assets() in scripts/mobile/e2e-test.sh and update the test-assets prerequisite note
in HOW-TO-RUN.md / APPS-MOBILE.md. Mark done, move the plan file to completed/. Do not run tests.
```

- [x] **Step 2 — Mid-band (600–899dp) breakpoint decision (docs).**

**Cursor model:** Auto — decision + docs only (no product code for decision A).

```text
Read and execute .llm/plans/active/mobile-pg10-tablet-followups/02-midband-breakpoint-decision.md
Record decision A (intended as-is) in DOCS-MOBILE-DEVICE-MATRIX.md with the three-band table, note
the rendered-coverage gap in the e2e readme, and log the optional mid-band nightly against 18.16.
If review picks decision B (behavior change), STOP and open a separate plan. Mark done, move the
plan file to completed/. Do not run tests.
```

- [x] **Step 3 — Phone Home FlatList visual confirm (regression guard).**

**Cursor model:** Codex 5.3 — confirm + lock intent (comment or minimal card-wrapper restore).

```text
Read and execute .llm/plans/active/mobile-pg10-tablet-followups/03-phone-home-flatlist-visual-confirm.md
Confirm the phone Home post-FlatList layout is intended; either document it with a comment above the
FlatList in HomeScreen.tsx, or restore the single-column card wrapper if it was an unintended
regression (leave the columns>1 grid path unchanged). Mark done, archive the whole set to completed/.
Do not run tests.
```

## After all complete (operator verification)

One-shots (**Mobile** tab) — leave-running **Mobile Metro** + **Mobile E2E API** +
**Mobile E2E test-assets** must be up, and the tablet apps installed
(`mobile:e2e:ios:tablet` / `mobile:e2e:android:tablet`):

```bash
npm run build:packages
npm run lint
npm run test -w apps/mobile
```

E2E (**Mobile Maestro** tab):

```bash
npm run mobile:e2e:test -- tablet
npm run mobile:e2e:test -- home
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-tablet/index.html
open .artifacts/mobile-e2e-reports/latest/android-tablet/index.html
```
