# COPY-PASTA — mobile-helpers-dto-subpath

Use one prompt per agent. Run **in order** from `00-EXECUTION-ORDER.md`.

After each prompt: tick `[x]` here. Agents do **not** run tests — operator verifies.

## Step 1 — Helpers dto export + mobile imports

- [x] completed

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-helpers-dto-subpath/01-helpers-dto-export-and-mobile-imports.md
Also read .llm/plans/active/mobile-helpers-dto-subpath/00-SUMMARY.md for locked decisions.
Add @podverse/helpers/dto export; switch AuthProvider and LoginScreen off the helpers barrel; remove the TODO; note APPS-MOBILE.md.
Do not run tests during agent work; end with operator verification commands.
```

## Cumulative operator verification (whole set)

Leave-running: **Mobile Metro** `npm run mobile:dev:e2e` (and **Mobile E2E API** if auth needs API).

**Root / Mobile Maestro:**

```bash
npm run build -w packages/helpers
npm run mobile:e2e:test -- auth-login
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
