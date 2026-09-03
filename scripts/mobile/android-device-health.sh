#!/usr/bin/env bash
# Answer one question about an Android E2E device fast: can Maestro still drive it?
#
# A system dialog ("System UI isn't responding", "Podverse Next keeps stopping") sits above the app
# and swallows every tap, so Maestro keeps retrying against a screen the app does not own and the
# run burns its whole timeout ladder on a device problem. Every adb call here is bounded, because a
# wedged emulator can hang adb itself and a blocking health check is the failure it is meant to
# report.
#
# Usage (from monorepo root):
#   bash scripts/mobile/android-device-health.sh status <serial>
#   bash scripts/mobile/android-device-health.sh capture <serial> <out-dir>
#
# status exit codes: 0 healthy, 10 blocking dialog, 20 device unreachable.

set -uo pipefail

ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
ADB_BIN="${ANDROID_HOME}/platform-tools/adb"
if [[ ! -x "$ADB_BIN" ]] && command -v adb >/dev/null 2>&1; then
  ADB_BIN="$(command -v adb)"
fi

ADB_CALL_TIMEOUT_SECONDS="${MOBILE_E2E_ADB_TIMEOUT_SECONDS:-15}"

HEALTH_OK=0
HEALTH_DIALOG=10
HEALTH_UNREACHABLE=20

# Run adb with a hard ceiling. Returns 124 when the call had to be killed, which is itself a
# health signal rather than an error to retry.
adb_bounded() {
  local out_file rc pid ticks limit
  out_file="$(mktemp "${TMPDIR:-/tmp}/podverse-adb.XXXXXX")"

  "$ADB_BIN" "$@" >"$out_file" 2>/dev/null &
  pid=$!

  ticks=0
  limit=$((ADB_CALL_TIMEOUT_SECONDS * 5))
  while kill -0 "$pid" 2>/dev/null; do
    if ((ticks >= limit)); then
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

# The focused window is the authoritative "what is on screen right now" read. AOSP names the ANR
# window "Application Not Responding: <package>" and the crash window "Application Error:
# <package>", whatever localized text the dialog itself renders.
focused_windows() {
  local serial="$1"
  adb_bounded -s "$serial" shell dumpsys window 2>/dev/null \
    | grep -E 'mCurrentFocus|mFocusedApp|mFocusedWindow' \
    | head -n 5
}

device_reachable() {
  local serial="$1"
  local state
  state="$(adb_bounded -s "$serial" get-state 2>/dev/null | tr -d '\r' | head -n1)"
  [[ "$state" == 'device' ]] || return 1
  adb_bounded -s "$serial" shell true >/dev/null 2>&1 || return 1
  local booted
  booted="$(adb_bounded -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' | head -n1)"
  [[ "$booted" == '1' ]]
}

status_command() {
  local serial="$1"
  local focus

  if ! device_reachable "$serial"; then
    echo "unreachable: ${serial} is not answering adb"
    return "$HEALTH_UNREACHABLE"
  fi

  focus="$(focused_windows "$serial")"

  if printf '%s' "$focus" | grep -q 'Application Not Responding'; then
    echo "anr: $(printf '%s' "$focus" | grep -o 'Application Not Responding[^},]*' | head -n1)"
    return "$HEALTH_DIALOG"
  fi

  if printf '%s' "$focus" | grep -q 'Application Error'; then
    echo "crash-dialog: $(printf '%s' "$focus" | grep -o 'Application Error[^},]*' | head -n1)"
    return "$HEALTH_DIALOG"
  fi

  echo "ok"
  return "$HEALTH_OK"
}

# Everything an operator or agent needs to tell a device problem from a flow problem, captured
# before the emulator is rebooted and the evidence is gone.
capture_command() {
  local serial="$1"
  local out_dir="$2"
  mkdir -p "$out_dir"

  adb_bounded -s "$serial" exec-out screencap -p >"$out_dir/screen.png" 2>/dev/null
  if [[ ! -s "$out_dir/screen.png" ]]; then
    rm -f "$out_dir/screen.png"
  fi

  focused_windows "$serial" >"$out_dir/focused-window.txt" 2>/dev/null

  # The events buffer records every ANR this boot, so it dates the dialog and names the process.
  adb_bounded -s "$serial" shell logcat -d -b events -t 400 2>/dev/null \
    | grep -E 'am_anr|am_crash|am_proc_died' >"$out_dir/anr-events.txt"

  adb_bounded -s "$serial" shell logcat -d -t 600 >"$out_dir/logcat-tail.txt" 2>/dev/null

  {
    echo "serial: ${serial}"
    echo "captured_at: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    adb_bounded -s "$serial" shell 'cat /proc/loadavg; cat /proc/meminfo | head -3' 2>/dev/null
  } >"$out_dir/device-info.txt"

  echo "$out_dir"
}

MODE="${1:-}"
SERIAL="${2:-}"

case "$MODE" in
status)
  [[ -n "$SERIAL" ]] || {
    echo "Usage: bash scripts/mobile/android-device-health.sh status <serial>" >&2
    exit 2
  }
  status_command "$SERIAL"
  ;;
capture)
  [[ -n "$SERIAL" && -n "${3:-}" ]] || {
    echo "Usage: bash scripts/mobile/android-device-health.sh capture <serial> <out-dir>" >&2
    exit 2
  }
  capture_command "$SERIAL" "$3"
  ;;
*)
  echo "Usage: bash scripts/mobile/android-device-health.sh <status|capture> <serial> [out-dir]" >&2
  exit 2
  ;;
esac
