#!/usr/bin/env bash
# Free the local API listen port so a leftover process cannot block `dev:api`.
# Default port is 3000. Override with API_PORT or apps/api/.env `API_PORT=`.
# Does not stop the mobile E2E API on :4230 unless that port is requested.
#
# Usage (from monorepo root):
#   npm run dev:api:stop
#   API_PORT=3000 npm run dev:api:stop

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

read_api_port() {
  if [[ -n "${API_PORT:-}" ]]; then
    echo "${API_PORT}"
    return
  fi

  local env_file="${REPO_ROOT}/apps/api/.env"
  if [[ -f "${env_file}" ]]; then
    local line value
    line="$(grep -E '^API_PORT=' "${env_file}" | tail -n 1 || true)"
    if [[ -n "${line}" ]]; then
      value="${line#API_PORT=}"
      value="${value#\"}"
      value="${value%\"}"
      if [[ "${value}" =~ ^[0-9]+$ ]]; then
        echo "${value}"
        return
      fi
    fi
  fi

  echo '3000'
}

is_running_pid() {
  local pid="$1"
  kill -0 "${pid}" >/dev/null 2>&1
}

listen_pids() {
  lsof -nP -t -iTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null | sort -u || true
}

nodemon_parent_pid() {
  local pid="$1"
  local ppid comm
  ppid="$(ps -o ppid= -p "${pid}" 2>/dev/null | tr -d ' ' || true)"
  if [[ -z "${ppid}" || "${ppid}" == '0' || "${ppid}" == '1' ]]; then
    return 1
  fi
  comm="$(ps -o comm= -p "${ppid}" 2>/dev/null || true)"
  if [[ "${comm}" == *nodemon* ]]; then
    echo "${ppid}"
    return 0
  fi
  return 1
}

collect_stop_pids() {
  local pid parent
  local -a seen=()
  for pid in $(listen_pids); do
    if [[ " ${seen[*]} " != *" ${pid} "* ]]; then
      seen+=("${pid}")
      echo "${pid}"
    fi
    if parent="$(nodemon_parent_pid "${pid}")"; then
      if [[ " ${seen[*]} " != *" ${parent} "* ]]; then
        seen+=("${parent}")
        echo "${parent}"
      fi
    fi
  done
}

send_signal() {
  local signal="$1"
  local pid
  shift
  for pid in "$@"; do
    if [[ -n "${pid}" ]] && is_running_pid "${pid}"; then
      kill "-${signal}" "${pid}" 2>/dev/null || true
    fi
  done
}

PORT="$(read_api_port)"
if [[ ! "${PORT}" =~ ^[0-9]+$ ]]; then
  echo "Invalid API_PORT: ${PORT}" >&2
  exit 1
fi

if [[ "${PORT}" == '4230' ]]; then
  echo "Port 4230 is the mobile E2E API. Prefer: npm run mobile:e2e:api:stop"
fi

pids="$(collect_stop_pids | tr '\n' ' ')"
pids="${pids%"${pids##*[![:space:]]}"}"
if [[ -z "${pids}" ]]; then
  echo "No process is listening on :${PORT}."
  exit 0
fi

echo "Stopping API listener(s) on :${PORT} (pid ${pids})..."
# shellcheck disable=SC2086
send_signal TERM ${pids}

for _ in {1..20}; do
  remaining="$(listen_pids)"
  if [[ -z "${remaining}" ]]; then
    echo "Stopped. Port :${PORT} is free."
    exit 0
  fi
  sleep 0.25
done

echo "Process did not exit after SIGTERM; sending SIGKILL..."
pids="$(collect_stop_pids | tr '\n' ' ')"
pids="${pids%"${pids##*[![:space:]]}"}"
# shellcheck disable=SC2086
send_signal KILL ${pids}
sleep 0.25

remaining="$(listen_pids)"
if [[ -n "${remaining}" ]]; then
  echo "Port :${PORT} is still listening (pid ${remaining})." >&2
  exit 1
fi

echo "Stopped (SIGKILL). Port :${PORT} is free."
