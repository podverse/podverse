# COPY-PASTA — mobile-auth-nav-tech-debt

Use one prompt per agent. Run **in order** from `00-EXECUTION-ORDER.md`.

After each prompt: tick `[x]` here. Agents do **not** run tests — operator verifies.

Phases are sequential. Phase 2 prompts may run in parallel with each other.

## Step 1 — Auth bootstrap + post-login account

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/completed/mobile-auth-nav-tech-debt/01-auth-bootstrap-and-account-hydrate.md
Also read .llm/plans/completed/mobile-auth-nav-tech-debt/00-SUMMARY.md for locked decisions.
Fix bootstrap status/token inconsistency and load /auth/me after successful login.
Do not run tests during agent work; end with operator verification commands.
```

## Step 2a — Docs + env consistency (parallel with 2b)

- [x] done

**Cursor model:** Auto

```text
Read and execute .llm/plans/completed/mobile-auth-nav-tech-debt/02-docs-and-env-consistency.md
Fix HOW-TO-RUN stale :4230 hosts (include /api/v2) and clarify local_env vs E2E port docs.
Do not run tests during agent work.
```

## Step 2b — Entry + import hygiene (parallel with 2a)

- [x] done

**Cursor model:** Auto

```text
Read and execute .llm/plans/completed/mobile-auth-nav-tech-debt/03-mobile-entry-and-import-hygiene.md
Add gesture-handler entry import; prefer non-barrel DTOAccount type import if cheap.
Do not run tests during agent work; end with tab-switch Maestro verify commands for the operator.
```

## Step 3 — Signup copy + health fetch (optional)

- [x] done

**Cursor model:** Auto

```text
Read and execute .llm/plans/completed/mobile-auth-nav-tech-debt/04-signup-i18n-and-health-fetch.md
Optional polish only — defer if not needed for the next ship.
Do not run tests during agent work.
```

## Cumulative operator verification (whole set)

Assume all COPY-PASTA prompts ran without tests until the end. Leave-running (do not paste into
the one-shot block): **Mobile Metro** `npm run mobile:dev:e2e`, **Mobile E2E API**
`npm run mobile:e2e:api`, E2E iOS/Android installs already done per HOW-TO-RUN.

**Mobile Maestro** (one-shot):

```bash
npm run mobile:e2e:test -- auth-login,auth-logout,tab-switch-playback,api-health,hello-world
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

If only Phase 1 shipped: narrow to `auth-login,auth-logout`.
