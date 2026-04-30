#!/usr/bin/env bash
# Guardrail: runtime code must not attempt CREATE EXTENSION.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PATTERN='CREATE[[:space:]]+EXTENSION'

if rg -n -i "$PATTERN" "$REPO_ROOT/apps" "$REPO_ROOT/packages" >/dev/null; then
  echo "ERROR: Found CREATE EXTENSION in runtime app/package code. Move extension setup to DB bootstrap only." >&2
  rg -n -i "$PATTERN" "$REPO_ROOT/apps" "$REPO_ROOT/packages" || true
  exit 1
fi

echo "No runtime CREATE EXTENSION statements found."
