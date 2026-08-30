#!/usr/bin/env bash
# Run Maestro on E2E iOS + Android and write HTML screenshot reports.
# Prerequisites (separate terminals): npm run mobile:dev, mobile:e2e:ios, mobile:e2e:android
# Usage (monorepo root):
#   bash scripts/mobile/e2e-test.sh
#   bash scripts/mobile/e2e-test.sh hello-world
#   bash scripts/mobile/e2e-test.sh hello-world,locale-switch-home-smoke
#   bash scripts/mobile/e2e-test.sh all   # every apps/mobile/e2e/*.yaml (not shared/)
#   bash scripts/mobile/e2e-test.sh --platform ios home
#   bash scripts/mobile/e2e-test.sh --platform android home
#   bash scripts/mobile/e2e-test.sh --reset-data --platform ios subscriptions-anonymous

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

E2E_IOS_NAME='iPhone 17 Pro E2E'
E2E_ANDROID_AVD='Pixel_6_Pro_API_33_e2e'
E2E_IOS_TABLET_NAME='iPad Pro 13-inch (M4) E2E'
E2E_ANDROID_TABLET_AVD='Pixel_Tablet_API_33_e2e'
MOBILE_APP_ID='com.podverse.app.next'
MOBILE_METRO_PORT="${MOBILE_METRO_PORT:-8081}"
MOBILE_E2E_API_PORT="${MOBILE_E2E_API_PORT:-4230}"
MOBILE_E2E_TEST_ASSETS_PORT="${MOBILE_E2E_TEST_ASSETS_PORT:-2111}"
MOBILE_E2E_API_PID_FILE="$REPO_ROOT/.artifacts/mobile-e2e-api/api.pid"
DEFAULT_SPEC='hello-world'
E2E_DIR="$REPO_ROOT/apps/mobile/e2e"
TIMEOUTS_ENV="$E2E_DIR/shared/timeouts.env"

# Basename list (comma-free) of top-level flows that need :4230. Keep in sync when adding
# API-backed apps/mobile/e2e/<area>.yaml — full suite (`all`) always requires the API.
flow_needs_e2e_api() {
  case "$1" in
  add-by-rss | api-health | auth-login | auth-logout | auto-queue-advance | deep-link | \
  detail-sort-prefs | engine-audio-spike | home | library-downloads | library-playlists | \
  membership-gate | opml | play-mini-player | podcast-episode | push | queue-add | search | \
  search-unparsed | subscriptions-anonymous | tab-switch-playback | tablet | v4v | \
  video-transition)
    return 0
    ;;
  *)
    return 1
    ;;
  esac
}

# Flows that must run on tablet devices (ios-tablet / android-tablet slots), not phones.
flow_needs_tablet() {
  case "$1" in
  tablet)
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
  add-by-rss | auto-queue-advance | engine-audio-spike | library-downloads | play-mini-player | \
  tab-switch-playback | tablet | v4v | video-transition)
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

PLATFORM='both'
SPEC_RAW=''
RESET_DATA=0
while [[ "$#" -gt 0 ]]; do
  case "$1" in
  --reset-data)
    RESET_DATA=1
    shift
    ;;
  --platform)
    if [[ "$#" -lt 2 ]]; then
      echo "Missing value for --platform. Expected ios, android, or both." >&2
      exit 1
    fi
    PLATFORM="$2"
    shift 2
    ;;
  --platform=*)
    PLATFORM="${1#*=}"
    shift
    ;;
  -*)
    echo "Unknown option: $1" >&2
    echo "Usage: bash scripts/mobile/e2e-test.sh [--reset-data] [--platform ios|android|both] [flow|all]" >&2
    exit 1
    ;;
  *)
    if [[ -n "$SPEC_RAW" ]]; then
      echo "Only one flow selector may be provided: $SPEC_RAW" >&2
      exit 1
    fi
    SPEC_RAW="$1"
    shift
    ;;
  esac
done

case "$PLATFORM" in
ios | android | both)
  ;;
*)
  echo "Invalid platform: $PLATFORM. Expected ios, android, or both." >&2
  exit 1
  ;;
esac

