---
name: mobile-e2e-screenshots
description: After React Native mobile UI changes, instruct the operator to run npm mobile E2E scripts and open failures.json + per-slot/per-flow HTML reports under .artifacts/mobile-e2e-reports/latest/. Read those reports when diagnosing failures. Not Playwright or web make e2e_* targets.
---

# Mobile E2E screenshot reports

Use when you modify **visual or interactive UI** in `apps/mobile/src/**` or mobile E2E specs under
`apps/mobile/e2e/**`.

Mobile E2E uses **Maestro** (Track 5 lock) — not Playwright. Do **not** suggest web
`make e2e_*` targets; those are web and management-web only (see **e2e-run-with-make-only** rule).

## Report layout (OS + form factor)

Each run writes a **hub**, a compact **`failures.json`**, plus **slot summaries** and **per-flow pages**:

```text
.artifacts/mobile-e2e-reports/<timestamp>/
  index.html                 # hub (fails callout + slot cards)
  failures.json              # machine index — preferred agent entrypoint
  ios-phone/
    index.html               # slot summary (fails-first links)
    flows/<slug>/index.html  # one flow: error, steps, screenshots
    flows/<slug>/failure.png # copy of primary ❌ shot when present
    maestro.html             # raw Maestro HTML (optional)
  android-phone/...
  ios-tablet/...             # when `npm run mobile:e2e:test -- tablet` runs
  android-tablet/...
```

`latest` symlinks to the newest timestamp. Flow pages keep web-parity screenshot chrome
(**Prev/Next Shot | Test | Error**). Slot index stays concise for scanning; do **not** dump full
Maestro accessibility hierarchies into HTML (raw `commands-*.json` remains for deep dive).

Do **not** collapse platforms into a single screenshot page. Open the slot / flow that failed.

## Full suite vs focused verify

- **Full suite (operator regression):** `npm run mobile:e2e:test:all` — discovers every top-level
  `apps/mobile/e2e/<area>.yaml` (not `shared/`). Documented first in
  [HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md). Requires API-backed stack
  (`mobile:dev:e2e` + `mobile:e2e:api` + deps/seed + E2E installs).
- **Feature / PR verify:** keep using the **narrowest** `npm run mobile:e2e:test -- <area>` (bare
  `mobile:e2e:test` = `hello-world` only). Do **not** default agent verify endings to `:all`.
- **UI-only Metro symptom:** API-backed / `:all` runs with `mobile:dev` (not `mobile:dev:e2e`) show
  Network Error / “Could not sign in” / missing `tab-home` — the app still points at `:3000`.
  `e2e-test.sh` fail-fasts when it can read Metro’s env and `EXPO_PUBLIC_MOBILE_E2E=1` is absent.
  Fix: restart **Mobile Metro** with `npm run mobile:dev:e2e`, reload/reinstall, then re-run.

### When adding a new top-level Maestro flow

1. Add `apps/mobile/e2e/<area>.yaml` — it is **auto-included** in `mobile:e2e:test:all`.
2. If the flow needs `:4230` when run alone, add `<area>` to `flow_needs_e2e_api` in
   [`scripts/mobile/e2e-test.sh`](/scripts/mobile/e2e-test.sh).
3. If the flow needs real media (`tools/test-assets` on `:2111`), add `<area>` to
   `flow_needs_test_assets` in the same script.
4. Keep [HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md) § Run all as the operator entry for the
   full process (prep + leave-running + `:all`). Update that section if prep/stack steps change.

## Operator verification (mobile UI / feature work)

Same habit as web UI work (**ui-e2e-screenshot-report**): agents do **not** run E2E during
implementation. For mobile feature/UI PRs, instruct the operator to generate slot reports:

