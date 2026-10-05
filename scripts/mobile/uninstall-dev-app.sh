#!/usr/bin/env bash
# Uninstall the manual dev client so the next install is a signed-out app.
#
# Usage (from monorepo root):
#   npm run mobile:ios:uninstall
#   npm run mobile:android:uninstall
#   bash scripts/mobile/uninstall-dev-app.sh ios [--device "iPhone 17 Pro"]
#   bash scripts/mobile/uninstall-dev-app.sh android [--device Pixel_6_Pro_API_33]
#
# iOS Simulator Keychain items outlive a home-screen delete and `simctl uninstall`.
# This removes the app, then deletes Keychain rows whose access group belongs to
# com.podverse.app.next. Other apps on that simulator keep their Keychain items.
# When the simulator is booted, it shuts down first (securityd holds the Keychain
# file) and boots again afterward.
#
# Android `adb uninstall` removes the package and its private data, including
# encrypted prefs. A missing simulator or AVD is a no-op so a first quickstart
# can run this before the device exists.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

APP_ID='com.podverse.app.next'
MANUAL_IOS_NAME='iPhone 17 Pro'
MANUAL_ANDROID_AVD='Pixel_6_Pro_API_33'

ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
EMULATOR_BIN="${ANDROID_HOME}/emulator/emulator"
ADB_BIN="${ANDROID_HOME}/platform-tools/adb"
ANDROID_EMULATOR_EXTRA_FLAGS=(-gpu host -no-boot-anim -netdelay none -netspeed full)

usage() {
  awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$0"
}

die() {
  echo "Error: $*" >&2
  exit 1
}

ios_udids_by_name() {
  local name="$1"
  xcrun simctl list devices available -j 2>/dev/null \
    | python3 -c '
import json, sys
name = sys.argv[1]
data = json.load(sys.stdin)
found = []
for devices in data.get("devices", {}).values():
  for d in devices:
    if d.get("name") == name and d.get("isAvailable", True):
      found.append(d["udid"])
for udid in found:
  print(udid)
' "$name"
}

ios_state_for_udid() {
  local udid="$1"
  xcrun simctl list devices -j 2>/dev/null | python3 -c '
import json, sys
udid = sys.argv[1]
try:
  data = json.load(sys.stdin)
except Exception:
  print("")
  raise SystemExit(0)
for devices in data.get("devices", {}).values():
  for d in devices:
    if d.get("udid") == udid:
      print(d.get("state", ""))
      raise SystemExit(0)
print("")
' "$udid"
}

wait_for_ios_state() {
  local udid="$1"
  local want="$2"
  local waited=0
  local state
  while ((waited < 60)); do
    state="$(ios_state_for_udid "$udid")"
    if [[ "$state" == "$want" ]]; then
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done
  die "Timed out waiting for simulator ${udid} to reach ${want} (last state: ${state:-unknown})."
}

clear_ios_app_keychain() {
  local udid="$1"
  local db="$HOME/Library/Developer/CoreSimulator/Devices/${udid}/data/Library/Keychains/keychain-2-debug.db"
  if [[ ! -f "$db" ]]; then
    echo "No simulator Keychain database for ${udid}; nothing to clear."
    return 0
  fi

  local attempt
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if sqlite3 "$db" "PRAGMA busy_timeout = 5000; PRAGMA wal_checkpoint(TRUNCATE);" >/dev/null; then
      break
    fi
    if ((attempt == 10)); then
      die "Keychain database stayed locked after shutdown: ${db}"
    fi
    sleep 1
  done

  local removed=0
  local table count sql exists
  for table in genp inet cert; do
    exists="$(sqlite3 "$db" "SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = '${table}';")"
    if [[ "$exists" == "0" ]]; then
      continue
    fi
    # PRAGMA busy_timeout prints the timeout, so it stays out of the captured count.
    sqlite3 "$db" "PRAGMA busy_timeout = 5000;" >/dev/null
    sql="DELETE FROM ${table} WHERE agrp = '${APP_ID}' OR agrp LIKE '%.${APP_ID}'; SELECT changes();"
    count="$(sqlite3 "$db" "$sql")"
    removed=$((removed + count))
  done
  echo "Removed ${removed} Keychain item(s) for ${APP_ID}."
}