SPEC_RAW="${SPEC_RAW:-$DEFAULT_SPEC}"
TS="$(date +%Y%m%d-%H%M%S)"
REPORT_DIR="$REPO_ROOT/.artifacts/mobile-e2e-reports/$TS"
# One Maestro output dir per OS + form-factor slot.
IOS_PHONE_DIR="$REPORT_DIR/ios-phone"
ANDROID_PHONE_DIR="$REPORT_DIR/android-phone"
IOS_TABLET_DIR="$REPORT_DIR/ios-tablet"
ANDROID_TABLET_DIR="$REPORT_DIR/android-tablet"
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
NEEDS_TABLET=0

if [[ "$SPEC_RAW" == "all" ]]; then
  # Auto-discover top-level flows so new apps/mobile/e2e/<area>.yaml joins the suite.
  # Exclude tablet-only flows — they need opt-in tablet devices (`npm run mobile:e2e:test -- tablet`).
  while IFS= read -r flow_path; do
    base="$(basename "$flow_path" .yaml)"
    if flow_needs_tablet "$base"; then
      continue
    fi
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
    if flow_needs_tablet "$spec"; then
      NEEDS_TABLET=1
    fi
  done
fi

if [[ "$NEEDS_TABLET" -eq 1 ]]; then
  for flow_path in "${FLOWS[@]}"; do
    base="$(basename "$flow_path" .yaml)"
    if ! flow_needs_tablet "$base"; then
      echo "Error: tablet flows cannot be mixed with phone flows in one run (${base})." >&2
      echo "Run tablet alone: npm run mobile:e2e:test -- tablet" >&2
      exit 1
    fi
  done
fi

seed_mobile_e2e_db_safely() {
  local api_was_managed=0
  local api_pid=''

  if [[ -f "$MOBILE_E2E_API_PID_FILE" ]]; then
    api_pid="$(<"$MOBILE_E2E_API_PID_FILE")"
    if kill -0 "$api_pid" >/dev/null 2>&1; then
      echo "Stopping managed mobile E2E API before reseeding..."
      bash "$REPO_ROOT/scripts/mobile/e2e-api.sh" stop
      api_was_managed=1
    fi
  fi

  if lsof -nP -iTCP:"$MOBILE_E2E_API_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Error: cannot reseed while an unmanaged mobile E2E API is listening on :${MOBILE_E2E_API_PORT}." >&2
    echo "Stop the foreground API, then rerun it with npm run mobile:e2e:api:bg so the runner can manage its lifecycle." >&2
    exit 1
  fi

  if ! make mobile_e2e_seed; then
    if [[ "$api_was_managed" -eq 1 ]]; then
      echo "Restarting managed mobile E2E API after failed reseed..."
      bash "$REPO_ROOT/scripts/mobile/e2e-api.sh" start-bg || true
    fi
    return 1
  fi

  if [[ "$api_was_managed" -eq 1 ]]; then
    echo "Restarting managed mobile E2E API after reseeding..."
    bash "$REPO_ROOT/scripts/mobile/e2e-api.sh" start-bg
  fi
}

wait_for_mobile_e2e_api_health() {
  local health_url="$1"
  local health_json=''

  for attempt in {1..30}; do
    health_json="$(curl -sf "$health_url" 2>/dev/null || true)"
    if printf '%s' "$health_json" | grep -q '"fixturesEnabled"[[:space:]]*:[[:space:]]*true'; then
      return 0
    fi
    if ((attempt < 30)); then
      sleep 1
    fi
  done

  return 1
}

