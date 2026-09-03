---
name: abce2efulltestdebug
description: Debug all supplied Podverse web, management-web, and mobile E2E failures one unit and platform at a time. Use when the operator invokes abce2efulltestdebug with a suite output or multiple targets.
---

# `abce2efulltestdebug`

Use this workflow whenever the operator invokes **`abce2efulltestdebug`** for a failing E2E run
containing multiple failures. The objective is a verified, focused pass for every supplied failing
spec or mobile flow. For mobile, isolate one flow and one device platform so a failure on the first
platform is fixed before spending time on the second platform.

## Full mobile platform handoff

When the operator is sweeping the complete mobile suite, use this handoff:

1. Run the full iOS suite alone:
   `npm run mobile:e2e:test:all -- --platform ios`
2. Invoke **`abce2efulltestdebug`** with the iOS output or report artifacts. Debug every unresolved
   iOS flow one at a time until the iOS queue is green. Do not start Android debugging during this
   phase.
3. After iOS is green, run the full Android suite alone:
   `npm run mobile:e2e:test:all -- --platform android`
4. Invoke **`abce2efulltestdebug`** with the Android output or report artifacts. Debug every
   unresolved Android flow one at a time until the Android queue is green.

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
2. Select only the first unresolved unit. Do not inspect or modify the next failing unit yet. For a
   mobile queue on a platform that supports both phone slots, select iOS first.
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
10. After the current unit passes, record its root cause, fix, verification command, and result,
    then immediately select the next unresolved unit. When multiple failures are supplied, continue
    through the entire queue; do not stop after resolving only the first failure.

## Environment blockers are a stop condition, not a slow failure

A wedged device is the one failure mode that can consume an entire session, because waiting looks
identical to progress. The mobile runner therefore supervises every Maestro invocation and exits
**78** when the environment — not the flow — is what broke.

Treat exit 78 as its own outcome:

- **It invalidates the run.** No flow in that invocation passed or failed on its merits, so nothing
  from it may be recorded as `passed-*` or used as evidence for a fix.
- **The runner already retried what is safe to retry.** It recovers the disposable E2E device once
  per platform (`MOBILE_E2E_ANDROID_RECOVERIES` / `MOBILE_E2E_IOS_RECOVERIES`, default 1) and
  re-runs only the flows without a result. A second block means the host needs a human.
- **Report it immediately and stop.** Name the reason, link the diagnostics directory
  (`<report>/diagnostics/<timestamp>-<label>/`) and the Maestro log
  (`<report>/logs/<seq>-<label>.log`), and ask for operator intervention. Do not start the next
  queue item on a device that just failed to recover.
- **Do not "fix" it in the flow.** Raising a timeout, adding a retry, or adding an optional tap on
  a system dialog hides a host-health problem inside a product test.

Repeated blocks on the same platform are themselves the finding: report host contention (both
devices plus Metro, the API, and the JVM on the same cores) rather than continuing to burn runs.

### The four blocked reasons, and what each means

**`blocked: <adb scan range>` — a host port conflict, before any device work.** Maestro's device
discovery opens an adb connection to every localhost port in **5555–5683** and waits forever for a
reply, so any unrelated service listening in that range hangs Maestro during startup with a
perfectly healthy device. The runner probes for this before the first Maestro invocation and refuses
to start. It affects iOS and Android identically, so `--platform` is not a workaround, and no device
recovery will help. Move the unrelated listener outside the range; Podverse's local Artemis uses
host `:5684` and container `:5672`. This is a host-port reservation, not an MQ prerequisite for
mobile E2E.

**`blocked: startup` — Maestro never reached the device.** No slot artifacts within
`MOBILE_E2E_STARTUP_TIMEOUT_SECONDS`. On iOS this is usually driver acquisition: Maestro is up but
never gets a working `maestro-driver-ios` against the simulator, so its log stops after the system
banner. Recovery is `bash scripts/mobile/ensure-devices.sh recover-e2e-ios`, which kills stale
driver processes, terminates the app, and reboots the simulator.

