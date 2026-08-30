---
name: abce2etestdebug
description: Debug failing Podverse web, management-web, and mobile E2E tests one unit and platform at a time. Use when the operator invokes abce2etestdebug.
---

# `abce2etestdebug`

Use this workflow whenever the operator invokes **`abce2etestdebug`** for a failing E2E run.
The objective is a verified, focused pass for each failing spec or mobile flow before moving to
the next failure. For mobile, isolate one flow and one device platform so a failure on the first
platform is fixed before spending time on the second platform.

## Full mobile platform handoff

When the operator is sweeping the complete mobile suite, use this handoff:

1. Run the full iOS suite alone:
   `npm run mobile:e2e:test:all -- --platform ios`
2. Invoke **abce2etestdebug** with the iOS output or report artifacts. Debug every unresolved iOS
   flow one at a time until the iOS queue is green. Do not start Android debugging during this
   phase.
3. After iOS is green, run the full Android suite alone:
   `npm run mobile:e2e:test:all -- --platform android`
4. Invoke **abce2etestdebug** with the Android output or report artifacts. Debug every unresolved
   Android flow one at a time until the Android queue is green.

Each platform-scoped full-suite run seeds its own database and creates only its selected report
slot, preventing the second platform from inheriting feature state written by the first. Running
Android alone reduces total wall-clock time and cross-platform state contamination, but it does
not by itself reduce the duration of an individual Android flow. If Android flows remain much
slower than iOS, investigate Android Dev Client/Metro connection waits and emulator performance
separately.

## Required debugging loop

1. Build an ordered queue of failures from the supplied output or report artifacts. Treat each web
   spec as one unit and each mobile YAML flow as one unit. Do not debug the whole suite as one
   problem.
2. Select only the first unresolved unit. Do not inspect or modify the next failing unit yet.
   For a mobile queue on a platform that supports both phone slots, select iOS first.
3. Confirm that the report artifacts for the selected unit are available. If the expected report
   artifacts are missing or incomplete, rerun that unit immediately with the narrowest supported
   command. The default runner configuration must be used unless the operator explicitly requests
   retries; do not add redundant inline environment overrides.
4. Read failure evidence before changing code:
   - Web or management-web: inspect the failing test output, report step screenshots, URL, console
     errors, and network/API evidence when available.
   - Mobile: read `failures.json` first, then the listed flow HTML and its failure screenshot.
     Inspect raw Maestro command output only when the flow report lacks the required detail.
5. Determine whether the failure is an environment/precondition problem, a test-contract problem,
   or an application defect. Preserve a deterministic expected outcome.
6. Fix the root cause when it is clear. Do not increase timeouts, add retries, weaken assertions,
   or accept multiple outcomes as a first response.
7. If the correct fix is uncertain, stop and ask focused questions before changing code. Include
   the competing explanations, the evidence needed to distinguish them, and the exact operator
   observation or action required. Ask again whenever new evidence leaves the fix ambiguous.
8. Run the narrowest verification for the current unit. For mobile, run the flow on only the
   selected platform:
   - iOS first: `npm run mobile:e2e:test -- --platform ios <area>`
   - Android after iOS passes: `npm run mobile:e2e:test -- --platform android <area>`
   Do not use `--platform both` while isolating a failure. Do not continue to another failure until
   the current platform passes. Once a mobile flow passes on iOS, run that same flow on Android
   before selecting the next flow. When the operator has provided the required leave-running
   services, the agent runs this focused command and reads the result; do not ask the operator to
   run it and report back unless the agent has a concrete execution blocker. If it fails again,
   return to evidence gathering and repeat this loop.
9. If operator intervention is required (missing device, native build, service, permission,
   authentication, or other local environment blocker), stop immediately. State the blocker and
   request the exact intervention and resulting output; do not work around it or skip to another
   test.
10. After the current unit passes, record its root cause, fix, verification command, and result,
    then immediately select the next unresolved unit. When multiple failures are supplied, continue
    through the entire queue; do not stop after resolving only the first failure.

## Verification commands

Use the repository's supported runners:

- Web: `make e2e_test_web_report_spec SPEC=e2e/<spec>.spec.ts`
- Management-web: `make e2e_test_management_web_report_spec SPEC=e2e/<spec>.spec.ts`
- Both web surfaces: `make e2e_test_report_scoped WEB_SPEC=... MGMT_SPEC=...`
- Mobile debugging: `npm run mobile:e2e:test -- --platform ios <area>` or
  `npm run mobile:e2e:test -- --platform android <area>` in the **Mobile Maestro** tab.
  Use `npm run mobile:e2e:test -- <area>` for a deliberate two-platform run.

Use the exact affected path and the smallest focused command. Do not use direct Playwright
commands for web E2E. For mobile debugging, assume **Mobile Metro**, **Mobile E2E API**, and
**Mobile E2E test-assets** are already running as the operator specified; verify a required service
only when the failure evidence indicates that it is the blocker.

Interrupted mobile runs attempt to generate a partial report. Use that report when it contains
the selected flow's evidence. If the partial report is missing or incomplete, rerun the selected
flow normally so the default no-retry configuration creates `failures.json` and the focused flow
report. A missing report after that rerun is a setup blocker to investigate, not a reason to debug
from incomplete suite output.

The mobile runner does not perform end-of-suite retries by default. Keep
`MOBILE_E2E_FLOW_RETRIES` at `0` while isolating a failure. Enable a retry only when the operator
explicitly requests it, for example `MOBILE_E2E_FLOW_RETRIES=1`, and never treat a retry pass as a
substitute for understanding a failure.

## Rate-limit effects

Treat an unexpected 429 from a long-lived E2E API as possible test-state contamination before
changing a locator or weakening an assertion. Check the endpoint, account, retry metadata, and
whether the request was user-initiated or background sync.

- The normal web/mobile E2E profiles may relax only explicitly identified noisy limits through
  test-environment configuration. Production defaults and production request handling remain
  unchanged.
- Test actual API enforcement with integration tests under the rate-limited test profile.
- Test web rate-limit UI with deterministic Playwright response mocks.
- Test mobile rate-limit UI with an explicit E2E fixture or opt-in rate-limited profile when device
  coverage is required; do not add a second always-running API for ordinary E2E.
- Background-sync 429s should remain non-blocking and be recorded through sync diagnostics.
  User-facing rate-limit UI is for user-initiated actions unless the product contract says
  otherwise.
- If a rate-limit configuration changes, restart the long-lived E2E API before verification so it
  loads the rebuilt profile. Never continue debugging against a stale API process.

## Scope and evidence discipline

- A suite-level cascade of identical mobile locator failures is one active failure until the first
  focused flow establishes whether the shared launch/connect path or the feature flow is broken.
- A shared helper or fixture change may affect multiple failures, but verify the first affected
  flow before investigating the others, then continue through every remaining affected unit.
- Keep existing report artifacts. The mobile runner opens the report hub automatically; do not add
  manual `open` commands unless the operator specifically asks to open a particular artifact.
- Do not classify a failure as flaky solely because a retry passes. Identify the transient
  condition, make the test or environment deterministic where appropriate, and report remaining
  uncertainty.

## Completion response

For each resolved unit, state:

- the test/spec or mobile flow;
- the observed failure and root cause;
- the files changed;
- the focused verification command and pass result;
- any remaining environmental limitation.

For a batch of failures, continue until every supplied unit passes or the next unit needs operator
input, an unavailable environment capability, or an uncertain product decision. At that point,
summarize the completed units and the blocker, and stop only for that operator action or decision.
