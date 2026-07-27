#!/usr/bin/env bash
# Start Expo Metro with Android API base URL pointed at this machine's LAN IPv4 so a
# USB/Wi‑Fi physical Android phone can reach the host API (emulator 10.0.2.2 does not work).
#
# Usage (repo root, Mobile Metro tab — leave running):
#   npm run mobile:dev:device
#
# Does not rewrite apps/mobile/.env (keeps emulator defaults). Override host with:
#   MOBILE_API_LAN_HOST=192.168.1.10 npm run mobile:dev:device
#
# Pair with: npm run mobile:android:device (install/launch; --no-bundler).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MOBILE_ENV="$REPO_ROOT/apps/mobile/.env"
cd "$REPO_ROOT"

# shellcheck source=scripts/mobile/lan-host.sh
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lan-host.sh"

read_dotenv_value() {
  local key="$1"
  local file="$2"
  [[ -f "$file" ]] || return 0
  local line
  line="$(grep -E "^${key}=" "$file" | tail -n 1 || true)"
  [[ -n "$line" ]] || return 0
  local value="${line#*=}"
  # Strip surrounding double quotes (env-file-formatting convention).
  value="${value%\"}"
  value="${value#\"}"
  printf '%s' "$value"
}

LAN_HOST="$(resolve_mobile_lan_ipv4)"
if [[ -z "$LAN_HOST" ]]; then
  echo "Error: could not detect a LAN IPv4 address (tried MOBILE_API_LAN_HOST, ipconfig en0/en1)." >&2
  echo "Set MOBILE_API_LAN_HOST=<your-mac-ip> and retry." >&2
  exit 1
fi

# Prefer the Android URL already in .env (port + /api/v2 path), swap only the host.
# Fall back to day-to-day local API on :3000 (local_env_setup default for non-E2E).
TEMPLATE_ANDROID="$(read_dotenv_value EXPO_PUBLIC_MOBILE_API_BASE_URL_ANDROID "$MOBILE_ENV")"
TEMPLATE_SHARED="$(read_dotenv_value EXPO_PUBLIC_MOBILE_API_BASE_URL "$MOBILE_ENV")"
TEMPLATE_IOS="$(read_dotenv_value EXPO_PUBLIC_MOBILE_API_BASE_URL_IOS "$MOBILE_ENV")"

BASE_TEMPLATE="${TEMPLATE_ANDROID:-}"
if [[ -z "$BASE_TEMPLATE" && -n "$TEMPLATE_SHARED" ]]; then
  BASE_TEMPLATE="$TEMPLATE_SHARED"
fi
if [[ -z "$BASE_TEMPLATE" ]]; then
  BASE_TEMPLATE="http://10.0.2.2:3000/api/v2"
fi

PHYSICAL_ANDROID_URL="$(rewrite_url_host "$BASE_TEMPLATE" "$LAN_HOST")"

# Shared EXPO_PUBLIC_MOBILE_API_BASE_URL wins in the app over platform URLs — clear it for
# this Metro process so Android uses the LAN URL while iOS can keep simulator localhost.
unset EXPO_PUBLIC_MOBILE_API_BASE_URL || true
export EXPO_PUBLIC_MOBILE_API_BASE_URL_ANDROID="$PHYSICAL_ANDROID_URL"
if [[ -n "$TEMPLATE_IOS" ]]; then
  export EXPO_PUBLIC_MOBILE_API_BASE_URL_IOS="$TEMPLATE_IOS"
fi

echo "Starting mobile Metro for physical Android (LAN API host):"
echo "  LAN host: $LAN_HOST"
echo "  EXPO_PUBLIC_MOBILE_API_BASE_URL_ANDROID=$EXPO_PUBLIC_MOBILE_API_BASE_URL_ANDROID"
if [[ -n "${EXPO_PUBLIC_MOBILE_API_BASE_URL_IOS:-}" ]]; then
  echo "  EXPO_PUBLIC_MOBILE_API_BASE_URL_IOS=$EXPO_PUBLIC_MOBILE_API_BASE_URL_IOS"
fi
echo "  (apps/mobile/.env unchanged — emulator still uses 10.0.2.2 via npm run mobile:dev)"
echo "  Install/launch phone: npm run mobile:android:device"

exec npm --prefix apps/mobile run start
