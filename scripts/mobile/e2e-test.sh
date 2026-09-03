#!/usr/bin/env bash
# Run Maestro on E2E iOS + Android and write HTML screenshot reports.
# Prerequisites (separate terminals): npm run mobile:dev, mobile:e2e:ios, mobile:e2e:android
# Usage (monorepo root):
#   bash scripts/mobile/e2e-test.sh
#   bash scripts/mobile/e2e-test.sh hello-world
#   bash scripts/mobile/e2e-test.sh hello-world,locale-switch-home-smoke
#   bash scripts/mobile/e2e-test.sh all   # every apps/mobile/e2e/*.yaml (not shared/)
#   bash scripts/mobile/e2e-test.sh --platform ios home
#   bash scripts/mobile/e2e-test.sh --platform android home
#   bash scripts/mobile/e2e-test.sh --reset-data --platform ios subscriptions-anonymous
#   bash scripts/mobile/e2e-test.sh --parallel all   # iOS and Android slots at the same time
#   bash scripts/mobile/e2e-test.sh --skip-seed --platform ios home   # debug loop, keeps DB state
#
# Exit codes: 0 pass, 1 flow failure, 78 blocked by the test environment (wedged device) —
# see MOBILE_E2E_ENV_BLOCKED_EXIT below.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

E2E_IOS_NAME='iPhone 17 Pro E2E'
E2E_ANDROID_AVD='Pixel_6_Pro_API_33_e2e'
E2E_IOS_TABLET_NAME='iPad Pro 13-inch (M4) E2E'
E2E_ANDROID_TABLET_AVD='Pixel_Tablet_API_33_e2e'
MOBILE_APP_ID='com.podverse.app.next'
MOBILE_METRO_PORT="${MOBILE_METRO_PORT:-8081}"
MOBILE_E2E_API_PORT="${MOBILE_E2E_API_PORT:-4230}"
MOBILE_E2E_TEST_ASSETS_PORT="${MOBILE_E2E_TEST_ASSETS_PORT:-2111}"
MOBILE_E2E_API_PID_FILE="$REPO_ROOT/.artifacts/mobile-e2e-api/api.pid"
DEFAULT_SPEC='hello-world'
E2E_DIR="$REPO_ROOT/apps/mobile/e2e"
TIMEOUTS_ENV="$E2E_DIR/shared/timeouts.env"

# Basename list (comma-free) of top-level flows that need :4230. Keep in sync when adding
# API-backed apps/mobile/e2e/<area>.yaml — full suite (`all`) always requires the API.
flow_needs_e2e_api() {
  case "$1" in
  add-by-rss | api-health | auth-login | auth-logout | auto-queue-advance | browse | deep-link | \
  detail-sort-prefs | engine-audio-spike | home | library-downloads | library-playlists | \
  membership-gate | notifications-inbox | opml | play-mini-player | podcast-episode | push | \
  queue-add | search | \
  search-unparsed | subscriptions-anonymous | tab-switch-playback | tablet | v4v | \
  video-transition)
    return 0
    ;;
  *)
    return 1
    ;;
  esac
}

# Flows that must run on tablet devices (ios-tablet / android-tablet slots), not phones.
flow_needs_tablet() {
  case "$1" in
  tablet)
    return 0
    ;;
  *)
    return 1
    ;;
  esac
}

# Basename list of flows that need tools/test-assets on :2111 (real media / play asserts).
flow_needs_test_assets() {
  case "$1" in
  add-by-rss | auto-queue-advance | engine-audio-spike | library-downloads | play-mini-player | \
  tab-switch-playback | tablet | v4v | video-transition)
    return 0
    ;;
  *)
    return 1
    ;;
  esac
}

if [[ -f "$TIMEOUTS_ENV" ]]; then
  # shellcheck disable=SC1090
  set -a
  # shellcheck source=apps/mobile/e2e/shared/timeouts.env
  source "$TIMEOUTS_ENV"
  set +a
fi

MAESTRO_TIMEOUT_ARGS=(
  -e "TIMEOUT_FASTEST=${TIMEOUT_FASTEST:-2000}"
  -e "TIMEOUT_FASTER=${TIMEOUT_FASTER:-3000}"
  -e "TIMEOUT_FAST=${TIMEOUT_FAST:-5000}"
  -e "TIMEOUT_SLOW=${TIMEOUT_SLOW:-8000}"
  -e "TIMEOUT_SLOWER=${TIMEOUT_SLOWER:-12000}"
  -e "TIMEOUT_SLOWEST=${TIMEOUT_SLOWEST:-20000}"
)

# A wedged device (System UI ANR, dead adb, a Maestro driver that never acquires the simulator) is
# not a flow failure, and treating it as one wastes the rest of the session. Every Maestro
# invocation runs under a watchdog that stops on the first sign the environment — not the flow —
# is what broke.
MOBILE_E2E_ENV_BLOCKED_EXIT=78
# How often to ask the device whether it can still be driven.
MOBILE_E2E_WATCHDOG_INTERVAL_SECONDS="${MOBILE_E2E_WATCHDOG_INTERVAL_SECONDS:-15}"
# No new Maestro progress (console output or slot artifacts) for this long means the run is not
# progressing, whatever the device says. Generous enough to clear a cold flow on a fresh bundle.
MOBILE_E2E_STALL_TIMEOUT_SECONDS="${MOBILE_E2E_STALL_TIMEOUT_SECONDS:-300}"
# Maestro must show it reached the device within this long: an artifact in the slot, or sustained
# console output. Printing a banner and then hanging on driver acquisition is the failure this
# catches; without it that hang only surfaces after the much longer stall window.
MOBILE_E2E_STARTUP_TIMEOUT_SECONDS="${MOBILE_E2E_STARTUP_TIMEOUT_SECONDS:-180}"
# Grace before a missing Maestro iOS driver process is read as a failed acquisition rather than a
# driver still installing. Confirmed on a second poll before it blocks the run.
MOBILE_E2E_IOS_DRIVER_GRACE_SECONDS="${MOBILE_E2E_IOS_DRIVER_GRACE_SECONDS:-90}"
# Absolute ceiling per Maestro invocation; 0 leaves only the stall detector in charge.
MOBILE_E2E_RUN_TIMEOUT_SECONDS="${MOBILE_E2E_RUN_TIMEOUT_SECONDS:-0}"
# Recoveries of a disposable E2E device allowed per run before stopping for the operator.
MOBILE_E2E_ANDROID_RECOVERIES="${MOBILE_E2E_ANDROID_RECOVERIES:-1}"
MOBILE_E2E_IOS_RECOVERIES="${MOBILE_E2E_IOS_RECOVERIES:-1}"
MOBILE_E2E_ANDROID_WATCHDOG="${MOBILE_E2E_ANDROID_WATCHDOG:-1}"
MOBILE_E2E_IOS_WATCHDOG="${MOBILE_E2E_IOS_WATCHDOG:-1}"
# Prove Maestro can acquire each device before spending minutes on reseeding and health checks.
MOBILE_E2E_DEVICE_CANARY="${MOBILE_E2E_DEVICE_CANARY:-1}"
MOBILE_E2E_DEVICE_CANARY_TIMEOUT_SECONDS="${MOBILE_E2E_DEVICE_CANARY_TIMEOUT_SECONDS:-120}"
# Run the iOS and Android slots at the same time. Opt-in: it roughly halves wall clock but both
# devices then compete with Metro and the Maestro JVM for the same cores.
MOBILE_E2E_PARALLEL_SLOTS="${MOBILE_E2E_PARALLEL_SLOTS:-0}"
# Debug-loop escape hatch: reuse the database as it stands instead of reseeding.
MOBILE_E2E_SKIP_SEED="${MOBILE_E2E_SKIP_SEED:-0}"