**`blocked: device` — the device stopped answering mid-flow.** On Android that is a system dialog
("System UI isn't responding", "Podverse Next keeps stopping") swallowing every tap, or an
unreachable emulator; recovery is
`bash scripts/mobile/ensure-devices.sh recover-e2e-android`. **Never dismiss the dialog by hand or
add a flow step that taps it** — _Close app_ asks Android to kill System UI and leaves the emulator
worse than a reboot, and _Wait_ can hang indefinitely. On iOS it is an unresponsive CoreSimulator
or a driver that died after the flow started.

**`blocked: stalled` — output stopped.** No Maestro log growth and no new slot artifacts for
`MOBILE_E2E_STALL_TIMEOUT_SECONDS` while the device still looks healthy. Read the tail of
`<report>/logs/<seq>-<label>.log` to see which command it died on before assuming a device fault.

### A healthy device does not mean a healthy run

When every probe reports a booted, responsive device and Maestro still produces nothing, the fault
is on the **host**, not the device — the adb-scan-range conflict is the worked example. Before
rebooting a simulator for the third time, check what the Maestro process is actually blocked on:

```bash
kill -QUIT <maestro-jvm-pid>   # thread dump lands in the Maestro log
```

A stack in `dadb.AdbReader.readMessage` or `dadb.Dadb$Companion.list` is device _discovery_
hanging on a host socket, not a device problem.

## Never wait unbounded on a run

Before starting any Maestro invocation, state the flow, platform, and an expected duration. iOS
phone flows run ~20–90 s; Android runs roughly 2x that (see
[MOBILE-E2E-ANDROID-VS-IOS-SPEED.md](/docs/testing/MOBILE-E2E-ANDROID-VS-IOS-SPEED.md)). A full
two-platform suite is ~55 minutes sequential.

- A single focused flow that has not returned within about **5x** its expected duration is a
  blocker to investigate, not a run to keep waiting on. Read the terminal output file and the
  device state instead of continuing to block.
- The runner's watchdog owns the killing. Do not add your own `sleep`-and-poll loops around it, and
  do not raise `MOBILE_E2E_STALL_TIMEOUT_SECONDS` to make a hang look like patience.
- If you have been waiting on the same command across multiple turns with no new evidence, stop and
  report where it is stuck. An hour of silence is a worse outcome for the operator than an early
  "this is blocked, here is the screenshot".

## Mandatory completion gate

Never describe a run, failure queue, platform, or debugging session as fixed, complete, green, or
fully resolved unless all applicable conditions below are true:

1. Every failure from the supplied output or report is recorded as a separate queue item.
2. Every queue item has either:
   - a focused post-fix run that reports `Passed`, or
   - an explicitly documented blocker that requires operator input.

   A run that exited 78 satisfies neither: those items stay `unresolved` or become `blocked`.

3. A shared application, fixture, service, runner, or report-generator fix invalidates conclusions
   from earlier runs until the first affected unit is rerun after that fix.
4. A report-generator failure is tracked separately from flow failures and is itself verified fixed
   by a later run that writes the expected report artifacts.
5. For mobile, each affected flow passes on iOS and Android before it is marked resolved.

A shared root cause may explain multiple failures, but it does not mark those flows resolved. A
suite-level pass does not prove that every previously failing flow passed. If no post-fix command
has actually started, report verification as pending instead of reporting a pass.

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
  selecting the next queue item.

Maintain one status for every supplied failure item: `unresolved`, `investigating`,
`fixed-unverified`, `passed-ios`, `passed-android`, `blocked`, or `blocked-environment` (runner
exit 78 — the device wedged, so the item never got a fair run). Do not remove an item because
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

Interrupted mobile runs attempt to generate a partial report. Use that report when it contains the
selected flow's evidence. If the partial report is missing or incomplete, rerun the selected flow
normally so the default no-retry configuration creates `failures.json` and the focused flow
report. A missing report after that rerun is a setup blocker to investigate, not a reason to debug
from incomplete suite output.

