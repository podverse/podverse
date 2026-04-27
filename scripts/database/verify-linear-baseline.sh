#!/usr/bin/env bash
# Fail if 0003_linear_baseline.sql does not match generate-linear-baseline.sh output.
# Use in CI and after editing ops/source/migrations. Requires Docker.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUT="$REPO_ROOT/infra/k8s/base/db/source/bootstrap/0003_linear_baseline.sql"
if [[ ! -f "$OUT" ]]; then
  echo "Missing baseline: $OUT" >&2
  echo "Run: bash scripts/database/generate-linear-baseline.sh" >&2
  exit 1
fi
GEN="$(mktemp)"
trap 'rm -f "$GEN"' EXIT
bash "$REPO_ROOT/scripts/database/generate-linear-baseline.sh" "$GEN"
if ! cmp -s "$OUT" "$GEN"; then
  echo "Linear baseline 0003 is out of date (migrations or generator changed)." >&2
  echo "Run: bash scripts/database/generate-linear-baseline.sh" >&2
  diff -u "$OUT" "$GEN" | head -200 >&2 || true
  exit 1
fi
echo "OK: 0003_linear_baseline.sql matches generated output."
