#!/usr/bin/env bash
# Start/stop/health helper for long-lived mobile E2E API (apiMobileE2e on :4230).
# Env source: @podverse/helpers-config buildPodverseApiTestEnv({ profile: 'apiMobileE2e' })
# + PODVERSE_SKIP_DOTENV — same pattern as web Playwright apiWebE2e (not apps/mobile/.env).
# Usage:
#   bash scripts/mobile/e2e-api.sh start
#   bash scripts/mobile/e2e-api.sh start-bg
#   bash scripts/mobile/e2e-api.sh health
#   bash scripts/mobile/e2e-api.sh stop

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

PORT='4230'
HEALTH_URL="http://localhost:${PORT}/api/v2/health"
READY_URL="http://localhost:${PORT}/api/v2/health/ready"
PID_FILE="$REPO_ROOT/.artifacts/mobile-e2e-api/api.pid"
LOG_FILE="$REPO_ROOT/.artifacts/mobile-e2e-api/api.log"
ENV_PREFIX_SCRIPT="$REPO_ROOT/scripts/mobile/e2e-api-env-prefix.mjs"
ACTION="${1:-start}"

mkdir -p "$REPO_ROOT/.artifacts/mobile-e2e-api"

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

# Always rebuild so apiMobileE2e (and CORS/port) exists in dist — stale dist caused
# API_ALLOWED_CORS_ORIGINS=undefined. Matches web Playwright e2e-webservers.ts.
rebuild_api_stack() {
  echo "Building @podverse/helpers-config + @podverse/api (apiMobileE2e env requires fresh dist)..."
  npm run build -w @podverse/helpers-config
  npm run build -w @podverse/api
}

build_and_validate_env_prefix() {
  if ! ENV_PREFIX="$(node "$ENV_PREFIX_SCRIPT")"; then
    echo "Failed to build apiMobileE2e env prefix." >&2
    exit 1
  fi

  if [[ "$ENV_PREFIX" != *"API_PORT=${PORT}"* ]]; then
    echo "apiMobileE2e env prefix missing API_PORT=${PORT}." >&2
    echo "Rebuild helpers-config and confirm profile apiMobileE2e exists in dist." >&2
    exit 1
  fi
  if [[ "$ENV_PREFIX" != *"API_ALLOWED_CORS_ORIGINS="* ]]; then
    echo "apiMobileE2e env prefix missing API_ALLOWED_CORS_ORIGINS." >&2
    echo "Stale helpers-config dist usually causes this — rebuild and retry." >&2
    exit 1
  fi
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
      echo "mobile E2E API already running on :${PORT} (pid ${file_pid})."
      return 10
    fi
  fi

  echo "Port ${PORT} is already in use by PID(s): ${port_pid}" >&2
  echo "Refusing to start apiMobileE2e on a different port." >&2
  echo "Free :${PORT} first (or run: npm run mobile:e2e:api:stop if it is the managed process)." >&2
  return 1
}

start_foreground() {
  rebuild_api_stack
  build_and_validate_env_prefix

  set +e
  ensure_port_is_free_or_owned
  local port_status=$?
  set -e
  if [[ "$port_status" -eq 10 ]]; then
    echo "If this is unexpected, stop it first: npm run mobile:e2e:api:stop"
    exit 1
  elif [[ "$port_status" -ne 0 ]]; then
    exit 1
  fi

  echo "Starting mobile E2E API in foreground on :${PORT}..."
  echo "Health URLs:"
  echo "  ${HEALTH_URL}"
  echo "  ${READY_URL}"
  exec bash -lc "$ENV_PREFIX npm run start -w @podverse/api"
}

start_background() {
  rebuild_api_stack
  build_and_validate_env_prefix

  set +e
  ensure_port_is_free_or_owned
  local port_status=$?
  set -e
  if [[ "$port_status" -eq 10 ]]; then
    echo "If this is unexpected, stop it first: npm run mobile:e2e:api:stop"
    exit 1
  elif [[ "$port_status" -ne 0 ]]; then
    exit 1
  fi

  echo "Starting mobile E2E API in background on :${PORT}..."
  bash -lc "$ENV_PREFIX npm run start -w @podverse/api >> \"$LOG_FILE\" 2>&1 & echo \$!" >"$PID_FILE"

  local pid
  pid="$(cat "$PID_FILE")"
  sleep 1
  if ! is_running_pid "$pid"; then
    echo "mobile E2E API failed to start. Check log: $LOG_FILE" >&2
    rm -f "$PID_FILE"
    exit 1
  fi

  echo "mobile E2E API started (pid ${pid})"
  echo "Log: $LOG_FILE"
}

stop_api() {
  local pid
  if ! pid="$(pid_from_file 2>/dev/null || true)" || [[ -z "$pid" ]]; then
    echo "No managed mobile E2E API PID found."
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

  echo "Stopping mobile E2E API (pid ${pid})..."
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
  echo "Checking ${HEALTH_URL}"
  curl --silent --show-error --fail "$HEALTH_URL"
  echo
  echo "Checking ${READY_URL}"
  curl --silent --show-error --fail "$READY_URL"
  echo
}

status_check() {
  local file_pid=''
  if file_pid="$(pid_from_file 2>/dev/null || true)" && [[ -n "$file_pid" ]]; then
    if is_running_pid "$file_pid"; then
      echo "Managed mobile E2E API running (pid ${file_pid})."
    else
      echo "Managed mobile E2E API PID file is stale (pid ${file_pid})."
    fi
  else
    echo "No managed mobile E2E API PID file."
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
    stop_api
    ;;
  health)
    health_check
    ;;
  status)
    status_check
    ;;
  *)
    echo "Unknown action: $ACTION" >&2
    echo "Usage: bash scripts/mobile/e2e-api.sh {start|start-bg|stop|health|status}" >&2
    exit 1
    ;;
esac
