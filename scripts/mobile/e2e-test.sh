#!/usr/bin/env bash
# Run Maestro on E2E iOS + Android and write HTML screenshot reports.
# Prerequisites (separate terminals): npm run mobile:dev, mobile:e2e:ios, mobile:e2e:android
# Usage (monorepo root):
#   bash scripts/mobile/e2e-test.sh
#   bash scripts/mobile/e2e-test.sh hello-world
#   bash scripts/mobile/e2e-test.sh hello-world,locale-switch-home-smoke
#   bash scripts/mobile/e2e-test.sh all   # every apps/mobile/e2e/*.yaml (not shared/)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

E2E_IOS_NAME='iPhone 17 Pro E2E'
E2E_ANDROID_AVD='Pixel_6_Pro_API_33_e2e'
MOBILE_METRO_PORT="${MOBILE_METRO_PORT:-8081}"
MOBILE_E2E_API_PORT="${MOBILE_E2E_API_PORT:-4230}"
MOBILE_E2E_TEST_ASSETS_PORT="${MOBILE_E2E_TEST_ASSETS_PORT:-2111}"
DEFAULT_SPEC='hello-world'
E2E_DIR="$REPO_ROOT/apps/mobile/e2e"
TIMEOUTS_ENV="$E2E_DIR/shared/timeouts.env"

# Basename list (comma-free) of top-level flows that need :4230. Keep in sync when adding
# API-backed apps/mobile/e2e/<area>.yaml — full suite (`all`) always requires the API.
flow_needs_e2e_api() {
  case "$1" in
  add-by-rss | api-health | auth-login | auth-logout | home | podcast-episode | search | \
  tab-switch-playback)
    return 0
    ;;
  *)
    return 1
    ;;
  esac
}

# Basename list of flows that need tools/test-assets on :2111 (real media / play asserts).
flow_needs_test_assets() {
  case "$1" in
  add-by-rss)
    return 0
    ;;
  *)
    return 1
    ;;
  esac
}

if [[ -f "$TIMEOUTS_ENV" ]]; then
  # shellcheck disable=SC1090
  set -a
  # shellcheck source=apps/mobile/e2e/shared/timeouts.env
  source "$TIMEOUTS_ENV"
  set +a
fi

MAESTRO_TIMEOUT_ARGS=(
  -e "TIMEOUT_FASTEST=${TIMEOUT_FASTEST:-2000}"
  -e "TIMEOUT_FASTER=${TIMEOUT_FASTER:-3000}"
  -e "TIMEOUT_FAST=${TIMEOUT_FAST:-5000}"
  -e "TIMEOUT_SLOW=${TIMEOUT_SLOW:-8000}"
  -e "TIMEOUT_SLOWER=${TIMEOUT_SLOWER:-12000}"
  -e "TIMEOUT_SLOWEST=${TIMEOUT_SLOWEST:-20000}"
)

SPEC_RAW="${1:-$DEFAULT_SPEC}"
TS="$(date +%Y%m%d-%H%M%S)"
REPORT_DIR="$REPO_ROOT/.artifacts/mobile-e2e-reports/$TS"
# One Maestro output dir per OS + form-factor slot (phone today; tablet slots reserved).
IOS_PHONE_DIR="$REPORT_DIR/ios-phone"
ANDROID_PHONE_DIR="$REPORT_DIR/android-phone"
LATEST_LINK="$REPO_ROOT/.artifacts/mobile-e2e-reports/latest"

if ! command -v maestro >/dev/null 2>&1; then
  echo "Maestro CLI is not installed or not on PATH." >&2
  echo "Install via the repo flake (maestro) or https://docs.maestro.dev/getting-started/installing-maestro" >&2
  exit 1
fi

if ! lsof -nP -iTCP:"$MOBILE_METRO_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Error: Metro is not listening on port ${MOBILE_METRO_PORT}." >&2
  echo "Start it in another terminal: npm run mobile:dev:e2e (full suite) or npm run mobile:dev" >&2
  exit 1
fi

FLOWS=()
NEEDS_E2E_API=0
NEEDS_TEST_ASSETS=0

