#!/usr/bin/env bash
# Generate native ios/android trees, then pod install outside Nix/direnv PATH.
# Usage:
#   bash scripts/mobile/prebuild-macos.sh
#   bash scripts/mobile/prebuild-macos.sh --clean
# Run from repo root. For install + clean prebuild recovery, prefer mobile:reset.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CLEAN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --clean) CLEAN=1 ;;
    *)
      echo "Error: unknown flag: $1 (supported: --clean)" >&2
      exit 1
      ;;
  esac
  shift
done

cd "$REPO_ROOT"

if [[ "$CLEAN" -eq 1 ]]; then
  echo "Running expo prebuild --clean (skip auto pod install)..."
  CI=1 npm --prefix apps/mobile run prebuild:clean -- --no-install
else
  echo "Running expo prebuild (skip auto pod install)..."
  npm --prefix apps/mobile run prebuild -- --no-install
fi

echo "Running pod install with macOS-native toolchain..."
bash "$SCRIPT_DIR/pod-install-macos.sh"
