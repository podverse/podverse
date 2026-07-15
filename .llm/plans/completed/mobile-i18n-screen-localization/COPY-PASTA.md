# COPY-PASTA — mobile-i18n-screen-localization

Use one prompt per agent. Run **in order** from `00-EXECUTION-ORDER.md`.

After each prompt: tick `[x]` here. Agents do **not** run tests — operator verifies.

Phases are sequential (catalog → auth → nav).

## Step 1 — Catalog keys

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/completed/mobile-i18n-screen-localization/01-catalog-keys.md
Also read .llm/plans/completed/mobile-i18n-screen-localization/00-SUMMARY.md for locked decisions.
Add missing en-US keys (reuse consumer/shared first; mobile overlay for RN-only chrome).
Run i18n:compile guidance for the operator; do not wire screens yet.
Do not run tests during agent work; end with operator verification commands.
```

## Step 2 — Auth screens + account locale

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/completed/mobile-i18n-screen-localization/02-auth-screens-i18n.md
Also read .llm/plans/completed/mobile-i18n-screen-localization/00-SUMMARY.md for locked decisions.
Wire Login/SignUp/HelloWorld auth CTAs to useTranslation; resolve validation keys via authentication.*; call applyAccountLocaleOverride after /auth/me. Keep all testIDs.
Do not run tests during agent work; end with auth Maestro verify commands for the operator.
```

## Step 3 — Navigation titles

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/completed/mobile-i18n-screen-localization/03-navigation-i18n.md
Also read .llm/plans/completed/mobile-i18n-screen-localization/00-SUMMARY.md for locked decisions.
Localize tab labels and stack/hub product titles via t(); leave ...Placeholder body text hardcoded; keep testIDs.
Do not run tests during agent work; end with tab-switch and auth-logout Maestro verify commands for the operator.
```

## Cumulative operator verification (whole set)

Assume all COPY-PASTA prompts ran without tests until the end. Leave-running (do not paste into
the one-shot block): **Mobile Metro** `npm run mobile:dev:e2e`, **Mobile E2E API**
`npm run mobile:e2e:api`, E2E iOS/Android installs already done per HOW-TO-RUN.

**Root / Mobile** (one-shot catalog + Maestro):

```bash
npm run i18n:compile
npm run i18n:validate
npm run mobile:e2e:test -- auth-login,auth-logout,tab-switch-playback
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

Optional locale smoke (interim HelloWorld controls until Track 16.3 settings picker):

```bash
npm run mobile:e2e:test -- locale-switch-home-smoke
```
