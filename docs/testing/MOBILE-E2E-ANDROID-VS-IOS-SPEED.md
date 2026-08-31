# Mobile E2E: why Android takes ~2x longer than iOS

Investigation of the `npm run mobile:e2e:test:all` wall-clock gap, measured against the
`20260830-135844` full-suite report on an Apple M2 Pro (10 cores: 6 performance + 4 efficiency,
32 GB), Maestro 2.5.1, `Pixel_6_Pro_API_33_e2e` (arm64-v8a, API 33) vs `iPhone 17 Pro E2E`.

## Answer in one paragraph

The gap is real and reproducible (**1.94x**), but it is **not** the Android emulator being slow, and
it is **not** a sign that the app's Android UX is slow. Roughly **85% of the gap comes from just two
Maestro commands** — `tapOn` and `inputText` — which cost 2.3–2.5x more on Android because Maestro's
Android driver wraps every input injection in animation-settle waits that its iOS driver does not
have. Every other measured operation is equal or **faster** on Android, including app launch,
assertions, and screenshots. Raw input into the same emulator through `adb shell input tap` takes
**70–120 ms**, while Maestro's `tapOn` on that same emulator takes **2,582 ms**. The emulator is
idle-waiting, not computing.

## The measured gap

Wall clock, 29 flows, run sequentially (iOS slot, then Android slot):

| Slot          | Wall clock | Mean per flow |
| ------------- | ---------- | ------------- |
| ios-phone     | 18m 39s    | 38.6 s        |
| android-phone | 36m 12s    | 74.9 s        |

Maestro records a `duration` per command in
`.artifacts/mobile-e2e-reports/<ts>/<slot>/<ts>/commands-*.json`. Summing those durations across the
whole suite explains **992 s of the 1,053 s gap (94%)**:

| Command                  | iOS n | iOS median | iOS total | Android n | Android median | Android total | Gap    |
| ------------------------ | ----- | ---------- | --------- | --------- | -------------- | ------------- | ------ |
| `tapOnElement`           | 295   | 1.117 s    | 373 s     | 351       | **2.582 s**    | **1,055 s**   | +682 s |
| `inputTextCommand`       | 58    | 1.381 s    | 90 s      | 87        | **3.473 s**    | **300 s**     | +211 s |
| `takeScreenshotCommand`  | 106   | 0.092 s    | 10 s      | 105       | 0.142 s        | 19 s          | +9 s   |
| `assertConditionCommand` | 394   | 0.151 s    | 121 s     | 423       | 0.079 s        | 134 s         | +13 s  |
| `launchAppCommand`       | 29    | 2.383 s    | 70 s      | 29        | 0.916 s        | 39 s          | −31 s  |

Two things in that table are worth pausing on:

- **Assertions are faster on Android** (0.079 s vs 0.151 s median). The intuitive explanation —
  "UiAutomator hierarchy dumps are slow" — is wrong for our suite. Maestro keeps a persistent
  driver, so a hierarchy read is cheap. (A naive `adb shell uiautomator dump` takes 2.4–3.5 s, but
  that is dominated by process spawn and is not what Maestro does.)
- **App launch is 2.6x faster on Android** (0.916 s vs 2.383 s). The emulator is not struggling.

So the entire deficit lives in input delivery.

## Root cause: Maestro's Android input path

Maestro's `AndroidDriver` does two things per interaction that the iOS driver does not:

1. **`waitForWindowToSettle`** runs a `do { ... } while (System.currentTimeMillis() < endTime)` loop
   for the full `WINDOW_UPDATE_TIMEOUT_MS = 750` window after an interaction, polling
   `isWindowUpdating` — it does not exit early when the window is already stable. iOS uses a
   screenshot-diff settle that returns as soon as two frames match.