1. Narrowest Maestro flow under `apps/mobile/e2e/<area>.yaml` (add/update when behavior changes).
2. Assume / point to [HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md) and label tabs from
   [`.vscode/terminals.json`](/.vscode/terminals.json) (**vscode-terminals-commands** rule):
   - **UI-only:** **Mobile Metro** (`mobile:dev`) + **Mobile iOS** / **Mobile Android** installs +
     **Mobile Maestro**.
   - **API-backed / full suite:** **Mobile** one-shots (`make mobile_e2e_deps` / `mobile_e2e_seed`),
     then leave-running **Mobile Metro** (`mobile:dev:e2e`) + **Mobile E2E API**, and for playback
     flows also **Mobile E2E test-assets** (`mobile:e2e:test-assets` on `:2111`), installs, then
     **Mobile Maestro** (`mobile:e2e:test -- <area>` or `mobile:e2e:test:all`).
3. Tell them where to review **after** they run:
   - Failures index: `.artifacts/mobile-e2e-reports/latest/failures.json`
   - Hub: `.artifacts/mobile-e2e-reports/latest/index.html`
   - iOS phone: `.artifacts/mobile-e2e-reports/latest/ios-phone/index.html`
   - Android phone: `.artifacts/mobile-e2e-reports/latest/android-phone/index.html`

### Never chain leave-running processes in one verify `bash` block

`npm run mobile:dev`, `npm run mobile:dev:e2e`, `npm run mobile:e2e:api`, and
`npm run mobile:e2e:test-assets` **block the shell**.
Do **not** put them in the same fenced `bash` block as `mobile:e2e:test` (or other one-shot
commands) as if the operator can paste the whole list into one terminal. That forces Ctrl+C on Metro
(“Stopped server”) before later steps run.

**Mobile E2E API** is leave-running independently of Metro. Restarting **Mobile Metro** does **not**
require restarting the API if `:4230` is already healthy. Auth/tab/api-health flows do need the API
up (see **mobile-maestro-timeouts**). **Mobile E2E test-assets** (`:2111`) is leave-running the same
way for playback flows (add-by-rss play).

Timeouts: prefer the shared `TIMEOUT_*` ladder (**mobile-maestro-timeouts**); default to the fastest
reasonable tier.

Final response `bash` blocks should contain only **one-shot** commands (prep Make targets if
needed, Maestro, `open` report paths). For leave-running Metro/API, name the tabs (**Mobile Metro**,
**Mobile E2E API**) in prose — do not paste blockers into the same verify block. Optional:
`mobile:e2e:api:bg` + `mobile:e2e:api:health` in **Mobile** when background API is intentional.

## Agents: read reports when debugging

When mobile E2E fails (operator paste, CI artifact, or local `.artifacts/mobile-e2e-reports/`):

1. Read **`failures.json`** first (compact list of failing flows + paths).
2. Open only the listed **flow** HTML pages (`<slot>/flows/<slug>/index.html`) and their
   `failure.png` / ❌ screenshots.
3. Use slot `index.html` for a fails-first overview; use raw `commands-*.json` only when hierarchy
   / deep step detail is required.
4. Use that evidence before suggesting unrelated fixes (Metro, wrong device, locator, Expo
   launcher still showing, etc.).

## Expo Dev Client contract (required after launchApp)

`launchApp` with `clearState: true`:

1. Lands on the Expo Dev Client **launcher** until Metro is entered.
2. After the JS bundle loads, re-shows the one-time **developer menu** (“Continue”) because
   clearState resets Expo’s “seen menu” flag. That sheet occludes app UI.

Every Maestro flow that needs app UI must use `runFlow: shared/launch-and-connect.yaml` **before**
asserting app `testID`s. That shared flow wraps `launchApp` + `shared/connect-dev-client.yaml` in a
Maestro `retry` (iOS mid-suite relaunches can blank out before “Development servers”). The connect
steps tap the Metro URL (iOS `localhost` / Android `10.0.2.2`), tap **Continue** to dismiss the
onboarding card, then **close the dev-menu bottom sheet** it reveals (tapping the dimmed scrim above
the sheet), then wait for `hello-world-screen` (or the flow’s root once Home replaces that screen).
Tapping **Continue** alone is insufficient — it only opens the full dev menu (Reload / Go home / …),
which still occludes the app. Do not invent a parallel connect path that skips the sheet close.

