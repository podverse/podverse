#!/usr/bin/env bash
# Recover mobile native trees after a failed prebuild, or force a clean native regen.
#
# Usage (from monorepo root):
#   npm run mobile:reset
#   bash scripts/mobile/reset-macos.sh
#   bash scripts/mobile/reset-macos.sh --skip-install
#
# Steps:
#   1. Reinstall apps/mobile JS deps (unless --skip-install)
#   2. expo prebuild --clean --no-install (CI=1 skips git dirty prompt)
#   3. CocoaPods via pod-install-macos.sh (Nix/direnv stripped)
#
# Prefer this over bare `prebuild:clean` + `mobile:pod-install` when ios/android were wiped
# mid-failure. For a full monorepo clean (root + mobile + packages build), use deps:init:native.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SKIP_INSTALL=0

usage() {
  sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-install) SKIP_INSTALL=1 ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Error: unknown flag: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

cd "$REPO_ROOT"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Error: mobile:reset requires macOS (CocoaPods / Xcode toolchain)." >&2
  exit 1
fi

if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  echo "Reinstalling standalone mobile dependencies (apps/mobile)..."
  npm install --prefix apps/mobile
  bash "$SCRIPT_DIR/patch-expo-localization-xcode26.sh" "$REPO_ROOT/apps/mobile"
else
  echo "Skipping mobile JS reinstall (--skip-install)."
fi

echo "Running expo prebuild --clean (skip auto pod install)..."
# CI=1: non-interactive (skip "Continue with uncommitted changes?" prompt).
CI=1 npm --prefix apps/mobile run prebuild:clean -- --no-install

echo "Running pod install with macOS-native toolchain..."
bash "$SCRIPT_DIR/pod-install-macos.sh"

echo "=== mobile:reset complete ==="
echo "Next: npm run mobile:dev  and  npm run mobile:ios -- --device \"iPhone 17 Pro\""
