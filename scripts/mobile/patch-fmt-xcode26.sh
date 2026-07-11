#!/usr/bin/env bash
# Patch the CocoaPods fmt pod for Xcode 26+ (Apple clang 21).
# fmt 11.0.2 (bundled via React Native 0.76 / RCT-Folly) enables FMT_USE_CONSTEVAL for Apple clang,
# but clang 21 rejects FMT_STRING call sites in format-inl.h. Disabling consteval is a no-op at runtime.
# Idempotent: safe to run after every pod install. No-op when fmt pod is absent or already patched.
# Usage: bash scripts/mobile/patch-fmt-xcode26.sh [ios_dir]
# Default ios_dir: <repo_root>/apps/mobile/ios

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
IOS_DIR="${1:-$REPO_ROOT/apps/mobile/ios}"
FMT_BASE="$IOS_DIR/Pods/fmt/include/fmt/base.h"

if [[ ! -f "$FMT_BASE" ]]; then
  exit 0
fi

if grep -q 'Xcode 26 workaround' "$FMT_BASE"; then
  exit 0
fi

if ! grep -q '^#  define FMT_USE_CONSTEVAL 1$' "$FMT_BASE"; then
  echo "Warning: $FMT_BASE has unexpected FMT_USE_CONSTEVAL layout; skipping Xcode 26 fmt patch." >&2
  exit 0
fi

perl -i -pe 's/^#  define FMT_USE_CONSTEVAL 1$/#  define FMT_USE_CONSTEVAL 0  \/\/ Xcode 26 workaround/' \
  "$FMT_BASE"

echo "Patched fmt for Xcode 26: $FMT_BASE"