ANDROID_RECOVERIES_USED=0
IOS_RECOVERIES_USED=0
MAESTRO_LOG_SEQ=0
ENV_BLOCKED_REASON=''
ENV_BLOCKED_PLATFORM=''
SUPERVISED_MAESTRO_PID=''
MANAGED_API_STOPPED=0

PLATFORM='both'
SPEC_RAW=''
RESET_DATA=0
while [[ "$#" -gt 0 ]]; do
  case "$1" in
  --reset-data)
    RESET_DATA=1
    shift
    ;;
  --parallel)
    MOBILE_E2E_PARALLEL_SLOTS=1
    shift
    ;;
  --skip-seed)
    MOBILE_E2E_SKIP_SEED=1
    shift
    ;;
  --platform)
    if [[ "$#" -lt 2 ]]; then
      echo "Missing value for --platform. Expected ios, android, or both." >&2
      exit 1
    fi
    PLATFORM="$2"
    shift 2
    ;;
  --platform=*)
    PLATFORM="${1#*=}"
    shift
    ;;
  -*)
    echo "Unknown option: $1" >&2
    echo "Usage: bash scripts/mobile/e2e-test.sh [--reset-data] [--parallel] [--skip-seed] [--platform ios|android|both] [flow|all]" >&2
    exit 1
    ;;
  *)
    if [[ -n "$SPEC_RAW" ]]; then
      echo "Only one flow selector may be provided: $SPEC_RAW" >&2
      exit 1
    fi
    SPEC_RAW="$1"
    shift
    ;;
  esac
done

case "$PLATFORM" in
ios | android | both)
  ;;
*)
  echo "Invalid platform: $PLATFORM. Expected ios, android, or both." >&2
  exit 1
  ;;
esac

SPEC_RAW="${SPEC_RAW:-$DEFAULT_SPEC}"
TS="$(date +%Y%m%d-%H%M%S)"
REPORT_DIR="$REPO_ROOT/.artifacts/mobile-e2e-reports/$TS"
# One Maestro output dir per OS + form-factor slot.
IOS_PHONE_DIR="$REPORT_DIR/ios-phone"
ANDROID_PHONE_DIR="$REPORT_DIR/android-phone"
IOS_TABLET_DIR="$REPORT_DIR/ios-tablet"
ANDROID_TABLET_DIR="$REPORT_DIR/android-tablet"
LATEST_LINK="$REPO_ROOT/.artifacts/mobile-e2e-reports/latest"

if ! command -v maestro >/dev/null 2>&1; then
  echo "Maestro CLI is not installed or not on PATH." >&2
  echo "Install via the repo flake (maestro) or https://docs.maestro.dev/getting-started/installing-maestro" >&2
  exit 1
fi

# Maestro enumerates Android devices with dadb, which finds emulators by opening a raw adb
# connection to every localhost port in 5555–5683. Anything else listening in that range accepts
# the TCP connection and never answers the adb handshake, and dadb sets no read timeout — so
# Maestro blocks forever inside device selection, before it looks at --device or the platform. It
# hangs an iOS run exactly as hard as an Android one, prints nothing past its banner, and every
# device-side probe reports a perfectly healthy simulator.
#
# Local host services must publish outside this range; Podverse's local Artemis uses :5684.
ADB_SCAN_RANGE_START=5555
ADB_SCAN_RANGE_END=5683

# Ports in the scan range whose listener does not speak adb, as "<port><tab><command>" lines.
# A real emulator answers the handshake, so it is never reported here.
adb_scan_range_blockers() {
  python3 - "$ADB_SCAN_RANGE_START" "$ADB_SCAN_RANGE_END" <<'PY'
import socket
import struct
import subprocess
import sys

start, end = int(sys.argv[1]), int(sys.argv[2])

try:
    listing = subprocess.run(
        ['lsof', '-nP', '+c', '0', '-iTCP', '-sTCP:LISTEN'],
        capture_output=True, text=True, timeout=15,
    ).stdout
except Exception:
    raise SystemExit(0)

listeners = {}
for line in listing.splitlines()[1:]:
    fields = line.split()
    if len(fields) < 9 or ':' not in fields[8]:
        continue
    try:
        port = int(fields[8].rsplit(':', 1)[1])
    except ValueError:
        continue
    if start <= port <= end:
        listeners.setdefault(port, fields[0])

for port, command in sorted(listeners.items()):
    try:
        sock = socket.create_connection(('127.0.0.1', port), 2)
    except OSError:
        continue
    sock.settimeout(3)
    try:
        # ADB expects a complete little-endian CNXN packet, including the command magic.
        command_id = 0x4E584E43
        sock.sendall(
            struct.pack(
                '<6I',
                command_id,
                0x01000000,
                4096,
                0,
                0,
                command_id ^ 0xFFFFFFFF,
            )
        )
        if not sock.recv(8):
            print(f'{port}\t{command}')
    except OSError:
        print(f'{port}\t{command}')
    finally:
        sock.close()
PY
}

ADB_SCAN_BLOCKERS="$(adb_scan_range_blockers 2>/dev/null || true)"
if [[ -n "$ADB_SCAN_BLOCKERS" ]]; then
  echo "Error: a service in the adb scan range (${ADB_SCAN_RANGE_START}-${ADB_SCAN_RANGE_END}) will hang Maestro." >&2
  echo "Maestro's device discovery opens an adb connection to every port in that range and waits" >&2
  echo "forever for a reply. These listeners accept the connection and never answer:" >&2
  while IFS=$'\t' read -r blocked_port blocked_command; do
    [[ -n "$blocked_port" ]] || continue
    echo "  :${blocked_port} (${blocked_command})" >&2
  done <<<"$ADB_SCAN_BLOCKERS"
  echo "" >&2
  echo "This affects iOS and Android identically and cannot be worked around with --platform." >&2
  echo "Nothing on the device is wrong, which is why every health probe reports a healthy device." >&2
  echo "" >&2
  echo "Operator steps:" >&2
  echo "  1. Identify the listener above and move its host port outside 5555-5683." >&2
  echo "  2. Keep 5555-5683 available for Android emulator ADB endpoints." >&2
  echo "  3. Re-run the command after the conflicting service is reconfigured." >&2
  exit "$MOBILE_E2E_ENV_BLOCKED_EXIT"
fi

if ! lsof -nP -iTCP:"$MOBILE_METRO_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Error: Metro is not listening on port ${MOBILE_METRO_PORT}." >&2
  echo "Start it in another terminal: npm run mobile:dev:e2e (full suite) or npm run mobile:dev" >&2
  exit 1
fi

FLOWS=()
NEEDS_E2E_API=0
NEEDS_TEST_ASSETS=0
NEEDS_TABLET=0

if [[ "$SPEC_RAW" == "all" ]]; then
  # Auto-discover top-level flows so new apps/mobile/e2e/<area>.yaml joins the suite.
  # Exclude tablet-only flows — they need opt-in tablet devices (`npm run mobile:e2e:test -- tablet`).
  while IFS= read -r flow_path; do
    base="$(basename "$flow_path" .yaml)"
    if flow_needs_tablet "$base"; then
      continue
    fi
    FLOWS+=("$flow_path")
  done < <(find "$E2E_DIR" -maxdepth 1 -type f -name '*.yaml' | LC_ALL=C sort)
  if [[ "${#FLOWS[@]}" -eq 0 ]]; then
    echo "Error: no flows found under apps/mobile/e2e/*.yaml" >&2
    exit 1
  fi
  NEEDS_E2E_API=1
  # Full suite includes playback flows that hit :2111.
  NEEDS_TEST_ASSETS=1
