#!/usr/bin/env bash
# Guardrail: runtime code must not attempt CREATE EXTENSION.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PATTERN='CREATE[[:space:]]+EXTENSION'

if command -v rg >/dev/null 2>&1; then
  if rg -n -i "$PATTERN" "$REPO_ROOT/apps" "$REPO_ROOT/packages" >/dev/null; then
    echo "ERROR: Found CREATE EXTENSION in runtime app/package code. Move extension setup to DB bootstrap only." >&2
    rg -n -i "$PATTERN" "$REPO_ROOT/apps" "$REPO_ROOT/packages" || true
    exit 1
  fi
else
  echo "WARNING: 'rg' not found; falling back to grep for runtime CREATE EXTENSION guard." >&2
  if grep -R -n -E -i "$PATTERN" "$REPO_ROOT/apps" "$REPO_ROOT/packages" >/dev/null; then
    echo "ERROR: Found CREATE EXTENSION in runtime app/package code. Move extension setup to DB bootstrap only." >&2
    grep -R -n -E -i "$PATTERN" "$REPO_ROOT/apps" "$REPO_ROOT/packages" || true
    exit 1
  fi
fi

echo "No runtime CREATE EXTENSION statements found."