2. **Input goes through `UiAutomation.injectInputEvent(event, sync = true)`**, whose 2-arg overload
   implies `waitForAnimations = true`, blocking on `waitForAllWindowsDrawn(...)`. React Native /
   Expo dev clients are known to leave window animations that never signal completion, so every tap
   and keystroke absorbs a wait. This is the subject of Maestro
   [PR #3334](https://github.com/mobile-dev-inc/Maestro/pull/3334) (still **open** as of writing),
   which replaces those paths with `adb shell input`, reporting `tap` going from ~10,000 ms to
   ~150 ms on an affected device.

Our numbers fit this exactly: `tapOn` = 2.582 s while the underlying `adb shell input tap` = 0.07 s.
Note we already benefit from
[PR #2326](https://github.com/mobile-dev-inc/Maestro/pull/2326) (merged 2026-01-06, removes a
redundant screenshot check per Android tap) — 2.5.1 shipped 2026-04-30 — so 2.582 s is the
_post-fix_ number.

`inputText` compounds it: each character pays the wait, so our Android-only 21-character Metro URL
entry costs 3.47 s.

## Our flows also do ~19% more work on Android

Android executed 1,234 measured commands vs iOS's 1,038. The difference is almost entirely
`apps/mobile/e2e/shared/connect-dev-client.yaml`: iOS's Expo Dev Client launcher discovers
`http://localhost:8081` and is a single `tapOn`, while Android's launcher often shows no discovered
server, so the flow types `http://10.0.2.2:8081` manually:

```yaml
- tapOn: "Enter URL manually"
- inputText: "http://10.0.2.2:8081"
- hideKeyboard
- tapOn: "Connect"
```

Because every flow starts with `launchApp: clearState: true` (which on Android is `pm clear`, wiping
the dev client's saved Metro URL), that block runs **29 times per suite**. At current Android command
costs it is roughly **10 s per flow, ~5 minutes per suite** — self-inflicted, and fixable without
touching Maestro.

## Answers to the specific questions

**Are Android devices just slower?** No. Real Android hardware is not the issue and this is not an
app-performance signal. Within our own measurements Android launches the app faster and reads the
hierarchy faster than the iOS simulator.

**Is this emulator-only?** Partly. There is a genuine, unavoidable architectural difference: the
Android Emulator boots a real `system.img` in a forked-QEMU virtual machine (full kernel, HALs,
`system_server`, GPU streaming), whereas the iOS Simulator is not a VM at all — it compiles the app
for the host CPU and runs it natively against simulator-flavored frameworks. That is why emulator
cold boot is 30–90 s vs under 5 s, and it is why some baseline overhead is permanent. But in _our_
suite that architectural tax is small; the measurable cost is Maestro's driver, which would also
apply on a physical Android phone.

**Should I be concerned our Android UX is slow?** No — not from this data. Nothing here measures app
responsiveness. If you want that signal, measure it directly (frame timings, TTI) rather than
inferring it from harness wall clock.

**Are the emulator RAM settings actually working?** Yes, verified in the guest:

| Setting          | Configured | Observed in guest                |
| ---------------- | ---------- | -------------------------------- |
| `hw.ramSize`     | 4096 MB    | `MemTotal: 3999976 kB`           |
| `hw.cpu.ncore`   | 6          | `nproc` → `6`                    |
| ABI              | arm64-v8a  | `ro.product.cpu.abi` → arm64-v8a |
| `hw.gpu.mode`    | host       | launched with `-gpu host`        |
| Animation scales | 0          | all three report `0`             |

`scripts/mobile/ensure-devices.sh` is doing its job. Animations are already disabled — the
single most-recommended Android E2E speedup on the internet is already applied here, which is part
of why the remaining cost is structural rather than tunable.

**Do I need a better computer?** Almost certainly not for this problem. The bottleneck is fixed
idle-waiting, not throughput — a faster CPU cannot shorten a 750 ms sleep. That said, the host _is_
saturated during a run (load average 10.54 on 10 cores) because the emulator is given all 6
performance cores while Metro, the JVM, the API, Postgres, Valkey, the test-asset server, and the
iOS simulator compete for the same silicon. More performance cores (M4/M5 Pro/Max) would reduce
contention and flakiness, but expect single-digit-percent improvement on this gap, not 2x.

**Is ~2x just normal?** A 1.5–2x Android:iOS ratio is widely reported and generally accepted as the
cost of doing business. The non-obvious part of our situation is that our 2x is _not_ mostly the
emulator — so unlike most teams, we have levers.

## Reliability: the failure mode that costs more than the gap

Wall clock is not the only thing that eats a session. An Android **system dialog** — "System UI
isn't responding", or an app crash dialog — sits above the app and absorbs every tap, so Maestro
keeps driving a screen the app does not own and each command spends its full timeout before the
flow fails with a misleading assertion. Observed once as a 3-minute flow failure reported as
`home-screen is visible` false, with the real cause visible only in the screenshot.

The runner now treats this as an environment blocker rather than a slow failure. Every Maestro
invocation runs under a watchdog that ends the run when the focused window is an ANR or crash
dialog, when the device stops answering `adb`, or when nothing has been written to the slot
directory for `MOBILE_E2E_STALL_TIMEOUT_SECONDS` (300s). It captures a screenshot, the focused
window, `am_anr` events and a logcat tail under `<run>/diagnostics/`, reboots the disposable E2E
emulator once, re-runs only the flows with no result, and exits **78** if it is blocked again.
Exit 78 is distinct from exit 1 on purpose: nothing in that run passed or failed on its merits.

Detection is deliberately passive — the watchdog never taps the dialog. *Close app* asks Android to
kill System UI and leaves the emulator worse off; *Wait* can hang indefinitely. Rebooting a
throwaway emulator is the cheaper and more deterministic move. See
[HOW-TO-RUN.md § Blocked runs](/apps/mobile/e2e/HOW-TO-RUN.md).

Host contention is the likeliest trigger (load average 10.54 on 10 cores during a run), which is
also why parallel slots stay opt-in below.

### iOS hangs before it reaches the device

Android's dialog is the visible failure. iOS has a quieter one that costs more, because there is
nothing to look at: Maestro starts, prints its system banner, and then never acquires a working
`maestro-driver-ios` against the simulator. The simulator is booted and responsive the whole time,
so a screenshot proves nothing and the operator's instinct — reboot the simulator — does not help.

The original watchdog could not see this, because it inferred liveness from files appearing in the
slot directory, and a Maestro that never reaches the device writes no files. A hang before the
first command and a flow legitimately still setting up looked identical, so the run sat until the
300 s stall timeout, five times over, on a run that was never going to produce anything.

Three changes close it:

- **Liveness is now a signature, not a file count.** Each invocation's stdout is `tee`'d to
  `<run>/logs/<seq>-<label>.log`, and the watchdog watches log bytes *and* slot artifacts together.
  A Maestro that is printing but not progressing is now distinguishable from one that has stopped.
- **A separate startup timeout.** `MOBILE_E2E_STARTUP_TIMEOUT_SECONDS` (180 s) fires when nothing
  has reached the device yet, which is the case a 300 s output-stall timer handles badly.
- **iOS health polling and recovery.** `scripts/mobile/ios-device-health.sh` mirrors the Android
  script: simulator state via `simctl`, responsiveness via a bounded screenshot, and presence of
  the `maestro-driver-ios` host process. `ensure-devices.sh recover-e2e-ios` kills stale driver
  processes, terminates the app, and reboots the simulator, and the runner now spends one automatic
  recovery on iOS exactly as it does on Android.

### A healthy device does not mean a healthy run

The most expensive session in this investigation was neither of the above. Every probe reported a
booted, responsive simulator, and Maestro still produced nothing — including for a bare
`maestro hierarchy`, on both platforms, across simulator reboots.

`kill -QUIT` on the Maestro JVM gave the answer: the main thread was blocked in
`dadb.AdbReader.readMessage`, under `dadb.Dadb$Companion.list`. Maestro enumerates Android devices
on **every** invocation regardless of `--platform`, and `dadb` does that by opening an adb
connection to each localhost port in **5555–5683** and waiting for a handshake reply. A local
service that accepts the TCP connection and then says nothing an adb client understands makes
`dadb` block forever on the read.

Nothing about the device, the app, the flow, or the platform is involved, which is exactly why it
resists device-shaped debugging. The runner now probes the range before the first Maestro
invocation and refuses to start, naming the listener and the process holding it.

The clean fix is to republish Artemis on host port `5684` while keeping container port `5672`.
Mobile E2E fixture mode does not require MQ; keeping the broker running on its non-conflicting host
port preserves normal local development without adding test-specific service shutdowns.

### Failing fast is a speed feature

Each selected device now gets a bounded `maestro hierarchy` canary (~20 s healthy) *before* the
database reseed and API preflight, so a wedged device or a host port conflict costs seconds instead
of minutes of setup followed by a stall timeout. `--skip-seed` removes the reseed and its API
stop/start when re-running a flow against a fix with a database that is already correct.

Neither makes a passing suite faster. Both make a blocked one cheap, which — measured across a
debugging session rather than a single green run — is where the time actually goes.

## Recommended plan

Five changes are small, and two of the small ones carry the most value. Do them in this order and
measure after each: the gains overlap, so the later items are worth less once the earlier ones land.

| Order | Change                                          | Expected gain           | Status                                  |
| ----- | ----------------------------------------------- | ----------------------- | --------------------------------------- |
| 1     | Upgrade Maestro 2.5.1 → 2.9.0                   | Unknown, possibly large | Not started (nix flake pin)             |
| 2     | Run the iOS and Android slots concurrently      | 55 min → ~36 min wall   | Landed, opt-in `--parallel`             |
| 3     | `adb reverse tcp:8081 tcp:8081` on Android boot | ~5 min/suite            | Landed in `ensure-devices.sh`           |
| 4     | Emit per-command timing medians in the report   | Makes 1–3 verifiable    | Landed in `e2e-html-report.mjs`         |
| 5     | Republish local Artemis off the 5555–5683 range | Removes a total blocker | Landed on host `:5684` |

### 1. Upgrade Maestro

We are five releases behind (2.9.0 shipped 2026-08-26) and the Android input path is exactly what
upstream keeps working on. Cost is a flake pin change plus an A/B: run one flow on each version and
compare the `tapOnElement` median in `commands-*.json`. If that median drops from 2.582 s, most of
the 17 minutes comes back for free.

The risk is that selector or hierarchy behavior shifts and breaks flows, so do it on a branch and
run the full suite once before keeping it.

### 2. Run the two slots concurrently

Landed as **opt-in** `--parallel` (`npm run mobile:e2e:test:all:parallel`). Each slot runs in its
own background job against its own device and slot directory; output is buffered to
`<run>/ios-phone.log` and `<run>/android-phone.log` and printed when each finishes, and exit status
is collected from `wait` rather than assigned across the subshell boundary.

It is opt-in rather than default because the host already runs saturated, and contention is the
likeliest cause of the wedged-device blocks described above. Trading a suspected reliability
regression for wall clock is not worth it on a debugging run — use it on green sweeps and measure
before making it the default.

**Trap: do not do the no-code version of this** by opening two terminals with `--platform ios` and
`--platform android`. The script stops the E2E API, reseeds the database, restarts the API, and
rewrites the `latest` symlink. Two concurrent invocations race on all of that. That path would need
a `--skip-seed` flag first.

### 3. `adb reverse` so Android stops typing the Metro URL

Landed. `ensure_android_host_bridges` runs `adb reverse tcp:8081 tcp:8081` alongside
`tune_android_runtime_settings` in `boot_android_avd`, and again after a recovery reboot (reverse
mappings live in the adb daemon's per-device connection and do not survive one). Metro is then
reachable at `localhost:8081` inside the emulator, so the Expo launcher offers the same
`http://localhost:8081` entry iOS taps.

The manual-entry block in `connect-dev-client.yaml` is kept as a fallback for emulators where the
bridge does not come up, but it should now be unreached — which removes one `inputText`, our most
expensive Android command, plus two or three taps from every flow. Confirm with
`adb reverse --list` and by checking that Android flows no longer show the manual-entry steps.

Two alternative routes to the same end, if the bridge proves unreliable: launch via a
`podverse-next://expo-development-client/?url=...` deep link so the launcher is skipped entirely, or
replace full `pm clear` with a narrower per-flow reset so the saved Metro URL survives. The second
has the wider blast radius (test isolation), so it ranks last.

### 4. Put the timing rollup in the report generator

Landed. Each slot page now carries a **Command timing** table (count, median, total per command
key, slowest first), and the same numbers are written to `<slot>/command-timings.json` so two runs
can be diffed without scraping HTML. `metadata.duration` was already in the JSON the report
generator reads; this only surfaces it.

That turns every change above into a before/after comparison: watch `tapOnElement` and
`inputTextCommand` medians on `android-phone`, and watch the `inputTextCommand` **count** drop as
the `adb reverse` bridge removes the manual URL entry.

### Hold off until 1–4 land

| Change                                                         | Expected gain             | Why wait                                                |
| -------------------------------------------------------------- | ------------------------- | ------------------------------------------------------- |
| `waitToSettleTimeoutMs` on hot `tapOn` commands                | Up to ~10 min/suite       | Trades away flake insurance; needs a per-flow A/B       |
| Bundled-JS (preview/release) Android E2E build, not dev client | Large, structural         | Real build-pipeline change                              |
| Patched Maestro carrying PR #3334's `adb shell input` path     | Potentially 2x on Android | Upstream PR is still open; a fork is a maintenance cost |

**`waitToSettleTimeoutMs`** ([PR #1531](https://github.com/mobile-dev-inc/maestro/pull/1531)) is the
only supported knob that attacks the 2.582 s directly. Our flows set none, so every tap pays the
full window, and since animation scales are already zero that wait is mostly measuring nothing. It
is not available in `config.yaml` (deliberately), so it must go on each `tapOn`. Try `500` on the
three highest-tap-count flows, run each three times, and compare pass rate before going wider — do
not bulk-apply it.

**A bundled-JS E2E build** deletes the launcher, the dev menu, the onboarding card, the manual URL
entry, and per-flow Metro bundle transfer over the emulator's NAT gateway in one move, and makes
Android's launch path resemble iOS's. It is the highest-leverage structural fix, at the cost of a
build step and losing fast refresh on the E2E build. Worth it only if 1–4 leave the gap painful.

### Not worth doing

- **A faster machine.** Fixed idle-waiting does not shrink with clock speed.
- **Lowering `hw.lcd.*`** below 1440x3120. Breaks screenshot parity with the Pixel 6 Pro baseline,
  and screenshots measured equal across platforms anyway.
- **Headless emulator.** The whole report system depends on screenshots.
- **Sharding Android across two local emulators** (`--shard-split`). The host already runs at load
  10.54 on 10 cores; this belongs on CI.
- **Most remaining AVD tuning.** `showDeviceFrame = no` and dropping `hw.cpu.ncore` to 4 (so the
  emulator stops competing with Metro and the Maestro JVM for all 6 performance cores) are cheap
  experiments, but these are not where the 17 minutes went.

## How to re-measure

The analysis above is reproducible from any full-suite report directory. Per-command durations are
in `<slot>/<timestamp>/commands-*.json` under `metadata.duration` (milliseconds); group by the
command key (`tapOnElement`, `inputTextCommand`, …) and compare medians and totals across the two
slot directories. The two sanity checks that separate "emulator is slow" from "driver is slow" are:

```bash
adb -s emulator-5554 shell input tap 700 2600
adb -s emulator-5554 exec-out screencap -p > /tmp/and.png
xcrun simctl io booted screenshot --type=png /tmp/ios.png
adb -s emulator-5554 shell "cat /proc/meminfo | head -3; nproc; getprop ro.product.cpu.abi"
```

If raw tap latency stays in the ~100 ms range while Maestro's `tapOn` median stays in the seconds,
the bottleneck is the driver, not the device.

## References

- Maestro [PR #3334](https://github.com/mobile-dev-inc/Maestro/pull/3334) — Android `tap` /
  `inputText` UiAutomation animation-wait hang, and the `adb shell input` bypass (open)
- Maestro [PR #2326](https://github.com/mobile-dev-inc/Maestro/pull/2326) — redundant screenshot
  check on Android taps (merged, present in 2.5.1)
- Maestro [PR #1531](https://github.com/mobile-dev-inc/maestro/pull/1531) — `waitToSettleTimeoutMs`
- Maestro [PR #787](https://github.com/mobile-dev-inc/maestro/pull/787) — iOS settle optimization
  that Android never received
- [Android Emulator internals](https://github.com/aospbooks/android-emulator-internal-book/blob/main/01-introduction.md)
  — why the emulator is a VM and the iOS Simulator is not
- [QA Wolf: Android emulator instability](https://www.qawolf.com/blog/5-strategies-to-address-android-emulator-instability-during-automated-testing)
  — pre-booted snapshots, skinless mode, why headless is a bad trade
- [Maestro parallel execution](https://maestrodeck.cloud/docs/guides/parallel-execution) — sharding
  and its limits
- Local config: [`scripts/mobile/ensure-devices.sh`](/scripts/mobile/ensure-devices.sh),
  [`scripts/mobile/e2e-test.sh`](/scripts/mobile/e2e-test.sh),
  [`scripts/mobile/android-device-health.sh`](/scripts/mobile/android-device-health.sh),
  [`scripts/mobile/ios-device-health.sh`](/scripts/mobile/ios-device-health.sh),
  [`apps/mobile/e2e/shared/connect-dev-client.yaml`](/apps/mobile/e2e/shared/connect-dev-client.yaml)
