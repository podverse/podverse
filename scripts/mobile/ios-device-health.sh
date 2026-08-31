#!/usr/bin/env bash
# Answer one question about an iOS E2E simulator fast: can Maestro still drive it?
#
# The iOS wedge is quieter than Android's. There is no dialog to photograph: Maestro hangs while
# acquiring the simulator — installing and launching its XCTest driver runner — prints nothing
# further, and executes no commands, so a whole stall window can pass with the simulator looking
# perfectly healthy on screen. The `driver` probe below is what separates that from a slow flow.
#
# Every probe is bounded, because the same wedge that stops Maestro can hang `simctl` itself, and a
# blocking health check is the failure it exists to report.
#
# Usage (from monorepo root):
#   bash scripts/mobile/ios-device-health.sh status <udid>
#   bash scripts/mobile/ios-device-health.sh driver <udid>
#   bash scripts/mobile/ios-device-health.sh capture <udid> <out-dir>
#
# status exit codes: 0 healthy, 20 unreachable or unresponsive.
# driver exit codes: 0 driver running, 30 no driver process.

set -uo pipefail

SIMCTL_CALL_TIMEOUT_SECONDS="${MOBILE_E2E_SIMCTL_TIMEOUT_SECONDS:-20}"
# Maestro installs its XCTest runner as maestro-driver-iosUITests-Runner.app. Match the stem so the
# probe survives an upstream rename of the bundle.
DRIVER_PROCESS_PATTERN='maestro-driver-ios'
# The app under test runs as a host process named after its Xcode target, not its bundle id.
APP_PROCESS_PATTERN='PodverseNext.app/PodverseNext'

HEALTH_OK=0
HEALTH_UNREACHABLE=20
HEALTH_NO_DRIVER=30

# Run a command with a hard ceiling. Returns 124 when the call had to be killed, which is itself a
# health signal rather than an error to retry.
run_bounded() {
  local limit="$1"
  shift
  local out_file rc pid ticks max
  out_file="$(mktemp "${TMPDIR:-/tmp}/podverse-simctl.XXXXXX")"

  "$@" >"$out_file" 2>/dev/null &
  pid=$!

  ticks=0
  max=$((limit * 5))
  while kill -0 "$pid" 2>/dev/null; do
    if ((ticks >= max)); then
      kill -KILL "$pid" 2>/dev/null
      wait "$pid" 2>/dev/null
      rm -f "$out_file"
      return 124
    fi
    sleep 0.2
    ticks=$((ticks + 1))
  done

  wait "$pid"
  rc=$?
  cat "$out_file"
  rm -f "$out_file"
  return "$rc"
}

device_state() {
  local udid="$1"
  run_bounded "$SIMCTL_CALL_TIMEOUT_SECONDS" xcrun simctl list devices -j 2>/dev/null \
    | python3 -c '
import json, sys
udid = sys.argv[1]
try:
  data = json.load(sys.stdin)
except Exception:
  raise SystemExit(0)
for devices in data.get("devices", {}).values():
  for d in devices:
    if d.get("udid") == udid:
      print(d.get("state", ""))
      raise SystemExit(0)
' "$udid"
}

# A screenshot is the cheapest round trip that proves CoreSimulator is still answering for this
# device. `simctl list` reads a plist and stays happy long after the simulator stops responding.
simulator_responsive() {
  local udid="$1"
  local probe rc
  probe="$(mktemp "${TMPDIR:-/tmp}/podverse-ios-probe.XXXXXX")"
  run_bounded "$SIMCTL_CALL_TIMEOUT_SECONDS" xcrun simctl io "$udid" screenshot --type=png "$probe" >/dev/null 2>&1
  rc=$?
  if [[ "$rc" -eq 0 && -s "$probe" ]]; then
    rm -f "$probe"
    return 0
  fi
  rm -f "$probe"
  return 1
}

# Simulator apps are ordinary macOS processes, so both the driver runner and the app under test are
# visible to pgrep on the host without going through simctl.
pids_matching() {
  pgrep -f "$1" 2>/dev/null | tr '\n' ' ' | sed 's/ *$//'
}

