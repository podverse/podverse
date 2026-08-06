#!/usr/bin/env bash
# Install/launch Podverse Next on an E2E device slot (no Metro bundler).
# Usage (monorepo root):
#   bash scripts/mobile/e2e-device.sh ios
#   bash scripts/mobile/e2e-device.sh android
#   bash scripts/mobile/e2e-device.sh ios-tablet
#   bash scripts/mobile/e2e-device.sh android-tablet

set -euo pipefail

PLATFORM="${1:-}"
if [[ "$PLATFORM" != "ios" && "$PLATFORM" != "android" && \
      "$PLATFORM" != "ios-tablet" && "$PLATFORM" != "android-tablet" ]]; then
  echo "Usage: bash scripts/mobile/e2e-device.sh <ios|android|ios-tablet|android-tablet>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

E2E_IOS_NAME='iPhone 17 Pro E2E'
E2E_ANDROID_AVD='Pixel_6_Pro_API_33_e2e'
E2E_IOS_TABLET_NAME='iPad Pro 13-inch (M4) E2E'
E2E_ANDROID_TABLET_AVD='Pixel_Tablet_API_33_e2e'

if [[ "$PLATFORM" == "ios" ]]; then
  bash "$SCRIPT_DIR/ensure-devices.sh" e2e-ios
  echo "=== E2E iOS install/launch (${E2E_IOS_NAME}, --no-bundler) ==="
  echo "Ensure Metro is running in another terminal: npm run mobile:dev"
  exec bash "$SCRIPT_DIR/run-expo-macos.sh" ios --device "$E2E_IOS_NAME" --no-bundler
fi

if [[ "$PLATFORM" == "ios-tablet" ]]; then
  bash "$SCRIPT_DIR/ensure-devices.sh" e2e-ios-tablet
  echo "=== E2E iOS tablet install/launch (${E2E_IOS_TABLET_NAME}, --no-bundler) ==="
  echo "Ensure Metro is running in another terminal: npm run mobile:dev:e2e"
  exec bash "$SCRIPT_DIR/run-expo-macos.sh" ios --device "$E2E_IOS_TABLET_NAME" --no-bundler
fi

if [[ "$PLATFORM" == "android-tablet" ]]; then
  bash "$SCRIPT_DIR/ensure-devices.sh" e2e-android-tablet
  echo "=== E2E Android tablet install/launch (${E2E_ANDROID_TABLET_AVD}, --no-bundler) ==="
  echo "Ensure Metro is running in another terminal: npm run mobile:dev:e2e"
  exec bash "$SCRIPT_DIR/run-expo-macos.sh" android --device "$E2E_ANDROID_TABLET_AVD" --no-bundler
fi

bash "$SCRIPT_DIR/ensure-devices.sh" e2e-android
echo "=== E2E Android install/launch (${E2E_ANDROID_AVD}, --no-bundler) ==="
echo "Ensure Metro is running in another terminal: npm run mobile:dev"
exec bash "$SCRIPT_DIR/run-expo-macos.sh" android --device "$E2E_ANDROID_AVD" --no-bundler
