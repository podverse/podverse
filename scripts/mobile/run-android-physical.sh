#!/usr/bin/env bash
# Install/run the mobile app on the connected USB Android phone (not an emulator).
# Resolves a single physical adb device (skips emulator-*), then passes Expo the product
# *model* name (Expo --device does not match adb serials). Metro is never started here —
# run-expo-macos.sh always adds --no-bundler; keep npm run mobile:dev in Mobile Metro.
#
# Usage (from repo root):
#   bash scripts/mobile/run-android-physical.sh
#   npm run mobile:android:device
# Override: MOBILE_ANDROID_DEVICE=<serial> npm run mobile:android:device

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
ADB_BIN="${ANDROID_HOME}/platform-tools/adb"
if [[ ! -x "$ADB_BIN" ]]; then
  if command -v adb >/dev/null 2>&1; then
    ADB_BIN="$(command -v adb)"
  else
    echo "Error: adb not found at ${ANDROID_HOME}/platform-tools/adb (set ANDROID_HOME or install platform-tools)." >&2
    exit 1
  fi
fi

resolve_serial() {
  if [[ -n "${MOBILE_ANDROID_DEVICE:-}" ]]; then
    echo "$MOBILE_ANDROID_DEVICE"
    return 0
  fi

  # Columns: serial  state  … — only authorized devices in "device" state.
  local -a serials=()
  local serial state
  while read -r serial state _; do
    [[ -z "${serial:-}" || "$serial" == "List" ]] && continue
    [[ "$state" != "device" ]] && continue
    # Emulators use serials like emulator-5554; USB phones use hardware ids.
    [[ "$serial" == emulator-* ]] && continue
    serials+=("$serial")
  done < <("$ADB_BIN" devices | tail -n +2)

  if [[ ${#serials[@]} -eq 0 ]]; then
    echo "Error: no physical Android device in 'device' state." >&2
    echo "Plug in a phone, enable USB debugging, accept the RSA prompt, then: adb devices" >&2
    echo "(Emulators are ignored — use npm run mobile:android for Pixel_6_Pro_API_33.)" >&2
    exit 1
  fi
  if [[ ${#serials[@]} -gt 1 ]]; then
    echo "Error: multiple physical Android devices connected:" >&2
    printf '  %s\n' "${serials[@]}" >&2
    echo "Disconnect extras, or set MOBILE_ANDROID_DEVICE=<serial>, or:" >&2
    echo "  npm run mobile:android -- --device \"\$(adb -s <serial> shell getprop ro.product.model)\"" >&2
    exit 1
  fi
  echo "${serials[0]}"
}

SERIAL="$(resolve_serial)"
# Expo CLI matches --device against `adb devices -l` model: (e.g. Pixel_4a), NOT
# `getprop ro.product.model` (Pixel 4a with spaces) and NOT the adb serial.
MODEL="$(
  "$ADB_BIN" devices -l \
    | awk -v serial="$SERIAL" '$1 == serial {
        for (i = 1; i <= NF; i++) {
          if ($i ~ /^model:/) {
            sub(/^model:/, "", $i)
            print $i
            exit
          }
        }
      }'
)"
if [[ -z "$MODEL" ]]; then
  echo "Error: could not parse model: from adb devices -l for ${SERIAL}." >&2
  "$ADB_BIN" devices -l >&2
  exit 1
fi
echo "==> mobile:android:device → ${SERIAL} (${MODEL})"
echo "==> Tip: Metro for a USB phone must use LAN API host — Mobile Metro: npm run mobile:dev:device"
echo "    (plain npm run mobile:dev keeps emulator 10.0.2.2 and will Network Error on device)"
exec bash "$SCRIPT_DIR/run-expo-macos.sh" android --device "$MODEL" "$@"