if [[ "$SPEC_RAW" == "all" ]]; then
  # Auto-discover top-level flows so new apps/mobile/e2e/<area>.yaml joins the suite.
  while IFS= read -r flow_path; do
    FLOWS+=("$flow_path")
  done < <(find "$E2E_DIR" -maxdepth 1 -type f -name '*.yaml' | LC_ALL=C sort)
  if [[ "${#FLOWS[@]}" -eq 0 ]]; then
    echo "Error: no flows found under apps/mobile/e2e/*.yaml" >&2
    exit 1
  fi
  NEEDS_E2E_API=1
  # Full suite includes playback flows that hit :2111.
  NEEDS_TEST_ASSETS=1
else
  SPEC_LIST="${SPEC_RAW//,/ }"
  for spec in $SPEC_LIST; do
    FLOW_PATH="apps/mobile/e2e/${spec}.yaml"
    if [[ ! -f "$FLOW_PATH" ]]; then
      echo "Missing mobile E2E flow: $FLOW_PATH" >&2
      echo "Expected values map to apps/mobile/e2e/<area>.yaml (or pass all)" >&2
      exit 1
    fi
    FLOWS+=("$FLOW_PATH")
    if flow_needs_e2e_api "$spec"; then
      NEEDS_E2E_API=1
    fi
    if flow_needs_test_assets "$spec"; then
      NEEDS_TEST_ASSETS=1
    fi
  done
fi

if [[ "$NEEDS_E2E_API" -eq 1 ]]; then
  if ! lsof -nP -iTCP:"$MOBILE_E2E_API_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Error: API-backed flows need the mobile E2E API on :${MOBILE_E2E_API_PORT}." >&2
    echo "Start it in tab Mobile E2E API: npm run mobile:e2e:api" >&2
    echo "(Leave-running; no need to restart when only reloading Metro.)" >&2
    exit 1
  fi

  # Fail fast when the leave-running API was started before PODVERSE_E2E_FIXTURES
  # (search + add-by-RSS fixtures). Health includes fixturesEnabled after rebuild.
  HEALTH_URL="http://127.0.0.1:${MOBILE_E2E_API_PORT}/api/v2/health"
  HEALTH_JSON="$(curl -sf "$HEALTH_URL" 2>/dev/null || true)"
  if ! printf '%s' "$HEALTH_JSON" | grep -q '"fixturesEnabled"[[:space:]]*:[[:space:]]*true'; then
    echo "Error: Mobile E2E API on :${MOBILE_E2E_API_PORT} is stale (no fixtures)." >&2
    echo "Restart it in tab Mobile E2E API so dist rebuilds with PODVERSE_E2E_FIXTURES:" >&2
    echo "  npm run mobile:e2e:api" >&2
    echo "Health check: ${HEALTH_URL}" >&2
    exit 1
  fi

  # Mirror web Playwright make targets: always seed before API-backed Maestro.
  echo "Seeding mobile E2E DB (make mobile_e2e_seed — reuses web seed)..."
  make mobile_e2e_seed

  # Metro must be E2E-mode (mobile:dev:e2e) for API-backed / full-suite flows.
  # Only fail when we can positively read Metro's env and the E2E flag is absent.
  METRO_PIDS="$(lsof -nP -iTCP:"$MOBILE_METRO_PORT" -sTCP:LISTEN -t 2>/dev/null || true)"
  METRO_ENV=""
  for mpid in $METRO_PIDS; do
    METRO_ENV+="$(ps eww "$mpid" 2>/dev/null || true)"$'\n'
  done
  if printf '%s' "$METRO_ENV" | grep -q 'EXPO_PUBLIC_'; then
    if ! printf '%s' "$METRO_ENV" | grep -q 'EXPO_PUBLIC_MOBILE_E2E=1'; then
      echo "Error: Metro on :${MOBILE_METRO_PORT} is UI-only (mobile:dev)." >&2
      echo "API-backed / full-suite flows need E2E Metro. Restart it in Mobile Metro:" >&2
      echo "  npm run mobile:dev:e2e" >&2
      echo "Then reload/reinstall the app so it targets :${MOBILE_E2E_API_PORT}." >&2
      exit 1
    fi
  fi
