#!/usr/bin/env bash
# Create/boot Podverse mobile simulators/emulators for manual vs E2E slots.
# Usage (from monorepo root):
#   bash scripts/mobile/ensure-devices.sh print-matrix
#   bash scripts/mobile/ensure-devices.sh e2e
#   bash scripts/mobile/ensure-devices.sh manual-ios
#   bash scripts/mobile/ensure-devices.sh manual-android
#   bash scripts/mobile/ensure-devices.sh resolve-e2e-ios-udid
#   bash scripts/mobile/ensure-devices.sh resolve-e2e-android-serial
#   bash scripts/mobile/ensure-devices.sh recover-e2e-android
#   bash scripts/mobile/ensure-devices.sh recover-e2e-ios

set -euo pipefail

MANUAL_IOS_NAME='iPhone 17 Pro'
MANUAL_ANDROID_AVD='Pixel_6_Pro_API_33'
E2E_IOS_NAME='iPhone 17 Pro E2E'
E2E_ANDROID_AVD='Pixel_6_Pro_API_33_e2e'
# Opt-in tablet E2E slots (not used by default phone matrix / mobile:e2e:test:all).
MANUAL_IOS_TABLET_NAME='iPad Pro 13-inch (M4)'
E2E_IOS_TABLET_NAME='iPad Pro 13-inch (M4) E2E'
E2E_ANDROID_TABLET_AVD='Pixel_Tablet_API_33_e2e'
APP_ID='com.podverse.app.next'

ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
EMULATOR_BIN="${ANDROID_HOME}/emulator/emulator"
ADB_BIN="${ANDROID_HOME}/platform-tools/adb"
AVD_HOME="${ANDROID_AVD_HOME:-$HOME/.android/avd}"

# Metro is bridged into the emulator so the Expo Dev Client discovers http://localhost:8081 and
# connects with the single tap iOS already uses. Without the bridge the launcher lists no server
# and every flow types the 10.0.2.2 URL by hand — inputText is the most expensive command Maestro
# has on Android, and clearState makes each flow pay it again.
ANDROID_METRO_PORT="${MOBILE_METRO_PORT:-8081}"

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
  Manual iOS:           ${MANUAL_IOS_NAME}
  Manual Android:       ${MANUAL_ANDROID_AVD}
  E2E iOS phone:        ${E2E_IOS_NAME}
  E2E Android phone:    ${E2E_ANDROID_AVD}
  Manual iOS tablet:    ${MANUAL_IOS_TABLET_NAME} (optional)
  E2E iOS tablet:       ${E2E_IOS_TABLET_NAME} (opt-in)
  E2E Android tablet:   ${E2E_ANDROID_TABLET_AVD} (opt-in)
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

ios_device_type_and_runtime_from_name() {
  local source_name="$1"
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
' "$source_name"
}

ios_device_type_and_runtime_from_manual() {
  ios_device_type_and_runtime_from_name "$MANUAL_IOS_NAME"
}

# Prefer a matching manual iPad; otherwise pick an available iPad Pro device type + runtime.
ios_tablet_device_type_and_runtime() {
  if ios_udid_by_name "$MANUAL_IOS_TABLET_NAME" >/dev/null 2>&1; then
    ios_device_type_and_runtime_from_name "$MANUAL_IOS_TABLET_NAME"
    return 0
  fi
  xcrun simctl list -j 2>/dev/null \
    | python3 -c '
import json, sys
data = json.load(sys.stdin)
runtimes = [
  r["identifier"]
  for r in data.get("runtimes", [])
  if r.get("isAvailable", True) and "iOS" in r.get("name", "")
]
if not runtimes:
  raise SystemExit(1)
# Prefer larger iPad Pro identifiers when present.
preferred_substrings = (
  "iPad-Pro-13-inch",
  "iPad-Pro-12-9",
  "iPad-Pro-11",
  "iPad-Air",
  "iPad",
)
types = data.get("devicetypes", [])
chosen = None
for needle in preferred_substrings:
  for dt in types:
    ident = dt.get("identifier", "")
    if needle in ident:
      chosen = ident
      break
  if chosen is not None:
    break
if chosen is None:
  raise SystemExit(1)
print(chosen)
print(runtimes[0])
'
}

