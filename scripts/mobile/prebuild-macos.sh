#!/usr/bin/env bash
# Generate native ios/android trees, then pod install outside Nix/direnv PATH.
# Usage: bash scripts/mobile/prebuild-macos.sh
# Run from repo root.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

echo "Running expo prebuild (skip auto pod install)..."
npm --prefix apps/mobile run prebuild -- --no-install

echo "Running pod install with macOS-native toolchain..."
bash "$SCRIPT_DIR/pod-install-macos.sh"
