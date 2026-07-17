#!/usr/bin/env bash
# Start/stop/health helper for long-lived mobile E2E test-assets (port 2111).
# Same `podverse-test-assets` server web Playwright uses — not a mobile-only stack.
# Usage:
#   bash scripts/mobile/e2e-test-assets.sh start
#   bash scripts/mobile/e2e-test-assets.sh start-bg
#   bash scripts/mobile/e2e-test-assets.sh health
#   bash scripts/mobile/e2e-test-assets.sh stop

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

PORT='2111'
# Bind IPv4 all-interfaces so Android emulator (10.0.2.2 → host) and iOS AVPlayer
# (often prefers 127.0.0.1 over ::1) can reach fixtures. Node's default `localhost`
# bind is frequently IPv6-only ([::1]) on macOS, which breaks mobile media E2E.
export BIND_ADDRESS="${BIND_ADDRESS:-0.0.0.0}"
# Known fixture from tools/web/seed-e2e.mjs / apps/web/e2e/helpers/seedConstants.ts
FIXTURE_URL="http://127.0.0.1:${PORT}/e2e/audio/e2e-addbyrss-fresh-60s-440hz.mp3"
PID_FILE="$REPO_ROOT/.artifacts/mobile-e2e-test-assets/test-assets.pid"
LOG_FILE="$REPO_ROOT/.artifacts/mobile-e2e-test-assets/test-assets.log"
ACTION="${1:-start}"

mkdir -p "$REPO_ROOT/.artifacts/mobile-e2e-test-assets"

get_port_pid() {
  lsof -nP -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | tr '\n' ' ' | sed 's/[[:space:]]*$//'
}

pid_from_file() {
  if [[ -f "$PID_FILE" ]]; then
    cat "$PID_FILE"
    return 0
  fi
  return 1
}

is_running_pid() {
  local pid="$1"
  kill -0 "$pid" >/dev/null 2>&1
}

ensure_port_is_free_or_owned() {
  local port_pid
  port_pid="$(get_port_pid || true)"
  if [[ -z "$port_pid" ]]; then
    return 0
  fi

  local file_pid=''
  if file_pid="$(pid_from_file 2>/dev/null || true)" && [[ -n "$file_pid" ]]; then
    if [[ "$port_pid" == *"$file_pid"* ]] && is_running_pid "$file_pid"; then
      echo "mobile E2E test-assets already running on :${PORT} (pid ${file_pid})."
      return 10
    fi
  fi

  echo "Port ${PORT} is already in use by PID(s): ${port_pid}" >&2
  echo "Refusing to start podverse-test-assets on a different port." >&2
  echo "Free :${PORT} first (or run: npm run mobile:e2e:test-assets:stop if it is the managed process)." >&2
  return 1
}

start_foreground() {
  set +e
  ensure_port_is_free_or_owned
  local port_status=$?
  set -e
  if [[ "$port_status" -eq 10 ]]; then
    echo "If this is unexpected, stop it first: npm run mobile:e2e:test-assets:stop"
    exit 1
  elif [[ "$port_status" -ne 0 ]]; then
    exit 1
  fi

  echo "Starting mobile E2E test-assets in foreground on :${PORT}..."
  echo "BIND_ADDRESS=${BIND_ADDRESS}"
  echo "Fixture health URL: ${FIXTURE_URL}"
  exec npm run start -w podverse-test-assets
}

start_background() {
  set +e
  ensure_port_is_free_or_owned
  local port_status=$?
  set -e
  if [[ "$port_status" -eq 10 ]]; then
    echo "If this is unexpected, stop it first: npm run mobile:e2e:test-assets:stop"
    exit 1
  elif [[ "$port_status" -ne 0 ]]; then
    exit 1
  fi

  echo "Starting mobile E2E test-assets in background on :${PORT}..."
  echo "BIND_ADDRESS=${BIND_ADDRESS}"
  # nohup so the process outlives the invoking shell (agent/CI wrappers).
  nohup env BIND_ADDRESS="$BIND_ADDRESS" npm run start -w podverse-test-assets \
    >>"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"

  local pid
  pid="$(cat "$PID_FILE")"
  sleep 1
  if ! is_running_pid "$pid"; then
    echo "mobile E2E test-assets failed to start. Check log: $LOG_FILE" >&2
    rm -f "$PID_FILE"
    exit 1
  fi

  echo "mobile E2E test-assets started (pid ${pid})"
  echo "Log: $LOG_FILE"
}

stop_assets() {
  local pid
  if ! pid="$(pid_from_file 2>/dev/null || true)" || [[ -z "$pid" ]]; then
    echo "No managed mobile E2E test-assets PID found."
    local port_pid
    port_pid="$(get_port_pid || true)"
    if [[ -n "$port_pid" ]]; then
      echo "Note: :${PORT} is listening with PID(s): ${port_pid}" >&2
    fi
    return 0
  fi

  if ! is_running_pid "$pid"; then
    echo "Stale PID file found (pid ${pid} not running); removing."
    rm -f "$PID_FILE"
    return 0
  fi

  echo "Stopping mobile E2E test-assets (pid ${pid})..."
  kill "$pid"
  for _ in {1..20}; do
    if ! is_running_pid "$pid"; then
      rm -f "$PID_FILE"
      echo "Stopped."
      return 0
    fi
    sleep 0.25
  done

  echo "Process did not exit after SIGTERM; sending SIGKILL..."
  kill -9 "$pid"
  rm -f "$PID_FILE"
  echo "Stopped (SIGKILL)."
}

health_check() {
  echo "Checking fixture ${FIXTURE_URL}"
  curl --silent --show-error --fail --output /dev/null --head "$FIXTURE_URL" || \
    curl --silent --show-error --fail --output /dev/null --range 0-0 "$FIXTURE_URL"
  echo "OK (fixture reachable on :${PORT})"
}

status_check() {
  local file_pid=''
  if file_pid="$(pid_from_file 2>/dev/null || true)" && [[ -n "$file_pid" ]]; then
    if is_running_pid "$file_pid"; then
      echo "Managed mobile E2E test-assets running (pid ${file_pid})."
    else
      echo "Managed mobile E2E test-assets PID file is stale (pid ${file_pid})."
    fi
  else
    echo "No managed mobile E2E test-assets PID file."
  fi

  local port_pid
  port_pid="$(get_port_pid || true)"
  if [[ -n "$port_pid" ]]; then
    echo "Port ${PORT} listener PID(s): ${port_pid}"
  else
    echo "Port ${PORT} is not listening."
  fi
}

case "$ACTION" in
  start)
    start_foreground
    ;;
  start-bg)
    start_background
    ;;
  stop)
    stop_assets
    ;;
  health)
    health_check
    ;;
  status)
    status_check
    ;;
  *)
    echo "Unknown action: $ACTION" >&2
    echo "Usage: bash scripts/mobile/e2e-test-assets.sh {start|start-bg|stop|health|status}" >&2
    exit 1
    ;;
esac
