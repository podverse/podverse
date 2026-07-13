#!/usr/bin/env bash
# Patch expo-localization for Xcode 26+ / iOS 26 SDK.
# LocalizationModule.swift switches on Calendar.Identifier without @unknown default.
# iOS 26 added new calendar cases, so Swift treats the switch as non-exhaustive and
# fails the build (switch must be exhaustive). Upstream fixed this in Expo SDK 53+;
# SDK 52 / expo-localization@16.0.1 needs a local patch.
# Idempotent: safe after every mobile npm install / before expo run:ios.
# Usage: bash scripts/mobile/patch-expo-localization-xcode26.sh [mobile_dir]
# Default mobile_dir: <repo_root>/apps/mobile

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MOBILE_DIR="${1:-$REPO_ROOT/apps/mobile}"
TARGET="$MOBILE_DIR/node_modules/expo-localization/ios/LocalizationModule.swift"

if [[ ! -f "$TARGET" ]]; then
  exit 0
fi

if grep -q '@unknown default:' "$TARGET"; then
  exit 0
fi

if ! grep -q 'case \.iso8601:' "$TARGET"; then
  echo "Warning: $TARGET missing expected iso8601 case; skipping Xcode 26 localization patch." >&2
  exit 0
fi

perl -i -0pe 's/(case \.iso8601:\n\s+return "iso8601"\n)(\s+\})/$1    \@unknown default:\n      \/\/ Xcode 26 workaround (iOS 26 Calendar.Identifier cases)\n      return "iso8601"\n$2/' \
  "$TARGET"

if ! grep -q '@unknown default:' "$TARGET"; then
  echo "Error: failed to patch $TARGET for Xcode 26." >&2
  exit 1
fi

echo "Patched expo-localization for Xcode 26: $TARGET"
