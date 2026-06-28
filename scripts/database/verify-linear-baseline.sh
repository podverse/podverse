#!/usr/bin/env bash
# Fail if generated baseline archives do not match generator output.
# Compares uncompressed SQL bytes for each 0004/0005 gzip (committed vs fresh Docker-generated).
# Use after editing infra/k8s/base/ops/source/database/linear-migrations and in CI (e.g. /test on a PR). Requires Docker for 0004/0005.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUT_APP="$REPO_ROOT/infra/k8s/base/db/source/bootstrap/0004_app_linear_baseline.sql.gz"
OUT_MGT="$REPO_ROOT/infra/k8s/base/db/source/bootstrap/0005_management_linear_baseline.sql.gz"

print_fix_hint() {
  {
    echo "To regenerate 0004/0005 from the repo root:" >&2
    echo "  make db_regen_linear_baseline" >&2
    echo "  make db_verify_linear_baseline" >&2
    echo "Or: bash scripts/database/generate-linear-baseline.sh" >&2
  } >&2
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    {
      echo "## Linear baseline 0004/0005 out of date"
      echo
      echo "Regenerate from the repository root, then commit baseline archives:"
      echo
      echo '```'
      echo "make db_regen_linear_baseline"
      echo "make db_verify_linear_baseline"
      echo '```'
      echo
      echo "Or: \`bash scripts/database/generate-linear-baseline.sh\`"
    } >>"$GITHUB_STEP_SUMMARY"
  fi
}

for f in "$OUT_APP" "$OUT_MGT"; do
  if [[ ! -f "$f" ]]; then
    echo "Missing baseline: $f" >&2
    print_fix_hint
    exit 1
  fi
done

if ! command -v gzip >/dev/null 2>&1; then
  echo "gzip is required to verify the compressed baseline." >&2
  exit 1
fi

GEN_DIR="$(mktemp -d)"
GEN_APP_SQL="$(mktemp)"
GEN_MGT_SQL="$(mktemp)"
COMM_APP_SQL="$(mktemp)"
COMM_MGT_SQL="$(mktemp)"
trap 'rm -rf "$GEN_DIR" "$GEN_APP_SQL" "$GEN_MGT_SQL" "$COMM_APP_SQL" "$COMM_MGT_SQL"' EXIT

bash "$REPO_ROOT/scripts/database/generate-linear-baseline.sh" "$GEN_DIR"

gzip -dc "$OUT_APP" >"$COMM_APP_SQL"
gzip -dc "$GEN_DIR/0004_app_linear_baseline.sql.gz" >"$GEN_APP_SQL"
if ! cmp -s "$COMM_APP_SQL" "$GEN_APP_SQL"; then
  echo "Linear baseline 0004 (app) is out of date (migrations or generator changed)." >&2
  print_fix_hint
  diff -u "$COMM_APP_SQL" "$GEN_APP_SQL" | head -200 >&2 || true
  exit 1
fi
echo "OK: 0004_app_linear_baseline.sql.gz (uncompressed) matches generated output."

gzip -dc "$OUT_MGT" >"$COMM_MGT_SQL"
gzip -dc "$GEN_DIR/0005_management_linear_baseline.sql.gz" >"$GEN_MGT_SQL"
if ! cmp -s "$COMM_MGT_SQL" "$GEN_MGT_SQL"; then
  echo "Linear baseline 0005 (management) is out of date (migrations or generator changed)." >&2
  print_fix_hint
  diff -u "$COMM_MGT_SQL" "$GEN_MGT_SQL" | head -200 >&2 || true
  exit 1
fi
echo "OK: 0005_management_linear_baseline.sql.gz (uncompressed) matches generated output."
