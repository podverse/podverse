#!/usr/bin/env bash
# Reinstall monorepo workspace deps and the standalone mobile install.
#
# Root `npm install` / `npm ci` never installs apps/mobile (outside workspaces).
# Mobile also needs shared package dist/ (file: links) and, for native iOS builds,
# CocoaPods via the macOS-native helper scripts.
#
# Usage (from monorepo root):
#   ./scripts/dev/deps-init.sh
#   ./scripts/dev/deps-init.sh --ci
#   ./scripts/dev/deps-init.sh --with-native
#   ./scripts/nix/with-env ./scripts/dev/deps-init.sh
#
# Flags:
#   --ci            Use npm ci (lockfile-strict) instead of npm install
#   --skip-clean    Do not delete node_modules trees first
#   --skip-mobile   Server/web workspaces only (no apps/mobile install)
#   --with-native   After JS installs, run mobile:prebuild (expo prebuild + pod install)
#   -h, --help      Show this help
#
# Does not delete package-lock.json files. Does not install host tooling
# (Xcode, CocoaPods gem, Android SDK) — those stay outside the repo.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

USE_CI=0
SKIP_CLEAN=0
SKIP_MOBILE=0
WITH_NATIVE=0

usage() {
  sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ci) USE_CI=1 ;;
    --skip-clean) SKIP_CLEAN=1 ;;
    --skip-mobile) SKIP_MOBILE=1 ;;
    --with-native) WITH_NATIVE=1 ;;
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

if ! command -v npm &>/dev/null; then
  echo "Error: npm not found on PATH. Enter the repo dev shell (direnv) or run via ./scripts/nix/with-env." >&2
  exit 1
fi

root_npm() {
  if [[ "$USE_CI" -eq 1 ]]; then
    npm ci "$@"
  else
    npm install "$@"
  fi
}

mobile_npm() {
  if [[ "$USE_CI" -eq 1 ]]; then
    npm ci --prefix apps/mobile "$@"
  else
    npm install --prefix apps/mobile "$@"
  fi
}

NPM_MODE="npm install"
MOBILE_MODE="include"
NATIVE_MODE="no"
if [[ "$USE_CI" -eq 1 ]]; then
  NPM_MODE="npm ci"
fi
if [[ "$SKIP_MOBILE" -eq 1 ]]; then
  MOBILE_MODE="skip"
fi
if [[ "$WITH_NATIVE" -eq 1 ]]; then
  NATIVE_MODE="yes"
fi

echo "=== Podverse deps-init ==="
echo "Root: $REPO_ROOT"
echo "Mode: $NPM_MODE"
echo "Mobile: $MOBILE_MODE"
echo "Native (CocoaPods/prebuild): $NATIVE_MODE"
echo ""

if [[ "$SKIP_CLEAN" -eq 0 ]]; then
  echo "Cleaning node_modules (root workspaces + apps/mobile)..."
  # clean:node_modules already covers apps/*/node_modules (including mobile).
  npm run clean:node_modules
else
  echo "Skipping node_modules clean (--skip-clean)."
fi

echo ""
echo "Installing root workspace dependencies..."
root_npm

echo ""
echo "Building shared packages (required for mobile file: links / Metro)..."
npm run build:packages

if [[ "$SKIP_MOBILE" -eq 0 ]]; then
  echo ""
  echo "Installing standalone mobile dependencies (apps/mobile)..."
  mobile_npm
  bash "$REPO_ROOT/scripts/mobile/patch-expo-localization-xcode26.sh" "$REPO_ROOT/apps/mobile"

  if [[ "$WITH_NATIVE" -eq 1 ]]; then
    echo ""
    if [[ "$(uname -s)" != "Darwin" ]]; then
      echo "Warning: --with-native requested, but CocoaPods/iOS prebuild requires macOS. Skipping native step." >&2
    else
      echo "Running mobile prebuild + CocoaPods (macOS-native toolchain)..."
      npm run mobile:prebuild
    fi
  fi
fi

echo ""
echo "=== deps-init complete ==="
if [[ "$SKIP_MOBILE" -eq 0 && "$WITH_NATIVE" -eq 0 ]]; then
  echo "JS deps are ready. For iOS native trees/Pods later:"
  echo "  npm run mobile:prebuild"
fi
echo "Host tooling (Xcode, CocoaPods gem, Android SDK) is not installed by this script."
echo "See apps/mobile/APPS-MOBILE.md § Native toolchain prerequisites."
