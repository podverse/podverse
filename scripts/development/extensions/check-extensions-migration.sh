#!/usr/bin/env bash
# Verifies extensions migration: no prom-client in main apps; K8s extensions base builds.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$REPO_ROOT"

echo "Checking prom-client is not a dependency of main app workspaces..."
if rg -l 'prom-client' apps/api apps/management-api apps/web apps/management-web apps/workers packages/extension-metrics-sdk 2>/dev/null; then
  echo "ERROR: prom-client found in an app or extension-metrics-sdk package (expected only in extensions/prometheus)."
  exit 1
fi

if ! rg -q 'prom-client' extensions/prometheus/package.json 2>/dev/null; then
  echo "NOTE: extensions/prometheus may bundle prom-client via otelcol only (no direct dep in package.json)."
fi

echo "Building K8s extensions base..."
if command -v kustomize >/dev/null 2>&1; then
  kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/base/extensions/ >/dev/null
  echo "kustomize build infra/k8s/base/extensions/ OK"
else
  echo "WARN: kustomize not on PATH; skip extensions base build"
fi

echo "Extensions migration checks passed."