else
  SPEC_LIST="${SPEC_RAW//,/ }"
  for spec in $SPEC_LIST; do
    FLOW_PATH="apps/mobile/e2e/${spec}.yaml"
    if [[ ! -f "$FLOW_PATH" ]]; then
      echo "Missing mobile E2E flow: $FLOW_PATH" >&2
      echo "Expected values map to apps/mobile/e2e/<area>.yaml (or pass all)" >&2
      exit 1
    fi
    FLOWS+=("$FLOW_PATH")
    if flow_needs_e2e_api "$spec"; then
      NEEDS_E2E_API=1
    fi
    if flow_needs_test_assets "$spec"; then
      NEEDS_TEST_ASSETS=1
    fi
    if flow_needs_tablet "$spec"; then
      NEEDS_TABLET=1
    fi
  done
fi

if [[ "$NEEDS_TABLET" -eq 1 ]]; then
  for flow_path in "${FLOWS[@]}"; do
    base="$(basename "$flow_path" .yaml)"
    if ! flow_needs_tablet "$base"; then
      echo "Error: tablet flows cannot be mixed with phone flows in one run (${base})." >&2
      echo "Run tablet alone: npm run mobile:e2e:test -- tablet" >&2
      exit 1
    fi
  done
fi

IOS_UDID=""
ANDROID_SERIAL=""
IOS_SLOT_DIR="$IOS_PHONE_DIR"
ANDROID_SLOT_DIR="$ANDROID_PHONE_DIR"
IOS_DEVICE_LABEL="$E2E_IOS_NAME"
ANDROID_DEVICE_LABEL="$E2E_ANDROID_AVD"
IOS_SLOT_NAME="ios-phone"
ANDROID_SLOT_NAME="android-phone"

REPORT_FINALIZED=0
REPORT_INTERRUPTED=0
DIAGNOSTICS_ROOT="$REPORT_DIR/diagnostics"

# Only ever pointed at a run that produced something worth opening, so a preflight that fails
# before any device work does not clobber the previous run's link.
link_latest_report() {
  [[ -d "$REPORT_DIR" ]] || return 0
  rm -f "$LATEST_LINK"
  ln -sfn "$TS" "$LATEST_LINK"
}

finalize_report() {
  if [[ "$REPORT_FINALIZED" -eq 1 || ! -d "$REPORT_DIR" ]]; then
    return 0
  fi
  REPORT_FINALIZED=1

  if [[ "$REPORT_INTERRUPTED" -eq 1 ]]; then
    echo "Finalizing partial mobile E2E report after interruption..."
    if ! MOBILE_E2E_REPORT_PARTIAL=1 node "$SCRIPT_DIR/e2e-html-report.mjs" "$REPORT_DIR"; then
      echo "Warning: unable to finalize the partial mobile E2E report." >&2
      return 0
    fi
  else
    node "$SCRIPT_DIR/e2e-html-report.mjs" "$REPORT_DIR"
  fi

  echo "Mobile E2E hub: $REPORT_DIR/index.html"
  echo "  Failures JSON: $REPORT_DIR/failures.json"
  if [[ -d "$IOS_SLOT_DIR" ]]; then
    echo "  ${IOS_SLOT_NAME}: $IOS_SLOT_DIR/index.html"
  fi
  if [[ -d "$ANDROID_SLOT_DIR" ]]; then
    echo "  ${ANDROID_SLOT_NAME}: $ANDROID_SLOT_DIR/index.html"
  fi
  echo "Latest symlink: $LATEST_LINK"

  if [[ "$REPORT_INTERRUPTED" -eq 0 ]]; then
    if command -v open >/dev/null 2>&1; then
      [[ -f "$REPORT_DIR/index.html" ]] && open "$REPORT_DIR/index.html" 2>/dev/null || true
    elif command -v xdg-open >/dev/null 2>&1; then
      [[ -f "$REPORT_DIR/index.html" ]] && xdg-open "$REPORT_DIR/index.html" >/dev/null 2>&1 || true
    fi
  fi
}

# Maestro runs a JVM under a launcher script, so signalling the pid we started leaves the JVM
# holding the device. Walk the tree instead.
kill_process_tree() {
  local pid="$1"
  local signal="$2"
  local child
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do
    kill_process_tree "$child" "$signal"
  done
  kill "-${signal}" "$pid" 2>/dev/null || true
}

stop_supervised_maestro() {
  local pid="$1"
  local waited=0

  kill_process_tree "$pid" TERM
  while kill -0 "$pid" 2>/dev/null && ((waited < 10)); do
    sleep 1
    waited=$((waited + 1))
  done
  if kill -0 "$pid" 2>/dev/null; then
    kill_process_tree "$pid" KILL
  fi
  wait "$pid" 2>/dev/null || true
}

stop_supervised_maestro_if_running() {
  if [[ -n "$SUPERVISED_MAESTRO_PID" ]] && kill -0 "$SUPERVISED_MAESTRO_PID" 2>/dev/null; then
    stop_supervised_maestro "$SUPERVISED_MAESTRO_PID"
    SUPERVISED_MAESTRO_PID=''
  fi
}

# Reseeding stops the managed API and starts it again afterwards. An interrupt inside that window
# would otherwise leave the operator with no API on :4230 and no indication why.
restart_managed_api_if_stopped() {
  if [[ "$MANAGED_API_STOPPED" -ne 1 ]]; then
    return 0
  fi
  MANAGED_API_STOPPED=0
  echo "Restarting the managed mobile E2E API stopped for reseeding..." >&2
  bash "$REPO_ROOT/scripts/mobile/e2e-api.sh" start-bg || true
}

handle_interrupt() {
  REPORT_INTERRUPTED=1
  echo "Mobile E2E interrupted; preserving available report artifacts." >&2
  stop_supervised_maestro_if_running
  restart_managed_api_if_stopped
  finalize_report
  trap - EXIT
  exit 130
}

handle_termination() {
  REPORT_INTERRUPTED=1
  echo "Mobile E2E terminated; preserving available report artifacts." >&2
  stop_supervised_maestro_if_running
  restart_managed_api_if_stopped
  finalize_report
  trap - EXIT
  exit 143
}

handle_exit() {
  local exit_code="$?"
  trap - EXIT
  restart_managed_api_if_stopped
  finalize_report
  exit "$exit_code"
}

trap handle_interrupt INT
trap handle_termination TERM
trap handle_exit EXIT

capture_env_diagnostics() {
  local device="$1"
  local platform="$2"
  local label="$3"
  local reason="$4"
  local log_file="${5:-}"
  local dir="$DIAGNOSTICS_ROOT/$(date +%Y%m%d-%H%M%S)-${label}"

  # Kept outside the slot dirs so the report generator never mistakes a diagnostic screenshot for
  # a flow's own step screenshot.
  mkdir -p "$dir"
  printf '%s\n' "$reason" >"$dir/reason.txt"

  if [[ "$platform" == 'android' ]]; then
    bash "$SCRIPT_DIR/android-device-health.sh" capture "$device" "$dir" >/dev/null 2>&1 || true
  else
    bash "$SCRIPT_DIR/ios-device-health.sh" capture "$device" "$dir" >/dev/null 2>&1 || true
  fi

  # What Maestro itself printed is the difference between "hung mid-flow" and "never reached the
  # device": an acquisition hang leaves a log that stops at the banner.
  if [[ -n "$log_file" && -f "$log_file" ]]; then
    tail -n 200 "$log_file" >"$dir/maestro-tail.log" 2>/dev/null || true
  fi

  echo "  Diagnostics: $dir" >&2
}

