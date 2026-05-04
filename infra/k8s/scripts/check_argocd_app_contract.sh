#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-argocd/podverse-alpha}"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "ERROR: target directory not found: $TARGET_DIR" >&2
  exit 1
fi

check_wave() {
  local app="$1"
  local wave="$2"
  local file="$TARGET_DIR/$app.yaml"
  if [[ ! -f "$file" ]]; then
    echo "ERROR: missing app manifest: $file" >&2
    return 1
  fi
  if ! rg -q "argocd\.argoproj\.io/sync-wave:[[:space:]]*\"$wave\"" "$file"; then
    echo "ERROR: $file missing expected sync-wave \"$wave\"" >&2
    return 1
  fi
}

check_wave common -3
check_wave db -2
check_wave keyvaldb -2
check_wave mq -2
check_wave ops -1
check_wave api 0
check_wave management-api 0
check_wave web 1
check_wave management-web 1

echo "Argo app contract check passed for $TARGET_DIR"
