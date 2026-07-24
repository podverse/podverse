#!/usr/bin/env bash
# Create/boot Podverse mobile simulators/emulators for manual vs E2E slots.
# Usage (from monorepo root):
#   bash scripts/mobile/ensure-devices.sh print-matrix
#   bash scripts/mobile/ensure-devices.sh e2e
#   bash scripts/mobile/ensure-devices.sh manual-ios
#   bash scripts/mobile/ensure-devices.sh manual-android
#   bash scripts/mobile/ensure-devices.sh resolve-e2e-ios-udid
#   bash scripts/mobile/ensure-devices.sh resolve-e2e-android-serial

set -euo pipefail

MANUAL_IOS_NAME='iPhone 17 Pro'
MANUAL_ANDROID_AVD='Pixel_6_Pro_API_33'
E2E_IOS_NAME='iPhone 17 Pro E2E'
E2E_ANDROID_AVD='Pixel_6_Pro_API_33_e2e'
APP_ID='com.podverse.app.next'

ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
EMULATOR_BIN="${ANDROID_HOME}/emulator/emulator"
ADB_BIN="${ANDROID_HOME}/platform-tools/adb"
AVD_HOME="${ANDROID_AVD_HOME:-$HOME/.android/avd}"

# Podverse Android AVD performance profile (Apple Silicon + HVF). Applied on every ensure/boot
# so manual + E2E slots stay consistent. Keeps Pixel_6_Pro LCD size for screenshot parity.
ANDROID_AVD_RAM_MB=4096
ANDROID_AVD_CPU_CORES=6
ANDROID_AVD_HEAP_MB=512
ANDROID_AVD_GPU_MODE=host
# Launch flags: host GPU + no boot anim + full network (matches AVD runtime.network.*).
ANDROID_EMULATOR_EXTRA_FLAGS=(-gpu host -no-boot-anim -netdelay none -netspeed full)

die() {
  echo "Error: $*" >&2
  exit 1
}

print_matrix() {
  cat <<EOF
Podverse mobile device matrix (same app id: ${APP_ID})
  Manual iOS:     ${MANUAL_IOS_NAME}
  Manual Android: ${MANUAL_ANDROID_AVD}
  E2E iOS:        ${E2E_IOS_NAME}
  E2E Android:    ${E2E_ANDROID_AVD}
EOF
}

ios_udid_by_name() {
  local name="$1"
  xcrun simctl list devices available -j 2>/dev/null \
    | python3 -c '
import json, sys
name = sys.argv[1]
data = json.load(sys.stdin)
for devices in data.get("devices", {}).values():
  for d in devices:
    if d.get("name") == name and d.get("isAvailable", True):
      print(d["udid"])
      raise SystemExit(0)
raise SystemExit(1)
' "$name"
}

ios_device_type_and_runtime_from_manual() {
  xcrun simctl list devices available -j 2>/dev/null \
    | python3 -c '
import json, sys
name = sys.argv[1]
data = json.load(sys.stdin)
for runtime, devices in data.get("devices", {}).items():
  for d in devices:
    if d.get("name") == name and d.get("isAvailable", True):
      print(d.get("deviceTypeIdentifier", ""))
      print(runtime)
      raise SystemExit(0)
raise SystemExit(1)
' "$MANUAL_IOS_NAME"
}

ensure_ios_sim() {
  local name="$1"
  if ios_udid_by_name "$name" >/dev/null 2>&1; then
    return 0
  fi
  if [[ "$(uname -s)" != "Darwin" ]]; then
    die "iOS simulator create requires macOS (wanted: ${name})"
  fi
  if ! ios_udid_by_name "$MANUAL_IOS_NAME" >/dev/null 2>&1; then
    die "Manual simulator \"${MANUAL_IOS_NAME}\" not found. Create it in Xcode first, then re-run."
  fi
  local device_type runtime meta
  meta="$(ios_device_type_and_runtime_from_manual)"
  device_type="$(printf '%s\n' "$meta" | sed -n '1p')"
  runtime="$(printf '%s\n' "$meta" | sed -n '2p')"
  [[ -n "$device_type" && -n "$runtime" ]] || die "Could not resolve device type/runtime from \"${MANUAL_IOS_NAME}\""
  echo "Creating iOS simulator: ${name}" >&2
  xcrun simctl create "$name" "$device_type" "$runtime" >/dev/null
}

boot_ios_sim() {
  local name="$1"
  ensure_ios_sim "$name"
  local udid
  udid="$(ios_udid_by_name "$name")" || die "Simulator not found after create: ${name}"
  local state
  state="$(xcrun simctl list devices -j | python3 -c '
import json, sys
udid = sys.argv[1]
data = json.load(sys.stdin)
for devices in data.get("devices", {}).values():
  for d in devices:
    if d.get("udid") == udid:
      print(d.get("state", ""))
      raise SystemExit(0)
print("")
' "$udid")"
  if [[ "$state" != "Booted" ]]; then
    echo "Booting iOS simulator: ${name}" >&2
    xcrun simctl boot "$udid" 2>/dev/null || true
    open -a Simulator >/dev/null 2>&1 || true
    xcrun simctl bootstatus "$udid" -b >/dev/null
  else
    echo "iOS simulator already booted: ${name}" >&2
  fi
  printf '%s\n' "$udid"
}