# One place that knows how an operator unblocks each platform, so the early preflight and the
# end-of-run summary cannot drift apart.
print_blocked_guidance() {
  local platform="$1"
  local reason="$2"

  echo ""
  echo "Mobile E2E BLOCKED by the test environment (exit ${MOBILE_E2E_ENV_BLOCKED_EXIT})."
  echo "The device stopped accepting input, so no conclusion about the app or the flows is valid."
  if [[ -n "$reason" ]]; then
    echo "  Reason: ${reason}"
  fi
  echo "  Diagnostics: $DIAGNOSTICS_ROOT"
  echo ""
  echo "Operator steps:"

  if [[ "$platform" != 'ios' ]]; then
    echo "  Android:"
    echo "    1. Open the diagnostics screenshot to confirm the system dialog."
    echo "    2. Cold-restart the emulator if a reboot did not clear it:"
    echo "         bash scripts/mobile/ensure-devices.sh recover-e2e-android"
    echo "    3. Free host load (close the other simulator, stop unused dev servers), then rerun."
    echo "    Do not tap Close app / Wait by hand — that leaves the emulator worse off than a reboot."
  fi

  if [[ "$platform" != 'android' ]]; then
    echo "  iOS:"
    echo "    1. Read device-info.txt and host-processes.txt in the diagnostics dir. An iOS block is"
    echo "       usually an acquisition hang, not a visible dialog: an empty driver_pids means"
    echo "       Maestro never started its XCTest runner, so the screenshot will look normal."
    echo "    2. Reset the simulator and clear any orphaned driver:"
    echo "         bash scripts/mobile/ensure-devices.sh recover-e2e-ios"
    echo "    3. If that fails to boot, CoreSimulator itself is wedged. Quit Simulator.app, then:"
    echo "         killall -9 com.apple.CoreSimulator.CoreSimulatorService"
    echo "       That restarts every simulator on the host, including manual ones."
    echo "    4. Reinstall the app if the simulator was erased: npm run mobile:e2e:ios"
  fi

  echo "  Then rerun the same focused command; the runner reseeds before it retries."
}

# Prove Maestro can acquire the device before the run spends minutes on reseeding and API health
# checks. `maestro hierarchy` is the cheapest command that exercises the whole driver path, and it
# leaves the driver warm for the first flow, so most of what it costs comes back immediately.
device_canary() {
  local device="$1"
  local out pid ticks max rc

  out="$(mktemp "${TMPDIR:-/tmp}/podverse-e2e-canary.XXXXXX")"
  maestro --device "$device" hierarchy >"$out" 2>&1 &
  pid=$!

  ticks=0
  max=$((MOBILE_E2E_DEVICE_CANARY_TIMEOUT_SECONDS * 2))
  while kill -0 "$pid" 2>/dev/null; do
    if ((ticks >= max)); then
      kill_process_tree "$pid" KILL
      wait "$pid" 2>/dev/null || true
      rm -f "$out"
      return 1
    fi
    sleep 0.5
    ticks=$((ticks + 1))
  done

  wait "$pid"
  rc=$?
  rm -f "$out"
  return "$rc"
}

# Empty output means the device is ready; anything else is the reason it is not.
device_block_reason() {
  local device="$1"
  local platform="$2"
  local health=''

  if [[ "$platform" == 'ios' ]]; then
    health="$(bash "$SCRIPT_DIR/ios-device-health.sh" status "$device" 2>/dev/null || true)"
  else
    health="$(bash "$SCRIPT_DIR/android-device-health.sh" status "$device" 2>/dev/null || true)"
  fi

  if [[ -n "$health" && "$health" != 'ok' ]]; then
    printf '%s\n' "$health"
    return 0
  fi

  if [[ "$MOBILE_E2E_DEVICE_CANARY" == '1' ]] && ! device_canary "$device"; then
    printf 'canary: Maestro could not read the UI hierarchy within %ss\n' \
      "$MOBILE_E2E_DEVICE_CANARY_TIMEOUT_SECONDS"
  fi
}

preflight_device() {
  local device="$1"
  local platform="$2"
  local label="$3"
  local recover_mode="$4"
  local reason=''

  echo "Checking Maestro can drive ${label}..."
  reason="$(device_block_reason "$device" "$platform")"
  if [[ -z "$reason" ]]; then
    return 0
  fi

  echo "Device preflight for ${label}: ${reason}" >&2
  capture_env_diagnostics "$device" "$platform" "preflight-${label}" "$reason"
  echo "Recovering ${label} before the run starts..." >&2
  if ! bash "$SCRIPT_DIR/ensure-devices.sh" "$recover_mode" >/dev/null; then
    ENV_BLOCKED_REASON="${reason} (recovery failed)"
    ENV_BLOCKED_PLATFORM="$platform"
    return 1
  fi

  reason="$(device_block_reason "$device" "$platform")"
  if [[ -n "$reason" ]]; then
    ENV_BLOCKED_REASON="${reason} (still blocked after recovery)"
    ENV_BLOCKED_PLATFORM="$platform"
    return 1
  fi

  echo "${label} recovered and answering Maestro."
  return 0
}

# Devices come first. A wedged device invalidates everything after it, so finding out now costs
# seconds, while finding out after reseeding and API health checks costs minutes per attempt.
if [[ "$NEEDS_TABLET" -eq 1 ]]; then
  IOS_SLOT_DIR="$IOS_TABLET_DIR"
  ANDROID_SLOT_DIR="$ANDROID_TABLET_DIR"
  IOS_DEVICE_LABEL="$E2E_IOS_TABLET_NAME"
  ANDROID_DEVICE_LABEL="$E2E_ANDROID_TABLET_AVD"
  IOS_SLOT_NAME="ios-tablet"
  ANDROID_SLOT_NAME="android-tablet"
  echo "Booting E2E tablet devices (no install)..."
  if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "both" ]]; then
    if [[ "$(uname -s)" == "Darwin" ]]; then
      bash "$SCRIPT_DIR/ensure-devices.sh" e2e-ios-tablet
      IOS_UDID="$(bash "$SCRIPT_DIR/ensure-devices.sh" resolve-e2e-ios-tablet-udid)"
      echo "E2E iOS tablet UDID: $IOS_UDID"
      if ! bash "$SCRIPT_DIR/ensure-devices.sh" check-e2e-app-ios-tablet >/dev/null 2>&1; then
        echo "Error: app not installed on E2E iOS tablet (${E2E_IOS_TABLET_NAME})." >&2
        echo "In another terminal: npm run mobile:e2e:ios:tablet" >&2
        exit 1
      fi
    fi
  fi
  if [[ "$PLATFORM" == "android" || "$PLATFORM" == "both" ]]; then
    if ANDROID_SERIAL="$(bash "$SCRIPT_DIR/ensure-devices.sh" resolve-e2e-android-tablet-serial 2>/dev/null)"; then
      echo "E2E Android tablet serial: $ANDROID_SERIAL"
      if ! bash "$SCRIPT_DIR/ensure-devices.sh" check-e2e-app-android-tablet >/dev/null 2>&1; then
        echo "Error: app not installed on E2E Android tablet (${E2E_ANDROID_TABLET_AVD})." >&2
        echo "In another terminal: npm run mobile:e2e:android:tablet" >&2
        exit 1
      fi
    else
      echo "Warning: E2E Android tablet not available; iOS-tablet-only Maestro run this pass."
      ANDROID_SERIAL=""
    fi
  fi
else
  echo "Booting E2E phone devices (no install)..."
  if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "both" ]]; then
    if [[ "$(uname -s)" == "Darwin" ]]; then
      bash "$SCRIPT_DIR/ensure-devices.sh" e2e-ios
      IOS_UDID="$(bash "$SCRIPT_DIR/ensure-devices.sh" resolve-e2e-ios-udid)"
      echo "E2E iOS UDID: $IOS_UDID"
      if ! bash "$SCRIPT_DIR/ensure-devices.sh" check-e2e-app-ios >/dev/null 2>&1; then
        echo "Error: app not installed on E2E iOS (${E2E_IOS_NAME})." >&2
        echo "In another terminal: npm run mobile:e2e:ios" >&2
        exit 1
      fi
    fi
  fi
  if [[ "$PLATFORM" == "android" || "$PLATFORM" == "both" ]]; then
    if ANDROID_SERIAL="$(bash "$SCRIPT_DIR/ensure-devices.sh" resolve-e2e-android-serial 2>/dev/null)"; then
      echo "E2E Android serial: $ANDROID_SERIAL"
      if ! bash "$SCRIPT_DIR/ensure-devices.sh" check-e2e-app-android >/dev/null 2>&1; then
        echo "Error: app not installed on E2E Android (${E2E_ANDROID_AVD})." >&2
        echo "In another terminal: npm run mobile:e2e:android" >&2
        exit 1
      fi
    else
      echo "Warning: E2E Android not available; iOS-only Maestro run this pass."
      ANDROID_SERIAL=""
    fi
  fi