ensure_ios_sim() {
  local name="$1"
  local source_name="${2:-$MANUAL_IOS_NAME}"
  if ios_udid_by_name "$name" >/dev/null 2>&1; then
    return 0
  fi
  if [[ "$(uname -s)" != "Darwin" ]]; then
    die "iOS simulator create requires macOS (wanted: ${name})"
  fi
  local device_type runtime meta
  if [[ "$name" == "$E2E_IOS_TABLET_NAME" || "$name" == "$MANUAL_IOS_TABLET_NAME" ]]; then
    meta="$(ios_tablet_device_type_and_runtime)" || die "Could not resolve an iPad device type/runtime for ${name}"
  else
    if ! ios_udid_by_name "$source_name" >/dev/null 2>&1; then
      die "Manual simulator \"${source_name}\" not found. Create it in Xcode first, then re-run."
    fi
    meta="$(ios_device_type_and_runtime_from_name "$source_name")"
  fi
  device_type="$(printf '%s\n' "$meta" | sed -n '1p')"
  runtime="$(printf '%s\n' "$meta" | sed -n '2p')"
  [[ -n "$device_type" && -n "$runtime" ]] || die "Could not resolve device type/runtime for \"${name}\""
  echo "Creating iOS simulator: ${name} (${device_type})" >&2
  xcrun simctl create "$name" "$device_type" "$runtime" >/dev/null
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

boot_ios_sim() {
  local name="$1"
  ensure_ios_sim "$name"
  local udid
  udid="$(ios_udid_by_name "$name")" || die "Simulator not found after create: ${name}"
  local state
  state="$(ios_state_for_udid "$udid")"
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

# Hand a wedged E2E simulator back booted and free of the previous run's driver. Only ever used on
# E2E simulators, whose state is disposable — the app stays installed and the caller re-runs the
# flows that never got a result.
#
# The usual iOS wedge is not the simulator itself but Maestro's XCTest runner: a killed run leaves
# the runner attached, and the next invocation blocks forever trying to acquire a device something
# else already owns. So the runner goes first, then the simulator.
recover_ios_device() {
  local name="$1"
  local udid pid waited
  [[ "$(uname -s)" == "Darwin" ]] || die "iOS recovery requires macOS"
  udid="$(ios_udid_by_name "$name")" || die "iOS simulator ${name} not found; nothing to recover."

  echo "Recovering iOS E2E simulator ${name} (${udid})..." >&2

  for pid in $(pgrep -f 'maestro-driver-ios' 2>/dev/null || true); do
    kill -TERM "$pid" 2>/dev/null || true
  done
  sleep 2
  for pid in $(pgrep -f 'maestro-driver-ios' 2>/dev/null || true); do
    kill -KILL "$pid" 2>/dev/null || true
  done

  xcrun simctl terminate "$udid" "$APP_ID" >/dev/null 2>&1 || true
  xcrun simctl shutdown "$udid" >/dev/null 2>&1 || true

  waited=0
  while ((waited < 60)); do
    [[ "$(ios_state_for_udid "$udid")" == "Shutdown" ]] && break
    sleep 2
    waited=$((waited + 2))
  done

  xcrun simctl boot "$udid" >/dev/null 2>&1 || true
  open -a Simulator >/dev/null 2>&1 || true
  if ! xcrun simctl bootstatus "$udid" -b >/dev/null 2>&1; then
    echo "Error: ${name} did not finish booting after recovery." >&2
    echo "CoreSimulator itself may be wedged. Quit Simulator.app, then:" >&2
    echo "  killall -9 com.apple.CoreSimulator.CoreSimulatorService" >&2
    echo "That restarts every simulator on the host, including manual ones." >&2
    exit 1
  fi
  # SpringBoard keeps launching services after bootstatus returns. Handing the simulator to Maestro
  # inside that window is how the next invocation inherits the same acquisition hang.
  sleep 5
  echo "iOS E2E simulator ${name} recovered (${udid})." >&2
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

# After cloning a phone AVD for the tablet E2E slot, widen the LCD so portrait width ≥ md
# and landscape (or wide portrait) can hit the split-detail threshold (≥ lg dp).
tune_android_tablet_avd_display() {
  local name="$1"
  local config="${AVD_HOME}/${name}.avd/config.ini"
  [[ -f "$config" ]] || die "AVD config missing: ${config}"
  python3 - "$config" <<'PY'
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
# ~900+ dp portrait at density 320 (1800 / (320/160) = 900).
updates = {
  'hw.lcd.density': '320',
  'hw.lcd.width': '1800',
  'hw.lcd.height': '2880',
  'skin.name': '1800x2880',
  'skin.path': '_no_skin',
  'showDeviceFrame': 'no',
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
  echo "Tuned Android tablet AVD ${name}: lcd=1800x2880 density=320" >&2
}

ensure_android_avd() {
  local name="$1"
  if android_avd_exists "$name"; then
    tune_android_avd_config "$name"
    if [[ "$name" == "$E2E_ANDROID_TABLET_AVD" ]]; then
      tune_android_tablet_avd_display "$name"
    fi
    return 0
  fi
  if [[ "$name" == "$E2E_ANDROID_AVD" ]]; then
    android_avd_exists "$MANUAL_ANDROID_AVD" || die "Manual AVD ${MANUAL_ANDROID_AVD} not found; create it before E2E clone."
    # Clone from a tuned manual AVD so E2E inherits the same performance profile.
    tune_android_avd_config "$MANUAL_ANDROID_AVD"
    clone_android_avd "$MANUAL_ANDROID_AVD" "$E2E_ANDROID_AVD"
    return 0
  fi
  if [[ "$name" == "$E2E_ANDROID_TABLET_AVD" ]]; then
    android_avd_exists "$MANUAL_ANDROID_AVD" || die "Manual AVD ${MANUAL_ANDROID_AVD} not found; create it before tablet E2E clone."
    tune_android_avd_config "$MANUAL_ANDROID_AVD"
    clone_android_avd "$MANUAL_ANDROID_AVD" "$E2E_ANDROID_TABLET_AVD"
    tune_android_tablet_avd_display "$E2E_ANDROID_TABLET_AVD"
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

# Emulator animations make every UiAutomator action wait for its transition to settle, which is the
# dominant per-command cost of a Maestro run. Zeroing the scales is idempotent and persists until
# the AVD's data partition is wiped, so it is re-applied on every boot.
tune_android_runtime_settings() {
  local serial="$1"
  local scale
  for scale in window_animation_scale transition_animation_scale animator_duration_scale; do
    "$ADB_BIN" -s "$serial" shell settings put global "$scale" 0 >/dev/null 2>&1 || true
  done
}

# Reverse-forward the host's Metro port into the guest. Reverse mappings live in the adb daemon's
# per-device connection, so this is re-applied on every boot and after any reboot.
ensure_android_host_bridges() {
  local serial="$1"
  if ! "$ADB_BIN" -s "$serial" reverse "tcp:${ANDROID_METRO_PORT}" "tcp:${ANDROID_METRO_PORT}" >/dev/null 2>&1; then
    echo "Warning: adb reverse tcp:${ANDROID_METRO_PORT} failed on ${serial}; Dev Client will fall back to manual URL entry." >&2
  fi
}

# Reboot a wedged emulator and hand it back ready to drive. Only ever used on E2E AVDs, whose
# state is disposable — the app stays installed, and the flow that hit the wedge is re-run by the
# caller.
recover_android_device() {
  local avd="$1"
  local serial waited boot
  serial="$(android_serial_for_avd "$avd")" || die "Android AVD ${avd} is not running; nothing to recover."

  echo "Rebooting Android E2E emulator ${avd} (${serial})..." >&2
  "$ADB_BIN" -s "$serial" reboot >/dev/null 2>&1 || true
  sleep 5
  "$ADB_BIN" -s "$serial" wait-for-device >/dev/null 2>&1 || true

  waited=0
  while ((waited < 240)); do
    boot="$("$ADB_BIN" -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
    if [[ "$boot" == "1" ]]; then
      # system_server keeps starting components after boot_completed; handing the device to
      # Maestro during that window is how the next flow inherits the same unresponsive UI.
      sleep 10
      tune_android_runtime_settings "$serial"
      ensure_android_host_bridges "$serial"
      echo "Android E2E emulator ${avd} recovered (${serial})." >&2
      printf '%s\n' "$serial"
      return 0
    fi
    sleep 3
    waited=$((waited + 3))
  done

  die "Timed out waiting for ${avd} to finish rebooting."
}

boot_android_avd() {
  local name="$1"
  ensure_android_avd "$name"
  [[ -x "$EMULATOR_BIN" ]] || die "Android emulator binary not found at ${EMULATOR_BIN}"
  [[ -x "$ADB_BIN" ]] || die "adb not found at ${ADB_BIN}"
  local serial
  if serial="$(android_serial_for_avd "$name")"; then
    echo "Android AVD already running: ${name} (${serial})" >&2
    tune_android_runtime_settings "$serial"
    ensure_android_host_bridges "$serial"
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
        tune_android_runtime_settings "$serial"
        ensure_android_host_bridges "$serial"
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
  recover-e2e-android)
    recover_android_device "$E2E_ANDROID_AVD"
    ;;
  recover-e2e-android-tablet)
    recover_android_device "$E2E_ANDROID_TABLET_AVD"
    ;;
  recover-e2e-ios)
    recover_ios_device "$E2E_IOS_NAME"
    ;;
  recover-e2e-ios-tablet)
    recover_ios_device "$E2E_IOS_TABLET_NAME"
    ;;
  e2e-ios-tablet)
    boot_ios_sim "$E2E_IOS_TABLET_NAME" >/dev/null
    echo "E2E iOS tablet ready: ${E2E_IOS_TABLET_NAME}"
    ;;
  e2e-android-tablet)
    if [[ ! -x "$EMULATOR_BIN" ]]; then
      die "Android emulator not found at ${EMULATOR_BIN}"
    fi
    boot_android_avd "$E2E_ANDROID_TABLET_AVD" >/dev/null
    echo "E2E Android tablet ready: ${E2E_ANDROID_TABLET_AVD}"
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
    echo "E2E phone devices ready."
    ;;
  e2e-tablet)
    print_matrix
    if [[ "$(uname -s)" == "Darwin" ]]; then
      boot_ios_sim "$E2E_IOS_TABLET_NAME" >/dev/null
    else
      echo "Skipping iOS tablet E2E boot (not Darwin)."
    fi
    if [[ -x "$EMULATOR_BIN" ]]; then
      boot_android_avd "$E2E_ANDROID_TABLET_AVD" >/dev/null
    else
      echo "Warning: Android emulator not found at ${EMULATOR_BIN}; skipping E2E Android tablet boot."
    fi
    echo "E2E tablet devices ready."
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
    if android_avd_exists "$E2E_ANDROID_TABLET_AVD"; then
      tune_android_avd_config "$E2E_ANDROID_TABLET_AVD"
      tune_android_tablet_avd_display "$E2E_ANDROID_TABLET_AVD"
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
  resolve-e2e-ios-tablet-udid)
    ensure_ios_sim "$E2E_IOS_TABLET_NAME"
    ios_udid_by_name "$E2E_IOS_TABLET_NAME"
    ;;
  resolve-e2e-android-tablet-serial)
    if [[ ! -x "$EMULATOR_BIN" ]]; then
      die "Android emulator not found at ${EMULATOR_BIN}"
    fi
    boot_android_avd "$E2E_ANDROID_TABLET_AVD"
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
  check-e2e-app-ios-tablet)
    udid="$(ios_udid_by_name "$E2E_IOS_TABLET_NAME")" || die "E2E iOS tablet sim missing"
    if app_installed_ios "$udid"; then
      echo "installed"
    else
      echo "missing"
      exit 2
    fi
    ;;
  check-e2e-app-android-tablet)
    serial="$(android_serial_for_avd "$E2E_ANDROID_TABLET_AVD")" || die "E2E Android tablet not running"
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
  print-matrix | e2e | e2e-ios | e2e-android | e2e-tablet | e2e-ios-tablet | e2e-android-tablet
  manual-ios | manual-android | tune-android
  recover-e2e-ios | recover-e2e-android | recover-e2e-ios-tablet | recover-e2e-android-tablet
  resolve-e2e-ios-udid | resolve-e2e-android-serial
  resolve-e2e-ios-tablet-udid | resolve-e2e-android-tablet-serial
  check-e2e-app-ios | check-e2e-app-android
  check-e2e-app-ios-tablet | check-e2e-app-android-tablet
EOF
    exit 1
    ;;
esac
