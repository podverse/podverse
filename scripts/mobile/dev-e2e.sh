#!/usr/bin/env bash
# Start Expo dev server with mobile E2E API host vars.
# iOS simulator reaches host as localhost; Android emulator uses 10.0.2.2.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

export EXPO_PUBLIC_MOBILE_API_BASE_URL_IOS="${EXPO_PUBLIC_MOBILE_API_BASE_URL_IOS:-http://localhost:4230/api/v2}"
export EXPO_PUBLIC_MOBILE_API_BASE_URL_ANDROID="${EXPO_PUBLIC_MOBILE_API_BASE_URL_ANDROID:-http://10.0.2.2:4230/api/v2}"
# Lets Login/SignUp use plaintext fields so Maestro can fill passwords (iOS Autofill + secureTextEntry).
export EXPO_PUBLIC_MOBILE_E2E="${EXPO_PUBLIC_MOBILE_E2E:-1}"

echo "Starting mobile dev server with E2E API URLs:"
echo "  EXPO_PUBLIC_MOBILE_API_BASE_URL_IOS=$EXPO_PUBLIC_MOBILE_API_BASE_URL_IOS"
echo "  EXPO_PUBLIC_MOBILE_API_BASE_URL_ANDROID=$EXPO_PUBLIC_MOBILE_API_BASE_URL_ANDROID"
echo "  EXPO_PUBLIC_MOBILE_E2E=$EXPO_PUBLIC_MOBILE_E2E"

exec npm --prefix apps/mobile run start
