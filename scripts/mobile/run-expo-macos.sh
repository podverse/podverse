#!/usr/bin/env bash
# Run `expo run:ios` / `expo run:android` with a macOS-native toolchain and without Nix env pollution.
# xcodebuild (and Gradle's native steps) must use Xcode's clang, not the Nix clang wrapper. direnv/Nix
# sets NIX_CC/NIX_CFLAGS_COMPILE/DEVELOPER_DIR/SDKROOT and puts Nix tools on PATH, so xcodebuild feeds
# Apple-only flags (e.g. -index-store-path) to the wrong clang and fails. Unset NIX_* + DEVELOPER_DIR +
# SDKROOT first, re-derive Xcode, trim PATH to macOS tools (keeping node from the caller), then run expo.
# Usage: bash scripts/mobile/run-expo-macos.sh <ios|android> [expo run args...]
# Run from repo root (or any cwd — script resolves repo root).

set -euo pipefail

PLATFORM="${1:-}"
if [[ "$PLATFORM" != "ios" && "$PLATFORM" != "android" ]]; then
  echo "Error: first argument must be 'ios' or 'android'." >&2
  echo "Usage: bash scripts/mobile/run-expo-macos.sh <ios|android> [expo run args...]" >&2
  exit 1
fi
shift

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [[ "$PLATFORM" == "ios" && "$(uname -s)" != "Darwin" ]]; then
  echo "Error: expo run:ios requires macOS with Xcode." >&2
  exit 1
fi

# Strip Nix/direnv pollution before xcode-select/xcrun (they honor DEVELOPER_DIR/SDKROOT).
unset DEVELOPER_DIR SDKROOT
while IFS='=' read -r var _; do
  case "$var" in
    NIX_* | __NIX_* | DETERMINISTIC_BUILD) unset "$var" ;;
  esac
done < <(env)

if ! command -v node &>/dev/null; then
  echo "Error: node not found on PATH. Enter the repo dev shell (direnv) or run via ./scripts/nix/with-env." >&2
  exit 1
fi
if ! command -v npm &>/dev/null; then
  echo "Error: npm not found on PATH. Enter the repo dev shell (direnv) or run via ./scripts/nix/with-env." >&2
  exit 1
fi

NODE_DIR="$(dirname "$(command -v node)")"
NPM_BIN="$(command -v npm)"

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

if [[ "$PLATFORM" == "ios" ]]; then
  # Re-derive Xcode for xcodebuild. Do NOT export SDKROOT: xcodebuild auto-selects the right SDK for
  # the chosen destination (simulator vs device); a pinned SDKROOT would break the other target.
  DEVELOPER_DIR="$(/usr/bin/xcode-select -p 2>/dev/null || true)"
  if [[ -z "$DEVELOPER_DIR" || "$DEVELOPER_DIR" == /nix/* || ! -d "$DEVELOPER_DIR" ]]; then
    DEVELOPER_DIR="/Applications/Xcode.app/Contents/Developer"
  fi
  if [[ ! -d "$DEVELOPER_DIR" ]]; then
    echo "Error: Xcode not found. Install Xcode and run: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer" >&2
    exit 1
  fi
  export DEVELOPER_DIR

  if [[ ! -d "$REPO_ROOT/apps/mobile/ios" ]]; then
    echo "Error: apps/mobile/ios does not exist. Run npm run mobile:prebuild first." >&2
    exit 1
  fi
else
  # Android: SDK + JDK for Gradle. Prefer an existing JAVA_HOME; otherwise use Android Studio's
  # bundled JBR (JetBrains Runtime). macOS /usr/bin/java is only a stub without a system JDK.
  if [[ -z "${ANDROID_HOME:-}" ]]; then
    if [[ -d "$HOME/Library/Android/sdk" ]]; then
      export ANDROID_HOME="$HOME/Library/Android/sdk"
    elif [[ -d "$HOME/Android/Sdk" ]]; then
      export ANDROID_HOME="$HOME/Android/Sdk"
    fi
  fi
  if [[ -z "${ANDROID_HOME:-}" || ! -d "$ANDROID_HOME" ]]; then
    echo "Error: Android SDK not found. Install Android Studio and set ANDROID_HOME (default: ~/Library/Android/sdk)." >&2
    exit 1
  fi
  export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"

  if [[ -z "${JAVA_HOME:-}" || ! -x "${JAVA_HOME}/bin/java" ]]; then
    for jbr in \
      "/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
      "/Applications/Android Studio Preview.app/Contents/jbr/Contents/Home"
    do
      if [[ -x "$jbr/bin/java" ]]; then
        export JAVA_HOME="$jbr"
        break
      fi
    done
  fi
  if [[ -z "${JAVA_HOME:-}" || ! -x "${JAVA_HOME}/bin/java" ]]; then
    echo "Error: no JDK found for Gradle. Install Android Studio (bundled JBR) or set JAVA_HOME to JDK 17+." >&2
    exit 1
  fi

  export PATH="$JAVA_HOME/bin:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

  if [[ ! -d "$REPO_ROOT/apps/mobile/android" ]]; then
    echo "Error: apps/mobile/android does not exist. Run npm run mobile:prebuild first." >&2
    exit 1
  fi
fi

cd "$REPO_ROOT"
if [[ "$PLATFORM" == "ios" ]]; then
  bash "$SCRIPT_DIR/patch-expo-localization-xcode26.sh" "$REPO_ROOT/apps/mobile"
fi

# Default to manual device slots when the caller did not pass --device / -d.
# Always append --device as its own argv + a separate quoted name (never unquoted spaces).
# Extra flags pass through via "$@".
# E2E install uses dedicated names via npm run mobile:e2e:ios|android (see e2e-device.sh).
#
# Always pass --no-bundler unless the caller already did. Metro must run in its own terminal
# (npm run mobile:dev / mobile:dev:e2e) — install/launch never starts a second bundler.
MANUAL_IOS_NAME='iPhone 17 Pro'
MANUAL_ANDROID_AVD='Pixel_6_Pro_API_33'
HAS_DEVICE_FLAG=0
HAS_NO_BUNDLER=0
for arg in "$@"; do
  case "$arg" in
    --device | -d | --device=* | -d=*)
      HAS_DEVICE_FLAG=1
      ;;
    --no-bundler)
      HAS_NO_BUNDLER=1
      ;;
  esac
done
if [[ "$HAS_DEVICE_FLAG" -eq 0 ]]; then
  if [[ "$PLATFORM" == "ios" ]]; then
    set -- "$@" --device "$MANUAL_IOS_NAME"
  else
    set -- "$@" --device "$MANUAL_ANDROID_AVD"
  fi
fi
if [[ "$HAS_NO_BUNDLER" -eq 0 ]]; then
  set -- "$@" --no-bundler
fi

# Keep AVD performance profile consistent before Expo may cold-start the emulator.
if [[ "$PLATFORM" == "android" ]]; then
  bash "$SCRIPT_DIR/ensure-devices.sh" tune-android >/dev/null 2>&1 || true
fi

# Preserve empty "$@" safely under set -u (do not expand an unbound EXTRA_ARGS array).
exec "$NPM_BIN" --prefix apps/mobile run "$PLATFORM" -- "$@"