fi

if [[ -n "$IOS_UDID" ]]; then
  IOS_RECOVER_MODE='recover-e2e-ios'
  [[ "$NEEDS_TABLET" -eq 1 ]] && IOS_RECOVER_MODE='recover-e2e-ios-tablet'
  if ! preflight_device "$IOS_UDID" 'ios' "$IOS_SLOT_NAME" "$IOS_RECOVER_MODE"; then
    link_latest_report
    print_blocked_guidance 'ios' "$ENV_BLOCKED_REASON"
    exit "$MOBILE_E2E_ENV_BLOCKED_EXIT"
  fi
fi

if [[ -n "$ANDROID_SERIAL" ]]; then
  ANDROID_RECOVER_MODE='recover-e2e-android'
  [[ "$NEEDS_TABLET" -eq 1 ]] && ANDROID_RECOVER_MODE='recover-e2e-android-tablet'
  if ! preflight_device "$ANDROID_SERIAL" 'android' "$ANDROID_SLOT_NAME" "$ANDROID_RECOVER_MODE"; then
    link_latest_report
    print_blocked_guidance 'android' "$ENV_BLOCKED_REASON"
    exit "$MOBILE_E2E_ENV_BLOCKED_EXIT"
  fi
fi

seed_mobile_e2e_db_safely() {
  local api_was_managed=0
  local api_pid=''

  if [[ -f "$MOBILE_E2E_API_PID_FILE" ]]; then
    api_pid="$(<"$MOBILE_E2E_API_PID_FILE")"
    if kill -0 "$api_pid" >/dev/null 2>&1; then
      echo "Stopping managed mobile E2E API before reseeding..."
      bash "$REPO_ROOT/scripts/mobile/e2e-api.sh" stop
      api_was_managed=1
      MANAGED_API_STOPPED=1
    fi
  fi

  if lsof -nP -iTCP:"$MOBILE_E2E_API_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Error: cannot reseed while an unmanaged mobile E2E API is listening on :${MOBILE_E2E_API_PORT}." >&2
    echo "Stop the foreground API, then rerun it with npm run mobile:e2e:api:bg so the runner can manage its lifecycle." >&2
    exit 1
  fi

  if ! make mobile_e2e_seed; then
    if [[ "$api_was_managed" -eq 1 ]]; then
      echo "Restarting managed mobile E2E API after failed reseed..."
      bash "$REPO_ROOT/scripts/mobile/e2e-api.sh" start-bg || true
      MANAGED_API_STOPPED=0
    fi
    return 1
  fi

  if [[ "$api_was_managed" -eq 1 ]]; then
    echo "Restarting managed mobile E2E API after reseeding..."
    bash "$REPO_ROOT/scripts/mobile/e2e-api.sh" start-bg
    MANAGED_API_STOPPED=0
  fi
}

wait_for_mobile_e2e_api_health() {
  local health_url="$1"
  local health_json=''

  for attempt in {1..30}; do
    health_json="$(curl -sf "$health_url" 2>/dev/null || true)"
    if printf '%s' "$health_json" | grep -q '"fixturesEnabled"[[:space:]]*:[[:space:]]*true'; then
      return 0
    fi
    if ((attempt < 30)); then
      sleep 1
    fi
  done

  return 1
}

if [[ "$NEEDS_E2E_API" -eq 1 ]]; then
  if ! lsof -nP -iTCP:"$MOBILE_E2E_API_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Error: API-backed flows need the mobile E2E API on :${MOBILE_E2E_API_PORT}." >&2
    echo "Start it in tab Mobile E2E API: npm run mobile:e2e:api:bg" >&2
    echo "(Leave-running; no need to restart when only reloading Metro.)" >&2
    exit 1
  fi

  # Fail fast when the leave-running API was started before PODVERSE_E2E_FIXTURES
  # (search + add-by-RSS fixtures). Health includes fixturesEnabled after rebuild.
  HEALTH_URL="http://127.0.0.1:${MOBILE_E2E_API_PORT}/api/v2/health"
  if ! wait_for_mobile_e2e_api_health "$HEALTH_URL"; then
    echo "Error: Mobile E2E API on :${MOBILE_E2E_API_PORT} is stale (no fixtures)." >&2
    echo "Restart it in tab Mobile E2E API so dist rebuilds with PODVERSE_E2E_FIXTURES:" >&2
    echo "  npm run mobile:e2e:api:bg" >&2
    echo "Health check: ${HEALTH_URL}" >&2
    exit 1
  fi

  # Mirror web Playwright make targets: always seed before API-backed Maestro.
  # --skip-seed is for a tight debug loop on one flow, where the reseed plus API restart is the
  # slowest part of the cycle and the previous run already left the database in a known state. It
  # is never right for a suite run: any flow that writes account data would inherit it.
  if [[ "$MOBILE_E2E_SKIP_SEED" == '1' ]]; then
    echo "Skipping mobile E2E DB reseed (--skip-seed). Results depend on the database as it stands."
  else
    echo "Seeding mobile E2E DB (make mobile_e2e_seed — reuses web seed)..."
    seed_mobile_e2e_db_safely

    if ! wait_for_mobile_e2e_api_health "$HEALTH_URL"; then
      echo "Error: Mobile E2E API on :${MOBILE_E2E_API_PORT} is unavailable after reseeding." >&2
      echo "Restart it in tab Mobile E2E API: npm run mobile:e2e:api:bg" >&2
      echo "Health check: ${HEALTH_URL}" >&2
      exit 1
    fi
  fi

  # Metro must be E2E-mode (mobile:dev:e2e) for API-backed / full-suite flows.
  # Only fail when we can positively read Metro's env and the E2E flag is absent.
  METRO_PIDS="$(lsof -nP -iTCP:"$MOBILE_METRO_PORT" -sTCP:LISTEN -t 2>/dev/null || true)"
  METRO_ENV=""
  for mpid in $METRO_PIDS; do
    METRO_ENV+="$(ps eww "$mpid" 2>/dev/null || true)"$'\n'
  done
  if printf '%s' "$METRO_ENV" | grep -q 'EXPO_PUBLIC_'; then
    if ! printf '%s' "$METRO_ENV" | grep -q 'EXPO_PUBLIC_MOBILE_E2E=1'; then
      echo "Error: Metro on :${MOBILE_METRO_PORT} is UI-only (mobile:dev)." >&2
      echo "API-backed / full-suite flows need E2E Metro. Restart it in Mobile Metro:" >&2
      echo "  npm run mobile:dev:e2e" >&2
      echo "Then reload/reinstall the app so it targets :${MOBILE_E2E_API_PORT}." >&2
      exit 1
    fi
  fi
fi

