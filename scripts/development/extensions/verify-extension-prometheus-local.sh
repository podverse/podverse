#!/usr/bin/env bash
set -euo pipefail

HEALTH_URL="${PROMETHEUS_HEALTH_URL:-http://127.0.0.1:9464/extensions/prometheus/health}"
METRICS_URL="${PROMETHEUS_METRICS_URL:-http://127.0.0.1:9464/extensions/prometheus/metrics}"

echo "Checking extension-prometheus health: ${HEALTH_URL}"
curl -fsS "$HEALTH_URL" >/dev/null

echo "Checking extension-prometheus metrics: ${METRICS_URL}"
curl -fsS "$METRICS_URL" | head -5

echo "OK: extension-prometheus is reachable locally."