The mobile runner does not perform end-of-suite retries by default. Keep
`MOBILE_E2E_FLOW_RETRIES` at `0` while isolating a failure. Enable a retry only when the operator
explicitly requests it, for example `MOBILE_E2E_FLOW_RETRIES=1`, and never treat a retry pass as a
substitute for understanding a failure.

### Runner knobs

Defaults are the supported configuration. Change one only with a stated reason, and say so in the
summary when you do.

| Variable                                   | Default | Meaning                                                |
| ------------------------------------------ | ------- | ------------------------------------------------------ |
| `MOBILE_E2E_STALL_TIMEOUT_SECONDS`         | `300`   | No log growth and no new slot artifacts ⇒ exit 78      |
| `MOBILE_E2E_STARTUP_TIMEOUT_SECONDS`       | `180`   | Maestro never reached the device ⇒ exit 78             |
| `MOBILE_E2E_RUN_TIMEOUT_SECONDS`           | `0`     | Hard ceiling per invocation; `0` leaves stall only     |
| `MOBILE_E2E_WATCHDOG_INTERVAL_SECONDS`     | `15`    | Device-health poll interval (both platforms)           |
| `MOBILE_E2E_IOS_DRIVER_GRACE_SECONDS`      | `90`    | Grace before a missing `maestro-driver-ios` counts     |
| `MOBILE_E2E_ANDROID_RECOVERIES`            | `1`     | Emulator reboots allowed before stopping               |
| `MOBILE_E2E_IOS_RECOVERIES`                | `1`     | Simulator reboots allowed before stopping              |
| `MOBILE_E2E_ANDROID_WATCHDOG`              | `1`     | Set `0` only to reproduce a hang deliberately          |
| `MOBILE_E2E_IOS_WATCHDOG`                  | `1`     | Set `0` only to reproduce a hang deliberately          |
| `MOBILE_E2E_DEVICE_CANARY`                 | `1`     | Pre-run `maestro hierarchy` probe per selected device  |
| `MOBILE_E2E_DEVICE_CANARY_TIMEOUT_SECONDS` | `120`   | Canary patience before declaring the device blocked    |
| `MOBILE_E2E_SKIP_SEED`                     | `0`     | `--skip-seed`; reuse the database from the last run    |
| `MOBILE_E2E_PARALLEL_SLOTS`                | `0`     | `--parallel` runs both slots at once (more contention) |

Do not pass `--parallel` while isolating a failure. It halves wall clock at the cost of the host
contention that produces device wedges in the first place, so it belongs on a green full-suite
sweep, not on debugging runs.

### Fast failure and fast iteration

Two runner behaviors keep a blocked host from costing a session:

- **The device canary runs before seeding.** Each selected device gets a bounded
  `maestro hierarchy` probe (~20 s when healthy) before the runner reseeds the database or waits on
  the API, so a wedged device or a host port conflict surfaces in seconds instead of after minutes
  of setup. Leave it on; `MOBILE_E2E_DEVICE_CANARY=0` only makes a blocked run take longer to say
  so.
- **`--skip-seed` reuses the previous database.** When re-running the same flow against a fix and
  the data state is already correct, it removes the reseed and the API stop/start around it. Do not
  use it for the first run of a flow, after switching platforms, or for any flow whose expectations
  depend on fresh fixtures — a stale database produces a failure that looks like a product defect.

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
- Before starting a long native build, device reset, or E2E run, state the command, intended VS Code
  tab, and expected scope. For background work, report meaningful milestones and explicitly report
  completion or failure before starting dependent work.

## Completion response

For each resolved unit, state:

- the test/spec or mobile flow;
- the observed failure and root cause;
- the files changed;
- the focused verification command and pass result;
- any remaining environmental limitation.

For a full-target invocation, continue until every supplied unit passes or the next unit needs
operator input, an unavailable environment capability, or an uncertain product decision. At that
point, summarize all completed units and the blocker, and stop only for that operator action or
decision.