if [[ "$NEEDS_E2E_API" -eq 1 ]]; then
  if ! lsof -nP -iTCP:"$MOBILE_E2E_API_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Error: API-backed flows need the mobile E2E API on :${MOBILE_E2E_API_PORT}." >&2
    echo "Start it in tab Mobile E2E API: npm run mobile:e2e:api:bg" >&2
    echo "(Leave-running; no need to restart when only reloading Metro.)" >&2
    exit 1
  fi

  # Fail fast when the leave-running API was started before PODVERSE_E2E_FIXTURES
  # (search + add-by-RSS fixtures). Health includes fixturesEnabled after rebuild.
  HEALTH_URL="http://127.0.0.1:${MOBILE_E2E_API_PORT}/api/v2/health"
  if ! wait_for_mobile_e2e_api_health "$HEALTH_URL"; then
    echo "Error: Mobile E2E API on :${MOBILE_E2E_API_PORT} is stale (no fixtures)." >&2
    echo "Restart it in tab Mobile E2E API so dist rebuilds with PODVERSE_E2E_FIXTURES:" >&2
    echo "  npm run mobile:e2e:api:bg" >&2
    echo "Health check: ${HEALTH_URL}" >&2
    exit 1
  fi

  # Mirror web Playwright make targets: always seed before API-backed Maestro.
  echo "Seeding mobile E2E DB (make mobile_e2e_seed — reuses web seed)..."
  seed_mobile_e2e_db_safely

  if ! wait_for_mobile_e2e_api_health "$HEALTH_URL"; then
    echo "Error: Mobile E2E API on :${MOBILE_E2E_API_PORT} is unavailable after reseeding." >&2
    echo "Restart it in tab Mobile E2E API: npm run mobile:e2e:api:bg" >&2
    echo "Health check: ${HEALTH_URL}" >&2
    exit 1
  fi

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
    echo "Start it in tab Mobile E2E test-assets: npm run mobile:e2e:test-assets:bg" >&2
    echo "(Same server as web Playwright; leave-running.)" >&2
    exit 1
  fi

  # mobile:e2e:test-assets binds 0.0.0.0 (IPv4). Use 127.0.0.1 — not localhost —
  # so preflight matches Android/iOS media hosts and does not prefer [::1].
  FIXTURE_URL="http://127.0.0.1:${MOBILE_E2E_TEST_ASSETS_PORT}/e2e/audio/e2e-addbyrss-fresh-60s-440hz.mp3"
  if ! curl -sf --output /dev/null --range 0-0 "$FIXTURE_URL" >/dev/null 2>&1; then
    echo "Error: test-assets on :${MOBILE_E2E_TEST_ASSETS_PORT} is not serving E2E fixtures." >&2
    echo "Restart in tab Mobile E2E test-assets: npm run mobile:e2e:test-assets:bg" >&2
    echo "Health: npm run mobile:e2e:test-assets:health" >&2
    exit 1
  fi
fi

rm -f "$LATEST_LINK"
ln -sfn "$TS" "$LATEST_LINK"

echo "=== Mobile E2E report run ==="
echo "Flows: ${FLOWS[*]}"
echo "Report dir: $REPORT_DIR"

IOS_UDID=""
ANDROID_SERIAL=""
IOS_SLOT_DIR="$IOS_PHONE_DIR"
ANDROID_SLOT_DIR="$ANDROID_PHONE_DIR"
IOS_DEVICE_LABEL="$E2E_IOS_NAME"
ANDROID_DEVICE_LABEL="$E2E_ANDROID_AVD"
IOS_SLOT_NAME="ios-phone"
ANDROID_SLOT_NAME="android-phone"

REPORT_FINALIZED=0
REPORT_INTERRUPTED=0

finalize_report() {
  if [[ "$REPORT_FINALIZED" -eq 1 || ! -d "$REPORT_DIR" ]]; then
    return 0
  fi
  REPORT_FINALIZED=1

  if [[ "$REPORT_INTERRUPTED" -eq 1 ]]; then
    echo "Finalizing partial mobile E2E report after interruption..."
    if ! MOBILE_E2E_REPORT_PARTIAL=1 node "$SCRIPT_DIR/e2e-html-report.mjs" "$REPORT_DIR"; then
      echo "Warning: unable to finalize the partial mobile E2E report." >&2
      return 0
    fi
  else
    node "$SCRIPT_DIR/e2e-html-report.mjs" "$REPORT_DIR"
  fi

  echo "Mobile E2E hub: $REPORT_DIR/index.html"
  echo "  Failures JSON: $REPORT_DIR/failures.json"
  if [[ -d "$IOS_SLOT_DIR" ]]; then
    echo "  ${IOS_SLOT_NAME}: $IOS_SLOT_DIR/index.html"
  fi
  if [[ -d "$ANDROID_SLOT_DIR" ]]; then
    echo "  ${ANDROID_SLOT_NAME}: $ANDROID_SLOT_DIR/index.html"
  fi
  echo "Latest symlink: $LATEST_LINK"

  if [[ "$REPORT_INTERRUPTED" -eq 0 ]]; then
    if command -v open >/dev/null 2>&1; then
      [[ -f "$REPORT_DIR/index.html" ]] && open "$REPORT_DIR/index.html" 2>/dev/null || true
    elif command -v xdg-open >/dev/null 2>&1; then
      [[ -f "$REPORT_DIR/index.html" ]] && xdg-open "$REPORT_DIR/index.html" >/dev/null 2>&1 || true
    fi
  fi
}

handle_interrupt() {
  REPORT_INTERRUPTED=1
  echo "Mobile E2E interrupted; preserving available report artifacts." >&2
  finalize_report
  trap - EXIT
  exit 130
}