android_avd_exists() {
  local name="$1"
  if [[ -x "$EMULATOR_BIN" ]]; then
    "$EMULATOR_BIN" -list-avds 2>/dev/null | grep -Fx "$name" >/dev/null 2>&1
  else
    [[ -d "${AVD_HOME}/${name}.avd" ]]
  fi
}

tune_android_avd_config() {
  local name="$1"
  local config="${AVD_HOME}/${name}.avd/config.ini"
  [[ -f "$config" ]] || die "AVD config missing: ${config}"
  python3 - "$config" "$name" "$ANDROID_AVD_RAM_MB" "$ANDROID_AVD_CPU_CORES" "$ANDROID_AVD_HEAP_MB" "$ANDROID_AVD_GPU_MODE" <<'PY'
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
avd_name = sys.argv[2]
ram_mb, cpu_cores, heap_mb, gpu_mode = sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6]
updates = {
  'AvdId': avd_name,
  'avd.ini.displayname': avd_name,
  'hw.ramSize': ram_mb,
  'hw.cpu.ncore': cpu_cores,
  'vm.heapSize': heap_mb,
  'hw.gpu.enabled': 'yes',
  'hw.gpu.mode': gpu_mode,
  'runtime.network.latency': 'none',
  'runtime.network.speed': 'full',
  'fastboot.forceFastBoot': 'yes',
  'fastboot.forceColdBoot': 'no',
}
seen = set()
lines = []
for raw in path.read_text().splitlines():
  if '=' not in raw:
    lines.append(raw)
    continue
  key, _, _rest = raw.partition('=')
  key_stripped = key.strip()
  if key_stripped in updates:
    sep = ' = ' if ' = ' in raw else '='
    lines.append(f'{key_stripped}{sep}{updates[key_stripped]}')
    seen.add(key_stripped)
  else:
    lines.append(raw)
for key, value in updates.items():
  if key not in seen:
    lines.append(f'{key} = {value}')
path.write_text('\n'.join(lines) + '\n')
PY
  echo "Tuned Android AVD ${name}: ram=${ANDROID_AVD_RAM_MB}MB cores=${ANDROID_AVD_CPU_CORES} gpu=${ANDROID_AVD_GPU_MODE} heap=${ANDROID_AVD_HEAP_MB}MB" >&2
}

clone_android_avd() {
  local src="$1"
  local dest="$2"
  local src_avd="${AVD_HOME}/${src}.avd"
  local src_ini="${AVD_HOME}/${src}.ini"
  local dest_avd="${AVD_HOME}/${dest}.avd"
  local dest_ini="${AVD_HOME}/${dest}.ini"
  [[ -d "$src_avd" && -f "$src_ini" ]] || die "Manual AVD missing (${src}). Create ${MANUAL_ANDROID_AVD} in Android Studio first."
  echo "Cloning Android AVD ${src} -> ${dest}" >&2
  mkdir -p "$AVD_HOME"
  rm -rf "$dest_avd" "$dest_ini"
  cp -R "$src_avd" "$dest_avd"
  {
    echo "avd.ini.encoding=UTF-8"
    echo "path=${dest_avd}"
    echo "path.rel=avd/${dest}.avd"
    echo "target=$(grep -E '^target=' "$src_ini" | head -n1 | cut -d= -f2-)"
  } >"$dest_ini"
  if [[ -f "${dest_avd}/config.ini" ]]; then
    python3 - "$dest_avd/config.ini" "$dest" <<'PY'
import pathlib, sys
path = pathlib.Path(sys.argv[1])
name = sys.argv[2]
text = path.read_text()
lines = []
for line in text.splitlines():
  stripped = line.replace(' ', '')
  if stripped.startswith('AvdId='):
    sep = ' = ' if ' = ' in line else '='
    lines.append(f'AvdId{sep}{name}')
  elif stripped.startswith('avd.ini.displayname='):
    sep = ' = ' if ' = ' in line else '='
    lines.append(f'avd.ini.displayname{sep}{name}')
  else:
    lines.append(line)
path.write_text('\n'.join(lines) + '\n')
PY
  fi
  tune_android_avd_config "$dest"
}

ensure_android_avd() {
  local name="$1"
  if android_avd_exists "$name"; then
    tune_android_avd_config "$name"
    return 0
  fi
  if [[ "$name" == "$E2E_ANDROID_AVD" ]]; then
    android_avd_exists "$MANUAL_ANDROID_AVD" || die "Manual AVD ${MANUAL_ANDROID_AVD} not found; create it before E2E clone."
    # Clone from a tuned manual AVD so E2E inherits the same performance profile.
    tune_android_avd_config "$MANUAL_ANDROID_AVD"
    clone_android_avd "$MANUAL_ANDROID_AVD" "$E2E_ANDROID_AVD"
    return 0
  fi
  die "Android AVD missing: ${name}. Create it in Android Studio (phone AVD, API 33, arm64-v8a)."
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
  done < <("$ADB_BIN" devices 2>/dev/null | awk '/\tdevice$/{print $1}')
  return 1
}

