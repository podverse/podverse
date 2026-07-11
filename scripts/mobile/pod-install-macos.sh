#!/usr/bin/env bash
# Run CocoaPods with a macOS-native toolchain PATH and without Nix env pollution.
# CocoaPods compiles glog with the iOS SDK; direnv/Nix sets DEVELOPER_DIR/SDKROOT to a Nix apple-sdk
# and puts Nix tools on PATH. Unset NIX_* + DEVELOPER_DIR + SDKROOT first, re-derive Xcode, then pod install.
# Usage: bash scripts/mobile/pod-install-macos.sh [pod install args...]
# Run from repo root (or any cwd — script resolves repo root).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
IOS_DIR="$REPO_ROOT/apps/mobile/ios"

resolve_iphoneos_sdk() {
  local sdk sdk_dir newest

  if sdk="$(/usr/bin/xcrun --sdk iphoneos --show-sdk-path 2>/dev/null)"; then
    echo "$sdk"
    return 0
  fi

  sdk_dir="$DEVELOPER_DIR/Platforms/iPhoneOS.platform/Developer/SDKs"
  newest="$(ls -d "$sdk_dir"/iPhoneOS*.sdk 2>/dev/null | sort -V | tail -1 || true)"
  if [[ -n "$newest" && -d "$newest" ]]; then
    echo "$newest"
    return 0
  fi

  return 1
}

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Error: pod install for iOS requires macOS with Xcode." >&2
  exit 1
fi

# Strip Nix/direnv Apple-SDK pollution before xcode-select/xcrun (they honor DEVELOPER_DIR/SDKROOT).
unset DEVELOPER_DIR SDKROOT
while IFS='=' read -r var _; do
  case "$var" in
    NIX_* | __NIX_* | DETERMINISTIC_BUILD) unset "$var" ;;
  esac
done < <(env)

DEVELOPER_DIR="$(/usr/bin/xcode-select -p 2>/dev/null || true)"
if [[ -z "$DEVELOPER_DIR" || "$DEVELOPER_DIR" == /nix/* || ! -d "$DEVELOPER_DIR" ]]; then
  DEVELOPER_DIR="/Applications/Xcode.app/Contents/Developer"
fi
if [[ ! -d "$DEVELOPER_DIR" ]]; then
  echo "Error: Xcode not found. Install Xcode and run: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer" >&2
  exit 1
fi
export DEVELOPER_DIR

if [[ ! -d "$IOS_DIR" ]]; then
  echo "Error: $IOS_DIR does not exist. Run npm run mobile:prebuild or npm --prefix apps/mobile run prebuild first." >&2
  exit 1
fi

if ! command -v node &>/dev/null; then
  echo "Error: node not found on PATH. Enter the repo dev shell (direnv) or run via ./scripts/nix/with-env." >&2
  exit 1
fi
if ! command -v pod &>/dev/null; then
  echo "Error: pod (CocoaPods) not found on PATH. Install via gem or Homebrew." >&2
  exit 1
fi

NODE_DIR="$(dirname "$(command -v node)")"
POD_BIN="$(command -v pod)"

MACOS_PATH="/usr/bin:/bin:/usr/sbin:/sbin"
if [[ -d /opt/homebrew/bin ]]; then
  MACOS_PATH="/opt/homebrew/bin:$MACOS_PATH"
fi
if [[ -d /usr/local/bin ]]; then
  MACOS_PATH="/usr/local/bin:$MACOS_PATH"
fi
MACOS_PATH="$NODE_DIR:$MACOS_PATH"

export PATH="$MACOS_PATH"
export SHELL=/bin/bash
export LANG="${LANG:-en_US.UTF-8}"
export LC_ALL="${LC_ALL:-en_US.UTF-8}"

if ! IPHONEOS_SDK="$(resolve_iphoneos_sdk)"; then
  echo "Error: could not resolve the iOS device SDK under $DEVELOPER_DIR." >&2
  echo "Try: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer" >&2
  echo "Then: xcodebuild -runFirstLaunch" >&2
  exit 1
fi

export SDKROOT="$IPHONEOS_SDK"

cd "$IOS_DIR"
"$POD_BIN" install --repo-update "$@"
bash "$SCRIPT_DIR/patch-fmt-xcode26.sh" "$IOS_DIR"