if [[ "$NEEDS_TEST_ASSETS" -eq 1 ]]; then
  if ! lsof -nP -iTCP:"$MOBILE_E2E_TEST_ASSETS_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Error: playback flows need tools/test-assets on :${MOBILE_E2E_TEST_ASSETS_PORT}." >&2
    echo "Start it in tab Mobile E2E test-assets: npm run mobile:e2e:test-assets:bg" >&2
    echo "(Same server as web Playwright; leave-running.)" >&2
    exit 1
  fi

  # mobile:e2e:test-assets binds 0.0.0.0 (IPv4). Use 127.0.0.1 — not localhost —
  # so preflight matches Android/iOS media hosts and does not prefer [::1].
  FIXTURE_URL="http://127.0.0.1:${MOBILE_E2E_TEST_ASSETS_PORT}/e2e/audio/e2e-addbyrss-fresh-60s-440hz.mp3"
  if ! curl -sf --output /dev/null --range 0-0 "$FIXTURE_URL" >/dev/null 2>&1; then
    echo "Error: test-assets on :${MOBILE_E2E_TEST_ASSETS_PORT} is not serving E2E fixtures." >&2
    echo "Restart in tab Mobile E2E test-assets: npm run mobile:e2e:test-assets:bg" >&2
    echo "Health: npm run mobile:e2e:test-assets:health" >&2
    exit 1
  fi
fi

[[ -n "$IOS_UDID" ]] && mkdir -p "$IOS_SLOT_DIR"
[[ -n "$ANDROID_SERIAL" ]] && mkdir -p "$ANDROID_SLOT_DIR"

link_latest_report

echo "=== Mobile E2E report run ==="
echo "Flows: ${FLOWS[*]}"
echo "Report dir: $REPORT_DIR"

reset_app_data() {
  local device="$1"
  local platform="$2"

  if [[ "$platform" == 'ios' ]]; then
    local app_bundle
    local reset_dir
    app_bundle="$(xcrun simctl get_app_container "$device" "$MOBILE_APP_ID" app)"
    reset_dir="$(mktemp -d "${TMPDIR:-/tmp}/podverse-e2e-reset.XXXXXX")"
    cp -R "$app_bundle" "$reset_dir/PodverseNext.app"
    echo "Resetting iOS E2E app data..."
    xcrun simctl uninstall "$device" "$MOBILE_APP_ID" >/dev/null
    xcrun simctl install "$device" "$reset_dir/PodverseNext.app" >/dev/null
    rm -rf "$reset_dir"
    return
  fi

  echo "Resetting Android E2E app data..."
  adb -s "$device" shell pm clear "$MOBILE_APP_ID" >/dev/null
}

# Flow-scoped retries after the initial suite pass (not a full-suite re-run).
# Set MOBILE_E2E_FLOW_RETRIES to a positive number to opt in.
MOBILE_E2E_FLOW_RETRIES="${MOBILE_E2E_FLOW_RETRIES:-0}"

# Two independent proofs that a run is alive, in one cheap string: bytes Maestro has printed, and
# how much it has written into the slot. Console output alone would miss a driver that prints a
# banner and hangs; slot artifacts alone would miss the gap before the first flow completes.
progress_signature() {
  local log_file="$1"
  local slot_dir="$2"
  local log_bytes slot_files slot_kb

  log_bytes="$(wc -c <"$log_file" 2>/dev/null | tr -d ' ')"
  slot_files="$(find "$slot_dir" -type f 2>/dev/null | wc -l | tr -d ' ')"
  slot_kb="$(du -sk "$slot_dir" 2>/dev/null | awk '{print $1}')"
  printf '%s:%s:%s' "${log_bytes:-0}" "${slot_files:-0}" "${slot_kb:-0}"
}

# Has Maestro reached the device at all? Artifacts in the slot dir are written by the driver, so
# the first one is the moment acquisition provably succeeded.
slot_has_output() {
  local dir="$1"
  [[ -d "$dir" ]] || return 1
  [[ -n "$(find "$dir" -type f 2>/dev/null | head -n1)" ]]
}

# Add terminal-only color to Maestro status lines while keeping captured logs plain text.
colorize_maestro_output() {
  if [[ ! -t 1 || -n "${NO_COLOR:-}" || "${TERM:-}" == 'dumb' ]]; then
    cat
    return
  fi

  local line
  while IFS= read -r line || [[ -n "$line" ]]; do
    case "$line" in
    '[Passed]'*|[0-9]*/[0-9]*' Flow Passed'*)
      printf '\033[32m%s\033[0m\n' "$line"
      ;;
    '[Failed]'*|[0-9]*/[0-9]*' Flow Failed'*)
      printf '\033[31m%s\033[0m\n' "$line"
      ;;
    '[Skipped]'*|[0-9]*/[0-9]*' Flow Skipped'*|*'Timed out'*)
      printf '\033[33m%s\033[0m\n' "$line"
      ;;
    *)
      printf '%s\n' "$line"
      ;;
    esac
  done
}