uninstall_ios() {
  local name="$1"
  [[ "$(uname -s)" == "Darwin" ]] || die "iOS uninstall requires macOS."

  local udids udid
  udids="$(ios_udids_by_name "$name")"
  if [[ -z "$udids" ]]; then
    echo "Simulator \"${name}\" does not exist yet. Nothing to uninstall."
    return 0
  fi
  if [[ "$(printf '%s\n' "$udids" | wc -l | tr -d ' ')" != "1" ]]; then
    echo "Error: more than one available simulator is named \"${name}\":" >&2
    printf '%s\n' "$udids" >&2
    die "Pass a unique name, or delete the extra simulator in Xcode."
  fi
  udid="$udids"

  local state was_booted=0
  state="$(ios_state_for_udid "$udid")"
  if [[ "$state" == "Booted" ]]; then
    was_booted=1
    xcrun simctl terminate "$udid" "$APP_ID" >/dev/null 2>&1 || true
  fi

  echo "Uninstalling ${APP_ID} from \"${name}\" (${udid})..."
  xcrun simctl uninstall "$udid" "$APP_ID"

  if [[ "$was_booted" -eq 1 ]]; then
    echo "Shutting down \"${name}\" to clear its Keychain..."
    xcrun simctl shutdown "$udid"
    wait_for_ios_state "$udid" "Shutdown"
  elif [[ "$state" == "Shutting Down" ]]; then
    wait_for_ios_state "$udid" "Shutdown"
  fi

  clear_ios_app_keychain "$udid"

  if [[ "$was_booted" -eq 1 ]]; then
    echo "Booting \"${name}\" again..."
    xcrun simctl boot "$udid"
    xcrun simctl bootstatus "$udid" -b >/dev/null
    bash "$SCRIPT_DIR/open-simulator-ui.sh"
  fi

  echo "iOS dev client removed from \"${name}\". Next launch is signed out."
}

android_avd_exists() {
  local name="$1"
  if [[ -x "$EMULATOR_BIN" ]]; then
    if "$EMULATOR_BIN" -list-avds 2>/dev/null | grep -Fx "$name" >/dev/null 2>&1; then
      return 0
    fi
    return 1
  fi
  [[ -d "${ANDROID_AVD_HOME:-$HOME/.android/avd}/${name}.avd" ]]
}

android_serial_for_avd() {
  local avd="$1"
  [[ -x "$ADB_BIN" ]] || return 1
  local serial avd_name
  while read -r serial; do
    [[ -n "$serial" ]] || continue
    avd_name="$("$ADB_BIN" -s "$serial" emu avd name 2>/dev/null | tr -d '\r' | head -n1 || true)"
    if [[ "$avd_name" == "$avd" ]]; then
      printf '%s\n' "$serial"
      return 0
    fi
  done < <("$ADB_BIN" devices 2>/dev/null | awk '/^emulator-/{print $1}')
  return 1
}

boot_android_avd() {
  local name="$1"
  local serial
  if serial="$(android_serial_for_avd "$name")"; then
    printf '%s\n' "$serial"
    return 0
  fi
  if [[ "$name" == "$MANUAL_ANDROID_AVD" ]]; then
    bash "$SCRIPT_DIR/ensure-devices.sh" manual-android
    android_serial_for_avd "$name"
    return $?
  fi

  echo "Starting Android AVD: ${name}" >&2
  nohup "$EMULATOR_BIN" -avd "$name" "${ANDROID_EMULATOR_EXTRA_FLAGS[@]}" \
    >/tmp/podverse-emulator-"${name}".log 2>&1 &
  local waited=0 boot
  while ((waited < 180)); do
    if serial="$(android_serial_for_avd "$name")"; then
      "$ADB_BIN" -s "$serial" wait-for-device
      boot="$("$ADB_BIN" -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
      if [[ "$boot" == "1" ]]; then
        printf '%s\n' "$serial"
        return 0
      fi
    fi
    sleep 2
    waited=$((waited + 2))
  done
  die "Timed out waiting for Android AVD ${name}. See /tmp/podverse-emulator-${name}.log"
}

uninstall_android() {
  local name="$1"
  if ! android_avd_exists "$name"; then
    echo "Android AVD ${name} does not exist yet. Nothing to uninstall."
    return 0
  fi
  [[ -x "$EMULATOR_BIN" ]] || die "Android emulator not found at ${EMULATOR_BIN}"
  [[ -x "$ADB_BIN" ]] || die "adb not found at ${ADB_BIN}"

  local serial
  serial="$(boot_android_avd "$name")" || die "Could not boot Android AVD ${name}."
  echo "Uninstalling ${APP_ID} from ${name} (${serial})..."
  local out
  out="$("$ADB_BIN" -s "$serial" uninstall "$APP_ID" 2>&1 || true)"
  if [[ "$out" == "Success" ]]; then
    echo "Android dev client removed from ${name}. Next install is signed out."
    return 0
  fi
  if [[ "$out" == *"Unknown package"* || "$out" == *"not installed"* ]]; then
    echo "App ${APP_ID} was not installed on ${name}."
    return 0
  fi
  die "adb uninstall failed: ${out}"
}

PLATFORM=""
DEVICE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    ios | android)
      if [[ -n "$PLATFORM" ]]; then
        die "Pass only one of ios or android."
      fi
      PLATFORM="$1"
      ;;
    --device)
      shift
      [[ $# -gt 0 ]] || die "--device requires a simulator or AVD name."
      DEVICE="$1"
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac
  shift
done

[[ -n "$PLATFORM" ]] || {
  usage >&2
  exit 1
}

case "$PLATFORM" in
  ios)
    uninstall_ios "${DEVICE:-$MANUAL_IOS_NAME}"
    ;;
  android)
    uninstall_android "${DEVICE:-$MANUAL_ANDROID_AVD}"
    ;;
esac
