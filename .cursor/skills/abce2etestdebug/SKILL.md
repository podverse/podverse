---
name: abce2etestdebug
description: Debug one specifically named Podverse web, management-web, or mobile E2E test flow/spec at a time. Use when the operator invokes abce2etestdebug with a single target.
---

# `abce2etestdebug`

Use this workflow whenever the operator invokes **`abce2etestdebug`** for one specifically named
failing E2E flow or spec. The objective is to diagnose and verify that one target without expanding
the work to unrelated failures. For mobile, isolate the named flow and one device platform so a
failure on the first platform is fixed before spending time on the second platform.

## Single-target contract

The operator is expected to provide exactly one mobile flow or web/management-web spec. Treat that
target as the complete scope:

- Do not build a queue from unrelated failures in a suite output.
- Do not inspect, modify, or run another flow/spec after the named target passes or reaches a
  blocker.
- If the supplied evidence contains other failures, mention them as out of scope and ask the
  operator to invoke **`abce2efulltestdebug`** or name the next target separately.
- For mobile, verify the named flow on iOS and Android when both platforms are applicable; both
  platforms remain part of this one target.

## Full mobile platform handoff

When the operator is sweeping the complete mobile suite, invoke
**`abce2efulltestdebug`** instead. Do not turn a single-target invocation into a suite sweep.

1. Run the full iOS suite alone:
   `npm run mobile:e2e:test:all -- --platform ios`
2. Invoke **`abce2efulltestdebug`** with the iOS output or report artifacts. Debug every unresolved iOS
   flow one at a time until the iOS queue is green. Do not start Android debugging during this
   phase.
3. After iOS is green, run the full Android suite alone:
   `npm run mobile:e2e:test:all -- --platform android`
4. Invoke **`abce2efulltestdebug`** with the Android output or report artifacts. Debug every unresolved
   Android flow one at a time until the Android queue is green.

Each platform-scoped full-suite run seeds its own database and creates only its selected report
slot, preventing the second platform from inheriting feature state written by the first. Running
Android alone reduces total wall-clock time and cross-platform state contamination, but it does
not by itself reduce the duration of an individual Android flow. If Android flows remain much
slower than iOS, investigate Android Dev Client/Metro connection waits and emulator performance
separately.

## Required debugging loop

1. Confirm the single named target from the operator's message and supplied output. Treat one web
   spec or one mobile YAML flow as the only unit. Do not debug the whole suite as one problem.
2. Select only the named target. Do not inspect or modify any other failing unit. For a mobile
   target on a platform that supports both phone slots, select iOS first.
3. Confirm that the report artifacts for the selected unit are available. If the expected report
   artifacts are missing or incomplete, rerun that unit immediately with the narrowest supported
   command. The default runner configuration must be used unless the operator explicitly requests
   retries; do not add redundant inline environment overrides.
   If the flow requires empty local mobile data and prior runs may have populated subscriptions,
   rerun it with `--reset-data` so the runner resets the app before that flow.
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
8. Establish the required service state before running the narrowest verification. For mobile,
   follow the service preflight below rather than assuming that operator-provided services are
   running. Then run the flow on only the selected platform:
   - iOS first: `npm run mobile:e2e:test -- --platform ios <area>`
   - Android after iOS passes: `npm run mobile:e2e:test -- --platform android <area>`
     Do not use `--platform both` while isolating a failure. Do not continue to another failure until
     the current platform passes. Once a mobile flow passes on iOS, run that same flow on Android
     before selecting the next flow. The agent runs this focused command and reads the result; do not
     ask the operator to run it and report back unless the agent has a concrete execution blocker. If
     it fails again, return to evidence gathering and repeat this loop.
9. Reconcile required leave-running services in the service preflight. First inspect the existing
   terminal state, listener ports, PIDs, process commands, and health endpoints so the agent does
   not create duplicate services. Treat service state as unknown until verified:
   - Mobile Metro: for mobile runs, ensure `npm run mobile:dev:e2e` is the active process on `:8081`.
     If no Metro is listening, start it in **Mobile Metro**. If a listener is the wrong Metro mode,
     stop it only when its process command is positively identified as the E2E Metro process, then
     start the E2E process and wait for it to become ready. Do not kill an unidentified listener,
     `mobile:dev`, or an operator-owned process.
   - Mobile E2E API: when an API-backed flow needs `:4230`, use the managed lifecycle in **Mobile
     E2E API**: `npm run mobile:e2e:api:stop`, then `npm run mobile:e2e:api:bg`, followed by its
     health check. The mobile runner reseeds the database, so this must be the managed background
     API that the runner can stop and restart around reseeding.
   - Mobile E2E test-assets: when a playback flow needs `:2111`, use the managed lifecycle in
     **Mobile E2E test-assets**: `npm run mobile:e2e:test-assets:stop`, then
     `npm run mobile:e2e:test-assets:bg`, followed by its fixture health check.
     If a managed service conflicts, stop the managed instance before starting it. Ask for operator
     intervention only for a missing device, native build, permission, authentication failure, or a
     positively identified operator-owned foreground process that cannot be safely restarted. Do not
     work around a blocker or skip to another test.