status_command() {
  local udid="$1"
  local state

  state="$(device_state "$udid" | tr -d '\r' | head -n1)"

  if [[ -z "$state" ]]; then
    echo "unreachable: ${udid} is not a known simulator (or simctl did not answer)"
    return "$HEALTH_UNREACHABLE"
  fi

  if [[ "$state" != 'Booted' ]]; then
    echo "unreachable: ${udid} is ${state}, not Booted"
    return "$HEALTH_UNREACHABLE"
  fi

  if ! simulator_responsive "$udid"; then
    echo "unresponsive: ${udid} did not answer a screenshot within ${SIMCTL_CALL_TIMEOUT_SECONDS}s"
    return "$HEALTH_UNREACHABLE"
  fi

  echo "ok"
  return "$HEALTH_OK"
}

driver_command() {
  local pids
  pids="$(pids_matching "$DRIVER_PROCESS_PATTERN")"

  if [[ -z "$pids" ]]; then
    echo "driver-missing: no ${DRIVER_PROCESS_PATTERN} process on the host"
    return "$HEALTH_NO_DRIVER"
  fi

  echo "ok: ${pids}"
  return "$HEALTH_OK"
}

# Everything needed to tell an acquisition hang from a flow problem. The host process list is the
# important part here: an iOS block usually looks fine on screen, and what distinguishes the two is
# whether Maestro's driver ever came up at all.
capture_command() {
  local udid="$1"
  local out_dir="$2"
  mkdir -p "$out_dir"

  run_bounded "$SIMCTL_CALL_TIMEOUT_SECONDS" xcrun simctl io "$udid" screenshot --type=png "$out_dir/screen.png" >/dev/null 2>&1
  if [[ ! -s "$out_dir/screen.png" ]]; then
    rm -f "$out_dir/screen.png"
  fi

  {
    echo "udid: ${udid}"
    echo "captured_at: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    echo "state: $(device_state "$udid" | tr -d '\r' | head -n1)"
    echo "driver_pids: $(pids_matching "$DRIVER_PROCESS_PATTERN")"
    echo "app_pids: $(pids_matching "$APP_PROCESS_PATTERN")"
    echo "host_load: $(uptime | sed 's/.*load averages*: //')"
  } >"$out_dir/device-info.txt"

  # Scoped tightly on purpose: every simulator process lives under a CoreSimulator path, so a
  # loose match buries the four lines that matter under the whole simulated system.
  ps -Ao pid,ppid,stat,etime,command 2>/dev/null \
    | grep -Ei 'maestro|PodverseNext|CoreSimulatorService|xctest|idb_companion|simctl' \
    | grep -v 'grep -Ei' | head -n 60 >"$out_dir/host-processes.txt"

  run_bounded 45 xcrun simctl spawn "$udid" log show --last 2m --style compact \
    --predicate 'process == "PodverseNext" OR subsystem == "com.facebook.react.log"' \
    >"$out_dir/app-log.txt" 2>/dev/null

  echo "$out_dir"
}

MODE="${1:-}"
UDID="${2:-}"

case "$MODE" in
status)
  [[ -n "$UDID" ]] || {
    echo "Usage: bash scripts/mobile/ios-device-health.sh status <udid>" >&2
    exit 2
  }
  status_command "$UDID"
  ;;
driver)
  [[ -n "$UDID" ]] || {
    echo "Usage: bash scripts/mobile/ios-device-health.sh driver <udid>" >&2
    exit 2
  }
  driver_command
  ;;
capture)
  [[ -n "$UDID" && -n "${3:-}" ]] || {
    echo "Usage: bash scripts/mobile/ios-device-health.sh capture <udid> <out-dir>" >&2
    exit 2
  }
  capture_command "$UDID" "$3"
  ;;
*)
  echo "Usage: bash scripts/mobile/ios-device-health.sh <status|driver|capture> <udid> [out-dir]" >&2
  exit 2
  ;;
esac