boot_android_avd() {
  local name="$1"
  ensure_android_avd "$name"
  [[ -x "$EMULATOR_BIN" ]] || die "Android emulator binary not found at ${EMULATOR_BIN}"
  [[ -x "$ADB_BIN" ]] || die "adb not found at ${ADB_BIN}"
  local serial
  if serial="$(android_serial_for_avd "$name")"; then
    echo "Android AVD already running: ${name} (${serial})" >&2
    printf '%s\n' "$serial"
    return 0
  fi
  echo "Starting Android AVD: ${name} (${ANDROID_EMULATOR_EXTRA_FLAGS[*]})" >&2
  nohup "$EMULATOR_BIN" -avd "$name" "${ANDROID_EMULATOR_EXTRA_FLAGS[@]}" \
    >/tmp/podverse-emulator-"${name}".log 2>&1 &
  local waited=0
  while (( waited < 180 )); do
    if serial="$(android_serial_for_avd "$name")"; then
      "$ADB_BIN" -s "$serial" wait-for-device
      # Wait until boot completed
      local boot=''
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

app_installed_ios() {
  local udid="$1"
  xcrun simctl listapps "$udid" 2>/dev/null | grep -F "\"${APP_ID}\"" >/dev/null 2>&1
}

app_installed_android() {
  local serial="$1"
  "$ADB_BIN" -s "$serial" shell pm path "$APP_ID" 2>/dev/null | grep -F 'package:' >/dev/null 2>&1
}

MODE="${1:-}"
case "$MODE" in
  print-matrix)
    print_matrix
    ;;
  e2e-ios)
    boot_ios_sim "$E2E_IOS_NAME" >/dev/null
    echo "E2E iOS ready: ${E2E_IOS_NAME}"
    ;;
  e2e-android)
    if [[ ! -x "$EMULATOR_BIN" ]]; then
      die "Android emulator not found at ${EMULATOR_BIN}"
    fi
    boot_android_avd "$E2E_ANDROID_AVD" >/dev/null
    echo "E2E Android ready: ${E2E_ANDROID_AVD}"
    ;;
  e2e)
    print_matrix
    if [[ "$(uname -s)" == "Darwin" ]]; then
      boot_ios_sim "$E2E_IOS_NAME" >/dev/null
    else
      echo "Skipping iOS E2E boot (not Darwin)."
    fi
    if [[ -x "$EMULATOR_BIN" ]]; then
      boot_android_avd "$E2E_ANDROID_AVD" >/dev/null
    else
      echo "Warning: Android emulator not found at ${EMULATOR_BIN}; skipping E2E Android boot."
    fi
    echo "E2E devices ready."
    ;;
  manual-ios)
    boot_ios_sim "$MANUAL_IOS_NAME" >/dev/null
    ;;
  manual-android)
    boot_android_avd "$MANUAL_ANDROID_AVD" >/dev/null
    ;;
  tune-android)
    # Re-apply performance profile to manual + E2E AVDs without booting.
    # Restart any running emulator afterward for RAM/CPU/GPU changes to take effect.
    android_avd_exists "$MANUAL_ANDROID_AVD" || die "Manual AVD ${MANUAL_ANDROID_AVD} not found."
    tune_android_avd_config "$MANUAL_ANDROID_AVD"
    if android_avd_exists "$E2E_ANDROID_AVD"; then
      tune_android_avd_config "$E2E_ANDROID_AVD"
    else
      echo "E2E AVD ${E2E_ANDROID_AVD} missing; will be cloned+tuned on next e2e-android boot." >&2
    fi
    echo "Android AVD tune complete. Quit and re-launch the emulator to apply RAM/CPU/GPU."
    ;;
  resolve-e2e-ios-udid)
    ensure_ios_sim "$E2E_IOS_NAME"
    ios_udid_by_name "$E2E_IOS_NAME"
    ;;
  resolve-e2e-android-serial)
    if [[ ! -x "$EMULATOR_BIN" ]]; then
      die "Android emulator not found at ${EMULATOR_BIN}"
    fi
    boot_android_avd "$E2E_ANDROID_AVD"
    ;;
  check-e2e-app-ios)
    udid="$(ios_udid_by_name "$E2E_IOS_NAME")" || die "E2E iOS sim missing"
    if app_installed_ios "$udid"; then
      echo "installed"
    else
      echo "missing"
      exit 2
    fi
    ;;
  check-e2e-app-android)
    serial="$(android_serial_for_avd "$E2E_ANDROID_AVD")" || die "E2E Android not running"
    if app_installed_android "$serial"; then
      echo "installed"
    else
      echo "missing"
      exit 2
    fi
    ;;
  *)
    cat <<EOF >&2
Usage: bash scripts/mobile/ensure-devices.sh <command>
  print-matrix | e2e | e2e-ios | e2e-android | manual-ios | manual-android
  tune-android
  resolve-e2e-ios-udid | resolve-e2e-android-serial
  check-e2e-app-ios | check-e2e-app-android
EOF
    exit 1
    ;;
esac
