---
name: mobile-e2e-screenshots
description: After React Native mobile UI changes, instruct the operator to run npm mobile E2E scripts and open per-slot HTML reports under .artifacts/mobile-e2e-reports/latest/{ios,android}-{phone,tablet}/. Read those reports when diagnosing failures. Not Playwright or web make e2e_* targets.
---

# Mobile E2E screenshot reports

Use when you modify **visual or interactive UI** in `apps/mobile/src/**` or mobile E2E specs under
`apps/mobile/e2e/**`.

Mobile E2E uses **Maestro** (Track 5 lock) — not Playwright. Do **not** suggest web
`make e2e_*` targets; those are web and management-web only (see **e2e-run-with-make-only** rule).

## Report layout (OS + form factor)

Each run writes a **hub** plus **one HTML report per OS + device form-factor slot**:

```text
.artifacts/mobile-e2e-reports/<timestamp>/
  index.html                 # hub
  ios-phone/index.html       # phone matrix (current default)
  android-phone/index.html
  ios-tablet/index.html      # reserved; create when tablet E2E devices exist
  android-tablet/index.html
```

`latest` symlinks to the newest timestamp. Slot reports use the **same chrome as web E2E**
(`scripts/e2e-html-steps-reporter.ts`): summary list, failed sections, screenshots, and fixed
**Prev/Next Shot | Test | Error** navigation.

Do **not** collapse platforms into a single screenshot page. Open the slot that failed.

## Operator verification (mobile UI / feature work)

Same habit as web UI work (**ui-e2e-screenshot-report**): agents do **not** run E2E during
implementation. For mobile feature/UI PRs, instruct the operator to generate slot reports:

1. Narrowest Maestro flow under `apps/mobile/e2e/<area>.yaml` (add/update when behavior changes).
2. Assume / point to [HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md) for terminal setup:
   - **UI-only:** Metro (`mobile:dev`) + e2e ios/android installs + Maestro — four terminals.
   - **API-backed:** one-shot `make mobile_e2e_deps` / `make mobile_e2e_seed`, then leave-running
     `mobile:dev:e2e` + `mobile:e2e:api`, installs, then Maestro — five terminals.
3. Tell them where to review **after** they run:
   - Hub: `.artifacts/mobile-e2e-reports/latest/index.html`
   - iOS phone: `.artifacts/mobile-e2e-reports/latest/ios-phone/index.html`
   - Android phone: `.artifacts/mobile-e2e-reports/latest/android-phone/index.html`

### Never chain leave-running processes in one verify `bash` block

`npm run mobile:dev`, `npm run mobile:dev:e2e`, and `npm run mobile:e2e:api` **block the shell**.
Do **not** put them in the same fenced `bash` block as `mobile:e2e:test` (or other one-shot
commands) as if the operator can paste the whole list into one terminal. That forces Ctrl+C on Metro
(“Stopped server”) before later steps run.

Final response `bash` blocks should contain only **one-shot** commands (prep Make targets if
needed, Maestro, `open` report paths). Point at HOW-TO-RUN (or labeled prose “Terminal 1 /
Terminal 4”) for leave-running Metro/API. Optional: `mobile:e2e:api:bg` + `mobile:e2e:api:health`
in a prep shell when background API is intentional.

## Agents: read reports when debugging

When mobile E2E fails (operator paste, CI artifact, or local `.artifacts/mobile-e2e-reports/`):

1. Open the **slot** HTML for the failing OS/form-factor (not only the hub).
2. Read the failed section error text and open the ❌ failure screenshot(s).
3. Use that evidence before suggesting unrelated fixes (Metro, wrong device, locator, Expo
   launcher still showing, etc.).

## Expo Dev Client contract (required after launchApp)

`launchApp` with `clearState: true`:

1. Lands on the Expo Dev Client **launcher** until Metro is entered.
2. After the JS bundle loads, re-shows the one-time **developer menu** (“Continue”) because
   clearState resets Expo’s “seen menu” flag. That sheet occludes app UI.

Every Maestro flow that needs app UI must `runFlow: shared/connect-dev-client.yaml` **after**
each such `launchApp` and **before** asserting app `testID`s. That shared flow taps the Metro URL
(iOS `localhost` / Android `10.0.2.2`), taps **Continue** to dismiss the onboarding card, then
**closes the dev-menu bottom sheet** it reveals (tapping the dimmed scrim above the sheet), then
waits for `hello-world-screen` (or the flow’s root once Home replaces that screen). Tapping
**Continue** alone is insufficient — it only opens the full dev menu (Reload / Go home / …), which
still occludes the app. Do not invent a parallel connect path that skips the sheet close.

## Response format

**Mandatory** for mobile UI / feature implementation responses (parity with web
**ui-e2e-screenshot-report** / **end-with-targeted-make-report-verify**):

1. End with a fenced `bash` block containing the **most focused** report command for the changed
   surface — prefer `npm run mobile:e2e:test -- <area>` mapped to the flow you added/updated.
   Use bare `npm run mobile:e2e:test` only when the default `hello-world` smoke is truly the right
   scope.
2. Include where to open results (hub + affected slots):
   - `.artifacts/mobile-e2e-reports/latest/index.html`
   - `.artifacts/mobile-e2e-reports/latest/ios-phone/index.html`
   - `.artifacts/mobile-e2e-reports/latest/android-phone/index.html`
3. If Metro / E2E installs / API are not already assumed running, point at
   [HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md) in prose — do not paste leave-running
   `mobile:dev*` / `mobile:e2e:api` into the final verification block.

Example ending block (UI-only area — replace `<area>` with the flow you changed; assume Metro +
installs already up per HOW-TO-RUN):

```bash
npm run mobile:e2e:test -- hello-world
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

Example ending block (API-backed area — assume Metro via `mobile:dev:e2e`, API on `:4230`, and E2E
installs already up per HOW-TO-RUN):

```bash
npm run mobile:e2e:test -- api-health
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

One-shot prep only (safe to paste; exits) when the operator has not seeded yet:

```bash
make mobile_e2e_deps
make mobile_e2e_seed
```

Track **5.17–5.20** API+DB harness is complete. Auth login/logout Maestro remains Track 6
(`210` / `211`). See [TEST-ENV.md](/apps/mobile/e2e/TEST-ENV.md).

## When this skill does not apply

- Docs-only changes under `apps/mobile/*.md` with no RN source.
- Shared package-only changes with no mobile UI impact: follow **response-ending-make-verify**.
- Web or management-web UI: use **ui-e2e-screenshot-report** instead.

## Related

- [HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md)
- [TEST-ENV.md](/apps/mobile/e2e/TEST-ENV.md) — UI-only vs API-backed; harness 5.17–5.20
- [APPS-MOBILE.md](/apps/mobile/APPS-MOBILE.md)
- **mobile-feature-requires-e2e** rule
- **mobile-master-plan-phasing** — Track 5 E2E harness (5.17–5.20 complete)
- Completed plan: [`.llm/plans/completed/mobile-e2e-api-db-harness/`](/.llm/plans/completed/mobile-e2e-api-db-harness/)