The runner also re-runs **only failed** flow YAMLs once per platform by default
(`MOBILE_E2E_FLOW_RETRIES=1`; set `0` to disable). HTML reports prefer the latest pass for a flow
title when both failed and retry `commands-*.json` exist.

## Maestro flow authoring gotchas (keyboard, secure input, silent failures)

These recur when a flow reaches a form (login/signup) and then stalls or fails on a post-submit
assertion. Check them before blaming locators or timeouts:

1. **`hideKeyboard` is flaky on iOS** — it throws `Couldn't hide the keyboard` because iOS has no
   guaranteed dismiss affordance. On iOS the primary button is usually visible above the keyboard, so
   you do not need it. Guard it to Android only:

   ```yaml
   - runFlow:
       when:
         platform: Android
       commands:
         - hideKeyboard
   ```

   On Android the soft keyboard often occludes the submit button after `inputText`, so Android _does_
   need the dismiss. Prefer this platform-guarded form over an unconditional `hideKeyboard`.

2. **`secureTextEntry` blocks Maestro `inputText`** — iOS Strong-Password autofill over a secure
   field leaves the value empty. The app renders password fields as plaintext when
   `EXPO_PUBLIC_MOBILE_E2E=1` (set by `scripts/mobile/dev-e2e.sh`); confirm the failure screenshot
   shows the typed value before deeper debugging.

3. **Silent submit = swallowed error in the screen, not a Maestro bug.** If Submit is tapped but the
   screen stays put with **no** error text (and the assertion times out), the async handler likely
   threw and was swallowed. Every mobile async submit/handler must `catch` and set a visible,
   `testID`-bearing error (see **mobile-surface-async-errors** rule). A visible error turns an opaque
   assertion timeout into a diagnosable message and lets the flow assert the failure directly.

4. **Reachability differs by platform.** iOS simulator reaches the host at `localhost`; Android
   emulator uses `10.0.2.2`. To isolate a network problem from a form/logic problem, run the
   `api-health` flow (it hits the same base URL with a GET): health `error` on one platform points at
   reachability/cleartext, not the form.

## Response format

**Mandatory** for mobile UI / feature implementation responses (parity with web
**ui-e2e-screenshot-report** / **end-with-targeted-make-report-verify**):

1. End with a fenced `bash` block containing the **most focused** report command for the changed
   surface — prefer `npm run mobile:e2e:test -- <area>` mapped to the flow you added/updated.
   Use bare `npm run mobile:e2e:test` only when the default `hello-world` smoke is truly the right
   scope.
2. Include where to open results (failures.json + hub + affected slots):
   - `.artifacts/mobile-e2e-reports/latest/failures.json`
   - `.artifacts/mobile-e2e-reports/latest/index.html`
   - `.artifacts/mobile-e2e-reports/latest/ios-phone/index.html`
   - `.artifacts/mobile-e2e-reports/latest/android-phone/index.html`
3. If Metro / E2E installs / API are not already assumed running, name the leave-running tabs
   (**Mobile Metro**, **Mobile E2E API**, **Mobile iOS** / **Mobile Android**) in prose and link
   [HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md) — do not paste leave-running commands into the
   final verification `bash` block.

Example ending (UI-only — **Mobile Maestro**; assume **Mobile Metro** + installs already up):

```bash
# Mobile Maestro
npm run mobile:e2e:test -- hello-world
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

Example ending (API-backed — **Mobile Maestro**; assume **Mobile Metro**=`mobile:dev:e2e` and
**Mobile E2E API** already up):

```bash
# Mobile Maestro
npm run mobile:e2e:test -- api-health
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

One-shot prep (**Mobile**) when the operator has not seeded yet:

```bash
# Mobile
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
- The completed harness outcome is captured in the mobile app E2E documentation; completed plan
  archives are removed after their outcomes are retained.
