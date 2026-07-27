#!/usr/bin/env bash
# Shared helpers for physical Android ↔ host API reachability.
# Sourced by scripts/mobile/dev-physical-android.sh (and related wrappers).

# Print a LAN IPv4 for this Mac, or empty on failure.
# Prefer MOBILE_API_LAN_HOST when set (operator override).
resolve_mobile_lan_ipv4() {
  if [[ -n "${MOBILE_API_LAN_HOST:-}" ]]; then
    printf '%s' "$MOBILE_API_LAN_HOST"
    return 0
  fi
  local ip=""
  local iface
  for iface in en0 en1; do
    ip="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
    if [[ -n "$ip" ]]; then
      printf '%s' "$ip"
      return 0
    fi
  done
  return 1
}

# Replace host in an absolute http(s) URL; keep scheme, port, path, query.
# Usage: rewrite_url_host "http://10.0.2.2:3000/api/v2" "192.168.1.10"
rewrite_url_host() {
  local url="$1"
  local new_host="$2"
  # shellcheck disable=SC2001
  printf '%s' "$url" | sed -E "s|^(https?://)[^/:]+|\1${new_host}|"
}