fi

if [[ "$NEEDS_TEST_ASSETS" -eq 1 ]]; then
  if ! lsof -nP -iTCP:"$MOBILE_E2E_TEST_ASSETS_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Error: playback flows need tools/test-assets on :${MOBILE_E2E_TEST_ASSETS_PORT}." >&2
    echo "Start it in tab Mobile E2E test-assets: npm run mobile:e2e:test-assets" >&2
    echo "(Same server as web Playwright; leave-running.)" >&2
    exit 1
  fi

  # mobile:e2e:test-assets binds 0.0.0.0 (IPv4). Use 127.0.0.1 — not localhost —
  # so preflight matches Android/iOS media hosts and does not prefer [::1].
  FIXTURE_URL="http://127.0.0.1:${MOBILE_E2E_TEST_ASSETS_PORT}/e2e/audio/e2e-addbyrss-fresh-60s-440hz.mp3"
  if ! curl -sf --output /dev/null --range 0-0 "$FIXTURE_URL" >/dev/null 2>&1; then
    echo "Error: test-assets on :${MOBILE_E2E_TEST_ASSETS_PORT} is not serving E2E fixtures." >&2
    echo "Restart in tab Mobile E2E test-assets: npm run mobile:e2e:test-assets" >&2
    echo "Health: npm run mobile:e2e:test-assets:health" >&2
    exit 1
  fi
fi

mkdir -p "$IOS_PHONE_DIR" "$ANDROID_PHONE_DIR"
rm -f "$LATEST_LINK"
ln -sfn "$TS" "$LATEST_LINK"

echo "=== Mobile E2E report run ==="
echo "Flows: ${FLOWS[*]}"
echo "Report dir: $REPORT_DIR"
echo "Booting E2E devices (no install)..."
bash "$SCRIPT_DIR/ensure-devices.sh" e2e

IOS_UDID=""
ANDROID_SERIAL=""
if [[ "$(uname -s)" == "Darwin" ]]; then
  IOS_UDID="$(bash "$SCRIPT_DIR/ensure-devices.sh" resolve-e2e-ios-udid)"
  echo "E2E iOS UDID: $IOS_UDID"
  if ! bash "$SCRIPT_DIR/ensure-devices.sh" check-e2e-app-ios >/dev/null 2>&1; then
    echo "Error: app not installed on E2E iOS (${E2E_IOS_NAME})." >&2
    echo "In another terminal: npm run mobile:e2e:ios" >&2
    exit 1
  fi
fi

if ANDROID_SERIAL="$(bash "$SCRIPT_DIR/ensure-devices.sh" resolve-e2e-android-serial 2>/dev/null)"; then
  echo "E2E Android serial: $ANDROID_SERIAL"
  if ! bash "$SCRIPT_DIR/ensure-devices.sh" check-e2e-app-android >/dev/null 2>&1; then
    echo "Error: app not installed on E2E Android (${E2E_ANDROID_AVD})." >&2
    echo "In another terminal: npm run mobile:e2e:android" >&2
    exit 1
  fi
else
  echo "Warning: E2E Android not available; iOS-only Maestro run this pass."
  ANDROID_SERIAL=""
fi

# Flow-scoped retries after the initial suite pass (not a full-suite re-run).
# Set MOBILE_E2E_FLOW_RETRIES=0 to disable. Default 1 recovers Dev Client relaunch flakes.
MOBILE_E2E_FLOW_RETRIES="${MOBILE_E2E_FLOW_RETRIES:-1}"