# Run Maestro with a watchdog attached.
# Returns 0 pass, 1 flow failure, $MOBILE_E2E_ENV_BLOCKED_EXIT when the environment is what failed.
supervise_maestro() {
  local device="$1"
  local platform="$2"
  local slot_dir="$3"
  local label="$4"
  shift 4
  local -a maestro_args=("$@")
  local pid rc start_ts elapsed health blocked had_errexit unhealthy_streak
  local log_file signature last_signature last_progress_ts quiet_for
  local progress_events reached_device driver_missing_streak

  # Callers already disable errexit around this function; restore exactly what they had rather
  # than turning it back on and aborting the script on a non-zero Maestro exit.
  had_errexit=0
  case $- in
  *e*) had_errexit=1 ;;
  esac
  set +e

  ENV_BLOCKED_REASON=''
  ENV_BLOCKED_PLATFORM="$platform"
  blocked=''
  unhealthy_streak=0
  driver_missing_streak=0
  progress_events=0
  reached_device=0
  start_ts="$SECONDS"

  mkdir -p "$slot_dir"
  # Outside the slot dir on purpose: a file Maestro did not write must never count as evidence
  # that Maestro reached the device.
  MAESTRO_LOG_SEQ=$((MAESTRO_LOG_SEQ + 1))
  log_file="$REPORT_DIR/logs/$(printf '%02d' "$MAESTRO_LOG_SEQ")-${label//[^A-Za-z0-9._-]/_}.log"
  mkdir -p "$REPORT_DIR/logs"
  : >"$log_file"

  # Tee through a process substitution rather than a pipeline: the operator keeps the live output,
  # and $! stays Maestro's own pid so the watchdog can still kill the JVM tree.
  maestro "${maestro_args[@]}" > >(tee -a "$log_file" | colorize_maestro_output) 2>&1 &
  pid=$!
  SUPERVISED_MAESTRO_PID="$pid"

  last_signature="$(progress_signature "$log_file" "$slot_dir")"
  last_progress_ts="$SECONDS"

  while kill -0 "$pid" 2>/dev/null; do
    sleep "$MOBILE_E2E_WATCHDOG_INTERVAL_SECONDS"
    kill -0 "$pid" 2>/dev/null || break
    elapsed=$((SECONDS - start_ts))

    signature="$(progress_signature "$log_file" "$slot_dir")"
    if [[ "$signature" != "$last_signature" ]]; then
      last_signature="$signature"
      last_progress_ts="$SECONDS"
      progress_events=$((progress_events + 1))
    fi
    quiet_for=$((SECONDS - last_progress_ts))

    # A driver that never acquires the device still prints its banner once, so a single burst of
    # output proves nothing. Either an artifact in the slot or output across several polls does.
    if [[ "$reached_device" -eq 0 ]] \
      && { slot_has_output "$slot_dir" || ((progress_events >= 3)); }; then
      reached_device=1
    fi

    if [[ "$platform" == 'android' && "$MOBILE_E2E_ANDROID_WATCHDOG" == '1' ]]; then
      health="$(bash "$SCRIPT_DIR/android-device-health.sh" status "$device" 2>/dev/null || true)"
      case "$health" in
      ok | '')
        unhealthy_streak=0
        ;;
      *)
        # Two consecutive reads before acting. A dialog does not clear itself, so the only thing a
        # second poll costs is one interval — and killing a healthy run on a momentary adb hiccup
        # would be a worse failure than the one this watchdog exists to catch.
        unhealthy_streak=$((unhealthy_streak + 1))
        if ((unhealthy_streak >= 2)); then
          blocked="$health"
        else
          echo "Device health check reported '${health}' for ${label}; confirming on next poll." >&2
        fi
        ;;
      esac
    fi

    if [[ "$platform" == 'ios' && "$MOBILE_E2E_IOS_WATCHDOG" == '1' ]]; then
      health="$(bash "$SCRIPT_DIR/ios-device-health.sh" status "$device" 2>/dev/null || true)"
      case "$health" in
      ok | '')
        unhealthy_streak=0
        ;;
      *)
        unhealthy_streak=$((unhealthy_streak + 1))
        if ((unhealthy_streak >= 2)); then
          blocked="$health"
        else
          echo "Device health check reported '${health}' for ${label}; confirming on next poll." >&2
        fi
        ;;
      esac

      # The iOS hang that costs whole sessions: Maestro prints its banner, then blocks acquiring
      # the simulator and never starts its XCTest runner. Nothing is wrong with the device, so no
      # health probe catches it — the absence of the driver process is the only tell.
      if [[ -z "$blocked" && "$reached_device" -eq 0 ]] \
        && ((elapsed >= MOBILE_E2E_IOS_DRIVER_GRACE_SECONDS)); then
        if bash "$SCRIPT_DIR/ios-device-health.sh" driver "$device" >/dev/null 2>&1; then
          driver_missing_streak=0
        else
          driver_missing_streak=$((driver_missing_streak + 1))
          if ((driver_missing_streak >= 2)); then
            blocked="ios-driver: Maestro started no simulator driver in ${elapsed}s"
          else
            echo "No Maestro iOS driver for ${label} after ${elapsed}s; confirming on next poll." >&2
          fi
        fi
      fi
    fi

    if [[ -z "$blocked" && "$reached_device" -eq 0 ]] \
      && ((elapsed >= MOBILE_E2E_STARTUP_TIMEOUT_SECONDS)); then
      blocked="startup: Maestro ran ${elapsed}s without reaching the device"
    fi

    if [[ -z "$blocked" ]] && ((quiet_for >= MOBILE_E2E_STALL_TIMEOUT_SECONDS)); then
      blocked="stalled: no Maestro progress for ${quiet_for}s"
    fi

    if [[ -z "$blocked" ]] && ((MOBILE_E2E_RUN_TIMEOUT_SECONDS > 0)) \
      && ((elapsed >= MOBILE_E2E_RUN_TIMEOUT_SECONDS)); then
      blocked="timeout: run exceeded ${MOBILE_E2E_RUN_TIMEOUT_SECONDS}s"
    fi

    if [[ -n "$blocked" ]]; then
      echo "" >&2
      echo "BLOCKED (${label}): ${blocked}" >&2
      capture_env_diagnostics "$device" "$platform" "$label" "$blocked" "$log_file"
      stop_supervised_maestro "$pid"
      SUPERVISED_MAESTRO_PID=''
      ENV_BLOCKED_REASON="$blocked"
      if ((had_errexit)); then set -e; fi
      return "$MOBILE_E2E_ENV_BLOCKED_EXIT"
    fi
  done

  wait "$pid"
  rc=$?
  SUPERVISED_MAESTRO_PID=''
  if ((had_errexit)); then set -e; fi
  return "$rc"
}

# Flows with no pass recorded yet, so a post-recovery re-run does not repeat work the device
# already completed before it wedged.
unresolved_flows_in_slot() {
  local slot_dir="$1"
  shift
  node "$SCRIPT_DIR/e2e-list-failed-flows.mjs" --mode=unresolved "$slot_dir" "$@"
}

# Run Maestro for a platform slot; on failure, re-run only still-failed flow YAMLs. A wedged
# device short-circuits the loop: the emulator is rebooted once and only the flows without a
# result are re-run, because retrying a flow against a broken device proves nothing.
# Usage: run_maestro_slot <device-id> <slot-dir> <label> <platform> <flow...>
run_maestro_slot() {
  local device="$1"
  local slot_dir="$2"
  local label="$3"
  local platform="$4"
  shift 3
  shift 1
  local -a suite_flows=("$@")
  local -a current_flows=("${suite_flows[@]}")
  local attempt=0
  local max_attempts=$((MOBILE_E2E_FLOW_RETRIES + 1))
  local rc=0
  local recover_mode recoveries_allowed recoveries_used

  if [[ "$platform" == 'android' ]]; then
    recover_mode='recover-e2e-android'
    [[ "$NEEDS_TABLET" -eq 1 ]] && recover_mode='recover-e2e-android-tablet'
    recoveries_allowed="$MOBILE_E2E_ANDROID_RECOVERIES"
    recoveries_used="$ANDROID_RECOVERIES_USED"
  else
    recover_mode='recover-e2e-ios'
    [[ "$NEEDS_TABLET" -eq 1 ]] && recover_mode='recover-e2e-ios-tablet'
    recoveries_allowed="$MOBILE_E2E_IOS_RECOVERIES"
    recoveries_used="$IOS_RECOVERIES_USED"
  fi

  mkdir -p "$slot_dir"

  while ((attempt < max_attempts)); do
    if ((attempt > 0)); then
      echo "Retrying failed ${label} flows (${attempt}/${MOBILE_E2E_FLOW_RETRIES}): ${current_flows[*]}"
    fi

    if [[ "$RESET_DATA" -eq 1 ]]; then
      rc=0
      for flow_path in "${current_flows[@]}"; do
        local flow_name
        local run_dir
        local flow_rc
        flow_name="$(basename "$flow_path" .yaml)"
        run_dir="$slot_dir/runs/$flow_name"
        mkdir -p "$run_dir"
        echo "Running clean-state ${label} flow: ${flow_name}"
        reset_app_data "$device" "$platform"
        set +e
        supervise_maestro "$device" "$platform" "$run_dir" "${label}-${flow_name}" \
          --device "$device" test \
          --format=HTML \
          --output "$run_dir/maestro.html" \
          --test-output-dir "$run_dir" \
          "${MAESTRO_TIMEOUT_ARGS[@]}" \
          "$flow_path"
        flow_rc=$?
        set -e
        if [[ "$flow_rc" -eq "$MOBILE_E2E_ENV_BLOCKED_EXIT" ]]; then
          # Every later flow in this pass would run against the same wedged device.
          rc="$MOBILE_E2E_ENV_BLOCKED_EXIT"
          break
        fi
        if [[ "$flow_rc" -ne 0 ]]; then
          rc=1
        fi
      done
    else
      set +e
      supervise_maestro "$device" "$platform" "$slot_dir" "$label" \
        --device "$device" test \
        --format=HTML \
        --output "$slot_dir/maestro.html" \
        --test-output-dir "$slot_dir" \
        "${MAESTRO_TIMEOUT_ARGS[@]}" \
        "${current_flows[@]}"
      rc=$?
      set -e
    fi

    if [[ "$rc" -eq 0 ]]; then
      return 0
    fi

    if [[ "$rc" -eq "$MOBILE_E2E_ENV_BLOCKED_EXIT" ]]; then
      if ((recoveries_used >= recoveries_allowed)); then
        echo "${label} still blocked after ${recoveries_used} device recovery attempt(s)." >&2
        return "$MOBILE_E2E_ENV_BLOCKED_EXIT"
      fi
      recoveries_used=$((recoveries_used + 1))
      if [[ "$platform" == 'android' ]]; then
        ANDROID_RECOVERIES_USED="$recoveries_used"
      else
        IOS_RECOVERIES_USED="$recoveries_used"
      fi
      echo "Recovering the ${label} E2E device (${recoveries_used}/${recoveries_allowed})..."
      if ! bash "$SCRIPT_DIR/ensure-devices.sh" "$recover_mode" >/dev/null; then
        echo "${label} device recovery failed; operator intervention required." >&2
        return "$MOBILE_E2E_ENV_BLOCKED_EXIT"
      fi

      local -a remaining_flows=()
      while IFS= read -r flow_path; do
        [[ -n "$flow_path" ]] && remaining_flows+=("$flow_path")
      done < <(unresolved_flows_in_slot "$slot_dir" "${suite_flows[@]}")

      if [[ "${#remaining_flows[@]}" -eq 0 ]]; then
        echo "All ${label} flows already have a result; nothing to re-run after recovery."
        return 0
      fi

      echo "Re-running ${#remaining_flows[@]} ${label} flow(s) after device recovery."
      current_flows=("${remaining_flows[@]}")
      # Recovery is not a flow retry: the flows never got a fair run on a working device.
      continue
    fi

    if ((attempt >= MOBILE_E2E_FLOW_RETRIES)); then
      return 1
    fi

    local -a failed_flows=()
    while IFS= read -r flow_path; do
      [[ -n "$flow_path" ]] && failed_flows+=("$flow_path")
    done < <(node "$SCRIPT_DIR/e2e-list-failed-flows.mjs" "$slot_dir" "${suite_flows[@]}")

    if [[ "${#failed_flows[@]}" -eq 0 ]]; then
      echo "Maestro exited non-zero for ${label} but no failed flow YAMLs were detected; not retrying."
      return 1
    fi

    current_flows=("${failed_flows[@]}")
    attempt=$((attempt + 1))
  done

  return 1
}