handle_termination() {
  REPORT_INTERRUPTED=1
  echo "Mobile E2E terminated; preserving available report artifacts." >&2
  finalize_report
  trap - EXIT
  exit 143
}

handle_exit() {
  local exit_code="$?"
  trap - EXIT
  finalize_report
  exit "$exit_code"
}

trap handle_interrupt INT
trap handle_termination TERM
trap handle_exit EXIT

reset_app_data() {
  local device="$1"
  local platform="$2"

  if [[ "$platform" == 'ios' ]]; then
    local app_bundle
    local reset_dir
    app_bundle="$(xcrun simctl get_app_container "$device" "$MOBILE_APP_ID" app)"
    reset_dir="$(mktemp -d "${TMPDIR:-/tmp}/podverse-e2e-reset.XXXXXX")"
    cp -R "$app_bundle" "$reset_dir/PodverseNext.app"
    echo "Resetting iOS E2E app data..."
    xcrun simctl uninstall "$device" "$MOBILE_APP_ID" >/dev/null
    xcrun simctl install "$device" "$reset_dir/PodverseNext.app" >/dev/null
    rm -rf "$reset_dir"
    return
  fi

  echo "Resetting Android E2E app data..."
  adb -s "$device" shell pm clear "$MOBILE_APP_ID" >/dev/null
}

if [[ "$NEEDS_TABLET" -eq 1 ]]; then
  IOS_SLOT_DIR="$IOS_TABLET_DIR"
  ANDROID_SLOT_DIR="$ANDROID_TABLET_DIR"
  IOS_DEVICE_LABEL="$E2E_IOS_TABLET_NAME"
  ANDROID_DEVICE_LABEL="$E2E_ANDROID_TABLET_AVD"
  IOS_SLOT_NAME="ios-tablet"
  ANDROID_SLOT_NAME="android-tablet"
  echo "Booting E2E tablet devices (no install)..."
  if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "both" ]]; then
    mkdir -p "$IOS_TABLET_DIR"
    if [[ "$(uname -s)" == "Darwin" ]]; then
      bash "$SCRIPT_DIR/ensure-devices.sh" e2e-ios-tablet
      IOS_UDID="$(bash "$SCRIPT_DIR/ensure-devices.sh" resolve-e2e-ios-tablet-udid)"
      echo "E2E iOS tablet UDID: $IOS_UDID"
      if ! bash "$SCRIPT_DIR/ensure-devices.sh" check-e2e-app-ios-tablet >/dev/null 2>&1; then
        echo "Error: app not installed on E2E iOS tablet (${E2E_IOS_TABLET_NAME})." >&2
        echo "In another terminal: npm run mobile:e2e:ios:tablet" >&2
        exit 1
      fi
    fi
  fi
  if [[ "$PLATFORM" == "android" || "$PLATFORM" == "both" ]]; then
    mkdir -p "$ANDROID_TABLET_DIR"
    if ANDROID_SERIAL="$(bash "$SCRIPT_DIR/ensure-devices.sh" resolve-e2e-android-tablet-serial 2>/dev/null)"; then
      echo "E2E Android tablet serial: $ANDROID_SERIAL"
      if ! bash "$SCRIPT_DIR/ensure-devices.sh" check-e2e-app-android-tablet >/dev/null 2>&1; then
        echo "Error: app not installed on E2E Android tablet (${E2E_ANDROID_TABLET_AVD})." >&2
        echo "In another terminal: npm run mobile:e2e:android:tablet" >&2
        exit 1
      fi
    else
      echo "Warning: E2E Android tablet not available; iOS-tablet-only Maestro run this pass."
      ANDROID_SERIAL=""
    fi
  fi
else
  echo "Booting E2E phone devices (no install)..."
  if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "both" ]]; then
    mkdir -p "$IOS_PHONE_DIR"
    if [[ "$(uname -s)" == "Darwin" ]]; then
      bash "$SCRIPT_DIR/ensure-devices.sh" e2e-ios
      IOS_UDID="$(bash "$SCRIPT_DIR/ensure-devices.sh" resolve-e2e-ios-udid)"
      echo "E2E iOS UDID: $IOS_UDID"
      if ! bash "$SCRIPT_DIR/ensure-devices.sh" check-e2e-app-ios >/dev/null 2>&1; then
        echo "Error: app not installed on E2E iOS (${E2E_IOS_NAME})." >&2
        echo "In another terminal: npm run mobile:e2e:ios" >&2
        exit 1
      fi
    fi
  fi
  if [[ "$PLATFORM" == "android" || "$PLATFORM" == "both" ]]; then
    mkdir -p "$ANDROID_PHONE_DIR"
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
  fi