10. After the named target passes, record its root cause, fix, verification command, and result,
    then stop. If it is blocked, record the evidence and the exact operator action needed, then
    stop. Do not select another unresolved unit.

## Mandatory completion gate

Never describe a run, failure queue, platform, or debugging session as fixed, complete, green, or
fully resolved unless all applicable conditions below are true:

1. Every failure within the named target is recorded as a separate target issue.
2. Every issue within the named target has either:
   - a focused post-fix run that reports `Passed`, or
   - an explicitly documented blocker that requires operator input.
3. A shared application, fixture, service, runner, or report-generator fix invalidates conclusions
   from earlier runs until the first affected unit is rerun after that fix.
4. A report-generator failure is tracked separately from flow failures and is itself verified fixed
   by a later run that writes the expected report artifacts.
5. For mobile, each affected flow passes on iOS and Android before it is marked resolved.

A shared root cause may explain multiple issues within the named target, but it does not mark the
target resolved without a focused post-fix result. A suite-level pass does not prove that the named
target passed. If no post-fix command has actually started, report verification as pending instead
of reporting a pass. Failures outside the named target are out of scope for this invocation.

## Run identity and stale-result protection

Before using a completion notification, terminal output, or report as evidence, confirm that it
belongs to the current invocation:

- Record the exact command, terminal/output path, report directory, selected platform, and selected
  flow or spec before starting it.
- Confirm that the command start time and report directory are after the latest relevant code or
  service change.
- Treat a notification for an already-completed command as stale when no new invocation started.
  Never use it as evidence for a newer rerun.
- After a background command finishes, record its exact pass/fail result and report path before
  deciding whether the named target needs another focused attempt.

Maintain one status for the named target: `unresolved`, `investigating`,
`fixed-unverified`, `passed-ios`, `passed-android`, or `blocked`. Do not remove an item because
another flow with a similar failure passed.

## Verification commands

Use the repository's supported runners:

- Web: `make e2e_test_web_report_spec SPEC=e2e/<spec>.spec.ts`
- Management-web: `make e2e_test_management_web_report_spec SPEC=e2e/<spec>.spec.ts`
- Both web surfaces: `make e2e_test_report_scoped WEB_SPEC=... MGMT_SPEC=...`
- Mobile debugging: `npm run mobile:e2e:test -- --platform ios <area>` or
  `npm run mobile:e2e:test -- --platform android <area>` in the **Mobile Maestro** tab.
  Use `--reset-data` before the platform selector when the flow requires a clean local SQLite
  database, for example `npm run mobile:e2e:test -- --reset-data --platform ios <area>`.
  Use `npm run mobile:e2e:test -- <area>` for a deliberate two-platform run.

Use the exact affected path and the smallest focused command. Do not use direct Playwright
commands for web E2E. For mobile debugging, establish **Mobile Metro** for every run, **Mobile E2E
API** for API-backed flows, and **Mobile E2E test-assets** for playback flows before invoking
Maestro. The service preflight owns this check even when the operator says the services should
already be running.

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
- A shared helper or fixture change may affect multiple failures, but verify the named target after
  the change and leave other affected units for separate invocations.
- Keep existing report artifacts. The mobile runner opens the report hub automatically; do not add
  manual `open` commands unless the operator specifically asks to open a particular artifact.
- Do not classify a failure as flaky solely because a retry passes. Identify the transient
  condition, make the test or environment deterministic where appropriate, and report remaining
  uncertainty.
- Before starting a long native build, device reset, or E2E run, state the command, intended VS Code
  tab, and expected scope. For background work, report meaningful milestones and explicitly report
  completion or failure before starting dependent work.

## Completion response

For the resolved named target, state:

- the test/spec or mobile flow;
- the observed failure and root cause;
- the files changed;
- the focused verification command and pass result;
- any remaining environmental limitation.

For a single-target invocation, summarize only the named target and stop after it passes or needs
operator input, an unavailable environment capability, or an uncertain product decision. Explicitly
identify any supplied failures that were left out of scope.