EXIT_CODE=0
RAN_ANY=0

# A blocked environment outranks a flow failure: it says the run's conclusions cannot be trusted,
# so it must not be flattened into the generic exit 1.
record_slot_result() {
  local rc="$1"
  local platform="${2:-}"
  if [[ "$rc" -eq 0 ]]; then
    return 0
  fi
  if [[ "$rc" -eq "$MOBILE_E2E_ENV_BLOCKED_EXIT" || "$EXIT_CODE" -eq "$MOBILE_E2E_ENV_BLOCKED_EXIT" ]]; then
    EXIT_CODE="$MOBILE_E2E_ENV_BLOCKED_EXIT"
    # A parallel slot runs in a subshell, so the platform has to be recorded here rather than read
    # back out of the watchdog.
    if [[ "$rc" -eq "$MOBILE_E2E_ENV_BLOCKED_EXIT" && -n "$platform" ]]; then
      ENV_BLOCKED_PLATFORM="$platform"
    fi
    return 0
  fi
  EXIT_CODE=1
}

run_slot_sequential() {
  local device="$1"
  local slot_dir="$2"
  local label="$3"
  local platform="$4"
  local slot_name="$5"
  local device_label="$6"
  shift 6
  local rc=0

  echo "--- Maestro ${slot_name} (${device_label}) → ${slot_name}/ ---"
  set +e
  run_maestro_slot "$device" "$slot_dir" "$label" "$platform" "$@"
  rc=$?
  set -e
  record_slot_result "$rc" "$platform"
}

if [[ "$MOBILE_E2E_PARALLEL_SLOTS" == '1' && -n "$IOS_UDID" && -n "$ANDROID_SERIAL" ]]; then
  RAN_ANY=1
  IOS_SLOT_LOG="$REPORT_DIR/${IOS_SLOT_NAME}.log"
  ANDROID_SLOT_LOG="$REPORT_DIR/${ANDROID_SLOT_NAME}.log"
  echo "--- Maestro ${IOS_SLOT_NAME} (${IOS_DEVICE_LABEL}) + ${ANDROID_SLOT_NAME} (${ANDROID_DEVICE_LABEL}) in parallel ---"
  echo "Per-slot output is buffered and printed when each slot finishes:"
  echo "  ${IOS_SLOT_LOG}"
  echo "  ${ANDROID_SLOT_LOG}"

  run_maestro_slot "$IOS_UDID" "$IOS_SLOT_DIR" "iOS" 'ios' "${FLOWS[@]}" >"$IOS_SLOT_LOG" 2>&1 &
  IOS_SLOT_PID=$!
  run_maestro_slot "$ANDROID_SERIAL" "$ANDROID_SLOT_DIR" "Android" 'android' "${FLOWS[@]}" >"$ANDROID_SLOT_LOG" 2>&1 &
  ANDROID_SLOT_PID=$!

  set +e
  wait "$IOS_SLOT_PID"
  IOS_SLOT_RC=$?
  wait "$ANDROID_SLOT_PID"
  ANDROID_SLOT_RC=$?
  set -e

  echo "--- ${IOS_SLOT_NAME} output ---"
  colorize_maestro_output <"$IOS_SLOT_LOG"
  echo "--- ${ANDROID_SLOT_NAME} output ---"
  colorize_maestro_output <"$ANDROID_SLOT_LOG"

  record_slot_result "$IOS_SLOT_RC" 'ios'
  record_slot_result "$ANDROID_SLOT_RC" 'android'
else
  if [[ "$MOBILE_E2E_PARALLEL_SLOTS" == '1' ]]; then
    echo "Parallel slots requested but only one device is available; running sequentially."
  fi

  if [[ -n "$IOS_UDID" ]]; then
    RAN_ANY=1
    run_slot_sequential "$IOS_UDID" "$IOS_SLOT_DIR" "iOS" 'ios' "$IOS_SLOT_NAME" "$IOS_DEVICE_LABEL" "${FLOWS[@]}"
  fi

  if [[ -n "$ANDROID_SERIAL" ]]; then
    RAN_ANY=1
    run_slot_sequential "$ANDROID_SERIAL" "$ANDROID_SLOT_DIR" "Android" 'android' "$ANDROID_SLOT_NAME" "$ANDROID_DEVICE_LABEL" "${FLOWS[@]}"
  fi
fi

if [[ "$RAN_ANY" -eq 0 ]]; then
  echo "Error: no E2E devices available for Maestro." >&2
  exit 1
fi

finalize_report

if [[ "$EXIT_CODE" -eq "$MOBILE_E2E_ENV_BLOCKED_EXIT" ]]; then
  print_blocked_guidance "$ENV_BLOCKED_PLATFORM" "$ENV_BLOCKED_REASON"
  echo "  Partial results so far: $REPORT_DIR/failures.json"
  echo "  Maestro console logs: $REPORT_DIR/logs/"
  exit "$MOBILE_E2E_ENV_BLOCKED_EXIT"
fi

if [[ "$EXIT_CODE" -ne 0 ]]; then
  echo ""
  echo "Mobile E2E failed. Hints:"
  echo "  - Agent/operator triage (prefer failures.json first):"
  echo "      open $REPORT_DIR/failures.json"
  if [[ "$NEEDS_TABLET" -eq 1 ]]; then
    echo "      open $REPORT_DIR/ios-tablet/index.html"
    echo "      open $REPORT_DIR/android-tablet/index.html"
    echo "  - Install E2E iOS tablet: npm run mobile:e2e:ios:tablet"
    echo "  - Install E2E Android tablet: npm run mobile:e2e:android:tablet"
  else
    echo "      open $REPORT_DIR/ios-phone/index.html"
    echo "      open $REPORT_DIR/android-phone/index.html"
    echo "  - Install E2E iOS: npm run mobile:e2e:ios"
    echo "  - Install E2E Android: npm run mobile:e2e:android"
  fi
  echo "  - Per-flow pages: $REPORT_DIR/<slot>/flows/<slug>/index.html"
  echo "  - Metro: npm run mobile:dev (UI-only) or npm run mobile:dev:e2e (API-backed)"
  echo "  - Mobile E2E API (API-backed flows): npm run mobile:e2e:api:bg"
  exit 1
fi
