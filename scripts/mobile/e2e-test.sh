#!/usr/bin/env bash
# Run Maestro on E2E iOS + Android and write HTML screenshot reports.
# Prerequisites (separate terminals): npm run mobile:dev, mobile:e2e:ios, mobile:e2e:android
# Usage (monorepo root):
#   bash scripts/mobile/e2e-test.sh
#   bash scripts/mobile/e2e-test.sh hello-world
#   bash scripts/mobile/e2e-test.sh hello-world,locale-switch-home-smoke

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

E2E_IOS_NAME='iPhone 17 Pro E2E'
E2E_ANDROID_AVD='Pixel_6_Pro_API_33_e2e'
MOBILE_METRO_PORT="${MOBILE_METRO_PORT:-8081}"
DEFAULT_SPEC='hello-world'

SPEC_RAW="${1:-$DEFAULT_SPEC}"
TS="$(date +%Y%m%d-%H%M%S)"
REPORT_DIR="$REPO_ROOT/.artifacts/mobile-e2e-reports/$TS"
# One Maestro output dir per OS + form-factor slot (phone today; tablet slots reserved).
IOS_PHONE_DIR="$REPORT_DIR/ios-phone"
ANDROID_PHONE_DIR="$REPORT_DIR/android-phone"
LATEST_LINK="$REPO_ROOT/.artifacts/mobile-e2e-reports/latest"

if ! command -v maestro >/dev/null 2>&1; then
  echo "Maestro CLI is not installed or not on PATH." >&2
  echo "Install via the repo flake (maestro) or https://docs.maestro.dev/getting-started/installing-maestro" >&2
  exit 1
fi

if ! lsof -nP -iTCP:"$MOBILE_METRO_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Error: Metro is not listening on port ${MOBILE_METRO_PORT}." >&2
  echo "Start it in another terminal: npm run mobile:dev" >&2
  exit 1
fi

FLOWS=()
SPEC_LIST="${SPEC_RAW//,/ }"
for spec in $SPEC_LIST; do
  FLOW_PATH="apps/mobile/e2e/${spec}.yaml"
  if [[ ! -f "$FLOW_PATH" ]]; then
    echo "Missing mobile E2E flow: $FLOW_PATH" >&2
    echo "Expected values map to apps/mobile/e2e/<area>.yaml" >&2
    exit 1
  fi
  FLOWS+=("$FLOW_PATH")
done

mkdir -p "$IOS_PHONE_DIR" "$ANDROID_PHONE_DIR"
rm -f "$LATEST_LINK"
ln -sfn "$TS" "$LATEST_LINK"

echo "=== Mobile E2E report run ==="
echo "Flows: ${FLOWS[*]}"
echo "Report dir: $REPORT_DIR"
echo "Booting E2E devices (no install)..."
bash "$SCRIPT_DIR/ensure-devices.sh" e2e

IOS_UDID=""
ANDROID_SERIAL=""
if [[ "$(uname -s)" == "Darwin" ]]; then
  IOS_UDID="$(bash "$SCRIPT_DIR/ensure-devices.sh" resolve-e2e-ios-udid)"
  echo "E2E iOS UDID: $IOS_UDID"
  if ! bash "$SCRIPT_DIR/ensure-devices.sh" check-e2e-app-ios >/dev/null 2>&1; then
    echo "Error: app not installed on E2E iOS (${E2E_IOS_NAME})." >&2
    echo "In another terminal: npm run mobile:e2e:ios" >&2
    exit 1
  fi
fi

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

EXIT_CODE=0
RAN_ANY=0

if [[ -n "$IOS_UDID" ]]; then
  RAN_ANY=1
  echo "--- Maestro iOS phone (${E2E_IOS_NAME}) → ios-phone/ ---"
  if ! maestro --device "$IOS_UDID" test --format=HTML --output "$IOS_PHONE_DIR/maestro.html" --test-output-dir "$IOS_PHONE_DIR" "${FLOWS[@]}"; then
    EXIT_CODE=1
  fi
fi

if [[ -n "$ANDROID_SERIAL" ]]; then
  RAN_ANY=1
  echo "--- Maestro Android phone (${E2E_ANDROID_AVD}) → android-phone/ ---"
  if ! maestro --device "$ANDROID_SERIAL" test --format=HTML --output "$ANDROID_PHONE_DIR/maestro.html" --test-output-dir "$ANDROID_PHONE_DIR" "${FLOWS[@]}"; then
    EXIT_CODE=1
  fi
fi

if [[ "$RAN_ANY" -eq 0 ]]; then
  echo "Error: no E2E devices available for Maestro." >&2
  exit 1
fi

node "$SCRIPT_DIR/e2e-html-report.mjs" "$REPORT_DIR"
echo "Mobile E2E hub: $REPORT_DIR/index.html"
echo "  iOS phone:     $REPORT_DIR/ios-phone/index.html"
echo "  Android phone: $REPORT_DIR/android-phone/index.html"
echo "Latest symlink: $LATEST_LINK"

if command -v open >/dev/null 2>&1; then
  [[ -f "$REPORT_DIR/index.html" ]] && open "$REPORT_DIR/index.html" 2>/dev/null || true
elif command -v xdg-open >/dev/null 2>&1; then
  [[ -f "$REPORT_DIR/index.html" ]] && xdg-open "$REPORT_DIR/index.html" >/dev/null 2>&1 || true
fi

if [[ "$EXIT_CODE" -ne 0 ]]; then
  echo ""
  echo "Mobile E2E failed. Hints:"
  echo "  - Read slot reports (screenshots + error text):"
  echo "      open $REPORT_DIR/ios-phone/index.html"
  echo "      open $REPORT_DIR/android-phone/index.html"
  echo "  - Metro: npm run mobile:dev"
  echo "  - Install E2E iOS: npm run mobile:e2e:ios"
  echo "  - Install E2E Android: npm run mobile:e2e:android"
  exit 1
fi