fi

# Flow-scoped retries after the initial suite pass (not a full-suite re-run).
# Set MOBILE_E2E_FLOW_RETRIES to a positive number to opt in.
MOBILE_E2E_FLOW_RETRIES="${MOBILE_E2E_FLOW_RETRIES:-0}"

# Run Maestro for a platform slot; on failure, re-run only still-failed flow YAMLs.
# Usage: run_maestro_slot <device-id> <slot-dir> <label> <platform> <flow...>
run_maestro_slot() {
  local device="$1"
  local slot_dir="$2"
  local label="$3"
  local platform="$4"
  shift 3
  shift 1
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

    if [[ "$RESET_DATA" -eq 1 ]]; then
      rc=0
      for flow_path in "${current_flows[@]}"; do
        local flow_name
        local run_dir
        local flow_rc
        flow_name="$(basename "$flow_path" .yaml)"
        run_dir="$slot_dir/runs/$flow_name"
        mkdir -p "$run_dir"
        echo "Running clean-state ${label} flow: ${flow_name}"
        reset_app_data "$device" "$platform"
        set +e
        maestro --device "$device" test \
          --format=HTML \
          --output "$run_dir/maestro.html" \
          --test-output-dir "$run_dir" \
          "${MAESTRO_TIMEOUT_ARGS[@]}" \
          "$flow_path"
        flow_rc=$?
        set -e
        if [[ "$flow_rc" -ne 0 ]]; then
          rc=1
        fi
      done
    else
      set +e
      maestro --device "$device" test \
        --format=HTML \
        --output "$slot_dir/maestro.html" \
        --test-output-dir "$slot_dir" \
        "${MAESTRO_TIMEOUT_ARGS[@]}" \
        "${current_flows[@]}"
      rc=$?
      set -e
    fi

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
  echo "--- Maestro ${IOS_SLOT_NAME} (${IOS_DEVICE_LABEL}) → ${IOS_SLOT_NAME}/ ---"
  if ! run_maestro_slot "$IOS_UDID" "$IOS_SLOT_DIR" "iOS" 'ios' "${FLOWS[@]}"; then
    EXIT_CODE=1
  fi
fi

if [[ -n "$ANDROID_SERIAL" ]]; then
  RAN_ANY=1
  echo "--- Maestro ${ANDROID_SLOT_NAME} (${ANDROID_DEVICE_LABEL}) → ${ANDROID_SLOT_NAME}/ ---"
  if ! run_maestro_slot "$ANDROID_SERIAL" "$ANDROID_SLOT_DIR" "Android" 'android' "${FLOWS[@]}"; then
    EXIT_CODE=1
  fi
fi

if [[ "$RAN_ANY" -eq 0 ]]; then
  echo "Error: no E2E devices available for Maestro." >&2
  exit 1
fi

finalize_report

if [[ "$EXIT_CODE" -ne 0 ]]; then
  echo ""
  echo "Mobile E2E failed. Hints:"
  echo "  - Agent/operator triage (prefer failures.json first):"
  echo "      open $REPORT_DIR/failures.json"
  if [[ "$NEEDS_TABLET" -eq 1 ]]; then
    echo "      open $REPORT_DIR/ios-tablet/index.html"
    echo "      open $REPORT_DIR/android-tablet/index.html"
    echo "  - Install E2E iOS tablet: npm run mobile:e2e:ios:tablet"
    echo "  - Install E2E Android tablet: npm run mobile:e2e:android:tablet"
  else
    echo "      open $REPORT_DIR/ios-phone/index.html"
    echo "      open $REPORT_DIR/android-phone/index.html"
    echo "  - Install E2E iOS: npm run mobile:e2e:ios"
    echo "  - Install E2E Android: npm run mobile:e2e:android"
  fi
  echo "  - Per-flow pages: $REPORT_DIR/<slot>/flows/<slug>/index.html"
  echo "  - Metro: npm run mobile:dev (UI-only) or npm run mobile:dev:e2e (API-backed)"
  echo "  - Mobile E2E API (API-backed flows): npm run mobile:e2e:api"
  exit 1
fi
