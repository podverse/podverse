#!/usr/bin/env bash
# Install/launch Podverse Next on an E2E device slot (no Metro bundler).
# Usage (monorepo root):
#   bash scripts/mobile/e2e-device.sh ios
#   bash scripts/mobile/e2e-device.sh android

set -euo pipefail

PLATFORM="${1:-}"
if [[ "$PLATFORM" != "ios" && "$PLATFORM" != "android" ]]; then
  echo "Usage: bash scripts/mobile/e2e-device.sh <ios|android>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

E2E_IOS_NAME='iPhone 17 Pro E2E'
E2E_ANDROID_AVD='Pixel_6_Pro_API_33_e2e'

if [[ "$PLATFORM" == "ios" ]]; then
  bash "$SCRIPT_DIR/ensure-devices.sh" e2e-ios
  echo "=== E2E iOS install/launch (${E2E_IOS_NAME}, --no-bundler) ==="
  echo "Ensure Metro is running in another terminal: npm run mobile:dev"
  exec bash "$SCRIPT_DIR/run-expo-macos.sh" ios --device "$E2E_IOS_NAME" --no-bundler
fi

bash "$SCRIPT_DIR/ensure-devices.sh" e2e-android
echo "=== E2E Android install/launch (${E2E_ANDROID_AVD}, --no-bundler) ==="
echo "Ensure Metro is running in another terminal: npm run mobile:dev"
exec bash "$SCRIPT_DIR/run-expo-macos.sh" android --device "$E2E_ANDROID_AVD" --no-bundler
