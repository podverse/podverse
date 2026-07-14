# COPY-PASTA — mobile-e2e-api-db-harness

Use one prompt per agent. Run in order from `00-EXECUTION-ORDER.md`.

Active at `.llm/plans/active/mobile-e2e-api-db-harness/`. Archive to `completed/` when all steps
are done and master-plan steps 5.17–5.20 are `done`.

## Step 1 — apiMobileE2e profile

- [x] done

```text
Read and execute .llm/plans/active/mobile-e2e-api-db-harness/01-api-mobile-profile.md
Also read docs/proposals/mobile/_master-plan_/details/076-e2e-api-mobile-profile.md.
Add apiMobileE2e @ port 4230 to podverseTestEnv; update TEST-ENV.md with the locked port.
Mark master step 5.17 / detail 076 done when this prompt finishes.
Cursor model: Codex 5.3
```

## Step 2 — seed + test_deps Make aliases

- [x] done

```text
Read and execute .llm/plans/active/mobile-e2e-api-db-harness/02-seed-and-test-deps.md
Also read docs/proposals/mobile/_master-plan_/details/077-e2e-api-db-seed.md.
Add mobile_e2e_deps / mobile_e2e_seed Make targets reusing e2e_deps + e2e_seed_web.
Do not gate default mobile:e2e:test on test_deps. Document seeded credentials for future auth.
Mark master step 5.18 / detail 077 done when this prompt finishes.
Cursor model: Codex 5.3
```

## Step 3 — API lifecycle

- [x] done

```text
Read and execute .llm/plans/active/mobile-e2e-api-db-harness/03-api-lifecycle.md
Also read docs/proposals/mobile/_master-plan_/details/078-e2e-api-lifecycle.md.
Add long-lived API start/stop/health for apiMobileE2e @ 4230 (scripts/Make/npm).
Do not attach to UI-only mobile:e2e:test. Mark 5.19 / 078 done when finished.
Cursor model: Codex 5.3
```

## Step 4 — Expo API base URL

- [x] done

```text
Read and execute .llm/plans/active/mobile-e2e-api-db-harness/04-expo-api-url.md
Also read docs/proposals/mobile/_master-plan_/details/079-e2e-expo-api-url.md.
Wire iOS localhost:4230 and Android 10.0.2.2:4230 for E2E (EXPO_PUBLIC_* or app config).
Cursor model: Codex 5.3
```

## Step 5 — docs, skills, API-health smoke, close-out

- [x] done

```text
Read and execute .llm/plans/active/mobile-e2e-api-db-harness/05-docs-skills-smoke-closeout.md
Also read docs/proposals/mobile/_master-plan_/details/079-e2e-expo-api-url.md.
Update HOW-TO-RUN / TEST-ENV / APPS-MOBILE / mobile-e2e-screenshots; add minimal API-health
Maestro smoke (not login). Mark 5.20 / 079 done; archive this plan set to completed/.
Do not implement 6.11 or 6.12.
Cursor model: Auto
```