# Run Maestro for a platform slot; on failure, re-run only still-failed flow YAMLs.
# Usage: run_maestro_slot <device-id> <slot-dir> <label> <flow...>
run_maestro_slot() {
  local device="$1"
  local slot_dir="$2"
  local label="$3"
  shift 3
  local -a suite_flows=("$@")
  local -a current_flows=("${suite_flows[@]}")
  local attempt=0
  local max_attempts=$((MOBILE_E2E_FLOW_RETRIES + 1))
  local rc=0

  mkdir -p "$slot_dir"

  while ((attempt < max_attempts)); do
    if ((attempt > 0)); then
      echo "Retrying failed ${label} flows (${attempt}/${MOBILE_E2E_FLOW_RETRIES}): ${current_flows[*]}"
    fi

    set +e
    maestro --device "$device" test \
      --format=HTML \
      --output "$slot_dir/maestro.html" \
      --test-output-dir "$slot_dir" \
      "${MAESTRO_TIMEOUT_ARGS[@]}" \
      "${current_flows[@]}"
    rc=$?
    set -e

    if [[ "$rc" -eq 0 ]]; then
      return 0
    fi

    if ((attempt >= MOBILE_E2E_FLOW_RETRIES)); then
      return 1
    fi

    local -a failed_flows=()
    while IFS= read -r flow_path; do
      [[ -n "$flow_path" ]] && failed_flows+=("$flow_path")
    done < <(node "$SCRIPT_DIR/e2e-list-failed-flows.mjs" "$slot_dir" "${suite_flows[@]}")

    if [[ "${#failed_flows[@]}" -eq 0 ]]; then
      echo "Maestro exited non-zero for ${label} but no failed flow YAMLs were detected; not retrying."
      return 1
    fi

    current_flows=("${failed_flows[@]}")
    attempt=$((attempt + 1))
  done

  return 1
}

EXIT_CODE=0
RAN_ANY=0

if [[ -n "$IOS_UDID" ]]; then
  RAN_ANY=1
  echo "--- Maestro iOS phone (${E2E_IOS_NAME}) → ios-phone/ ---"
  if ! run_maestro_slot "$IOS_UDID" "$IOS_PHONE_DIR" "iOS" "${FLOWS[@]}"; then
    EXIT_CODE=1
  fi
fi

if [[ -n "$ANDROID_SERIAL" ]]; then
  RAN_ANY=1
  echo "--- Maestro Android phone (${E2E_ANDROID_AVD}) → android-phone/ ---"
  if ! run_maestro_slot "$ANDROID_SERIAL" "$ANDROID_PHONE_DIR" "Android" "${FLOWS[@]}"; then
    EXIT_CODE=1
  fi
fi

if [[ "$RAN_ANY" -eq 0 ]]; then
  echo "Error: no E2E devices available for Maestro." >&2
  exit 1
fi

node "$SCRIPT_DIR/e2e-html-report.mjs" "$REPORT_DIR"
echo "Mobile E2E hub: $REPORT_DIR/index.html"
echo "  Failures JSON: $REPORT_DIR/failures.json"
echo "  iOS phone:     $REPORT_DIR/ios-phone/index.html"
echo "  Android phone: $REPORT_DIR/android-phone/index.html"
echo "Latest symlink: $LATEST_LINK"

if command -v open >/dev/null 2>&1; then
  [[ -f "$REPORT_DIR/index.html" ]] && open "$REPORT_DIR/index.html" 2>/dev/null || true
elif command -v xdg-open >/dev/null 2>&1; then
  [[ -f "$REPORT_DIR/index.html" ]] && xdg-open "$REPORT_DIR/index.html" >/dev/null 2>&1 || true
fi

if [[ "$EXIT_CODE" -ne 0 ]]; then
  echo ""
  echo "Mobile E2E failed. Hints:"
  echo "  - Agent/operator triage (prefer failures.json first):"
  echo "      open $REPORT_DIR/failures.json"
  echo "      open $REPORT_DIR/ios-phone/index.html"
  echo "      open $REPORT_DIR/android-phone/index.html"
  echo "  - Per-flow pages: $REPORT_DIR/<slot>/flows/<slug>/index.html"
  echo "  - Metro: npm run mobile:dev (UI-only) or npm run mobile:dev:e2e (API-backed)"
  echo "  - Mobile E2E API (API-backed flows): npm run mobile:e2e:api"
  echo "  - Install E2E iOS: npm run mobile:e2e:ios"
  echo "  - Install E2E Android: npm run mobile:e2e:android"
  exit 1
fi
